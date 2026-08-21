import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAccess } from '@/lib/permissions'
import type { OperatorPermissions } from '@/lib/permissionsShared'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'gerente', 'agent', 'client', 'operador']),
  departmentId: z.coerce.number().int().positive(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const roleFilter = searchParams.get('role') ?? ''

  // Cualquier usuario autenticado puede pedir la lista de agentes (dropdown de asignación)
  if (roleFilter === 'agent' && !['admin', 'operador'].includes(session.user.role)) {
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(agents)
  }

  // Lista paginada: admin o operador con users.read
  if (session.user.role !== 'admin') {
    const result = await requireAccess('users', 'read')
    if (result instanceof NextResponse) return result
  }

  // Cuando se pide role=agent sin paginación, devuelve array simple
  if (roleFilter === 'agent' && !searchParams.get('page')) {
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(agents)
  }

  // Dropdown de clientes para el módulo de recepciones (accesible para agent/admin/gerente/operador)
  if (roleFilter === 'client' && !searchParams.get('page') && ['agent', 'admin', 'gerente', 'operador'].includes(session.user.role)) {
    const clientsList = await prisma.user.findMany({
      where: { role: 'client', active: true },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(clientsList)
  }

  // Dropdown de staff (admin+agent+operador) para el responsable de recepción
  if (roleFilter === 'staff' && !searchParams.get('page') && ['agent', 'admin', 'gerente', 'operador'].includes(session.user.role)) {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'agent', 'operador'] }, active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(staff)
  }

  const search = searchParams.get('search') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const perPage = Number(searchParams.get('perPage') ?? 25)
  const activeFilter = searchParams.get('active')
  const estructuraId = searchParams.get('estructuraId')
  const departmentId = searchParams.get('departmentId')

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (roleFilter) where.role = roleFilter
  if (activeFilter === 'true') where.active = true
  else if (activeFilter === 'false') where.active = false
  if (departmentId) where.departmentId = Number(departmentId)
  else if (estructuraId) where.department = { estructuraId: Number(estructuraId) }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        active: true,
        phone: true,
        whatsappKey: true,
        createdAt: true,
        permissions: true,
        department: { select: { id: true, name: true, estructura: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ data, total, page, perPage, totalPages: Math.ceil(total / perPage) })
}

export async function POST(req: NextRequest) {
  const result = await requireAccess('users', 'write')
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const { permissions, ...rest } = body
  const parsed = createSchema.safeParse(rest)
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 })

  const hashed = await bcrypt.hash(parsed.data.password, 10)

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { ...parsed.data, password: hashed },
      select: { id: true, name: true, email: true, role: true },
    })

    if (parsed.data.role === 'operador' && permissions && typeof permissions === 'object') {
      const entries = Object.entries(permissions as OperatorPermissions)
      if (entries.length > 0) {
        await tx.userPermission.createMany({
          data: entries.map(([module, perm]) => ({
            userId: u.id,
            module,
            canRead: perm?.read ?? false,
            canWrite: perm?.write ?? false,
          })),
        })
      }
    }

    return u
  })

  return NextResponse.json(user, { status: 201 })
}
