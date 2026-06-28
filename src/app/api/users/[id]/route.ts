import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, password, role, departmentId } = body
  const targetId = Number(params.id)

  const current = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, departmentId: true },
  })
  if (!current) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const updateData: any = { name, email, role, departmentId: Number(departmentId) }
  if (password) updateData.password = await bcrypt.hash(password, 10)

  // Si cambió el rol o el departamento, incrementar tokenVersion para invalidar la sesión activa
  const roleChanged = role && role !== current.role
  const deptChanged = departmentId && Number(departmentId) !== current.departmentId
  if (roleChanged || deptChanged) {
    updateData.tokenVersion = { increment: 1 }
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (Number(params.id) === Number(session.user.id)) {
    return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 })
  }
  await prisma.user.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
