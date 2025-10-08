// DeFiLlama adapter for TVL data
export interface TVLPoint {
  chain: string
  protocol: string
  metric: string
  value: number
  ts: string
}

export class DeFiLlamaAdapter {
  private baseUrl = 'https://api.llama.fi'
  private timeout = 20000
  
  /**
   * Get TVL history for a specific protocol
   */
  async getProtocolTVL(protocolSlug: string): Promise<TVLPoint[]> {
    try {
      const response = await fetch(`${this.baseUrl}/protocol/${protocolSlug}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ADAF-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
  const tvlData: Array<{ date: number; totalLiquidityUSD: number }> = data.tvl || []
      
      // Take last 120 observations and convert to our format
      const points: TVLPoint[] = tvlData
        .slice(-120)
        .map((point) => ({
          chain: 'multi', // DeFiLlama aggregates across chains
          protocol: protocolSlug,
          metric: 'tvl.usd',
          value: parseFloat(String(point.totalLiquidityUSD ?? 0)),
          ts: new Date(point.date * 1000).toISOString()
        }))
        .filter((point: TVLPoint) => point.value > 0)
      
      return points
      
    } catch (error) {
      console.error(`Error fetching TVL for ${protocolSlug}:`, error)
      throw new Error(`Failed to fetch protocol TVL: ${error}`)
    }
  }
  
  /**
   * Get current TVL for multiple protocols
   */
  async getMultiProtocolTVL(protocols: string[]): Promise<Record<string, TVLPoint[]>> {
    const results: Record<string, TVLPoint[]> = {}
    
    // Process in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < protocols.length; i += batchSize) {
      const batch = protocols.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (protocol) => {
        try {
          const points = await this.getProtocolTVL(protocol)
          return { protocol, points }
        } catch (error) {
          console.error(`Failed to fetch ${protocol}:`, error)
          return { protocol, points: [] }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      for (const { protocol, points } of batchResults) {
        results[protocol] = points
      }
      
      // Small delay between batches
      if (i + batchSize < protocols.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }
  
  /**
   * Get top protocols by TVL
   */
  async getTopProtocols(limit = 50): Promise<Array<{slug: string, name: string, tvl: number}>> {
    try {
      const response = await fetch(`${this.baseUrl}/protocols`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ADAF-Dashboard/1.0'
        },
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
  const protocols: Array<{ slug: string; name: string; tvl: number }> = await response.json()
      
      return protocols
        .slice(0, limit)
        .map((p) => ({
          slug: p.slug,
          name: p.name,
          tvl: parseFloat(String(p.tvl ?? 0))
        }))
        .filter((p) => p.tvl > 0)
      
    } catch (error) {
      console.error('Error fetching top protocols:', error)
      throw new Error(`Failed to fetch top protocols: ${error}`)
    }
  }
  
  /**
   * Calculate TVL change percentage between two points
   */
  calculateTVLChange(previousValue: number, currentValue: number): number {
    if (previousValue <= 0) return 0
    return ((currentValue - previousValue) / previousValue) * 100
  }
  
  /**
   * Check if TVL change is significant (> threshold)
   */
  isSignificantChange(change: number, threshold = 5): boolean {
    return Math.abs(change) >= threshold
  }
}