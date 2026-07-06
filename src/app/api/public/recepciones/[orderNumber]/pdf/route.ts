import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildReceptionHtml } from '@/lib/receptionPdf'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  const ip = getClientIp(req)
  if (!rateLimit(`public:pdf:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 }))
    return new NextResponse('Demasiadas solicitudes', { status: 429 })

  const reception = await prisma.equipmentReception.findUnique({
    where: { orderNumber: params.orderNumber.toUpperCase(), deletedAt: null },
    include: { estructura: true, department: true, responsible: true, category: true },
  })
  if (!reception) return new NextResponse('No encontrado', { status: 404 })

  const branding = await prisma.appConfig.findMany({
    where: { key: { in: ['app_name', 'logo_url', 'phone', 'address', 'email'] } },
  })
  const cfg = Object.fromEntries(branding.map(r => [r.key, r.value]))

  const html = buildReceptionHtml(reception as any, cfg, false)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="recepcion-${reception.orderNumber}.html"`,
    },
  })
}
