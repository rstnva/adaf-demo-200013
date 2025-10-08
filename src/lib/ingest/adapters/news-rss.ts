// RSS/Atom news adapter for ADAF system
import Parser from 'rss-parser'

export interface NewsItem {
  source: string
  title: string
  url: string
  published_at: string
  summary?: string
  category?: string
  tickers: string[]
  keywords: string[]
}

export class NewsRSSAdapter {
  private parser: Parser
  
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      maxRedirects: 5
    })
  }
  
  /**
   * Pull and parse RSS/Atom feed
   */
  async pullFeed(feedUrl: string, source: string): Promise<NewsItem[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl)
      const items: NewsItem[] = []
      
      for (const entry of feed.items.slice(0, 50)) {
        // Parse publication date
        let publishedAt = new Date().toISOString()
        if (entry.pubDate) {
          publishedAt = new Date(entry.pubDate).toISOString()
        } else if (entry.isoDate) {
          publishedAt = new Date(entry.isoDate).toISOString()
        }
        
        // Extract basic info
        const title = entry.title || ''
        const url = entry.link || ''
        const summary = this.cleanSummary(entry.contentSnippet || entry.summary || '')
        
        // Basic categorization
        const category = this.categorizeNews(title + ' ' + summary)
        
        // Extract tickers (basic implementation)
        const tickers = this.extractTickers(title + ' ' + summary)
        
        // Extract keywords
        const keywords = this.extractKeywords(title + ' ' + summary)
        
        items.push({
          source,
          title,
          url,
          published_at: publishedAt,
          summary: summary.substring(0, 500),
          category,
          tickers,
          keywords
        })
      }
      
      return items
      
    } catch (error) {
      console.error(`Error pulling RSS feed ${feedUrl}:`, error)
      throw new Error(`Failed to pull RSS feed: ${error}`)
    }
  }
  
  private cleanSummary(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
  }
  
  private categorizeNews(text: string): string {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/hack|exploit|breach|attack|vulnerability/)) {
      return 'security'
    }
    if (lowerText.match(/sec|cftc|regulation|regulatory|compliance/)) {
      return 'regulation'
    }
    if (lowerText.match(/etf|institutional|adoption/)) {
      return 'institutional'
    }
    if (lowerText.match(/defi|protocol|yield|liquidity/)) {
      return 'defi'
    }
    if (lowerText.match(/macro|fed|interest|inflation|economic/)) {
      return 'macro'
    }
    
    return 'general'
  }
  
  private extractTickers(text: string): string[] {
    const tickers: string[] = []
    const upperText = text.toUpperCase()
    
    // Common crypto tickers
    const commonTickers = [
      'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
      'UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'BAL', 'SUSHI',
      'LDO', 'RPL', 'ETHFI', 'PENDLE', 'ENA', 'WEETH', 'RETH'
    ]
    
    for (const ticker of commonTickers) {
      if (upperText.includes(ticker)) {
        tickers.push(ticker)
      }
    }
    
    // Bitcoin variations
    if (upperText.match(/BITCOIN|BTC/)) tickers.push('BTC')
    if (upperText.match(/ETHEREUM|ETH/)) tickers.push('ETH')
    
    return [...new Set(tickers)] // Remove duplicates
  }
  
  private extractKeywords(text: string): string[] {
    const keywords: string[] = []
    const lowerText = text.toLowerCase()
    
    // Security keywords
    const securityKeywords = ['hack', 'exploit', 'breach', 'attack', 'vulnerability', 'security']
    // Regulatory keywords
    const regulatoryKeywords = ['sec', 'cftc', 'regulation', 'regulatory', 'compliance', 'etf']
    // DeFi keywords
    const defiKeywords = ['defi', 'protocol', 'yield', 'liquidity', 'tvl', 'apy']
    // Macro keywords
    const macroKeywords = ['fed', 'fomc', 'rates', 'inflation', 'cpi', 'economic']
    
    const allKeywords = [
      ...securityKeywords,
      ...regulatoryKeywords, 
      ...defiKeywords,
      ...macroKeywords
    ]
    
    for (const keyword of allKeywords) {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword)
      }
    }
    
    return [...new Set(keywords)] // Remove duplicates
  }
}