import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasModulePerm } from '@/lib/permissions'
import { z } from 'zod'

const VALID_TRANSITIONS: Record<string, string[]> = {
  RECIBIDO:      ['EN_REVISION'],
  EN_REVISION:   ['EN_REPARACION', 'LISTO'],
  EN_REPARACION: ['LISTO'],
  LISTO:         ['ENTREGADO'],
  ENTREGADO:     [],
}

const updateSchema = z.object({
  status:                  z.enum(['RECIBIDO', 'EN_REVISION', 'EN_REPARACION', 'LISTO', 'ENTREGADO']).optional(),
  deliverySignatureBase64: z.string().min(10).optional(),
  estructuraId:            z.coerce.number().int().positive().optional(),
  departmentId:            z.coerce.number().int().positive().nullable().optional(),
  brand:                   z.string().max(100).optional(),
  model:                   z.string().max(100).optional(),
  categoryId:              z.coerce.number().int().positive().nullable().optional(),
  observations:            z.string().optional(),
  responsibleId:           z.coerce.number().int().positive().optional(),
  contactName:             z.string().max(150).optional(),
  contactPhone:            z.string().max(50).optional(),
})

function canAccess(role: string, session: any, write = false): boolean {
  if (role === 'admin') return true
  if (role === 'agent') return true
  if (role === 'gerente' && !write) return true
  if (role === 'operador') return hasModulePerm(session, 'recepciones', write ? 'write' : 'read')
  return false
}

const INCLUDE = {
  estructura:  true,
  department:  true,
  responsible: { select: { id: true, name: true, email: true } },
  category:    true,
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const reception = await prisma.equipmentReception.findUnique({
    where: { id: Number(params.id), deletedAt: null },
    include: INCLUDE,
  })
  if (!reception) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(reception)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session, true))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const current = await prisma.equipmentReception.findUnique({
    where: { id: Number(params.id), deletedAt: null },
  })
  if (!current) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Solo admin puede reasignar el responsable
  if (parsed.data.responsibleId && session.user.role !== 'admin')
    return NextResponse.json({ error: 'Solo admin puede reasignar el responsable' }, { status: 403 })

  const { status, deliverySignatureBase64, ...rest } = parsed.data

  if (status) {
    const allowed = VALID_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(status))
      return NextResponse.json(
        { error: `Transición inválida: ${current.status} → ${status}` },
        { status: 400 }
      )
    if (status === 'ENTREGADO' && !deliverySignatureBase64)
      return NextResponse.json(
        { error: 'Se requiere firma de entrega para marcar como ENTREGADO' },
        { status: 400 }
      )
  }

  const updated = await prisma.equipmentReception.update({
    where: { id: Number(params.id) },
    data: {
      ...(status                  ? { status }                                             : {}),
      ...(deliverySignatureBase64 ? { deliverySignatureBase64 }                            : {}),
      ...(rest.estructuraId  !== undefined ? { estructuraId:  rest.estructuraId }          : {}),
      ...(rest.departmentId  !== undefined ? { departmentId:  rest.departmentId }          : {}),
      ...(rest.brand         !== undefined ? { brand:         rest.brand  || null }        : {}),
      ...(rest.model         !== undefined ? { model:         rest.model  || null }        : {}),
      ...(rest.categoryId    !== undefined ? { categoryId:    rest.categoryId }            : {}),
      ...(rest.observations  !== undefined ? { observations:  rest.observations  || null } : {}),
      ...(rest.responsibleId !== undefined ? { responsibleId: rest.responsibleId }         : {}),
      ...(rest.contactName   !== undefined ? { contactName:   rest.contactName   || null } : {}),
      ...(rest.contactPhone  !== undefined ? { contactPhone:  rest.contactPhone  || null } : {}),
    },
    include: INCLUDE,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const reception = await prisma.equipmentReception.findUnique({
    where: { id: Number(params.id), deletedAt: null },
  })
  if (!reception) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.equipmentReception.update({
    where: { id: Number(params.id) },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ message: 'Eliminado correctamente' })
}
