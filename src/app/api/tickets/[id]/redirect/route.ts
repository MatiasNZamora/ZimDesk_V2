import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendMail, mailTicketAssigned } from '@/lib/mail'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role   = session.user.role
  const callerId = Number(session.user.id)

  if (!['admin', 'agent'].includes(role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const { toAgentId, reason } = body

  if (!toAgentId || !reason?.trim()) {
    return NextResponse.json({ error: 'Agente destino y motivo son requeridos' }, { status: 400 })
  }

  const ticketId = Number(params.id)

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { status: true },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (['cerrado', 'resuelto', 'cancelado'].includes(ticket.status.slug)) {
    return NextResponse.json({ error: 'No se puede redirigir un ticket cerrado' }, { status: 400 })
  }

  if (role === 'agent' && ticket.assignedTo !== callerId) {
    return NextResponse.json({ error: 'Solo el agente asignado puede redirigir este ticket' }, { status: 403 })
  }

  const newAgent = await prisma.user.findUnique({
    where: { id: Number(toAgentId) },
    select: { id: true, name: true, email: true },
  })

  if (!newAgent || !['admin', 'agent'].includes(
    (await prisma.user.findUnique({ where: { id: Number(toAgentId) }, select: { role: true } }))?.role ?? ''
  )) {
    return NextResponse.json({ error: 'Agente destino no válido' }, { status: 400 })
  }

  const callerName = session.user.name ?? 'Agente'
  const reasonTrimmed = reason.trim()

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedTo: newAgent.id },
    }),
    prisma.log.create({
      data: {
        ticketId,
        userId: callerId,
        action: `${callerName} redirigió el ticket al Agente ${newAgent.name}. Motivo: ${reasonTrimmed}`,
      },
    }),
    prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: callerId,
        type: 'system',
        message: `Redirigido a ${newAgent.name} · Motivo: ${reasonTrimmed}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId:   newAgent.id,
        type:     'ticket_redirected',
        ticketId,
        message:  `${callerName} te redirigió el Ticket #${ticketId}: ${reasonTrimmed}`,
      },
    }),
  ])

  if (newAgent.email) {
    sendMail({
      to: newAgent.email,
      subject: `[ZimDesk] Se te redirigió el ticket #${ticketId}`,
      html: mailTicketAssigned({ id: ticketId, subject: ticket.subject } as any, newAgent.name, true),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
