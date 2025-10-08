import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

type Row = { date: string; dailyNetInflow: number }

export async function GET(req: NextRequest) {
  // MOCK: Always return static data for local/dev
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(31, Number(url.searchParams.get('days') || 7)));
  const today = new Date();
  let cum = 0;
  const rows = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const dailyNetInflow = Math.floor(Math.random() * 1000000 - 500000);
    cum += dailyNetInflow;
    return {
      date: d.toISOString().slice(0, 10),
      dailyNetInflow,
      cumNetInflow: cum,
      totalNetInflow: dailyNetInflow,
    };
  });
  const res = NextResponse.json(rows);
  incApiRequest('/api/read/etf/flow','GET', res.status);
  return res;
}
