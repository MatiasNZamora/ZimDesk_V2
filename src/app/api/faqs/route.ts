import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireAccess } from '@/lib/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const data = await prisma.faq.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const result = await requireAccess('faqs', 'write')
  if (result instanceof NextResponse) return result
  const { question, answer } = await req.json()
  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json({ error: 'Pregunta y respuesta son requeridas' }, { status: 422 })
  }
  const data = await prisma.faq.create({ data: { question: question.trim(), answer: answer.trim() } })
  return NextResponse.json(data, { status: 201 })
}
