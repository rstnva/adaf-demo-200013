// Farside ETF flows proxy API route
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { days = 30 } = await request.json();
    
    // For now, return mock data since we don't have direct Farside API access
    // In production, this would fetch from Farside's public endpoints
    const flows = generateFarsideMockData(days);
    
    return NextResponse.json({ flows });
  } catch (error) {
    console.error('Farside API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Farside data' },
      { status: 500 }
    );
  }
}

function generateFarsideMockData(days: number) {
  const flows = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate flows with some correlation to market patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Weekend flows tend to be zero or minimal
    const btcMultiplier = isWeekend ? 0.1 : 1;
    const ethMultiplier = isWeekend ? 0.1 : 1;
    
    const btcFlow = (Math.random() - 0.4) * 800 * btcMultiplier; // Slight negative bias
    const ethFlow = (Math.random() - 0.3) * 250 * ethMultiplier; // Less negative bias than BTC
    
    flows.push({
      date: dateStr,
      btc_flow: Math.round(btcFlow * 100) / 100,
      eth_flow: Math.round(ethFlow * 100) / 100,
    });
  }
  
  return flows;
}