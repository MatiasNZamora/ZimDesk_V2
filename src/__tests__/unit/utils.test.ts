import { describe, it, expect } from 'vitest'
import { cn, escapeHtml, formatMinutes } from '@/lib/utils'

describe('cn — class name merger', () => {
  it('une clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('omite valores falsy', () => {
    expect(cn('base', false && 'skip', undefined, null as any, 'keep')).toBe('base keep')
  })

  it('resuelve conflictos de Tailwind (última clase gana)', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toContain('px-4')
    expect(result).not.toContain('px-2')
  })

  it('acepta objetos condicionales', () => {
    const result = cn({ active: true, inactive: false })
    expect(result).toContain('active')
    expect(result).not.toContain('inactive')
  })

  it('retorna string vacío sin argumentos', () => {
    expect(cn()).toBe('')
  })

  it('maneja arrays de clases', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

describe('escapeHtml', () => {
  it('escapa ampersand &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapa corchetes angulares < y >', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('escapa comillas dobles "', () => {
    expect(escapeHtml('"hola"')).toBe('&quot;hola&quot;')
  })

  it('escapa comillas simples \'', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s")
  })

  it('escapa un payload XSS completo', () => {
    const payload = '<script>alert("xss")</script>'
    const result  = escapeHtml(payload)
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;script&gt;')
    expect(result).toContain('&quot;')
  })

  it('no modifica texto seguro', () => {
    expect(escapeHtml('texto normal 123 ñoño')).toBe('texto normal 123 ñoño')
  })

  it('maneja string vacío', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('formatMinutes', () => {
  it('muestra solo minutos cuando es menor a 60', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(1)).toBe('1m')
    expect(formatMinutes(59)).toBe('59m')
  })

  it('muestra exactamente 1h cuando es 60 minutos', () => {
    expect(formatMinutes(60)).toBe('1h')
  })

  it('muestra horas y minutos cuando hay resto', () => {
    expect(formatMinutes(61)).toBe('1h 1m')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(75)).toBe('1h 15m')
  })

  it('muestra solo horas cuando no hay resto', () => {
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(180)).toBe('3h')
  })

  it('maneja valores grandes correctamente', () => {
    expect(formatMinutes(1440)).toBe('24h')   // 1 día
    expect(formatMinutes(1441)).toBe('24h 1m')
  })
})
