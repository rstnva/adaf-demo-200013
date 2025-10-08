/**
 * Pruebas end-to-end del sistema completo ADAF
 * Valida el flujo completo desde ingesta hasta alertas y oportunidades
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Imports de los handlers
import { POST as newsHandler } from '../src/app/api/ingest/news/route'
import { POST as tvlHandler } from '../src/app/api/ingest/onchain/tvl/route'
import { GET as alertsHandler } from '../src/app/api/read/alerts/route'
import { GET as opportunitiesHandler } from '../src/app/api/read/opportunities/route'

const prisma = new PrismaClient()
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 15 // Base de datos separada para pruebas
})

describe('ADAF System End-to-End', () => {
  beforeAll(async () => {
    // Setup inicial para pruebas E2E
    await redis.flushdb()
    
    // Limpiar todas las tablas
    await prisma.alert.deleteMany()
    await prisma.opportunity.deleteMany()
    await prisma.signal.deleteMany()
  })

  afterAll(async () => {
    await redis.flushdb()
    await prisma.$disconnect()
    await redis.disconnect()
  })

  it('should complete full news ingestion to alert flow', async () => {
    // 1. Ingestar noticia crítica
    const criticalNews = {
      title: 'BREAKING: Major DeFi Protocol Exploited',
      description: 'Attacker drains $100M from leading DeFi protocol in sophisticated exploit',
      link: 'https://example.com/defi-exploit',
      pubDate: new Date().toISOString(),
      source: 'DeFiSecurity'
    }

    const newsRequest = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criticalNews)
    })

    const newsResponse = await newsHandler(newsRequest)
    const newsResult = await newsResponse.json()

    expect(newsResponse.status).toBe(201)
    expect(newsResult.success).toBe(true)
    expect(newsResult.signalId).toBeDefined()

    // 2. Simular procesamiento del worker (normalmente automático)
    // Aquí verificaríamos que el worker procesa la señal
    
    // 3. Verificar que se pueden leer las alertas
    const alertsRequest = new NextRequest('http://localhost:3000/api/read/alerts', {
      method: 'GET'
    })

    const alertsResponse = await alertsHandler(alertsRequest)
    const alertsResult = await alertsResponse.json()

    expect(alertsResponse.status).toBe(200)
    expect(Array.isArray(alertsResult.alerts)).toBe(true)
  })

  it('should complete full TVL ingestion to opportunity flow', async () => {
    // 1. Ingestar datos TVL con oportunidad de arbitraje
    const tvlData = {
      protocol: 'curve',
      tvl: 3200000000,
      change24h: 0.15, // 15% increase - posible oportunidad
      timestamp: new Date().toISOString(),
      chain: 'ethereum'
    }

    const tvlRequest = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tvlData)
    })

    const tvlResponse = await tvlHandler(tvlRequest)
    const tvlResult = await tvlResponse.json()

    expect(tvlResponse.status).toBe(201)
    expect(tvlResult.success).toBe(true)

    // 2. Verificar que se pueden leer las oportunidades
    const oppsRequest = new NextRequest('http://localhost:3000/api/read/opportunities', {
      method: 'GET'
    })

    const oppsResponse = await opportunitiesHandler(oppsRequest)
    const oppsResult = await oppsResponse.json()

    expect(oppsResponse.status).toBe(200)
    expect(Array.isArray(oppsResult.opportunities)).toBe(true)
  })

  it('should handle multiple concurrent ingestions', async () => {
    // Crear múltiples requests concurrentes
    const requests = [
      // Noticias
      fetch('http://localhost:3000/api/ingest/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Bitcoin Reaches New ATH',
          description: 'Bitcoin price surpasses $100k for first time',
          link: 'https://example.com/btc-ath',
          pubDate: new Date().toISOString(),
          source: 'CryptoTimes'
        })
      }),
      
      // TVL Data
      fetch('http://localhost:3000/api/ingest/onchain/tvl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'aave',
          tvl: 7800000000,
          change24h: -0.08,
          timestamp: new Date().toISOString(),
          chain: 'ethereum'
        })
      }),

      // Más noticias
      fetch('http://localhost:3000/api/ingest/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ethereum 2.0 Upgrade Complete',
          description: 'Final phase of Ethereum upgrade successfully deployed',
          link: 'https://example.com/eth-upgrade',
          pubDate: new Date().toISOString(),
          source: 'EthereumFoundation'
        })
      })
    ]

    // Ejecutar todas las requests en paralelo
    const responses = await Promise.all(requests)
    
    // Verificar que todas fueron exitosas
    for (const response of responses) {
      expect(response.status).toBeOneOf([200, 201])
    }

    // Verificar que se crearon múltiples señales
    const signals = await prisma.signal.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    expect(signals.length).toBeGreaterThanOrEqual(3)
  })

  it('should maintain data consistency under load', async () => {
    // Simular carga alta con la misma noticia desde múltiples fuentes
    const duplicateNews = {
      title: 'SEC Announces New Crypto Regulations',
      description: 'New regulatory framework for digital assets released',
      link: 'https://example.com/sec-regulations',
      pubDate: new Date().toISOString(),
      source: 'SECOfficial'
    }

    // Crear múltiples requests idénticas (simula ingesta desde múltiples fuentes)
    const duplicateRequests = Array.from({ length: 5 }, () => 
      fetch('http://localhost:3000/api/ingest/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateNews)
      })
    )

    const responses = await Promise.all(duplicateRequests)

    // Solo la primera debería ser exitosa (201)
    // Las demás deberían ser duplicadas (409)
    const successfulResponses = responses.filter(r => r.status === 201)
    const duplicateResponses = responses.filter(r => r.status === 409)

    expect(successfulResponses).toHaveLength(1)
    expect(duplicateResponses).toHaveLength(4)

    // Verificar que solo hay una señal en la base de datos
    const signals = await prisma.signal.findMany({
      where: {
        title: duplicateNews.title
      }
    })

    expect(signals).toHaveLength(1)
  })

  it('should provide real-time data through API endpoints', async () => {
    // Crear datos de prueba
    await prisma.signal.create({
      data: {
        type: 'news',
        source: 'TestAPI',
        title: 'Real-time Test Alert',
        description: 'Testing real-time capabilities',
        severity: 'medium',
        metadata: {},
        fingerprint: 'realtime-test',
        timestamp: new Date(),
        processed: true
      }
    })

    // Probar endpoint de alertas
    const alertsRequest = new NextRequest('http://localhost:3000/api/read/alerts?limit=10', {
      method: 'GET'
    })

    const alertsResponse = await alertsHandler(alertsRequest)
    const alertsData = await alertsResponse.json()

    expect(alertsResponse.status).toBe(200)
    expect(alertsData.alerts).toBeDefined()
    expect(alertsData.pagination).toBeDefined()

    // Probar endpoint de oportunidades
    const oppsRequest = new NextRequest('http://localhost:3000/api/read/opportunities?type=all', {
      method: 'GET'
    })

    const oppsResponse = await opportunitiesHandler(oppsRequest)
    const oppsData = await oppsResponse.json()

    expect(oppsResponse.status).toBe(200)
    expect(oppsData.opportunities).toBeDefined()
  })
})