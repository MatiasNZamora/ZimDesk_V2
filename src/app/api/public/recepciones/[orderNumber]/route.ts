import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  const ip = getClientIp(req)
  if (!rateLimit(`public:recepcion:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 }))
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const reception = await prisma.equipmentReception.findUnique({
    where: { orderNumber: params.orderNumber.toUpperCase(), deletedAt: null },
    select: {
      orderNumber: true,
      brand:       true,
      model:       true,
      condition:   true,
      status:      true,
      intakeDate:  true,
      observations: true,
      category:    { select: { name: true } },
    },
  })

  if (!reception) return NextResponse.json({ error: 'Número de orden no encontrado' }, { status: 404 })

  return NextResponse.json(reception)
}
