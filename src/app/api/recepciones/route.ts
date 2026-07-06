import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasModulePerm } from '@/lib/permissions'
import { z } from 'zod'


const createSchema = z.object({
  estructuraId:    z.coerce.number().int().positive(),
  departmentId:    z.coerce.number().int().positive().optional(),
  condition:       z.enum(['NUEVO', 'BUENO', 'REGULAR', 'DANADO']),
  intakeDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signatureBase64: z.string().min(10),
  responsibleId:   z.coerce.number().int().positive().optional(),
  brand:           z.string().max(100).optional(),
  model:           z.string().max(100).optional(),
  categoryId:      z.coerce.number().int().positive().optional(),
  observations:    z.string().optional(),
  contactName:     z.string().max(150).optional(),
  contactPhone:    z.string().max(50).optional(),
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page          = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit         = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))
  const status        = searchParams.get('status') ?? undefined
  const estructuraId  = searchParams.get('estructuraId') ? Number(searchParams.get('estructuraId')) : undefined
  const responsibleId = searchParams.get('responsibleId') ? Number(searchParams.get('responsibleId')) : undefined
  const search        = searchParams.get('search') ?? ''

  const where: any = { deletedAt: null }
  if (status)        where.status        = status
  if (estructuraId)  where.estructuraId  = estructuraId
  if (responsibleId) where.responsibleId = responsibleId
  if (search) {
    where.OR = [
      { orderNumber:  { contains: search, mode: 'insensitive' } },
      { brand:        { contains: search, mode: 'insensitive' } },
      { model:        { contains: search, mode: 'insensitive' } },
      { estructura:   { name: { contains: search, mode: 'insensitive' } } },
      { department:   { name: { contains: search, mode: 'insensitive' } } },
      { responsible:  { name: { contains: search, mode: 'insensitive' } } },
      { category:     { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.equipmentReception.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.equipmentReception.count({ where }),
  ])

  return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
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

  const {
    estructuraId, departmentId, condition, intakeDate, signatureBase64,
    brand, model, categoryId, observations, contactName, contactPhone,
  } = parsed.data

  // Responsable: siempre el usuario logueado, salvo que sea admin y envíe otro
  const responsibleId = session.user.role === 'admin' && parsed.data.responsibleId
    ? parsed.data.responsibleId
    : Number(session.user.id)

  const estructura = await prisma.estructura.findUnique({ where: { id: estructuraId } })
  if (!estructura)
    return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 400 })

  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!dept || dept.estructuraId !== estructuraId)
      return NextResponse.json({ error: 'Departamento no pertenece a la estructura' }, { status: 400 })
  }

  // Número de orden atómico
  const counterResult = await prisma.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "ReceptionOrderCounter" (id, "lastNumber") VALUES (1, 1)
    ON CONFLICT (id) DO UPDATE SET "lastNumber" = "ReceptionOrderCounter"."lastNumber" + 1
    RETURNING "lastNumber"
  `
  const orderNumber = `REC-${String(counterResult[0].lastNumber).padStart(4, '0')}`

  const reception = await prisma.equipmentReception.create({
    data: {
      orderNumber,
      estructuraId,
      departmentId:  departmentId  || null,
      responsibleId,
      condition,
      intakeDate:    new Date(intakeDate),
      signatureBase64,
      brand:         brand         || null,
      model:         model         || null,
      categoryId:    categoryId    || null,
      observations:  observations  || null,
      contactName:   contactName   || null,
      contactPhone:  contactPhone  || null,
      status:        'RECIBIDO',
    },
    include: INCLUDE,
  })

  return NextResponse.json(reception, { status: 201 })
}
