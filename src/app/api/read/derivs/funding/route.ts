import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

// Data contract: FundingPoint aggregated by day
type FundingResponse = Array<{
  date: string // YYYY-MM-DD
  exchange: string
  window: '8h' | '1d'
  fundingRate: number // % annualized rate
}>

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const assetParam = searchParams.get('asset') || 'BTC'
    const daysParam = searchParams.get('days') || '14'
    
    // Validate and clamp params
    const asset = ['BTC', 'ETH'].includes(assetParam.toUpperCase()) ? assetParam.toUpperCase() : 'BTC'
    const days = Math.min(Math.max(Number(daysParam), 1), 60)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // Query funding points from signals table
    // Assuming signals with type 'derivs.funding.point' contain funding rate data
    // metadata format: { asset, exchange, window, rate }
    const signals = await prisma.$queryRaw<Array<{
      ts: Date
      source: string
      metadata: { asset?: string; exchange?: string; window?: string; rate?: number }
    }>>(Prisma.sql`
      SELECT timestamp as ts, source, metadata
      FROM signals 
      WHERE type = 'derivs.funding.point'
        AND timestamp >= ${cutoff}
        AND (metadata->>'asset') = ${asset}
      ORDER BY timestamp DESC
    `)
    
    // Aggregate by day and exchange - taking the last (most recent) rate per day per exchange
    // This decision: use last rate of each day rather than average for simplicity
    const aggregated = new Map<string, FundingResponse[0]>()
    
    for (const signal of signals) {
      const meta = signal.metadata
      if (!meta?.exchange || typeof meta.rate !== 'number') continue
      
      const date = signal.ts.toISOString().split('T')[0] // YYYY-MM-DD
      const exchange = String(meta.exchange).toLowerCase()
      const window = (meta.window === '8h' || meta.window === '1d') ? meta.window : '8h'
      const key = `${date}-${exchange}-${window}`
      
      // Only keep if this is more recent than existing entry for this day/exchange
      const existing = aggregated.get(key)
      if (!existing || signal.ts > new Date(existing.date)) {
        aggregated.set(key, {
          date,
          exchange,
          window,
          fundingRate: Number(meta.rate)
        })
      }
    }
    
    // Sort by date desc, then exchange
    const data = Array.from(aggregated.values()).sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date)
      return dateComp !== 0 ? dateComp : a.exchange.localeCompare(b.exchange)
    })
    
    const res = NextResponse.json(data)
    incApiRequest('/api/read/derivs/funding', 'GET', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json(
      { error: e instanceof Error ? e.message : 'internal error' }, 
      { status: 500 }
    )
    incApiRequest('/api/read/derivs/funding', 'GET', res.status)
    return res
  }
}