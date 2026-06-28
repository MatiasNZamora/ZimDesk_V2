import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSession } from '../helpers/mocks'

const db = vi.hoisted(() => ({
  notification: {
    findMany:   vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('next-auth',    () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth',   () => ({ authOptions: {} }))

import { GET, PATCH } from '@/app/api/notifications/route'
import { getServerSession } from 'next-auth'

const SAMPLE = [
  { id: 1, userId: 1, type: 'new_message',   ticketId: 10, message: 'Respuesta en #10', read: false, createdAt: new Date() },
  { id: 2, userId: 1, type: 'status_change', ticketId: 11, message: 'Ticket #11 cerrado', read: true, createdAt: new Date() },
]

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.notification.findMany.mockResolvedValue(SAMPLE)
  })

  it('retorna 401 sin sesión', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/notifications'))
    expect(res.status).toBe(401)
  })

  it('devuelve las notificaciones del usuario autenticado', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '1' }))
    const res  = await GET(new NextRequest('http://localhost/api/notifications'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
  })

  it('filtra por el userId de la sesión activa', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '7' }))
    await GET(new NextRequest('http://localhost/api/notifications'))

    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) })
    )
  })

  it('limita a las últimas 30 notificaciones', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '1' }))
    await GET(new NextRequest('http://localhost/api/notifications'))

    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 30 })
    )
  })

  it('ordena por fecha descendente', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '1' }))
    await GET(new NextRequest('http://localhost/api/notifications'))

    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    )
  })
})

describe('PATCH /api/notifications', () => {
  function patchReq(body: object) {
    return new NextRequest('http://localhost/api/notifications', {
      method:  'PATCH',
      body:    JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    db.notification.updateMany.mockResolvedValue({ count: 1 })
  })

  it('retorna 401 sin sesión', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await PATCH(patchReq({ id: 1 }))
    expect(res.status).toBe(401)
  })

  it('marca una notificación específica como leída con { id }', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '1' }))
    const res  = await PATCH(patchReq({ id: 5 }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 5, userId: 1 },
      data:  { read: true },
    })
  })

  it('marca todas las notificaciones no leídas con { all: true }', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '1' }))
    const res = await PATCH(patchReq({ all: true }))

    expect(res.status).toBe(200)
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, read: false },
      data:  { read: true },
    })
  })

  it('solo afecta notificaciones del usuario en sesión', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ id: '99' }))
    await PATCH(patchReq({ id: 1 }))

    const call = db.notification.updateMany.mock.calls[0][0]
    expect(call.where.userId).toBe(99)
  })
})
