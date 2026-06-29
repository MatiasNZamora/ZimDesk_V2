import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getRealMime } from '@/lib/mime'
import { ALLOWED_MIME } from '@/lib/utils'

type Params = { params: Promise<{ id: string }> }

const MSG_SELECT = {
  id: true,
  conversationId: true,
  content: true,
  replyToId: true,
  pinned: true,
  deletedAt: true,
  createdAt: true,
  sender: { select: { id: true, name: true, avatar: true, chatHandle: true } },
  replyTo: {
    select: {
      id: true, content: true, deletedAt: true,
      sender: { select: { id: true, name: true } },
      attachments: { select: { id: true, fileName: true, fileType: true } },
    },
  },
  attachments: true,
  reactions: {
    include: { user: { select: { id: true, name: true } } },
  },
  readBy: { select: { userId: true, readAt: true } },
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor') ? Number(searchParams.get('cursor')) : undefined
  const limit = 50

  // Verificar acceso
  const participant = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convId, userId } },
  })
  if (!participant && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId: convId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: MSG_SELECT,
  })

  const hasMore = messages.length > limit
  if (hasMore) messages.pop()

  return NextResponse.json({
    messages: messages.reverse(),
    hasMore,
    nextCursor: hasMore ? messages[0]?.id : null,
  })
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const convId = Number(id)
  const userId = Number(session.user.id)

  const participant = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convId, userId } },
  })
  if (!participant || participant.status !== 'active') {
    return NextResponse.json({ error: 'Sin acceso o conversación no activa' }, { status: 403 })
  }

  const formData = await req.formData()
  const content = (formData.get('content') as string | null)?.trim() || null
  const replyToId = formData.get('replyToId') ? Number(formData.get('replyToId')) : null
  const files = formData.getAll('files') as File[]

  if (!content && files.length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 422 })
  }

  // Procesar archivos
  const savedFiles: { fileName: string; filePath: string; fileType: string; fileSize: number }[] = []
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat', String(convId))
  await mkdir(uploadDir, { recursive: true })

  for (const file of files.slice(0, 5)) {
    if (file.size > 80 * 1024 * 1024) continue
    const bytes = await file.arrayBuffer()
    const buf = Buffer.from(bytes)
    const realMime = await getRealMime(buf, file.type)
    if (!realMime || !ALLOWED_MIME.includes(realMime)) continue

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    await writeFile(path.join(uploadDir, filename), buf)
    savedFiles.push({
      fileName: file.name,
      filePath: `/uploads/chat/${convId}/${filename}`,
      fileType: realMime,
      fileSize: file.size,
    })
  }

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.chatMessage.create({
      data: {
        conversationId: convId,
        senderId: userId,
        content,
        replyToId,
        attachments: savedFiles.length > 0 ? { create: savedFiles } : undefined,
      },
      select: MSG_SELECT,
    })
    // Actualizar updatedAt de la conversación
    await tx.chatConversation.update({ where: { id: convId }, data: { updatedAt: new Date() } })
    return msg
  })

  return NextResponse.json(message, { status: 201 })
}
