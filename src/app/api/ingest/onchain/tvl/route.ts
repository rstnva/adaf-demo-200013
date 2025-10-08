// API route para ingesta de datos on-chain (OC-1)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Schema de validación para TVLPoint
const TVLPointSchema = z.object({
  chain: z.string().min(1),
  protocol: z.string().min(1),
  metric: z.string().regex(/^[a-z0-9\.\-_]+$/).default('tvl.usd'),
  value: z.number(),
  ts: z.string().datetime()
})

// Generar hash para deduplicación
function generateTVLHash(point: z.infer<typeof TVLPointSchema>): string {
  const ts = new Date(point.ts).toISOString()
  const base = `${point.chain}|${point.protocol}|${point.metric}|${ts}`
  return crypto.createHash('sha256').update(base).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const point = TVLPointSchema.parse(body)
    
    // Generar hash para deduplicación
    const hash = generateTVLHash(point)
    
    // Verificar duplicados en Redis (3 horas de ventana)
    const isDuplicate = await redis.setnx(`dedupe:onchain:${hash}`, '1')
    if (!isDuplicate) {
      return NextResponse.json({
        status: 'duplicate',
        hash
      })
    }
    
    // Configurar expiración
    await redis.expire(`dedupe:onchain:${hash}`, 3 * 3600)
    
    // Severidad básica (el análisis real se hace en el worker)
    const severity = 'low'
    // Construir señal acorde al esquema actual
    await prisma.signal.create({
      data: {
        type: 'onchain',
        source: 'OC-1',
        title: `TVL point ${point.protocol}`,
        description: `${point.chain} ${point.protocol} ${point.metric}=${point.value}`,
        severity,
        metadata: {
          chain: point.chain,
          protocol: point.protocol,
          metric: point.metric,
          value: point.value,
          ts: point.ts
        },
        fingerprint: hash,
        processed: false,
        timestamp: new Date(point.ts)
      }
    })
    
    return NextResponse.json({
      status: 'ok',
      hash
    })
    
  } catch (error) {
    console.error('Error processing TVL:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}