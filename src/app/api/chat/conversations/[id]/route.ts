import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)

  const conv = await prisma.chatConversation.findUnique({
    where: { id: convId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true, chatHandle: true, lastSeen: true, role: true } },
        },
      },
    },
  })
  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const isParticipant = conv.participants.some(p => p.userId === userId)
  const isAdmin = session.user.role === 'admin'
  if (!isParticipant && !isAdmin) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  return NextResponse.json(conv)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  }

  const { id } = await params
  await prisma.chatConversation.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)
  const body = await req.json()

  const participant = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convId, userId } },
  })
  if (!participant) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })

  // Actualizar nombre/avatar del grupo (solo creador o admin)
  if (body.name !== undefined || body.avatarUrl !== undefined) {
    const conv = await prisma.chatConversation.findUnique({ where: { id: convId }, select: { createdById: true } })
    if (conv?.createdById !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el creador puede editar el grupo' }, { status: 403 })
    }
    await prisma.chatConversation.update({
      where: { id: convId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
    })
  }

  return NextResponse.json({ ok: true })
}
