import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// POST — agregar miembro(s) a grupo
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)
  const { userIds } = await req.json()

  const conv = await prisma.chatConversation.findUnique({
    where: { id: convId },
    select: { type: true, createdById: true },
  })
  if (!conv || conv.type !== 'group') {
    return NextResponse.json({ error: 'Solo en grupos' }, { status: 422 })
  }

  // Solo participantes activos o admin pueden agregar
  const me = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convId, userId } },
  })
  if ((!me || me.status !== 'active') && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  await prisma.chatParticipant.createMany({
    data: (userIds as number[]).map(uid => ({
      conversationId: convId,
      userId: uid,
      status: 'active',
      joinedAt: new Date(),
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ ok: true })
}
