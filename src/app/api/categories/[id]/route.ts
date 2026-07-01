import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('categories', 'write')
  if (result instanceof NextResponse) return result
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })
  const data = await prisma.category.update({ where: { id: Number(params.id) }, data: { name: name.trim() } })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('categories', 'write')
  if (result instanceof NextResponse) return result
  await prisma.category.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
