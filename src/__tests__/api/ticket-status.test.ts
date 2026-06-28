import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSession } from '../helpers/mocks'

const db = vi.hoisted(() => ({
  ticket: {
    findUnique: vi.fn(),
    update:     vi.fn(),
  },
  status: { findUnique: vi.fn() },
  log:    { create: vi.fn() },
  notification: { create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('next-auth',    () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth',   () => ({ authOptions: {} }))

import { POST } from '@/app/api/tickets/[id]/status/route'
import { getServerSession } from 'next-auth'

const OPEN_TICKET = {
  id: 1, userId: 10, assignedTo: 20,
  status:  { slug: 'abierto' },
  creator: { id: 10, name: 'Cliente', email: 'c@test.com' },
  agent:   { id: 20, name: 'Agente',  email: 'a@test.com' },
}

function req(action: string) {
  return new NextRequest('http://localhost/api/tickets/1/status', {
    method:  'POST',
    body:    JSON.stringify({ action }),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/tickets/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.ticket.findUnique.mockResolvedValue(OPEN_TICKET)
    db.status.findUnique.mockResolvedValue({ id: 6, slug: 'cerrado', name: 'Cerrado' })
    db.ticket.update.mockResolvedValue({ ...OPEN_TICKET, status: { slug: 'cerrado' } })
    db.log.create.mockResolvedValue({})
    db.notification.create.mockResolvedValue({})
  })

  // ── Autenticación ─────────────────────────────────────────────
  it('retorna 401 sin sesión activa', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await POST(req('cerrar'), { params: { id: '1' } })
    expect(res.status).toBe(401)
  })

  // ── Acción cerrar ─────────────────────────────────────────────
  it('admin puede cerrar un ticket', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin', id: '1' }))
    const res = await POST(req('cerrar'), { params: { id: '1' } })
    expect(res.status).toBe(200)
  })

  it('agente puede cerrar un ticket', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'agent', id: '20' }))
    const res = await POST(req('cerrar'), { params: { id: '1' } })
    expect(res.status).toBe(200)
  })

  it('cliente NO puede cerrar un ticket', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'client', id: '10' }))
    const res = await POST(req('cerrar'), { params: { id: '1' } })
    expect(res.status).toBe(403)
  })

  // ── Acción marcar_resuelto ────────────────────────────────────
  it('solo admin puede marcar como resuelto', async () => {
    db.status.findUnique.mockResolvedValue({ id: 5, slug: 'resuelto', name: 'Resuelto' })
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin' }))
    const res = await POST(req('marcar_resuelto'), { params: { id: '1' } })
    expect(res.status).toBe(200)
  })

  it('agente NO puede marcar como resuelto', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'agent', id: '20' }))
    const res = await POST(req('marcar_resuelto'), { params: { id: '1' } })
    expect(res.status).toBe(403)
  })

  // ── Acción cancelar ───────────────────────────────────────────
  it('solo admin puede cancelar', async () => {
    db.status.findUnique.mockResolvedValue({ id: 8, slug: 'cancelado', name: 'Cancelado' })
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin' }))
    const res = await POST(req('cancelar'), { params: { id: '1' } })
    expect(res.status).toBe(200)
  })

  it('agente NO puede cancelar', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'agent', id: '20' }))
    const res = await POST(req('cancelar'), { params: { id: '1' } })
    expect(res.status).toBe(403)
  })

  // ── Acción reabrir ────────────────────────────────────────────
  it('cliente puede reabrir su propio ticket', async () => {
    db.status.findUnique.mockResolvedValue({ id: 1, slug: 'abierto', name: 'Abierto' })
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'client', id: '10' }))
    const res = await POST(req('reabrir'), { params: { id: '1' } })
    expect(res.status).toBe(200)
  })

  it('agente NO puede reabrir (solo admin y client)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'agent', id: '20' }))
    const res = await POST(req('reabrir'), { params: { id: '1' } })
    expect(res.status).toBe(403)
  })

  // ── Validaciones ──────────────────────────────────────────────
  it('retorna 422 para acción desconocida', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin' }))
    const res = await POST(req('accion_invalida'), { params: { id: '1' } })
    expect(res.status).toBe(422)
  })

  it('retorna 404 cuando el ticket no existe', async () => {
    db.ticket.findUnique.mockResolvedValue(null)
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin' }))
    const res = await POST(req('cerrar'), { params: { id: '999' } })
    expect(res.status).toBe(404)
  })

  // ── Efectos secundarios ───────────────────────────────────────
  it('crea un log de auditoría al cambiar el estado', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin', name: 'Admin Test' }))
    await POST(req('cerrar'), { params: { id: '1' } })
    expect(db.log.create).toHaveBeenCalledOnce()
    expect(db.log.create.mock.calls[0][0].data.action).toContain('cerró')
  })

  it('crea notificación para el usuario afectado', async () => {
    vi.mocked(getServerSession).mockResolvedValue(makeSession({ role: 'admin' }))
    await POST(req('cerrar'), { params: { id: '1' } })
    expect(db.notification.create).toHaveBeenCalled()
  })
})
