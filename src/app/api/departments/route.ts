import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const estructuraId = searchParams.get('estructuraId')

  const where: any = {}
  if (estructuraId) where.estructuraId = Number(estructuraId)

  const data = await prisma.department.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { estructura: { select: { id: true, name: true } } },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name, estructuraId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })

  const data = await prisma.department.create({
    data: {
      name: name.trim(),
      ...(estructuraId ? { estructuraId: Number(estructuraId) } : {}),
    },
    include: { estructura: { select: { id: true, name: true } } },
  })
  return NextResponse.json(data, { status: 201 })
}
