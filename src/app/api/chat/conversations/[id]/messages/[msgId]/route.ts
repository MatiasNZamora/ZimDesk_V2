import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; msgId: string }> }

// DELETE — admin elimina mensaje (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  }

  const { msgId } = await params
  await prisma.chatMessage.update({
    where: { id: Number(msgId) },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}

// PATCH — pin/unpin de mensaje (creador del grupo o admin)
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, msgId } = await params
  const userId = Number(session.user.id)
  const { pinned } = await req.json()

  const conv = await prisma.chatConversation.findUnique({
    where: { id: Number(id) },
    select: { createdById: true, type: true },
  })
  if (conv?.type !== 'group') return NextResponse.json({ error: 'Solo en grupos' }, { status: 422 })
  if (conv.createdById !== userId && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await prisma.chatMessage.update({ where: { id: Number(msgId) }, data: { pinned: Boolean(pinned) } })
  if (pinned) {
    await prisma.chatConversation.update({ where: { id: Number(id) }, data: { pinnedMsgId: Number(msgId) } })
  } else {
    await prisma.chatConversation.update({ where: { id: Number(id) }, data: { pinnedMsgId: null } })
  }
  return NextResponse.json({ ok: true })
}
