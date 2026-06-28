import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const estructuras = await prisma.estructura.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { departments: true } } },
  })
  return NextResponse.json(estructuras)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })

  const estructura = await prisma.estructura.create({ data: { name: name.trim() } })
  return NextResponse.json(estructura, { status: 201 })
}
