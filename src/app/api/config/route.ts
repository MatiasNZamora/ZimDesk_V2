import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CONFIG_DEFAULTS } from '@/lib/configDefaults'

export async function GET() {
  const rows = await prisma.appConfig.findMany()
  const config: Record<string, string> = { ...CONFIG_DEFAULTS }
  for (const row of rows) config[row.key] = row.value
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const allowed = Object.keys(CONFIG_DEFAULTS)

    const entries = Object.entries(body).filter(([key]) => allowed.includes(key))

    for (const [key, value] of entries) {
      await prisma.appConfig.upsert({
        where:  { key },
        update: { value: String(value ?? '') },
        create: { key, value: String(value ?? '') },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[config POST]', err)
    return NextResponse.json({ error: 'Error al guardar la configuración' }, { status: 500 })
  }
}
