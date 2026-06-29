import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const field = formData.get('field') as string | null // 'logo' | 'favicon'

  if (!file || !file.size) {
    return NextResponse.json({ error: 'No se recibió archivo' }, { status: 422 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Usá PNG, JPG, SVG o ICO.' }, { status: 422 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo no puede superar los 2 MB.' }, { status: 422 })
  }
  if (!['logo', 'favicon'].includes(field ?? '')) {
    return NextResponse.json({ error: 'Campo inválido' }, { status: 422 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const dir = path.join(process.cwd(), 'public', 'uploads', 'branding')
  await mkdir(dir, { recursive: true })

  const filename = `${field}-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(path.join(dir, filename), Buffer.from(bytes))

  return NextResponse.json({ url: `/uploads/branding/${filename}` })
}
