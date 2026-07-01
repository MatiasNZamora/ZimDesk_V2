import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

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
  const result = await requireAccess('departments', 'write')
  if (result instanceof NextResponse) return result

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
