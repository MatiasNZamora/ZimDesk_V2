import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'
import { sanitizeMessage } from '@/lib/sanitize'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('platform_norms', 'write')
  if (result instanceof NextResponse) return result
  const { title, content } = await req.json()
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Título y descripción son requeridos' }, { status: 422 })
  }
  const data = await prisma.platformNorm.update({
    where: { id: Number(params.id) },
    data: { title: title.trim(), content: sanitizeMessage(content) },
  })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('platform_norms', 'write')
  if (result instanceof NextResponse) return result
  await prisma.platformNorm.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
