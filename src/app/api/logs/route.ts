import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page     = Number(searchParams.get('page') ?? 1)
  const perPage  = Number(searchParams.get('perPage') ?? 50)
  const search   = searchParams.get('search') ?? ''
  const ticketId = searchParams.get('ticketId')

  const where: any = {}
  if (search) {
    where.OR = [
      { action:       { contains: search, mode: 'insensitive' } },
      { user:  { name: { contains: search, mode: 'insensitive' } } },
      { ticket: { subject: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (ticketId) where.ticketId = Number(ticketId)

  const [data, total] = await Promise.all([
    prisma.log.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user:   { select: { id: true, name: true, email: true, role: true } },
        ticket: { select: { id: true, subject: true } },
      },
    }),
    prisma.log.count({ where }),
  ])

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) })
}
