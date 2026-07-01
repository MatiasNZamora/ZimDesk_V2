import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const data = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const result = await requireAccess('categories', 'write')
  if (result instanceof NextResponse) return result
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 422 })
  const data = await prisma.category.create({ data: { name: name.trim() } })
  return NextResponse.json(data, { status: 201 })
}
