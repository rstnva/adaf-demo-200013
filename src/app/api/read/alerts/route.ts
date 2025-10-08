import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { incApiRequest } from '@/lib/metrics'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  // MOCK: Always return static data for local/dev
  const page = 1;
  const limit = 10;
  const total = 3;
  const pages = 1;
  const data = [
    {
      id: 1,
      title: 'Mock Alert 1',
      description: 'This is a mock alert for testing.',
      severity: 'sev1',
      resolved: false,
      createdAt: new Date().toISOString(),
      signal: { type: 'system', source: 'mock', title: 'Mock Signal', timestamp: new Date().toISOString() }
    },
    {
      id: 2,
      title: 'Mock Alert 2',
      description: 'Another mock alert.',
      severity: 'sev2',
      resolved: false,
      createdAt: new Date().toISOString(),
      signal: { type: 'api', source: 'mock', title: 'Mock API', timestamp: new Date().toISOString() }
    },
    {
      id: 3,
      title: 'Mock Alert 3',
      description: 'Yet another mock alert.',
      severity: 'sev3',
      resolved: true,
      createdAt: new Date().toISOString(),
      signal: { type: 'data', source: 'mock', title: 'Mock Data', timestamp: new Date().toISOString() }
    }
  ];
  const res = NextResponse.json({ page, limit, total, pages, data });
  incApiRequest('/api/read/alerts','GET', res.status);
  return res;
}