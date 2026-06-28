// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, PriorityBadge, RoleBadge } from '@/components/ui/Badge'

describe('StatusBadge', () => {
  it('renderiza el nombre del estado', () => {
    render(<StatusBadge slug="abierto" name="Abierto" />)
    expect(screen.getByText('Abierto')).toBeInTheDocument()
  })

  it('aplica clases de color según el slug', () => {
    const { container } = render(<StatusBadge slug="abierto" name="Abierto" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-amber-100')
    expect(span.className).toContain('text-amber-700')
  })

  it('aplica clases verdes para estado "resuelto"', () => {
    const { container } = render(<StatusBadge slug="resuelto" name="Resuelto" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-green-100')
  })

  it('aplica clases slate para estado "cerrado"', () => {
    const { container } = render(<StatusBadge slug="cerrado" name="Cerrado" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-slate-100')
  })

  it('usa estilos por defecto para slug desconocido', () => {
    const { container } = render(<StatusBadge slug="desconocido" name="Desconocido" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-slate-100')
    expect(span.className).toContain('text-slate-700')
  })

  it('tiene clase base "badge"', () => {
    const { container } = render(<StatusBadge slug="abierto" name="Abierto" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('badge')
  })
})

describe('PriorityBadge', () => {
  it('renderiza el nombre de la prioridad', () => {
    render(<PriorityBadge name="Alta" color="#f97316" />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('aplica el color como style inline', () => {
    const { container } = render(<PriorityBadge name="Urgente" color="#ef4444" />)
    const span = container.firstChild as HTMLElement
    expect(span.style.color).toBe('rgb(239, 68, 68)') // #ef4444 en rgb
  })

  it('aplica fondo semitransparente con el color', () => {
    const { container } = render(<PriorityBadge name="Baja" color="#22c55e" />)
    const span = container.firstChild as HTMLElement
    expect(span.style.backgroundColor).toBeTruthy()
  })
})

describe('RoleBadge', () => {
  it('muestra "Admin" para rol admin', () => {
    render(<RoleBadge role="admin" />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('muestra "Agente" para rol agent', () => {
    render(<RoleBadge role="agent" />)
    expect(screen.getByText('Agente')).toBeInTheDocument()
  })

  it('muestra "Cliente" para rol client', () => {
    render(<RoleBadge role="client" />)
    expect(screen.getByText('Cliente')).toBeInTheDocument()
  })

  it('aplica clases púrpuras para admin', () => {
    const { container } = render(<RoleBadge role="admin" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-purple-100')
  })

  it('aplica clases azules para agent', () => {
    const { container } = render(<RoleBadge role="agent" />)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-blue-100')
  })

  it('renderiza el rol sin procesar cuando es desconocido', () => {
    render(<RoleBadge role="superuser" />)
    expect(screen.getByText('superuser')).toBeInTheDocument()
  })
})
