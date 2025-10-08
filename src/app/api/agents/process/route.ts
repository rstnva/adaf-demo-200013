// API route para ejecutar worker de agentes manualmente
import { NextResponse } from 'next/server'
import { incApiRequest } from '@/lib/metrics'
import { tick } from '@/lib/workerTick'

export async function POST() {
  try {
    const res = await tick()
    const out = NextResponse.json({ ok: true, ...res })
    incApiRequest('/api/agents/process','POST', out.status)
    return out
    
  } catch (error) {
    console.error('Error executing agent worker:', error)
    const out = NextResponse.json({ ok: false, error: 'tick failed' }, { status: 500 })
    incApiRequest('/api/agents/process','POST', out.status)
    return out
  }
}

export async function GET() {
  const res = NextResponse.json({
    message: 'ADAF Agent Worker API',
    usage: 'POST to execute worker manually',
    status: 'ready'
  })
  incApiRequest('/api/agents/process','GET', res.status)
  return res
}