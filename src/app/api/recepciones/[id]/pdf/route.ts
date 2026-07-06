import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasModulePerm } from '@/lib/permissions'
import { buildReceptionHtml } from '@/lib/receptionPdf'

function canAccess(role: string, session: any): boolean {
  if (role === 'admin' || role === 'agent' || role === 'gerente') return true
  if (role === 'operador') return hasModulePerm(session, 'recepciones', 'read')
  return false
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccess(session.user.role, session))
    return new NextResponse('No autorizado', { status: 401 })

  const reception = await prisma.equipmentReception.findUnique({
    where: { id: Number(params.id), deletedAt: null },
    include: {
      estructura:  true,
      department:  true,
      responsible: true,
      category:    true,
    },
  })
  if (!reception) return new NextResponse('No encontrado', { status: 404 })

  const branding = await prisma.appConfig.findMany({
    where: { key: { in: ['app_name', 'logo_url', 'phone', 'address', 'email'] } },
  })
  const cfg = Object.fromEntries(branding.map(r => [r.key, r.value]))

  const html = buildReceptionHtml(reception as any, cfg, true)
  const download = req.nextUrl.searchParams.get('download') === '1'

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': download
        ? `attachment; filename="recepcion-${reception.orderNumber}.html"`
        : 'inline',
    },
  })
}
