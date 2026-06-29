import { prisma } from './prisma'

export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export async function generateUniqueHandle(name: string, excludeUserId?: number): Promise<string> {
  const base = slugifyHandle(name) || 'usuario'
  let handle = base
  let suffix = 2

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { chatHandle: handle },
      select: { id: true },
    })
    if (!existing || existing.id === excludeUserId) return handle
    handle = `${base}.${suffix++}`
  }
}
