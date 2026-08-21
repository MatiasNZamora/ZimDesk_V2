import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'client') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const statusId    = searchParams.get('statusId')
  const statusGroup = searchParams.get('statusGroup')
  const priorityId  = searchParams.get('priorityId')
  const agentId     = searchParams.get('agentId')
  const categoryId  = searchParams.get('categoryId')
  const dateFrom    = searchParams.get('dateFrom')
  const dateTo      = searchParams.get('dateTo')
  const slaBreached = searchParams.get('slaBreached') === 'true'
  const search      = searchParams.get('search') ?? ''
  const view        = searchParams.get('view') ?? 'gestion'
  const userId      = Number(session.user.id)
  const role        = session.user.role

  const where: any = {}
  if (role === 'agent') where.assignedTo = userId
  if (role === 'admin' && view === 'conformidad') where.status = { slug: { in: ['resuelto', 'cerrado'] } }
  if (statusGroup === 'en_proceso') where.statusId = { in: [2, 3, 4] }
  else if (statusId) where.statusId = Number(statusId)
  if (priorityId) where.priorityId = Number(priorityId)
  if (agentId) where.assignedTo = Number(agentId)
  if (categoryId) where.categoryId = Number(categoryId)
  if (slaBreached) { where.slaAlertedAt = { not: null }; where.firstResponseAt = null }
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59`)
  }
  if (search) {
    const orConditions: object[] = [{ subject: { contains: search, mode: 'insensitive' } }]
    if (!isNaN(Number(search))) orConditions.push({ id: Number(search) })
    where.OR = orConditions
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      creator:  { include: { department: true } },
      agent:    { select: { name: true } },
      status:   true,
      priority: true,
      category: true,
    },
    orderBy: { id: 'desc' },
    take: 5000,
  })

  const HEADERS = ['ID', 'Asunto', 'Estado', 'Prioridad', 'Categoría', 'Creador', 'Departamento', 'Agente', 'Creado', 'Cerrado']

  function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = tickets.map(t => [
    t.id,
    t.subject,
    t.status.name,
    t.priority.name,
    t.category.name,
    t.creator.name,
    t.creator.department?.name ?? '',
    t.agent?.name ?? 'Sin asignar',
    formatDate(t.createdAt),
    t.closedAt ? formatDate(t.closedAt) : '',
  ].map(escapeCsv).join(','))

  const csv = [HEADERS.join(','), ...rows].join('\r\n')
  const filename = `zimdesk-tickets-${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
