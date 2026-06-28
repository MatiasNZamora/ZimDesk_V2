import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, currentPassword, newPassword } = await req.json()
  const userId = Number(session.user.id)

  const updateData: any = {}
  if (name) updateData.name = name

  if (newPassword && currentPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json({ error: 'La contraseña actual no es correcta' }, { status: 400 })
    }
    updateData.password = await bcrypt.hash(newPassword, 10)
  }

  await prisma.user.update({ where: { id: userId }, data: updateData })
  return NextResponse.json({ success: true })
}
