import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let lastCreatedAt = new Date(0)

  const stream = new ReadableStream({
    async start(controller) {
      async function tick() {
        const rows = await prisma.alert.findMany({
          where: { createdAt: { gt: lastCreatedAt } },
          orderBy: { createdAt: 'asc' },
          take: 50
        })
        for (const r of rows) {
          lastCreatedAt = r.createdAt
          const chunk = `data: ${JSON.stringify({ id: r.id, title: r.title, description: r.description, createdAt: r.createdAt })}\n\n`
          controller.enqueue(encoder.encode(chunk))
        }
      }
      const interval = setInterval(() => { tick().catch(() => {}) }, 2000)
      // Send initial comment to keep connection open
      controller.enqueue(encoder.encode(':ok\n\n'))
      // Cleanup
  // @ts-expect-error AbortSignal is not typed on controller
      controller.signal?.addEventListener('abort', () => clearInterval(interval))
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}
