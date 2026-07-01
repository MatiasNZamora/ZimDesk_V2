import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CONFIG_DEFAULTS } from '@/lib/configDefaults'
import { requireAccess } from '@/lib/permissions'

export async function GET() {
  const rows = await prisma.appConfig.findMany()
  const config: Record<string, string> = { ...CONFIG_DEFAULTS }
  for (const row of rows) config[row.key] = row.value
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const result = await requireAccess('settings', 'write')
  if (result instanceof NextResponse) return result

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
