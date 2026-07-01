import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireAccess } from '@/lib/permissions'
import type { OperatorPermissions } from '@/lib/permissionsShared'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('users', 'write')
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const { name, email, password, role, departmentId, phone, whatsappKey, permissions } = body
  const targetId = Number(params.id)

  const current = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true, departmentId: true },
  })
  if (!current) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const updateData: any = { name, email, role, departmentId: Number(departmentId), phone: phone || null, whatsappKey: whatsappKey || null }
  if (password) updateData.password = await bcrypt.hash(password, 10)

  const roleChanged = role && role !== current.role
  const deptChanged = departmentId && Number(departmentId) !== current.departmentId
  if (roleChanged || deptChanged) {
    updateData.tokenVersion = { increment: 1 }
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: targetId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    })

    if (role === 'operador' && permissions && typeof permissions === 'object') {
      await tx.userPermission.deleteMany({ where: { userId: targetId } })
      const entries = Object.entries(permissions as OperatorPermissions)
      if (entries.length > 0) {
        await tx.userPermission.createMany({
          data: entries.map(([module, perm]) => ({
            userId: targetId,
            module,
            canRead: perm?.read ?? false,
            canWrite: perm?.write ?? false,
          })),
        })
      }
    } else if (current.role === 'operador' && role !== 'operador') {
      await tx.userPermission.deleteMany({ where: { userId: targetId } })
    }

    return u
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('users', 'write')
  if (result instanceof NextResponse) return result
  const { session } = result
  const targetId = Number(params.id)
  if (targetId === Number(session.user.id)) {
    return NextResponse.json({ error: 'No podés desactivarte a vos mismo' }, { status: 400 })
  }
  const { active } = await req.json()
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { active: Boolean(active), tokenVersion: { increment: active ? 0 : 1 } },
    select: { id: true, active: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('users', 'write')
  if (result instanceof NextResponse) return result
  const { session } = result
  if (Number(params.id) === Number(session.user.id)) {
    return NextResponse.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 })
  }
  await prisma.user.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
