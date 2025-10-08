/**
 * Pruebas de integración para el endpoint de datos on-chain (TVL)
 * Valida el procesamiento de datos DeFiLlama y generación de alertas
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import Redis from 'ioredis'

// Import del handler de la API route
import { POST as tvlIngestHandler } from '../src/app/api/ingest/onchain/tvl/route'

// Configuración de Redis para pruebas
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 15 // Base de datos separada para pruebas
})

describe('TVL Data Ingestion Integration', () => {
  beforeEach(async () => {
    // Limpiar Redis antes de cada prueba
    await redis.flushdb()
  })

  afterEach(async () => {
    // Limpiar después de cada prueba
    await redis.flushdb()
  })

  it('should process TVL data and create signals', async () => {
    const mockTVLData = {
      protocol: 'uniswap',
      tvl: 5800000000, // $5.8B
      change24h: -0.125, // -12.5% (debería triggerar alerta)
      timestamp: new Date().toISOString(),
      chain: 'ethereum'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockTVLData)
    })

    const response = await tvlIngestHandler(request)
    const result = await response.json()

    expect(response.status).toBe(201)
    expect(result.success).toBe(true)
    expect(result.signalId).toBeDefined()
    expect(result.alert).toBe(true) // Debería generar alerta por caída > 12%
  })

  it('should detect TVL threshold breaches', async () => {
    const significantDropTVL = {
      protocol: 'compound',
      tvl: 2100000000, // $2.1B
      change24h: -0.15, // -15% (mayor al threshold de -12%)
      timestamp: new Date().toISOString(),
      chain: 'ethereum'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(significantDropTVL)
    })

    const response = await tvlIngestHandler(request)
    const result = await response.json()

    expect(response.status).toBe(201)
    expect(result.alert).toBe(true)
    expect(result.severity).toBe('high')
    expect(result.reason).toContain('TVL drop')
  })

  it('should not create alerts for minor TVL changes', async () => {
    const minorChangeTVL = {
      protocol: 'aave',
      tvl: 8900000000, // $8.9B
      change24h: -0.05, // -5% (menor al threshold)
      timestamp: new Date().toISOString(),
      chain: 'ethereum'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(minorChangeTVL)
    })

    const response = await tvlIngestHandler(request)
    const result = await response.json()

    expect(response.status).toBe(201)
    expect(result.success).toBe(true)
    expect(result.alert).toBe(false)
  })

  it('should prevent duplicate TVL entries', async () => {
    const tvlData = {
      protocol: 'makerdao',
      tvl: 6200000000,
      change24h: -0.08,
      timestamp: new Date().toISOString(),
      chain: 'ethereum'
    }

    const request1 = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tvlData)
    })

    const request2 = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tvlData)
    })

    // Primera inserción
    const response1 = await tvlIngestHandler(request1)
    expect(response1.status).toBe(201)

    // Segunda inserción (duplicada)
    const response2 = await tvlIngestHandler(request2)
    expect(response2.status).toBe(409)
    
    const result2 = await response2.json()
    expect(result2.success).toBe(false)
    expect(result2.error).toContain('Duplicate TVL data')
  })

  it('should handle DeFiLlama adapter integration', async () => {
    // Prueba del adaptador DeFiLlama
    const protocolRequest = {
      protocol: 'curve',
      includeChains: ['ethereum', 'polygon']
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl/defi-llama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(protocolRequest)
    })

    const response = await tvlIngestHandler(request)
    
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.protocol).toBe('curve')
    expect(result.tvlData).toBeDefined()
    expect(Array.isArray(result.chainData)).toBe(true)
  })

  it('should validate TVL data schema', async () => {
    const invalidTVLData = {
      protocol: '', // Protocolo vacío
      tvl: -1000, // TVL negativo - inválido
      change24h: 'invalid', // Debe ser número
      // timestamp faltante
      chain: 123 // Debe ser string
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/onchain/tvl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidTVLData)
    })

    const response = await tvlIngestHandler(request)
    expect(response.status).toBe(400)
    
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('validation')
  })
})