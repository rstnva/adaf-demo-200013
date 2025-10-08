import { NextRequest, NextResponse } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

// Data contract: GammaPoint by tenor
type GammaPoint = {
  strike: number
  gamma: number
}

type GammaResponse = {
  tenor7: GammaPoint[]
  tenor14: GammaPoint[]
  tenor30: GammaPoint[]
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const assetParam = searchParams.get('asset') || 'BTC'
    
    // Validate params
    const asset = ['BTC', 'ETH'].includes(assetParam.toUpperCase()) ? assetParam.toUpperCase() : 'BTC'
    // Note: tenors parameter could be used for filtering, but for now we return all available tenors (7d, 14d, 30d)
    
    // Query gamma points from signals table
    // Assuming signals with type 'derivs.gamma.surface' contain gamma data
    // metadata format: { asset, tenor, strike, gamma }
    const signals = await prisma.$queryRaw<Array<{
      ts: Date
      metadata: { asset?: string; tenor?: string; strike?: number; gamma?: number }
    }>>(Prisma.sql`
      SELECT timestamp as ts, metadata
      FROM signals 
      WHERE type = 'derivs.gamma.surface'
        AND timestamp >= (NOW() - interval '1 day')
        AND (metadata->>'asset') = ${asset}
      ORDER BY timestamp DESC
    `)
    
    // Group by tenor and take most recent gamma for each strike
    const gammaByTenor = new Map<string, Map<number, number>>()
    
    for (const signal of signals) {
      const meta = signal.metadata
      if (!meta?.tenor || typeof meta.strike !== 'number' || typeof meta.gamma !== 'number') continue
      
      const tenor = meta.tenor
      const strike = Number(meta.strike)
      const gamma = Number(meta.gamma)
      
      if (!gammaByTenor.has(tenor)) {
        gammaByTenor.set(tenor, new Map())
      }
      
      const tenorMap = gammaByTenor.get(tenor)!
      // Only update if we don't have this strike yet (taking first/latest due to DESC order)
      if (!tenorMap.has(strike)) {
        tenorMap.set(strike, gamma)
      }
    }
    
    // Build response arrays, sorted by strike ascending
    const buildTenorArray = (tenor: string): GammaPoint[] => {
      const tenorMap = gammaByTenor.get(tenor)
      if (!tenorMap) return []
      
      return Array.from(tenorMap.entries())
        .map(([strike, gamma]) => ({ strike, gamma }))
        .sort((a, b) => a.strike - b.strike)
    }
    
    const data: GammaResponse = {
      tenor7: buildTenorArray('7d'),
      tenor14: buildTenorArray('14d'),
      tenor30: buildTenorArray('30d')
    }
    
    const res = NextResponse.json(data)
    incApiRequest('/api/read/derivs/gamma', 'GET', res.status)
    return res
  } catch (e: unknown) {
    const res = NextResponse.json(
      { error: e instanceof Error ? e.message : 'internal error' }, 
      { status: 500 }
    )
    incApiRequest('/api/read/derivs/gamma', 'GET', res.status)
    return res
  }
}