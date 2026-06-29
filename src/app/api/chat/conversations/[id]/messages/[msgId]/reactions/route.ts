import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

type Params = { params: Promise<{ id: string; msgId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { msgId } = await params
  const userId = Number(session.user.id)
  const { emoji } = await req.json()

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Emoji no permitido' }, { status: 422 })
  }

  const messageId = Number(msgId)

  // Toggle: si existe la elimina, si no la crea
  const existing = await prisma.chatReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  })

  if (existing) {
    await prisma.chatReaction.delete({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    })
    return NextResponse.json({ action: 'removed' })
  }

  await prisma.chatReaction.create({ data: { messageId, userId, emoji } })
  return NextResponse.json({ action: 'added' })
}
