import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(notifications)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, all } = await req.json()
  const userId = Number(session.user.id)

  if (all) {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  } else if (id) {
    await prisma.notification.updateMany({ where: { id: Number(id), userId }, data: { read: true } })
  }

  return NextResponse.json({ ok: true })
}
