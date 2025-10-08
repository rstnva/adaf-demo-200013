import { NextResponse } from 'next/server'

// MOCK: Always return static data for local/dev
export async function GET() {
  // All fields required by KpiData
  const mockData = {
    navUsd: 1000000.12,
    navMxn: 17000000.45,
    pnlUsd: 12345.67,
    pnlMxn: 210000.89,
    sharpe: 1.23,
    maxDrawdown: -0.12,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(mockData);
}
