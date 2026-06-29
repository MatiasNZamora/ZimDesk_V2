import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import { sendMail, mailTicketCreated } from '@/lib/mail'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { ALLOWED_MIME } from '@/lib/utils'
import { sanitizeMessage } from '@/lib/sanitize'
import { notifyAdminsWhatsApp } from '@/lib/whatsapp'
import { getRealMime } from '@/lib/mime'
import { z } from 'zod'

const MAX_FILE_SIZE = 80 * 1024 * 1024 // 80 MB
const MAX_FILES     = 5

const createSchema = z.object({
  subject:     z.string().min(3).max(255),
  description: z.string().min(5),
  categoryId:  z.coerce.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page      = Number(searchParams.get('page')     ?? 1)
  const perPage   = Number(searchParams.get('perPage')  ?? 25)
  const statusId    = searchParams.get('statusId')
  const statusGroup = searchParams.get('statusGroup')
  const priorityId  = searchParams.get('priorityId')
  const search    = searchParams.get('search') ?? ''
  const view      = searchParams.get('view')   ?? 'mine'
  const userId    = Number(session.user.id)
  const role      = session.user.role

  const where: any = {}

  if (role === 'client') {
    where.userId = userId
  } else if (role === 'gerente') {
    const estructuraId = session.user.estructuraId
    if (estructuraId) where.creator = { department: { estructuraId } }
  } else if (role === 'agent' && view === 'asignados') {
    where.assignedTo = userId
  } else if (role === 'admin' && view === 'conformidad') {
    where.status = { slug: { in: ['resuelto', 'cerrado'] } }
  }

  if (statusGroup === 'en_proceso') where.statusId = { in: [2, 3, 4] }
  else if (statusId) where.statusId = Number(statusId)
  if (priorityId) where.priorityId = Number(priorityId)
  if (search) {
    const orConditions: object[] = [{ subject: { contains: search, mode: 'insensitive' } }]
    if (!isNaN(Number(search))) orConditions.push({ id: Number(search) })
    where.OR = orConditions
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        creator:  { include: { department: { include: { estructura: true } } } },
        agent:    { select: { id: true, name: true, email: true } },
        status:   true,
        priority: true,
        category: true,
        _count:   { select: { messages: true } },
      },
      orderBy: view === 'gestion'
        ? [{ assignedTo: 'asc' }, { id: 'desc' }]
        : { id: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.ticket.count({ where }),
  ])

  return NextResponse.json({ data: tickets, total, page, perPage, totalPages: Math.ceil(total / perPage) })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'client') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rate limit: máx 10 tickets por usuario por hora
  const rlKey = `ticket:create:${session.user.id}`
  if (!rateLimit(rlKey, { maxRequests: 10, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá de nuevo en una hora.' }, { status: 429 })
  }

  const formData = await req.formData()
  const raw = {
    subject:     formData.get('subject'),
    description: formData.get('description'),
    categoryId:  formData.get('categoryId'),
  }

  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })
  }

  const { subject, categoryId } = parsed.data
  const description = sanitizeMessage(parsed.data.description)
  const userId = Number(session.user.id)

  // ── Validar y persistir archivos en disco ANTES de la transacción ──
  // Usamos un bucketId único para no depender del ticketId (que aún no existe)
  const bucketId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const rawFiles = formData.getAll('files') as File[]
  const sizeFiltered = rawFiles
    .filter(f => f.size > 0 && f.size <= MAX_FILE_SIZE)
    .slice(0, MAX_FILES)

  const savedFiles: { filePath: string; fileName: string; fileType: string; fileSize: number; diskPath: string }[] = []

  for (const file of sizeFiltered) {
    // Leer buffer una sola vez — se usa tanto para validar MIME como para escribir
    const buffer   = Buffer.from(await file.arrayBuffer())
    const realMime = await getRealMime(buffer, file.type)
    if (!realMime || !ALLOWED_MIME.includes(realMime)) continue

    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const dir      = path.join(process.cwd(), 'public', 'uploads', 'tickets', bucketId)
    await mkdir(dir, { recursive: true })
    const diskPath = path.join(dir, filename)
    await writeFile(diskPath, buffer)
    savedFiles.push({
      filePath: `/uploads/tickets/${bucketId}/${filename}`,
      fileName: file.name,
      fileType: realMime,
      fileSize: file.size,
      diskPath,
    })
  }

  // ── Transacción: ticket + adjuntos + log en una sola operación atómica ──
  let ticket: any
  try {
    const [openStatus, lowPriority] = await Promise.all([
      prisma.status.findUnique({ where: { slug: 'abierto' } }),
      prisma.priority.findUnique({ where: { slug: 'baja' } }),
    ])

    ticket = await prisma.$transaction(async (tx) => {
      const t = await tx.ticket.create({
        data: { userId, subject, description, categoryId, statusId: openStatus!.id, priorityId: lowPriority!.id },
        include: { creator: { include: { department: true } }, category: true },
      })

      for (const sf of savedFiles) {
        await tx.attachmentTicket.create({
          data: { ticketId: t.id, filePath: sf.filePath, fileType: sf.fileType, fileName: sf.fileName, fileSize: sf.fileSize },
        })
      }

      await tx.log.create({
        data: { ticketId: t.id, userId, action: `${session.user.name} creó el ticket "${subject}" (#${t.id}).` },
      })

      return t
    })
  } catch (err) {
    // Rollback: eliminar archivos ya escritos en disco
    await Promise.allSettled(savedFiles.map(sf => unlink(sf.diskPath)))
    throw err
  }

  // Email asíncrono — no bloquea la respuesta
  const notifyEmails = (process.env.MAIL_TICKET_NOTIFICATION ?? '').split(',').filter(Boolean)
  if (notifyEmails.length) {
    sendMail({
      to: notifyEmails,
      subject: `[ZimDesk] Nuevo ticket #${ticket.id}: ${subject}`,
      html: mailTicketCreated(ticket as any),
    }).catch(console.error)
  }

  notifyAdminsWhatsApp(
    `🎫 Nuevo ticket #${ticket.id}\n📌 ${subject}\n👤 ${ticket.creator.name}`
  )

  return NextResponse.json({ message: 'Ticket creado exitosamente', id: ticket.id }, { status: 201 })
}
