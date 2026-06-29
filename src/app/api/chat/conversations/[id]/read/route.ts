import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)
  const now = new Date()

  // Marcar todos los mensajes no leídos del otro como leídos
  const unreadMessages = await prisma.chatMessage.findMany({
    where: {
      conversationId: convId,
      senderId: { not: userId },
      deletedAt: null,
      readBy: { none: { userId } },
    },
    select: { id: true },
  })

  if (unreadMessages.length > 0) {
    await prisma.chatMessageRead.createMany({
      data: unreadMessages.map(m => ({ messageId: m.id, userId, readAt: now })),
      skipDuplicates: true,
    })
  }

  // Actualizar lastReadAt del participante
  await prisma.chatParticipant.updateMany({
    where: { conversationId: convId, userId },
    data: { lastReadAt: now },
  })

  return NextResponse.json({ ok: true, marked: unreadMessages.length })
}
