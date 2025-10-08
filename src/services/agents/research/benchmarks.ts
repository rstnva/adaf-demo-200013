// ================================================================================================
// Benchmark Data Service
// ================================================================================================
// Retrieves and manages benchmark data (BTC, ETH, NAV) for backtesting comparisons
// Handles data gaps and provides fallback synthetic data when needed
// ================================================================================================

import { Benchmark } from '@/types/research';

/**
 * Daily benchmark data point
 */
export interface BenchmarkData {
  date: string;      // YYYY-MM-DD format
  price: number;     // Closing price
  return: number;    // Daily return percentage
}

/**
 * Benchmark data service for backtesting
 */
export class BenchmarkService {
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private static cache: Map<string, { data: BenchmarkData[]; timestamp: number }> = new Map();

  /**
   * Get benchmark returns for a specific date range
   */
  static async getBenchmarkReturns(
    benchmark: Benchmark,
    fromDate: string,
    toDate: string
  ): Promise<BenchmarkData[]> {
    const cacheKey = `${benchmark}_${fromDate}_${toDate}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    let data: BenchmarkData[];

    try {
      switch (benchmark) {
        case 'BTC':
          data = await this.getBTCReturns(fromDate, toDate);
          break;
        case 'ETH':
          data = await this.getETHReturns(fromDate, toDate);
          break;
        case 'NAV':
          data = await this.getNAVReturns(fromDate, toDate);
          break;
        default:
          throw new Error(`Unsupported benchmark: ${benchmark}`);
      }

      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;

    } catch (error) {
      console.error(`❌ Error fetching ${benchmark} benchmark data:`, error);
      
      // Fallback to synthetic data with warning
      console.warn(`⚠️ Using synthetic ${benchmark} data as fallback`);
      data = this.generateSyntheticReturns(fromDate, toDate, benchmark);
      
      return data;
    }
  }

  /**
   * Get BTC daily returns from metrics table or external source
   */
  private static async getBTCReturns(fromDate: string, toDate: string): Promise<BenchmarkData[]> {
    // TODO: Replace with actual database query
    // SELECT date_trunc('day', ts) as date, 
    //        last(value, ts) as close_price
    // FROM metrics 
    // WHERE key = 'btc.close' 
    //   AND ts >= $1 AND ts <= $2
    // GROUP BY date_trunc('day', ts)
    // ORDER BY date

    // Mock implementation - in production, query the metrics table
    return this.queryMetricsTable('btc.close', fromDate, toDate);
  }

  /**
   * Get ETH daily returns from metrics table or external source
   */
  private static async getETHReturns(fromDate: string, toDate: string): Promise<BenchmarkData[]> {
    // TODO: Replace with actual database query
    return this.queryMetricsTable('eth.close', fromDate, toDate);
  }

  /**
   * Get NAV returns (usually flat, or from actual NAV metrics)
   */
  private static async getNAVReturns(fromDate: string, toDate: string): Promise<BenchmarkData[]> {
    // For NAV benchmark, typically returns close to 0%
    // Or query actual NAV data if available
    try {
      return this.queryMetricsTable('nav.close', fromDate, toDate);
    } catch {
      // Fallback to flat NAV (0% returns)
      return this.generateFlatReturns(fromDate, toDate);
    }
  }

  /**
   * Query metrics table for benchmark data
   */
  private static async queryMetricsTable(metricKey: string, fromDate: string, toDate: string): Promise<BenchmarkData[]> {
    // TODO: Implement actual database query when available
    // This is a placeholder for the real implementation
    
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

    // Mock data for development - replace with real query
    console.warn(`⚠️ Using mock data for ${metricKey} - implement database query`);
    
    return this.generateMockBenchmarkData(metricKey, fromDate, toDate, days);
  }

  /**
   * Generate flat returns (for NAV or fallback)
   */
  private static generateFlatReturns(fromDate: string, toDate: string): BenchmarkData[] {
    const data: BenchmarkData[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    let currentDate = new Date(start);
    let price = 1.0; // Start at 1.0 for NAV

    while (currentDate <= end) {
      data.push({
        date: currentDate.toISOString().split('T')[0],
        price,
        return: 0 // 0% daily return
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * Generate synthetic benchmark returns for fallback
   */
  private static generateSyntheticReturns(fromDate: string, toDate: string, benchmark: Benchmark): BenchmarkData[] {
    const data: BenchmarkData[] = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    // Base parameters by asset
    let basePrice = 50000; // BTC starting price
    let dailyVol = 0.03;   // 3% daily volatility
    let drift = 0.0002;    // Small upward drift

    switch (benchmark) {
      case 'ETH':
        basePrice = 3000;
        dailyVol = 0.035; // Slightly more volatile
        break;
      case 'NAV':
        return this.generateFlatReturns(fromDate, toDate);
    }

    let currentDate = new Date(start);
    let price = basePrice;

    while (currentDate <= end) {
      // Random walk with drift
      const randomReturn = this.generateNormalRandom() * dailyVol + drift;
      const newPrice = price * (1 + randomReturn);
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        price: newPrice,
        return: randomReturn
      });
      
      price = newPrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * Generate mock benchmark data for development
   */
  private static generateMockBenchmarkData(metricKey: string, fromDate: string, toDate: string, days: number): BenchmarkData[] {
    // Generate realistic-looking data based on historical patterns
    const data: BenchmarkData[] = [];
    const start = new Date(fromDate);
    
    let basePrice = metricKey.includes('btc') ? 45000 : 2800;
    let price = basePrice;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      
      // Generate realistic daily return
      const dailyReturn = this.generateRealisticReturn(metricKey, i);
      const newPrice = price * (1 + dailyReturn);
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: newPrice,
        return: dailyReturn
      });
      
      price = newPrice;
    }

    return data;
  }

  /**
   * Generate realistic returns based on asset characteristics
   */
  private static generateRealisticReturn(metricKey: string, dayIndex: number): number {
    const baseVol = metricKey.includes('btc') ? 0.025 : 0.03; // BTC vs ETH volatility
    
    // Add some cyclical patterns and trends
    const trend = Math.sin(dayIndex * 2 * Math.PI / 365) * 0.001; // Yearly cycle
    const noise = this.generateNormalRandom() * baseVol;
    
    return trend + noise;
  }

  /**
   * Generate normal random numbers using Box-Muller transform
   */
  private static generateNormalRandom(): number {
    const u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Calculate returns from price series
   */
  static calculateReturnsFromPrices(data: BenchmarkData[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const prevPrice = data[i - 1].price;
      const currPrice = data[i].price;
      
      if (prevPrice > 0) {
        returns.push((currPrice - prevPrice) / prevPrice);
      } else {
        returns.push(0);
      }
    }
    
    return returns;
  }

  /**
   * Validate and clean benchmark data
   */
  static validateBenchmarkData(data: BenchmarkData[]): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (data.length === 0) {
      return { valid: false, warnings: ['No benchmark data available'] };
    }

    // Check for missing data gaps
    const dates = data.map(d => new Date(d.date));
    let expectedDate = new Date(dates[0]);
    
    for (let i = 1; i < dates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() + 1);
      
      if (dates[i].getTime() !== expectedDate.getTime()) {
        warnings.push(`Data gap detected around ${dates[i].toISOString().split('T')[0]}`);
      }
    }

    // Check for extreme values
    const prices = data.map(d => d.price);
    const returns = data.map(d => d.return);
    
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const maxReturn = Math.max(...returns);
    const minReturn = Math.min(...returns);
    
    if (maxReturn > 0.5 || minReturn < -0.5) {
      warnings.push(`Extreme returns detected: ${(minReturn * 100).toFixed(1)}% to ${(maxReturn * 100).toFixed(1)}%`);
    }

    if (minPrice <= 0) {
      warnings.push('Non-positive prices detected in benchmark data');
    }

    return { valid: true, warnings };
  }

  /**
   * Clear cached benchmark data
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { keys: number; size: string } {
    const keys = this.cache.size;
    const sizeBytes = JSON.stringify([...this.cache.values()]).length;
    const size = `${(sizeBytes / 1024).toFixed(1)} KB`;
    
    return { keys, size };
  }
}