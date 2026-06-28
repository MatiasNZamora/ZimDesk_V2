import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(params.id) },
    include: {
      creator: { include: { department: { include: { estructura: true } } } },
      agent: { select: { id: true, name: true, email: true, avatar: true } },
      status: true,
      priority: true,
      category: true,
      attachments: true,
      messages: {
        include: {
          user: { select: { id: true, name: true, role: true, avatar: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      logs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const userId = Number(session.user.id)
  const role   = session.user.role

  if (role === 'client' && ticket.userId !== userId) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  if (role === 'agent' && ticket.assignedTo !== userId) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  return NextResponse.json(ticket)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { assignedTo, priorityId } = body

  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(params.id) },
    include: { status: true },
  })
  if (!ticket) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const updateData: any = {
    assignedTo: assignedTo !== undefined ? (assignedTo || null) : ticket.assignedTo,
    priorityId: priorityId ?? ticket.priorityId,
  }

  // Solo avanzar a en_progreso cuando se asigna agente a un ticket todavía 'abierto'
  if (assignedTo && ticket.status.slug === 'abierto') {
    const inProgressStatus = await prisma.status.findUnique({ where: { slug: 'en_progreso' } })
    if (inProgressStatus) updateData.statusId = inProgressStatus.id
  }

  const updated = await prisma.ticket.update({
    where: { id: Number(params.id) },
    data: updateData,
    include: {
      creator: true,
      agent: true,
      priority: true,
      status: true,
    },
  })

  const userName = session.user.name ?? 'Admin'

  if (assignedTo !== ticket.assignedTo) {
    const msg = assignedTo
      ? `${userName} asignó el ticket al agente ${updated.agent?.name}.`
      : `${userName} desasignó el agente del ticket.`
    await prisma.log.create({ data: { ticketId: updated.id, userId: Number(session.user.id), action: msg } })

    if (assignedTo) {
      prisma.notification.create({
        data: {
          userId:   assignedTo,
          type:     'ticket_assigned',
          ticketId: updated.id,
          message:  `Se te asignó el ticket #${updated.id}.`,
        },
      }).catch(console.error)
    }
  }

  if (priorityId && priorityId !== ticket.priorityId) {
    const [oldP, newP] = await Promise.all([
      prisma.priority.findUnique({ where: { id: ticket.priorityId } }),
      prisma.priority.findUnique({ where: { id: priorityId } }),
    ])
    await prisma.log.create({
      data: {
        ticketId: updated.id,
        userId: Number(session.user.id),
        action: `${userName} cambió la prioridad de "${oldP?.name}" a "${newP?.name}".`,
      },
    })
  }

  return NextResponse.json(updated)
}
