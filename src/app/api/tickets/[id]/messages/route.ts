import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { sendMail, mailTicketReply } from '@/lib/mail'
import { rateLimit } from '@/lib/rateLimit'
import { ALLOWED_MIME } from '@/lib/utils'
import { sanitizeMessage } from '@/lib/sanitize'
import { getRealMime } from '@/lib/mime'

const MAX_FILE_SIZE = 80 * 1024 * 1024
const MAX_FILES     = 5

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Rate limit: máx 30 mensajes por usuario cada 10 minutos
  const rlKey = `msg:send:${session.user.id}`
  if (!rateLimit(rlKey, { maxRequests: 30, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: 'Demasiados mensajes. Esperá unos minutos.' }, { status: 429 })
  }

  const formData = await req.formData()
  const rawMessage = String(formData.get('message') ?? '').trim()
  if (!rawMessage) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 422 })
  const message = sanitizeMessage(rawMessage)

  const ticketId = Number(params.id)
  const userId   = Number(session.user.id)
  const role     = session.user.role

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { creator: true, agent: true, status: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (role === 'client' && ticket.userId !== userId) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  if (role === 'agent' && ticket.assignedTo !== userId) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // ── Validar y guardar archivos en disco antes de la transacción ──
  const bucketId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const rawFiles = formData.getAll('files') as File[]
  const sizeFiltered = rawFiles
    .filter(f => f.size > 0 && f.size <= MAX_FILE_SIZE)
    .slice(0, MAX_FILES)

  const savedFiles: { filePath: string; fileName: string; fileType: string; fileSize: number; diskPath: string }[] = []

  for (const file of sizeFiltered) {
    const buffer   = Buffer.from(await file.arrayBuffer())
    const realMime = await getRealMime(buffer, file.type)
    if (!realMime || !ALLOWED_MIME.includes(realMime)) continue

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const dir      = path.join(process.cwd(), 'public', 'uploads', 'messages', bucketId)
    await mkdir(dir, { recursive: true })
    const diskPath = path.join(dir, filename)
    await writeFile(diskPath, buffer)
    savedFiles.push({
      filePath: `/uploads/messages/${bucketId}/${filename}`,
      fileName: file.name,
      fileType: realMime,
      fileSize: file.size,
      diskPath,
    })
  }

  // Calcular nuevo estado del ticket
  let newStatusSlug: string | null = null
  const ticketUpdateData: any = {}
  if (['agent', 'admin'].includes(role)) {
    if (!ticket.firstResponseAt) ticketUpdateData.firstResponseAt = new Date()
    newStatusSlug = 'en_espera_cliente'
  } else if (role === 'client') {
    newStatusSlug = 'respuesta_cliente'
  }

  let newStatusId: number | undefined
  if (newStatusSlug) {
    const ns = await prisma.status.findUnique({ where: { slug: newStatusSlug } })
    if (ns) newStatusId = ns.id
  }

  // ── Transacción: mensaje + adjuntos + log + actualización de ticket ──
  let msg: any
  try {
    msg = await prisma.$transaction(async (tx) => {
      const m = await tx.ticketMessage.create({
        data: { ticketId, userId, message },
        include: { user: { select: { id: true, name: true, role: true, avatar: true } }, attachments: true },
      })

      for (const sf of savedFiles) {
        await tx.attachmentMessage.create({
          data: { ticketMessageId: m.id, filePath: sf.filePath, fileType: sf.fileType, fileName: sf.fileName, fileSize: sf.fileSize },
        })
      }

      const updatePayload: any = { ...ticketUpdateData }
      if (newStatusId) updatePayload.statusId = newStatusId
      if (Object.keys(updatePayload).length > 0) {
        await tx.ticket.update({ where: { id: ticketId }, data: updatePayload })
      }

      await tx.log.create({
        data: { ticketId, userId, action: `${session.user.name ?? 'Usuario'} respondió al ticket.` },
      })

      return m
    })
  } catch (err) {
    await Promise.allSettled(savedFiles.map(sf => unlink(sf.diskPath)))
    throw err
  }

  // Notificación en-app al destinatario
  const notifyUserId = ['agent', 'admin'].includes(role) ? ticket.userId : ticket.assignedTo
  if (notifyUserId) {
    const senderLabel = session.user.name ?? 'Usuario'
    prisma.notification.create({
      data: {
        userId:   notifyUserId,
        type:     'new_message',
        ticketId: ticket.id,
        message:  `${senderLabel} respondió en el ticket #${ticket.id}.`,
      },
    }).catch(console.error)
  }

  // Emails fire-and-forget
  const senderName = session.user.name ?? 'Usuario'
  if (['agent', 'admin'].includes(role) && ticket.creator?.email) {
    sendMail({
      to: ticket.creator.email,
      subject: `[ZimDesk] Nueva respuesta en ticket #${ticketId}`,
      html: mailTicketReply(ticket, senderName, message, ticket.creator.name),
    }).catch(console.error)
  } else if (role === 'client' && ticket.agent?.email) {
    sendMail({
      to: ticket.agent.email,
      subject: `[ZimDesk] Cliente respondió en ticket #${ticketId}`,
      html: mailTicketReply(ticket, senderName, message, ticket.agent.name),
    }).catch(console.error)
  }

  return NextResponse.json(msg, { status: 201 })
}
