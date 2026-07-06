import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasModulePerm } from '@/lib/permissions'
import { z } from 'zod'

const updateSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  active:       z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
})

function canWrite(role: string, session: any): boolean {
  if (role === 'admin') return true
  if (role === 'operador') return hasModulePerm(session, 'recepciones', 'write')
  return false
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canWrite(session.user.role, session))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  try {
    const updated = await prisma.receptionCategory.update({
      where: { id: Number(params.id) },
      data: parsed.data,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (e.code === 'P2002') return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    await prisma.receptionCategory.delete({ where: { id: Number(params.id) } })
    return NextResponse.json({ message: 'Eliminada' })
  } catch (e: any) {
    if (e.code === 'P2025') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (e.code === 'P2003') return NextResponse.json({ error: 'Tiene recepciones asociadas' }, { status: 409 })
    throw e
  }
}
