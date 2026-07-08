import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const itemSchema   = z.object({ text: z.string() })
const specSchema   = z.object({ component: z.string(), spec: z.string() })
const actionSchema = z.object({ action: z.string(), priority: z.string(), time: z.string(), cost: z.string() })

const updateSchema = z.object({
  clientName:       z.string().max(200).optional(),
  equipmentName:    z.string().max(200).optional(),
  entryDate:        z.string().optional(),
  title:            z.string().min(3).max(500).optional(),
  status:           z.string().min(1).optional(),
  priority:         z.string().min(1).optional(),
  statusSummary:    z.string().min(1).optional(),
  rootCause:        z.string().min(1).optional(),
  recommendation:   z.string().min(1).optional(),
  caseSummary:      z.string().min(1).optional(),
  clientQuote:      z.string().optional(),
  equipmentSpecs:   z.array(specSchema).optional(),
  symptoms:         z.array(itemSchema).optional(),
  procedure:        z.array(itemSchema).optional(),
  findings:         z.array(itemSchema).optional(),
  findingsNote:     z.string().optional(),
  diagnosis:        z.string().min(1).optional(),
  technicalRec:     z.string().min(1).optional(),
  recActions:       z.array(actionSchema).optional(),
  conclusion:       z.string().min(1).optional(),
  technicianName:   z.string().min(1).optional(),
  clientLogoBase64: z.string().optional(),
})

function canAccess(role: string, write = false): boolean {
  if (role === 'admin') return true
  if (role === 'agent') return true
  if (role === 'gerente' && !write) return true
  return false
}

const INCLUDE = {
  reception: { select: { id: true, orderNumber: true, brand: true, model: true, estructura: { select: { name: true } } } },
  ticket:    { select: { id: true, subject: true } },
  createdBy: { select: { id: true, name: true } },
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const report = await prisma.technicalReport.findUnique({
    where: { id: Number(params.id) },
    include: INCLUDE,
  })
  if (!report) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(report)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, true))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const d = parsed.data
  const update: any = { ...d }
  if (d.entryDate) update.entryDate = new Date(d.entryDate)

  const report = await prisma.technicalReport.update({
    where: { id: Number(params.id) },
    data: update,
    include: INCLUDE,
  })

  return NextResponse.json(report)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await prisma.technicalReport.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
