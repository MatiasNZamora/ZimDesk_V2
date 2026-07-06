import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const estructuras = await prisma.estructura.findMany({
    orderBy: { name: 'asc' },
    include: {
      departments: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
      _count: { select: { departments: true } },
    },
  })
  return NextResponse.json(estructuras)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Admin, agent y operador con recepciones.write pueden crear estructuras desde el formulario
  const canCreate = ['admin', 'agent'].includes(session.user.role) ||
    (session.user.role === 'operador' && (session.user as any).permissions?.recepciones?.write)
  if (!canCreate) {
    const result = await requireAccess('estructuras', 'write')
    if (result instanceof NextResponse) return result
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })

  try {
    const estructura = await prisma.estructura.create({
      data: { name: name.trim() },
      include: { departments: true },
    })
    return NextResponse.json(estructura, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Ya existe una estructura con ese nombre' }, { status: 409 })
    throw e
  }
}
