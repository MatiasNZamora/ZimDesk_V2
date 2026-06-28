import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// vi.resetModules() en beforeEach garantiza que el Map interno (store) empieza vacío
describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite solicitudes por debajo del límite', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    expect(rateLimit('k1', { maxRequests: 3, windowMs: 60_000 })).toBe(true)
    expect(rateLimit('k1', { maxRequests: 3, windowMs: 60_000 })).toBe(true)
    expect(rateLimit('k1', { maxRequests: 3, windowMs: 60_000 })).toBe(true)
  })

  it('bloquea cuando se supera el límite', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    rateLimit('k1', { maxRequests: 2, windowMs: 60_000 })
    rateLimit('k1', { maxRequests: 2, windowMs: 60_000 })
    expect(rateLimit('k1', { maxRequests: 2, windowMs: 60_000 })).toBe(false)
  })

  it('permite exactamente maxRequests solicitudes, luego bloquea', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    const results = Array.from({ length: 7 }, () =>
      rateLimit('k1', { maxRequests: 4, windowMs: 60_000 })
    )
    expect(results.filter(Boolean)).toHaveLength(4)
    expect(results.filter(r => !r)).toHaveLength(3)
  })

  it('llaves distintas son independientes entre sí', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    rateLimit('user:1', { maxRequests: 1, windowMs: 60_000 })
    // user:1 está bloqueado
    expect(rateLimit('user:1', { maxRequests: 1, windowMs: 60_000 })).toBe(false)
    // user:2 no está afectado
    expect(rateLimit('user:2', { maxRequests: 1, windowMs: 60_000 })).toBe(true)
  })

  it('resetea el contador cuando expira la ventana de tiempo', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    rateLimit('k1', { maxRequests: 2, windowMs: 30_000 })
    rateLimit('k1', { maxRequests: 2, windowMs: 30_000 })
    expect(rateLimit('k1', { maxRequests: 2, windowMs: 30_000 })).toBe(false)

    vi.advanceTimersByTime(31_000) // avanzar 31 segundos

    expect(rateLimit('k1', { maxRequests: 2, windowMs: 30_000 })).toBe(true)
  })

  it('diferentes ventanas de tiempo son independientes', async () => {
    const { rateLimit } = await import('@/lib/rateLimit')
    // Key con ventana de 1 minuto
    rateLimit('minute', { maxRequests: 1, windowMs: 60_000 })
    expect(rateLimit('minute', { maxRequests: 1, windowMs: 60_000 })).toBe(false)

    // Avanzar 30s — insuficiente para 1min pero el key es diferente
    vi.advanceTimersByTime(30_000)

    // Key con ventana de 10 segundos — ya debería haberse reseteado
    rateLimit('tensec', { maxRequests: 1, windowMs: 10_000 })
    vi.advanceTimersByTime(11_000)
    expect(rateLimit('tensec', { maxRequests: 1, windowMs: 10_000 })).toBe(true)
  })
})

describe('getClientIp', () => {
  beforeEach(() => vi.resetModules())

  it('extrae la primera IP de x-forwarded-for', async () => {
    const { getClientIp } = await import('@/lib/rateLimit')
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1, 172.16.0.1' },
    })
    expect(getClientIp(req)).toBe('203.0.113.1')
  })

  it('devuelve "unknown" cuando no hay header de IP', async () => {
    const { getClientIp } = await import('@/lib/rateLimit')
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })

  it('maneja x-forwarded-for con una sola IP', async () => {
    const { getClientIp } = await import('@/lib/rateLimit')
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.100' },
    })
    expect(getClientIp(req)).toBe('192.168.1.100')
  })
})
