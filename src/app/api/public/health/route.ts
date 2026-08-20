import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const headers = { 'Cache-Control': 'no-store, max-age=0' }
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' }, { status: 200, headers })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503, headers })
  }
}
