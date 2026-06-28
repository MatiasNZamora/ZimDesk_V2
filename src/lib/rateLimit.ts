interface RateLimitRecord {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

// Limpia entradas vencidas cada 10 minutos para evitar memory leak
setInterval(() => {
  const now = Date.now()
  store.forEach((record, key) => {
    if (now > record.resetAt) store.delete(key)
  })
}, 10 * 60 * 1000)

interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

/**
 * Devuelve true si la request está permitida, false si excede el límite.
 * @param key  Identificador único (IP, userId, etc.)
 */
export function rateLimit(key: string, { maxRequests, windowMs }: RateLimitOptions): boolean {
  const now = Date.now()
  const record = store.get(key)

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) return false

  record.count++
  return true
}

export function getClientIp(req: Request): string {
  const forwarded = (req as any).headers?.get?.('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
