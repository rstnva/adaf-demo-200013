/**
 * Pruebas de integración para los workers de agentes
 * Valida el procesamiento automático de señales y heurísticas
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Import del worker
import { processNewSignals } from '../src/lib/agents/worker'

const prisma = new PrismaClient()
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 15 // Base de datos separada para pruebas
})

describe('Agent Worker Integration', () => {
  beforeEach(async () => {
    // Limpiar Redis y base de datos antes de cada prueba
    await redis.flushdb()
    
    // Limpiar tablas relacionadas en orden correcto
    await prisma.alert.deleteMany()
    await prisma.opportunity.deleteMany()
    await prisma.signal.deleteMany()
  })

  afterEach(async () => {
    await redis.flushdb()
  })

  it('should process news signals and generate alerts', async () => {
    // Crear una señal de prueba en la base de datos
    const testSignal = await prisma.signal.create({
      data: {
        type: 'news',
        source: 'CryptoNews',
        title: 'URGENT: Major Exchange Hack Detected',
        description: 'Critical security breach affecting millions of users worldwide',
        severity: 'critical',
        metadata: {
          keywords: ['hack', 'security', 'breach', 'urgent'],
          sentiment: -0.9
        },
        fingerprint: 'test-fingerprint-123',
        timestamp: new Date()
      }
    })

    // Ejecutar el worker
    const result = await processNewSignals()

    expect(result.processed).toBeGreaterThan(0)
    expect(result.alerts).toBeGreaterThan(0)

    // Verificar que se creó una alerta
    const alerts = await prisma.alert.findMany({
      where: { signalId: testSignal.id }
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('critical')
    expect(alerts[0].type).toBe('security')
  })

  it('should process TVL signals and detect significant drops', async () => {
    // Crear una señal TVL con caída significativa
    const tvlSignal = await prisma.signal.create({
      data: {
        type: 'onchain',
        source: 'DeFiLlama',
        title: 'Uniswap TVL Drop',
        description: 'TVL decreased by 15% in 24 hours',
        severity: 'high',
        metadata: {
          protocol: 'uniswap',
          tvl: 5800000000,
          change24h: -0.15,
          chain: 'ethereum'
        },
        fingerprint: 'tvl-test-456',
        timestamp: new Date()
      }
    })

    const result = await processNewSignals()

    expect(result.processed).toBeGreaterThan(0)
    expect(result.alerts).toBeGreaterThan(0)

    // Verificar la alerta generada
    const alerts = await prisma.alert.findMany({
      where: { signalId: tvlSignal.id }
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0].type).toBe('liquidity')
    expect(alerts[0].description).toContain('TVL drop')
  })

  it('should identify arbitrage opportunities', async () => {
    // Crear señales que podrían generar oportunidades
    const priceSignal = await prisma.signal.create({
      data: {
        type: 'price',
        source: 'PriceOracle',
        title: 'ETH Price Divergence Detected',
        description: 'Significant price difference between exchanges',
        severity: 'medium',
        metadata: {
          asset: 'ETH',
          exchanges: ['binance', 'coinbase'],
          priceDiff: 0.03, // 3% difference
          volume: 1500000
        },
        fingerprint: 'price-arb-789',
        timestamp: new Date()
      }
    })

    const result = await processNewSignals()

    expect(result.processed).toBeGreaterThan(0)
    expect(result.opportunities).toBeGreaterThan(0)

    // Verificar oportunidad de arbitraje
    const opportunities = await prisma.opportunity.findMany({
      where: { signalId: priceSignal.id }
    })

    expect(opportunities).toHaveLength(1)
    expect(opportunities[0].type).toBe('arbitrage')
    expect(opportunities[0].confidence).toBeGreaterThan(0.7)
  })

  it('should handle multiple signal types in batch', async () => {
    // Crear múltiples señales de diferentes tipos
    const signals = await Promise.all([
      prisma.signal.create({
        data: {
          type: 'news',
          source: 'NewsAPI',
          title: 'Bitcoin ETF Approved',
          description: 'SEC approves first Bitcoin ETF',
          severity: 'high',
          metadata: { sentiment: 0.8 },
          fingerprint: 'news-batch-1',
          timestamp: new Date()
        }
      }),
      prisma.signal.create({
        data: {
          type: 'onchain',
          source: 'ChainAnalysis',
          title: 'Large Whale Movement',
          description: '10,000 BTC moved to exchange',
          severity: 'medium',
          metadata: { amount: 10000, asset: 'BTC' },
          fingerprint: 'onchain-batch-2',
          timestamp: new Date()
        }
      }),
      prisma.signal.create({
        data: {
          type: 'social',
          source: 'TwitterAPI',
          title: 'Viral Crypto Tweet',
          description: 'Elon Musk tweets about Dogecoin',
          severity: 'low',
          metadata: { engagement: 500000, sentiment: 0.6 },
          fingerprint: 'social-batch-3',
          timestamp: new Date()
        }
      })
    ])

    const result = await processNewSignals()

    expect(result.processed).toBe(3)
    expect(result.alerts + result.opportunities).toBeGreaterThan(0)

    // Verificar que se procesaron todas las señales
    const processedSignals = await prisma.signal.findMany({
      where: {
        id: { in: signals.map(s => s.id) },
        processed: true
      }
    })

    expect(processedSignals).toHaveLength(3)
  })

  it('should respect processing cooldown periods', async () => {
    // Mock del timer para controlar el tiempo
    vi.useFakeTimers()

    // Crear una señal
    const signal = await prisma.signal.create({
      data: {
        type: 'news',
        source: 'TestSource',
        title: 'Test Signal',
        description: 'Test description',
        severity: 'low',
        metadata: {},
        fingerprint: 'cooldown-test',
        timestamp: new Date()
      }
    })

    // Primer procesamiento
    const result1 = await processNewSignals()
    expect(result1.processed).toBe(1)

    // Crear otra señal inmediatamente
    await prisma.signal.create({
      data: {
        type: 'news',
        source: 'TestSource',
        title: 'Test Signal 2',
        description: 'Test description 2',
        severity: 'low',
        metadata: {},
        fingerprint: 'cooldown-test-2',
        timestamp: new Date()
      }
    })

    // Segundo procesamiento inmediato (debería respetar cooldown)
    const result2 = await processNewSignals()
    expect(result2.skipped).toBeGreaterThan(0)

    // Avanzar tiempo y procesar de nuevo
    vi.advanceTimersByTime(60000) // 1 minuto
    const result3 = await processNewSignals()
    expect(result3.processed).toBeGreaterThan(0)

    vi.useRealTimers()
  })
})