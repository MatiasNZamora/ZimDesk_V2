import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('No autorizado', { status: 401 })

  const userId = Number(session.user.id)
  const encoder = new TextEncoder()
  let lastChecked = new Date()

  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat para mantener la conexión
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('data: {"type":"ping"}\n\n'))
        } catch {
          clearInterval(heartbeat)
          clearInterval(poll)
        }
      }, 25_000)

      // Poll de notificaciones cada 10 segundos
      const poll = setInterval(async () => {
        try {
          const newNotifs = await prisma.notification.findMany({
            where: { userId, createdAt: { gt: lastChecked }, read: false },
            orderBy: { createdAt: 'asc' },
          })

          if (newNotifs.length > 0) {
            lastChecked = new Date()
            for (const n of newNotifs) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(n)}\n\n`))
            }
          }
        } catch {
          clearInterval(heartbeat)
          clearInterval(poll)
        }
      }, 10_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clearInterval(poll)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
