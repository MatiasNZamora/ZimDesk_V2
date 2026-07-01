import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('faqs', 'write')
  if (result instanceof NextResponse) return result
  const { question, answer } = await req.json()
  const data = await prisma.faq.update({ where: { id: Number(params.id) }, data: { question, answer } })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const result = await requireAccess('faqs', 'write')
  if (result instanceof NextResponse) return result
  await prisma.faq.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
