import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STATUSES = [
  { id: 1, name: 'Abierto',               slug: 'abierto' },
  { id: 2, name: 'En Progreso',           slug: 'en_progreso' },
  { id: 3, name: 'En Espera del Cliente', slug: 'en_espera_cliente' },
  { id: 4, name: 'Respuesta del Cliente', slug: 'respuesta_cliente' },
  { id: 5, name: 'Resuelto',              slug: 'resuelto' },
  { id: 6, name: 'Cerrado',               slug: 'cerrado' },
  { id: 7, name: 'Reabierto',             slug: 'reabierto' },
  { id: 8, name: 'Cancelado',             slug: 'cancelado' },
]

const PRIORITIES = [
  { id: 1, name: 'Baja',    slug: 'baja',    color: '#22c55e' },
  { id: 2, name: 'Media',   slug: 'media',   color: '#facc15' },
  { id: 3, name: 'Alta',    slug: 'alta',    color: '#f97316' },
  { id: 4, name: 'Urgente', slug: 'urgente', color: '#ef4444' },
]

async function main() {
  console.log('Bootstrap de producción — catálogos mínimos + admin inicial')

  const estructura = await prisma.estructura.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: process.env.BOOTSTRAP_ORG_NAME ?? 'ZimTech' },
  })

  const department = await prisma.department.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: process.env.BOOTSTRAP_DEPT_NAME ?? 'General', estructuraId: estructura.id },
  })

  for (const s of STATUSES) {
    await prisma.status.upsert({ where: { id: s.id }, update: {}, create: s })
  }

  for (const p of PRIORITIES) {
    await prisma.priority.upsert({ where: { id: p.id }, update: {}, create: p })
  }

  await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Soporte Técnico' },
  })

  await prisma.receptionCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'General' },
  })

  console.log(`Catálogos listos (estructura=${estructura.id}, departamento=${department.id}).`)

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } })
  if (existingAdmin) {
    console.log(`Ya existe un admin (${existingAdmin.email}) — no se toca.`)
  } else {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_PASSWORD
    if (!email || !password || password.length < 12) {
      throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD (>=12 caracteres) son obligatorios para crear el primer admin.')
    }
    const hash = await bcrypt.hash(password, 10)
    const admin = await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME ?? 'Administrador',
        email,
        password: hash,
        role: 'admin',
        departmentId: department.id,
      },
    })
    console.log(`Admin creado: ${admin.email} (id=${admin.id}).`)
  }

  console.log('Bootstrap completado.')
}

main()
  .catch((e) => {
    console.error('Bootstrap falló:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
