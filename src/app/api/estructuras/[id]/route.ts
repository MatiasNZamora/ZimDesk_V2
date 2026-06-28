import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })

  const estructura = await prisma.estructura.update({
    where: { id: Number(params.id) },
    data: { name: name.trim() },
  })
  return NextResponse.json(estructura)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const count = await prisma.department.count({
    where: { estructuraId: Number(params.id) },
  })
  if (count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${count} departamento${count !== 1 ? 's' : ''} asociado${count !== 1 ? 's' : ''}` },
      { status: 409 },
    )
  }

  await prisma.estructura.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
