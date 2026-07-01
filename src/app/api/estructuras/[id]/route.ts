import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('estructuras', 'write')
  if (result instanceof NextResponse) return result

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })

  const estructura = await prisma.estructura.update({
    where: { id: Number(params.id) },
    data: { name: name.trim() },
  })
  return NextResponse.json(estructura)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('estructuras', 'write')
  if (result instanceof NextResponse) return result

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
