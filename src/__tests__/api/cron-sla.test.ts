import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const db = vi.hoisted(() => ({
  ticket: {
    findMany:   vi.fn(),
    updateMany: vi.fn(),
  },
  user: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/mail',   () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))

import { GET } from '@/app/api/cron/sla-alerts/route'

const CRON_SECRET = 'test-cron-secret-123'

const BREACHED_TICKET = {
  id: 1, subject: 'Ticket sin respuesta',
  creator:  { name: 'Cliente', email: 'c@test.com' },
  agent:    null,
  category: { name: 'Soporte' },
  priority: { name: 'Alta' },
}

function reqBearer(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/cron/sla-alerts', { headers })
}

function reqParam(secret?: string) {
  const url = secret
    ? `http://localhost/api/cron/sla-alerts?secret=${secret}`
    : 'http://localhost/api/cron/sla-alerts'
  return new NextRequest(url)
}

describe('GET /api/cron/sla-alerts — autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    db.ticket.findMany.mockResolvedValue([])
  })

  it('retorna 401 sin credenciales', async () => {
    const res = await GET(reqBearer())
    expect(res.status).toBe(401)
  })

  it('retorna 401 con Authorization header incorrecto', async () => {
    const res = await GET(reqBearer('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('retorna 401 con query param incorrecto', async () => {
    const res = await GET(reqParam('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('retorna 200 con Authorization: Bearer correcto (modo Vercel Cron)', async () => {
    const res = await GET(reqBearer(CRON_SECRET))
    expect(res.status).toBe(200)
  })

  it('retorna 200 con ?secret= correcto (modo testing manual)', async () => {
    const res = await GET(reqParam(CRON_SECRET))
    expect(res.status).toBe(200)
  })

  it('retorna 401 cuando CRON_SECRET no está configurado en env', async () => {
    const prev = process.env.CRON_SECRET
    delete process.env.CRON_SECRET
    const res = await GET(reqBearer(CRON_SECRET))
    expect(res.status).toBe(401)
    process.env.CRON_SECRET = prev
  })
})

describe('GET /api/cron/sla-alerts — procesamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    db.ticket.updateMany.mockResolvedValue({ count: 1 })
    db.notification.createMany.mockResolvedValue({ count: 2 })
  })

  it('retorna processed:0 y no actualiza DB cuando no hay tickets con SLA incumplido', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res  = await GET(reqBearer(CRON_SECRET))
    const data = await res.json()

    expect(data.ok).toBe(true)
    expect(data.processed).toBe(0)
    expect(db.ticket.updateMany).not.toHaveBeenCalled()
  })

  it('marca los tickets incumplidos con slaAlertedAt', async () => {
    db.ticket.findMany.mockResolvedValue([BREACHED_TICKET])
    db.user.findMany.mockResolvedValue([{ id: 1, email: 'admin@test.com' }])

    await GET(reqBearer(CRON_SECRET))

    expect(db.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1] } },
      data:  { slaAlertedAt: expect.any(Date) },
    })
  })

  it('crea notificaciones para todos los admins por cada ticket', async () => {
    db.ticket.findMany.mockResolvedValue([BREACHED_TICKET])
    db.user.findMany.mockResolvedValue([
      { id: 1, email: 'admin1@test.com' },
      { id: 2, email: 'admin2@test.com' },
    ])

    await GET(reqBearer(CRON_SECRET))

    expect(db.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 1, type: 'sla_breach', ticketId: 1 }),
        expect.objectContaining({ userId: 2, type: 'sla_breach', ticketId: 1 }),
      ]),
    })
  })

  it('retorna la cantidad correcta de tickets procesados', async () => {
    db.ticket.findMany.mockResolvedValue([BREACHED_TICKET, { ...BREACHED_TICKET, id: 2 }])
    db.user.findMany.mockResolvedValue([{ id: 1, email: 'admin@test.com' }])

    const res  = await GET(reqBearer(CRON_SECRET))
    const data = await res.json()

    expect(data.processed).toBe(2)
    expect(data.tickets).toEqual(expect.arrayContaining([1, 2]))
  })

  it('consulta tickets con umbral de tiempo (createdAt <= ahora - SLA_MINUTES)', async () => {
    // SLA_MINUTES se lee al cargar el módulo; en test usa el default de 120min
    db.ticket.findMany.mockResolvedValue([])

    await GET(reqBearer(CRON_SECRET))

    const callArg = db.ticket.findMany.mock.calls[0][0]
    expect(callArg.where.createdAt.lte).toBeInstanceOf(Date)

    // El threshold debe ser en el pasado (no en el futuro)
    expect((callArg.where.createdAt.lte as Date).getTime()).toBeLessThan(Date.now())
    // Y debe ser hace al menos 1 minuto (asegura que haya algún umbral)
    expect((callArg.where.createdAt.lte as Date).getTime()).toBeLessThan(Date.now() - 60_000)
  })
})
