import { vi } from 'vitest'

/**
 * Crea un mock completo de PrismaClient.
 * - Soporta tanto prisma.$transaction([...]) como prisma.$transaction(fn).
 * - Cada método es un vi.fn() reiniciable con vi.clearAllMocks().
 */
export function createPrismaMock() {
  const mock: any = {
    ticket: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      updateMany: vi.fn(),
      count:      vi.fn(),
      groupBy:    vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      update:     vi.fn(),
    },
    status:   { findUnique: vi.fn() },
    priority: { findUnique: vi.fn() },
    category: { findUnique: vi.fn() },
    ticketMessage:     { create: vi.fn() },
    attachmentTicket:  { create: vi.fn() },
    attachmentMessage: { create: vi.fn() },
    notification: {
      create:     vi.fn(),
      findMany:   vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    log: {
      create:   vi.fn(),
      findMany: vi.fn(),
      count:    vi.fn(),
    },
    passwordResetToken: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      delete:     vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }

  // Por defecto: ejecuta el callback con el propio mock (forma de callback)
  // o ejecuta todas las promesas en paralelo (forma de array)
  mock.$transaction.mockImplementation(async (arg: any) => {
    if (Array.isArray(arg)) return Promise.all(arg)
    return arg(mock)
  })

  return mock
}

/** Sesión de prueba por defecto, sobreescribible por campo */
export function makeSession(overrides: Record<string, any> = {}) {
  return {
    user: {
      id:           '1',
      name:         'Admin Test',
      email:        'admin@zimtech.com.ar',
      role:         'admin',
      avatar:       null,
      departmentId: 1,
      tokenVersion: 0,
      ...overrides,
    },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

/** NextRequest con body JSON */
export function jsonRequest(url: string, method: string, body: object, extraHeaders: Record<string, string> = {}) {
  return new Request(url, {
    method,
    body:    JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...extraHeaders },
  })
}
