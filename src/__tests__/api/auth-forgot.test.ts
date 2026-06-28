import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSession } from '../helpers/mocks'

// vi.hoisted: sin imports externos, solo vi.fn() inline
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  passwordResetToken: {
    create:     vi.fn(),
    delete:     vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma',    () => ({ prisma: db }))
vi.mock('@/lib/mail',      () => ({ sendMail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit:   vi.fn().mockReturnValue(true),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

import { POST } from '@/app/api/auth/forgot-password/route'
import { rateLimit } from '@/lib/rateLimit'

function req(body: object) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rateLimit).mockReturnValue(true)
  })

  it('retorna ok:true cuando el usuario existe y crea el token', async () => {
    db.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com', name: 'Test' })
    db.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 })
    db.passwordResetToken.create.mockResolvedValue({ token: 'abc', userId: 1 })

    const res  = await POST(req({ email: 'test@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(db.passwordResetToken.create).toHaveBeenCalledOnce()
  })

  it('retorna ok:true cuando el usuario NO existe (no revela existencia de emails)', async () => {
    db.user.findUnique.mockResolvedValue(null)

    const res  = await POST(req({ email: 'inexistente@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(db.passwordResetToken.create).not.toHaveBeenCalled()
  })

  it('retorna ok:true cuando el rate limit está activo (no revela el límite)', async () => {
    vi.mocked(rateLimit).mockReturnValue(false)

    const res  = await POST(req({ email: 'any@example.com' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it('retorna 422 cuando el email está ausente en el body', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(422)
  })

  it('retorna 422 cuando el email no es string', async () => {
    const res = await POST(req({ email: 123 }))
    expect(res.status).toBe(422)
  })

  it('invalida tokens anteriores antes de crear uno nuevo', async () => {
    db.user.findUnique.mockResolvedValue({ id: 5, email: 'u@test.com', name: 'U' })
    db.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 })
    db.passwordResetToken.create.mockResolvedValue({})

    await POST(req({ email: 'u@test.com' }))

    expect(db.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 5 } })
  })

  it('normaliza el email a minúsculas y sin espacios', async () => {
    db.user.findUnique.mockResolvedValue(null)

    await POST(req({ email: '  ADMIN@Example.COM  ' }))

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    })
  })
})
