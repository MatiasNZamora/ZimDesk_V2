import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateUniqueHandle } from '@/lib/chatHandle'

const PARTICIPANT_SELECT = {
  id: true,
  userId: true,
  status: true,
  muted: true,
  archived: true,
  lastReadAt: true,
  user: { select: { id: true, name: true, avatar: true, chatHandle: true, lastSeen: true, role: true } },
}

// GET /api/chat/conversations — lista de conversaciones del usuario
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = Number(session.user.id)
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all' // 'all' | 'pending' | 'archived'

  const statusFilter =
    filter === 'pending'  ? ['pending'] :
    filter === 'archived' ? ['active']  :
                            ['active']

  const conversations = await prisma.chatConversation.findMany({
    where: {
      participants: {
        some: {
          userId,
          status: { in: filter === 'pending' ? ['pending'] : ['active'] },
          archived: filter === 'archived' ? true : false,
        },
      },
    },
    include: {
      participants: { select: PARTICIPANT_SELECT },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
          attachments: { select: { id: true, fileName: true, fileType: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Calcular unread por conversación
  const result = await Promise.all(conversations.map(async (conv) => {
    const me = conv.participants.find(p => p.userId === userId)
    const unread = await prisma.chatMessage.count({
      where: {
        conversationId: conv.id,
        senderId: { not: userId },
        deletedAt: null,
        createdAt: { gt: me?.lastReadAt ?? new Date(0) },
      },
    })
    return { ...conv, unreadCount: unread }
  }))

  return NextResponse.json(result)
}

// POST /api/chat/conversations — crear direct o group
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = Number(session.user.id)
  const body = await req.json()
  const { type, targetUserId, name, memberIds, firstMessage } = body

  if (type === 'direct') {
    if (!targetUserId || !firstMessage?.trim()) {
      return NextResponse.json({ error: 'Falta destinatario o mensaje' }, { status: 422 })
    }

    // Verificar si ya existe una conversación direct entre ambos
    const existing = await prisma.chatConversation.findFirst({
      where: {
        type: 'direct',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: Number(targetUserId) } } },
        ],
      },
    })
    if (existing) return NextResponse.json({ error: 'Ya existe una conversación con este usuario', conversationId: existing.id }, { status: 409 })

    const conv = await prisma.$transaction(async (tx) => {
      const c = await tx.chatConversation.create({
        data: {
          type: 'direct',
          createdById: userId,
          participants: {
            create: [
              { userId, status: 'active', joinedAt: new Date() },
              { userId: Number(targetUserId), status: 'pending' },
            ],
          },
        },
      })
      await tx.chatMessage.create({
        data: { conversationId: c.id, senderId: userId, content: firstMessage.trim() },
      })
      // Notificación in-app al destinatario
      const sender = await tx.user.findUnique({ where: { id: userId }, select: { name: true } })
      await tx.notification.create({
        data: {
          userId: Number(targetUserId),
          type: 'chat_request',
          ticketId: 0, // no aplica, usamos 0 como placeholder
          message: `${sender?.name} te envió una solicitud de chat`,
        },
      }).catch(() => null) // si falla por FK, ignorar
      return c
    })
    return NextResponse.json({ conversationId: conv.id }, { status: 201 })
  }

  if (type === 'group') {
    if (!name?.trim() || !Array.isArray(memberIds) || memberIds.length < 1) {
      return NextResponse.json({ error: 'Nombre de grupo y al menos 1 miembro requerido' }, { status: 422 })
    }
    const allMembers = Array.from(new Set([userId, ...memberIds.map(Number)]))
    const conv = await prisma.chatConversation.create({
      data: {
        type: 'group',
        name: name.trim(),
        createdById: userId,
        participants: {
          create: allMembers.map(uid => ({
            userId: uid,
            status: 'active',
            joinedAt: new Date(),
          })),
        },
      },
    })
    if (firstMessage?.trim()) {
      await prisma.chatMessage.create({
        data: { conversationId: conv.id, senderId: userId, content: firstMessage.trim() },
      })
    }
    return NextResponse.json({ conversationId: conv.id }, { status: 201 })
  }

  return NextResponse.json({ error: 'Tipo inválido' }, { status: 422 })
}
