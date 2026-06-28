import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null

  if (!file || !file.size) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 422 })
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Usá JPG, PNG, WEBP o GIF.' }, { status: 422 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede superar los 5 MB.' }, { status: 422 })
  }

  const userId = session.user.id
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await mkdir(dir, { recursive: true })

  const filename = `user-${userId}-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(dir, filename), Buffer.from(bytes))

  const avatarUrl = `/uploads/avatars/${filename}`
  await prisma.user.update({
    where: { id: Number(userId) },
    data: { avatar: avatarUrl },
  })

  return NextResponse.json({ avatar: avatarUrl })
}
