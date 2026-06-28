import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const norm = await prisma.platformNorm.findFirst()
  return NextResponse.json(norm ?? { content: '' })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { content } = await req.json()
  const existing = await prisma.platformNorm.findFirst()
  const norm = existing
    ? await prisma.platformNorm.update({ where: { id: existing.id }, data: { content } })
    : await prisma.platformNorm.create({ data: { content } })
  return NextResponse.json(norm)
}
