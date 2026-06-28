import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month   = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
  const year    = Number(searchParams.get('year')  ?? new Date().getFullYear())
  const userId  = Number(session.user.id)
  const role    = session.user.role

  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month, 0, 23, 59, 59, 999)

  const whereBase: any = { createdAt: { gte: start, lte: end } }
  if (role === 'client') whereBase.userId    = userId
  if (role === 'agent')  whereBase.assignedTo = userId

  // ── Conteos por estado, categoría y prioridad usando groupBy (sin cargar filas) ──
  const [byStatus, byCategory, byPriority, statuses, categories, priorities, total] = await Promise.all([
    prisma.ticket.groupBy({ by: ['statusId'],   where: whereBase, _count: { id: true } }),
    prisma.ticket.groupBy({ by: ['categoryId'], where: whereBase, _count: { id: true } }),
    prisma.ticket.groupBy({ by: ['priorityId'], where: whereBase, _count: { id: true } }),
    prisma.status.findMany({ orderBy: { id: 'asc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.priority.findMany({ orderBy: { id: 'asc' } }),
    prisma.ticket.count({ where: whereBase }),
  ])

  const statusCountMap  = Object.fromEntries(byStatus.map(g  => [g.statusId,   g._count.id]))
  const categoryCountMap = Object.fromEntries(byCategory.map(g => [g.categoryId, g._count.id]))
  const priorityCountMap = Object.fromEntries(byPriority.map(g => [g.priorityId, g._count.id]))

  const estados = statuses.map(s => ({
    id: s.id, nombre: s.name, slug: s.slug,
    total: statusCountMap[s.id] ?? 0,
    porcentaje: total > 0 ? Math.round(((statusCountMap[s.id] ?? 0) / total) * 100) : 0,
  }))

  const categoriasData = categories
    .map(c => ({ nombre: c.name, total: categoryCountMap[c.id] ?? 0 }))
    .filter(c => c.total > 0)

  const prioridadesData = priorities
    .map(p => ({ nombre: p.name, color: p.color, total: priorityCountMap[p.id] ?? 0 }))
    .filter(p => p.total > 0)

  const result: Record<string, unknown> = { total, estados, categoriasData, prioridadesData }

  // ── Datos exclusivos de admin ──
  if (role === 'admin') {
    const [byAgent, agentUsers, slaTickets, sinRespuesta] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['assignedTo'],
        where: { ...whereBase, assignedTo: { not: null } },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { role: 'agent' },
        select: { id: true, name: true },
      }),
      // SLA: solo traemos los dos campos de fecha, sin relaciones
      prisma.ticket.findMany({
        where: { ...whereBase, firstResponseAt: { not: null } },
        select: { createdAt: true, firstResponseAt: true },
      }),
      prisma.ticket.count({ where: { ...whereBase, firstResponseAt: null } }),
    ])

    const agentMap = Object.fromEntries(agentUsers.map(u => [u.id, u.name]))
    result.agentesData = byAgent.map(g => ({
      nombre: agentMap[g.assignedTo!] ?? 'Desconocido',
      total:  g._count.id,
    }))

    result.slaPromedioMinutos = slaTickets.length === 0 ? null
      : Math.round(
          slaTickets.reduce((acc, t) =>
            acc + (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / 60000, 0
          ) / slaTickets.length
        )
    result.ticketsSinPrimeraRespuesta = sinRespuesta
  }

  return NextResponse.json(result)
}
