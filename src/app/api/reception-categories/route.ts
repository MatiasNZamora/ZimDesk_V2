import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasModulePerm } from '@/lib/permissions'
import { z } from 'zod'

const createSchema = z.object({
  name:         z.string().min(1).max(100),
  active:       z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
})

function canAccess(role: string, session: any, write = false): boolean {
  if (role === 'admin') return true
  if (role === 'agent' && !write) return true
  if (role === 'gerente' && !write) return true
  if (role === 'operador') return hasModulePerm(session, 'recepciones', write ? 'write' : 'read')
  return false
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const onlyActive = req.nextUrl.searchParams.get('active') === 'true'
  const categories = await prisma.receptionCategory.findMany({
    where: onlyActive ? { active: true } : {},
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session, true))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  try {
    const category = await prisma.receptionCategory.create({ data: parsed.data })
    return NextResponse.json(category, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    throw e
  }
}
