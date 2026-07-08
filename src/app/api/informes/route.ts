import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const itemSchema   = z.object({ text: z.string() })
const specSchema   = z.object({ component: z.string(), spec: z.string() })
const actionSchema = z.object({ action: z.string(), priority: z.string(), time: z.string(), cost: z.string() })

const createSchema = z.object({
  receptionId:     z.coerce.number().int().positive().optional(),
  ticketId:        z.coerce.number().int().positive().optional(),
  clientName:      z.string().max(200).optional(),
  equipmentName:   z.string().max(200).optional(),
  entryDate:       z.string().optional(),
  title:           z.string().min(3).max(500),
  status:          z.string().min(1),
  priority:        z.string().min(1),
  statusSummary:   z.string().min(1),
  rootCause:       z.string().min(1),
  recommendation:  z.string().min(1),
  caseSummary:     z.string().min(1),
  clientQuote:     z.string().optional(),
  equipmentSpecs:  z.array(specSchema).default([]),
  symptoms:        z.array(itemSchema).default([]),
  procedure:       z.array(itemSchema).default([]),
  findings:        z.array(itemSchema).default([]),
  findingsNote:    z.string().optional(),
  diagnosis:       z.string().min(1),
  technicalRec:    z.string().min(1),
  recActions:      z.array(actionSchema).default([]),
  conclusion:      z.string().min(1),
  technicianName:  z.string().min(1),
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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const limit  = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 100)))

  const where: any = {}
  if (search) {
    where.OR = [
      { reportNumber:  { contains: search, mode: 'insensitive' } },
      { title:         { contains: search, mode: 'insensitive' } },
      { technicianName:{ contains: search, mode: 'insensitive' } },
      { clientName:    { contains: search, mode: 'insensitive' } },
    ]
  }

  const data = await prisma.technicalReport.findMany({
    where,
    include: INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, true))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })

  const d = parsed.data

  const counterResult = await prisma.$queryRaw<{ lastNum: number }[]>`
    INSERT INTO "TechnicalReportCounter" (id, "lastNum") VALUES (1, 1)
    ON CONFLICT (id) DO UPDATE SET "lastNum" = "TechnicalReportCounter"."lastNum" + 1
    RETURNING "lastNum"
  `
  const year  = new Date().getFullYear()
  const num   = String(counterResult[0].lastNum).padStart(4, '0')
  const reportNumber = `IT-${year}-${num}`

  const report = await prisma.technicalReport.create({
    data: {
      reportNumber,
      receptionId:      d.receptionId  ?? null,
      ticketId:         d.ticketId     ?? null,
      createdById:      Number(session.user.id),
      clientName:       d.clientName   || null,
      equipmentName:    d.equipmentName || null,
      entryDate:        d.entryDate ? new Date(d.entryDate) : null,
      title:            d.title,
      status:           d.status,
      priority:         d.priority,
      statusSummary:    d.statusSummary,
      rootCause:        d.rootCause,
      recommendation:   d.recommendation,
      caseSummary:      d.caseSummary,
      clientQuote:      d.clientQuote  || null,
      equipmentSpecs:   d.equipmentSpecs,
      symptoms:         d.symptoms,
      procedure:        d.procedure,
      findings:         d.findings,
      findingsNote:     d.findingsNote || null,
      diagnosis:        d.diagnosis,
      technicalRec:     d.technicalRec,
      recActions:       d.recActions,
      conclusion:       d.conclusion,
      technicianName:   d.technicianName,
      clientLogoBase64: d.clientLogoBase64 || null,
    },
    include: INCLUDE,
  })

  return NextResponse.json(report, { status: 201 })
}
