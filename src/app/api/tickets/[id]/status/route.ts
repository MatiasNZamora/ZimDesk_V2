import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ACTION_SLUG: Record<string, string> = {
  cerrar:          'cerrado',
  reabrir:         'abierto',
  cancelar:        'cancelado',
  marcar_resuelto: 'resuelto',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { action } = await req.json()
  const targetSlug = ACTION_SLUG[action]
  if (!targetSlug) return NextResponse.json({ error: 'Acción inválida' }, { status: 422 })

  const role   = session.user.role
  const userId = Number(session.user.id)

  const ticket = await prisma.ticket.findUnique({
    where:   { id: Number(params.id) },
    include: { status: true, creator: true, agent: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (action === 'cerrar'          && !['admin', 'agent'].includes(role)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (action === 'marcar_resuelto' && role !== 'admin')                   return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (action === 'cancelar'        && role !== 'admin')                   return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  if (action === 'reabrir'         && !['admin', 'client'].includes(role)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const targetStatus = await prisma.status.findUnique({ where: { slug: targetSlug } })
  if (!targetStatus) return NextResponse.json({ error: `Estado "${targetSlug}" no existe` }, { status: 500 })

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data:  { statusId: targetStatus.id },
    include: { status: true },
  })

  const actionLabel: Record<string, string> = {
    cerrar:          'cerró',
    reabrir:         'reabrió',
    cancelar:        'canceló',
    marcar_resuelto: 'marcó como resuelto',
  }
  const userName = session.user.name ?? 'Usuario'
  await prisma.log.create({
    data: { ticketId: ticket.id, userId, action: `${userName} ${actionLabel[action]} el ticket.` },
  })

  const notifyUserId = role === 'client' ? ticket.assignedTo : ticket.userId
  if (notifyUserId) {
    const msgMap: Record<string, string> = {
      cerrar:          `El ticket #${ticket.id} fue cerrado.`,
      reabrir:         `El ticket #${ticket.id} fue reabierto.`,
      cancelar:        `El ticket #${ticket.id} fue cancelado.`,
      marcar_resuelto: `El ticket #${ticket.id} fue marcado como resuelto.`,
    }
    prisma.notification.create({
      data: { userId: notifyUserId, type: 'status_change', ticketId: ticket.id, message: msgMap[action] },
    }).catch(console.error)
  }

  return NextResponse.json(updated)
}
