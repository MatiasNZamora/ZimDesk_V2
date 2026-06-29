import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; userId: string }> }

// PATCH — aceptar/rechazar solicitud, silenciar, archivar
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, userId: targetUid } = await params
  const convId = Number(id)
  const targetUserId = Number(targetUid)
  const sessionUserId = Number(session.user.id)

  if (targetUserId !== sessionUserId && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const updateData: any = {}

  if (body.status === 'active') { updateData.status = 'active'; updateData.joinedAt = new Date() }
  if (body.status === 'declined') updateData.status = 'declined'
  if (body.status === 'left') updateData.status = 'left'
  if (typeof body.muted === 'boolean') updateData.muted = body.muted
  if (typeof body.archived === 'boolean') updateData.archived = body.archived

  await prisma.chatParticipant.updateMany({
    where: { conversationId: convId, userId: targetUserId },
    data: updateData,
  })

  return NextResponse.json({ ok: true })
}

// DELETE — salir del grupo / remover miembro
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, userId: targetUid } = await params
  const convId = Number(id)
  const targetUserId = Number(targetUid)
  const sessionUserId = Number(session.user.id)

  const conv = await prisma.chatConversation.findUnique({ where: { id: convId }, select: { createdById: true, type: true } })
  const isSelf = targetUserId === sessionUserId
  const isCreator = conv?.createdById === sessionUserId
  const isAdmin = session.user.role === 'admin'

  if (!isSelf && !isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Sin permiso para remover este miembro' }, { status: 403 })
  }

  await prisma.chatParticipant.updateMany({
    where: { conversationId: convId, userId: targetUserId },
    data: { status: 'left' },
  })

  return NextResponse.json({ ok: true })
}
