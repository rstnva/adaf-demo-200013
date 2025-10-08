// Worker de procesamiento de agentes integrado en Next.js
import { Prisma, PrismaClient } from '@prisma/client'
import { evalRule } from '../rules/engine'
import type { RuleExpr } from '../rules'
import cron from 'node-cron'
import { incDerivsFundingAlert, setDerivsFundingNegHours, incDqpIncident, setDqpSourcesStatus } from '../metrics'
import { createDqpIncident } from '../dqp/calculations'

const prisma = new PrismaClient()

// Heurísticas: palabras clave high/med; TVL drop; consenso multi-fuente
const HI_KWS = ['hack', 'exploit', 'depeg', 'halt']
const MED_KWS = ['sec', 'cnbv', 'banxico', 'fomc', 'cpi', 'rate', 'etf']

function hasKeyword(text: string, keywords: string[]): boolean {
  const t = (text || '').toLowerCase()
  return keywords.some(k => t.includes(k))
}

// DV-1: Funding alert logic - check for extended negative funding periods
async function processFundingAlerts(): Promise<void> {
  try {
    const assets: Array<'BTC' | 'ETH'> = ['BTC', 'ETH']
    const exchanges = ['deribit', 'okx', 'binance']
    
    // Check for funding < 0 for 48-72h (6-9 periods of 8h each)
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000)
    
    for (const asset of assets) {
      for (const exchange of exchanges) {
        // Get recent funding signals for this asset/exchange
        const recentSignals = await prisma.signal.findMany({
          where: {
            type: 'derivs.funding.point',
            timestamp: { gte: cutoff72h },
            AND: [
              { metadata: { path: ['asset'], equals: asset } },
              { metadata: { path: ['exchange'], equals: exchange } }
            ]
          },
          orderBy: { timestamp: 'desc' },
          take: 10 // last 10 periods (80h if 8h windows)
        })
        
        if (recentSignals.length < 6) continue // need at least 6 periods for 48h check
        
        // Count consecutive negative funding periods
        let negativeHours = 0
        
        for (const signal of recentSignals) {
          const metadata = signal.metadata as { rate?: number; window?: string } | null
          const rate = Number(metadata?.rate || 0)
          const window = metadata?.window || '8h'
          const hours = window === '1d' ? 24 : 8
          
          if (rate < 0) {
            negativeHours += hours
          } else {
            break // stop on first positive rate (checking consecutive)
          }
        }
        
        // Update metrics
        setDerivsFundingNegHours(asset, exchange, negativeHours)
        
        // Create alert if negative for 48h+ and haven't alerted recently
        if (negativeHours >= 48) {
          // Check if we already have a recent alert for this asset/exchange
          const recentAlert = await prisma.alert.findFirst({
            where: {
              type: 'derivs.funding.signal',
              timestamp: { gte: cutoff48h },
              AND: [
                { metadata: { path: ['asset'], equals: asset } },
                { metadata: { path: ['exchange'], equals: exchange } }
              ]
            }
          })
          
          if (!recentAlert) {
            // Create alert (using raw query to avoid schema constraints)
            await prisma.$executeRaw`
              INSERT INTO alerts (type, severity, title, description, metadata, timestamp, "createdAt", "updatedAt")
              VALUES (
                'derivs.funding.signal',
                'medium', 
                ${`${asset} Funding Negative 48h+ on ${exchange}`},
                ${`Funding rate negative for ${negativeHours}h consecutive on ${exchange}. Basis opportunity likely.`},
                ${JSON.stringify({ asset, exchange, negativeHours, agentCode: 'DV-1' })}::jsonb,
                NOW(),
                NOW(), 
                NOW()
              )
            `
            
            // Create basis opportunity if not exists
            const existingOpp = await prisma.opportunity.findFirst({
              where: {
                type: 'basis',
                status: 'proposed',
                AND: [
                  { metadata: { path: ['asset'], equals: asset } },
                  { metadata: { path: ['exchange'], equals: exchange } },
                  { metadata: { path: ['agentCode'], equals: 'DV-1' } }
                ]
              }
            })
            
            if (!existingOpp) {
              // Create opportunity using raw query
              await prisma.$executeRaw`
                INSERT INTO opportunities (type, confidence, title, description, metadata, "createdAt", "updatedAt")
                VALUES (
                  'basis',
                  0.75,
                  ${`${asset} Basis Trade - ${exchange} Funding Negative`},
                  ${`Negative funding for ${negativeHours}h indicates shorts paying longs. Basis trade opportunity.`},
                  ${JSON.stringify({
                    agentCode: 'DV-1',
                    asset,
                    exchange,
                    negativeHours,
                    sizing: {
                      notionalPctNAV: 0.20,
                      maxDDbps: 150
                    },
                    var: 100000
                  })}::jsonb,
                  NOW(),
                  NOW()
                )
              `
            }
            
            // Increment metrics
            incDerivsFundingAlert(asset, exchange)
            
            console.log(`🔔 Created funding alert: ${asset} on ${exchange} (${negativeHours}h negative)`)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing funding alerts:', error)
  }
}

// DQP Health Checks - Monitor data quality and pipeline health
async function processDqpHealthChecks(): Promise<void> {
  try {
    console.log('🔍 Running DQP health checks...')
    
    // Get overview data to update metrics  
    const { getDqpOverview } = await import('../dqp/calculations')
    const overviewData = await getDqpOverview({ limit: 1000 })
    
    // Count sources by status
    const statusCounts = overviewData.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Update DQP metrics
    setDqpSourcesStatus('ok', statusCounts.ok || 0)
    setDqpSourcesStatus('warn', statusCounts.warn || 0)
    setDqpSourcesStatus('fail', statusCounts.fail || 0)
    
    // Check for critical failures and create incidents
    const criticalFailures = overviewData.filter(row => 
      row.status === 'fail' && 
      (row.freshnessMin === null || row.freshnessMin > 120) // No data for 2+ hours
    )
    
    for (const failure of criticalFailures) {
      // Check if we already have a recent incident for this source+agent+type
      const recentIncident = await prisma.changeLog.findFirst({
        where: {
          entity: 'DQP',
          entityId: `${failure.source}:${failure.agentCode}:${failure.type}`,
          field: 'freshness',
          at: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } // within 4 hours
        }
      })
      
      if (!recentIncident) {
        // Create freshness incident
        await createDqpIncident(
          failure.source,
          failure.agentCode,
          failure.type,
          'freshness',
          failure.freshnessMin 
            ? `No data received for ${failure.freshnessMin} minutes`
            : 'No data received ever',
          {
            freshnessMinutes: failure.freshnessMin,
            lastTs: failure.lastTs,
            detectedAt: new Date().toISOString()
          }
        )
        
        // Increment metrics
        incDqpIncident('freshness', failure.source, failure.agentCode)
        console.log(`📊 Created DQP freshness incident: ${failure.source}:${failure.agentCode}:${failure.type}`)
      }
    }
    
    // Check for duplicate issues
    const duplicateIssues = overviewData.filter(row => row.dupes24h > 5) // more than 5 dupes
    
    for (const issue of duplicateIssues) {
      const recentDupeIncident = await prisma.changeLog.findFirst({
        where: {
          entity: 'DQP',
          entityId: `${issue.source}:${issue.agentCode}:${issue.type}`,
          field: 'duplicate',
          at: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // within 2 hours
        }
      })
      
      if (!recentDupeIncident) {
        await createDqpIncident(
          issue.source,
          issue.agentCode,
          issue.type,
          'duplicate',
          `${issue.dupes24h} duplicate signals detected in 24h window`,
          {
            duplicateCount: issue.dupes24h,
            detectedAt: new Date().toISOString()
          }
        )
        
        incDqpIncident('duplicate', issue.source, issue.agentCode)
        console.log(`🔄 Created DQP duplicate incident: ${issue.source}:${issue.agentCode}`)
      }
    }
    
    console.log(`✅ DQP health check completed: ${statusCounts.ok || 0} OK, ${statusCounts.warn || 0} WARN, ${statusCounts.fail || 0} FAIL`)
    
  } catch (error) {
    console.error('Error in DQP health checks:', error)
  }
}

export async function processNewSignals(): Promise<{ processed: number; alerts: number; opportunities: number; skipped: number }> {
  try {
    console.log('🤖 Processing new signals...')
    
    const signals = await prisma.signal.findMany({
      where: { processed: false },
      take: 200,
      orderBy: { timestamp: 'asc' }
    })
    
    console.log(`Found ${signals.length} new signals to process`)
    
  let processedCount = 0
  let alertsCount = 0
  let opportunitiesCount = 0
  let skippedCount = 0

  for (const signal of signals) {
      let createAlert = false
  let title = 'Alerta'
  let description = ''
      
      // NM-1: keywords processing
      if (signal.type === 'news') {
        const titleText = signal.title || ''
        
        if (hasKeyword(titleText, HI_KWS)) {
          createAlert = true
          title = 'NOTICIA CRITICA'
        } else if (hasKeyword(titleText, MED_KWS)) {
          createAlert = true
          title = 'Noticia Relevante'
        }
        description = signal.description
      }
      
      // OC-1: TVL delta analysis
      if (signal.type === 'onchain' && signal.source === 'OC-1') {
        const md = signal.metadata as Prisma.JsonObject | null
        const protocol = (md?.protocol as string) || ''
        
        if (protocol) {
          // Get last 2 points for this protocol
          const lastSignals = await prisma.signal.findMany({
            where: {
              type: 'onchain',
              source: 'OC-1',
              title: { contains: protocol }
            },
            orderBy: { timestamp: 'desc' },
            take: 2
          })
          
          if (lastSignals.length === 2) {
            const md0 = lastSignals[1].metadata as Prisma.JsonObject | null
            const md1 = lastSignals[0].metadata as Prisma.JsonObject | null
            const v0 = Number(md0?.value ?? 0)
            const v1 = Number(md1?.value ?? 0)
            const delta = (v1 - v0) / Math.max(v0, 1)
            
            // -12% threshold for alert + opportunity
            if (delta <= -0.12) {
              createAlert = true
              title = `TVL drop ${protocol}`
              description = `Delta ${(delta * 100).toFixed(1)}%`
              
              // Create opportunity (schema expects signalId and metadata JSON)
              await prisma.opportunity.create({
                data: {
                  signalId: signal.id,
                  type: 'realYield',
                  confidence: 0.5,
                  title: `TVL drop ${protocol}`,
                  description: `Delta ${(delta * 100).toFixed(1)}%`,
                  metadata: { protocol, delta }
                }
              })
              opportunitiesCount += 1
            }
          }
        }
      }
      
      // Reglas DSL aplicables por agente inferido
      try {
        const candidateAgents: string[] = []
        if (signal.type === 'news') candidateAgents.push('NM-1')
        if (signal.type === 'onchain' && signal.source === 'OC-1') candidateAgents.push('OC-1')
        if (signal.type === 'offchain') candidateAgents.push('OF-1')
        if (candidateAgents.length > 0) {
          const rules = await prisma.rule.findMany({
            where: { agentCode: { in: candidateAgents }, enabled: true },
            orderBy: { createdAt: 'desc' }
          })
          for (const r of rules) {
            try {
              const rawExpr = (r as unknown as { expr: unknown }).expr
              const expr: RuleExpr = typeof rawExpr === 'string' ? JSON.parse(rawExpr) : (rawExpr as RuleExpr)
              const out = await evalRule(expr, signal as unknown)
              if (out.pass) { createAlert = true; break }
            } catch { /* ignore parse/eval errors */ }
          }
        }
      } catch { /* ignore rule engine failures */ }

      // OF-1: ETF flow thresholds (offchain signals from ingest/etf/flow)
      if (signal.type === 'offchain') {
        const md = signal.metadata as Prisma.JsonObject | null
        const asset = ((md?.asset as string) || '').toUpperCase()
        const flow = Number(md?.netInUsd ?? 0)
        if (asset === 'BTC' || asset === 'ETH') {
          const th = asset === 'BTC' ? 250_000_000 : 100_000_000
          if (flow >= th) {
            createAlert = true
            title = `Inflow Alto ETF ${asset}`
            description = `${(flow / 1e6).toFixed(1)}M USD netos`
            // Create opportunity
            await prisma.opportunity.create({
              data: {
                signalId: signal.id,
                type: 'beta',
                confidence: 0.55,
                title: `Flow-spike ETF ${asset}`,
                description: `Flow ${(flow/1e6).toFixed(0)}M USD >= ${(th/1e6)}M threshold`,
                metadata: { agentCode: 'OF-1', asset, flow, threshold: th }
              }
            })
            opportunitiesCount += 1
          }
        }
      }

      // Create alert if conditions are met
      if (createAlert) {
        await prisma.alert.create({
          data: {
            signalId: signal.id,
            type: 'market',
            severity: 'medium',
            title,
            description,
            metadata: {}
          }
        })
        
        await prisma.signal.update({
          where: { id: signal.id },
          data: { processed: true }
        })
        
        console.log(`✅ Created alert: ${title}`)
        alertsCount += 1
        processedCount += 1
      } else {
        await prisma.signal.update({
          where: { id: signal.id },
          data: { processed: true }
        })
        
        console.log(`❌ No alert for signal: ${signal.id}`)
        skippedCount += 1
        processedCount += 1
      }
    }
    
    // DV-1: Funding rate monitoring (check for extended negative periods)
    await processFundingAlerts()
    
    // DQP: Data Quality & Pipeline health monitoring
    await processDqpHealthChecks()
    
    console.log('✅ Signal processing completed')
    return { processed: processedCount, alerts: alertsCount, opportunities: opportunitiesCount, skipped: skippedCount }
  } catch (error) {
    console.error('❌ Error processing signals:', error)
    return { processed: 0, alerts: 0, opportunities: 0, skipped: 0 }
  }
}

// Initialize worker - can be called from API route or standalone
export function startAgentWorker(): void {
  console.log('🚀 Starting ADAF agent worker...')
  
  // Process signals every minute
  cron.schedule('* * * * *', () => {
    processNewSignals().catch(console.error)
  })
  
  console.log('⏰ Agent worker scheduled to run every minute')
}

// For standalone execution
if (process.env.RUN_ONCE === '1') {
  processNewSignals().then(() => {
    console.log('✅ One-time signal processing completed')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Error in one-time processing:', error)
    process.exit(1)
  })
} else if (require.main === module) {
  startAgentWorker()
}