import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: ['app_name', 'logo_url', 'favicon_url'] } },
  })
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return NextResponse.json(cfg)
}
