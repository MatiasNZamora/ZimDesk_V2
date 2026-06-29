import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  const userId = Number(session.user.id)
  const handle = q.startsWith('@') ? q.slice(1) : q

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      active: true,
      OR: [
        { chatHandle: { contains: handle, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      chatHandle: true,
      avatar: true,
      role: true,
      lastSeen: true,
      department: { select: { name: true, estructura: { select: { name: true } } } },
    },
    take: 10,
  })

  return NextResponse.json(users)
}
