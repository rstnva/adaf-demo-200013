// Farside ETF data fetcher with Next.js API route proxy

export interface FarsideEtfFlow {
  date: string;
  btc_flow: number; // in millions USD
  eth_flow: number; // in millions USD
}

export async function fetchFarsideEtfFlows(days = 30): Promise<FarsideEtfFlow[]> {
  try {
    const response = await fetch('/api/farside', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days }),
    });

    if (!response.ok) {
      throw new Error(`Farside API error: ${response.status}`);
    }

    const data = await response.json();
    return data.flows || [];
  } catch (error) {
    console.error('Error fetching Farside ETF flows:', error);
    // Return mock data for development
    return generateMockFarsideData(days);
  }
}

// Mock data generator for development/fallback
function generateMockFarsideData(days: number): FarsideEtfFlow[] {
  const flows: FarsideEtfFlow[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate realistic-looking flows
    const btcFlow = (Math.random() - 0.5) * 1000; // ±500M range
    const ethFlow = (Math.random() - 0.5) * 300; // ±150M range
    
    flows.push({
      date: dateStr,
      btc_flow: Math.round(btcFlow * 100) / 100,
      eth_flow: Math.round(ethFlow * 100) / 100,
    });
  }
  
  return flows;
}