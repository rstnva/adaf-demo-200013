/**
 * Pruebas de integración para el endpoint de ingesta de noticias
 * Valida el procesamiento completo desde RSS hasta señales
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import Redis from 'ioredis'

// Import del handler de la API route
import { POST as newsIngestHandler } from '../src/app/api/ingest/news/route'

// Configuración de Redis para pruebas
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 15 // Base de datos separada para pruebas
})

describe('News Ingestion Integration', () => {
  beforeEach(async () => {
    // Limpiar Redis antes de cada prueba
    await redis.flushdb()
  })

  afterEach(async () => {
    // Limpiar después de cada prueba
    await redis.flushdb()
  })

  it('should process RSS feed and create signals', async () => {
    const mockNewsItem = {
      title: 'Bitcoin Breaks $50k Resistance Level',
      description: 'Major bullish momentum as Bitcoin surpasses key resistance...',
      link: 'https://example.com/bitcoin-news',
      pubDate: new Date().toISOString(),
      source: 'CryptoNews'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockNewsItem)
    })

    const response = await newsIngestHandler(request)
    const result = await response.json()

    expect(response.status).toBe(201)
    expect(result.success).toBe(true)
    expect(result.signalId).toBeDefined()
    expect(result.fingerprint).toBeDefined()
  })

  it('should detect and prevent duplicate news items', async () => {
    const newsItem = {
      title: 'Ethereum Network Upgrade Scheduled',
      description: 'The next Ethereum update brings improved scalability...',
      link: 'https://example.com/eth-upgrade',
      pubDate: new Date().toISOString(),
      source: 'EthereumDaily'
    }

    const request1 = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsItem)
    })

    const request2 = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsItem)
    })

    // Primera inserción
    const response1 = await newsIngestHandler(request1)
    const result1 = await response1.json()
    expect(response1.status).toBe(201)
    expect(result1.success).toBe(true)

    // Segunda inserción (duplicada)
    const response2 = await newsIngestHandler(request2)
    const result2 = await response2.json()
    expect(response2.status).toBe(409)
    expect(result2.success).toBe(false)
    expect(result2.error).toContain('already exists')
  })

  it('should classify news severity correctly', async () => {
    const criticalNews = {
      title: 'URGENT: Major Exchange Hack Detected',
      description: 'Security breach affects millions of users...',
      link: 'https://example.com/hack-alert',
      pubDate: new Date().toISOString(),
      source: 'SecurityAlert'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criticalNews)
    })

    const response = await newsIngestHandler(request)
    const result = await response.json()

    expect(response.status).toBe(201)
    expect(result.severity).toBe('critical')
  })

  it('should handle RSS adapter integration', async () => {
    // Prueba específica para verificar que el adaptador RSS funciona
    const rssData = {
      feedUrl: 'https://feeds.feedburner.com/CoinDesk',
      source: 'CoinDesk'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/news/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rssData)
    })

    // Este endpoint procesa un feed RSS completo
    const response = await newsIngestHandler(request)
    
    // Puede retornar múltiples señales procesadas
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.processed).toBeGreaterThan(0)
    expect(Array.isArray(result.signals)).toBe(true)
  })

  it('should validate input schema strictly', async () => {
    const invalidNewsItem = {
      title: '', // Título vacío - debe fallar
      description: 'Some description...',
      // Falta link requerido
      pubDate: 'invalid-date',
      source: 'TestSource'
    }

    const request = new NextRequest('http://localhost:3000/api/ingest/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidNewsItem)
    })

    const response = await newsIngestHandler(request)
    expect(response.status).toBe(400)
    
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('validation')
  })
})