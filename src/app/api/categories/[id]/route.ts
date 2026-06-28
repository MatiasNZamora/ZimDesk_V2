import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function guard(req?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return null
  return session
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })
  const data = await prisma.category.update({ where: { id: Number(params.id) }, data: { name: name.trim() } })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await guard()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await prisma.category.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
