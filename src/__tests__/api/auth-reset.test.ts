import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const db = vi.hoisted(() => ({
  user: { update: vi.fn() },
  passwordResetToken: {
    findUnique: vi.fn(),
    delete:     vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$hashed$') },
  hash:     vi.fn().mockResolvedValue('$hashed$'),
}))

import { POST } from '@/app/api/auth/reset-password/route'

const VALID_TOKEN  = 'a'.repeat(64)
const FUTURE_DATE  = new Date(Date.now() + 3_600_000)
const EXPIRED_DATE = new Date(Date.now() - 1_000)

function req(body: object) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg)
      return arg(db)
    })
    db.user.update.mockResolvedValue({ id: 1 })
    db.passwordResetToken.delete.mockResolvedValue({})
  })

  it('retorna ok:true con token válido y contraseña correcta', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: 1, token: VALID_TOKEN, userId: 1, expiresAt: FUTURE_DATE, user: { id: 1 },
    })

    const res  = await POST(req({ token: VALID_TOKEN, password: 'nueva123' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('actualiza la contraseña del usuario correcto', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: 1, token: VALID_TOKEN, userId: 42, expiresAt: FUTURE_DATE, user: { id: 42 },
    })

    await POST(req({ token: VALID_TOKEN, password: 'nuevaPass99' }))

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data:  { password: '$hashed$' },
    })
  })

  it('retorna 400 cuando el token no existe en la DB', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue(null)

    const res = await POST(req({ token: 'tokeninexistente', password: 'pass123' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 cuando el token expiró y lo elimina', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: 9, token: VALID_TOKEN, userId: 1, expiresAt: EXPIRED_DATE, user: { id: 1 },
    })

    const res = await POST(req({ token: VALID_TOKEN, password: 'pass123' }))

    expect(res.status).toBe(400)
    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 9 } })
  })

  it('retorna 422 cuando falta el token', async () => {
    const res = await POST(req({ password: 'pass123' }))
    expect(res.status).toBe(422)
  })

  it('retorna 422 cuando la contraseña tiene menos de 6 caracteres', async () => {
    const res = await POST(req({ token: VALID_TOKEN, password: '12345' }))
    expect(res.status).toBe(422)
  })

  it('retorna 422 cuando ambos campos están ausentes', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(422)
  })

  it('elimina el token tras un restablecimiento exitoso (uso único)', async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: 3, token: VALID_TOKEN, userId: 1, expiresAt: FUTURE_DATE, user: { id: 1 },
    })

    await POST(req({ token: VALID_TOKEN, password: 'nuevaPass!' }))

    expect(db.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: 3 } })
  })
})
