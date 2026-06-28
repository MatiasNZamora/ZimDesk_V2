// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/ui/Pagination'

describe('Pagination', () => {
  it('no renderiza nada cuando totalPages es 1', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPage={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('no renderiza nada cuando totalPages es 0', () => {
    const { container } = render(<Pagination page={1} totalPages={0} onPage={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('muestra los botones de navegación cuando hay más de una página', () => {
    render(<Pagination page={1} totalPages={5} onPage={vi.fn()} />)
    // ChevronLeft y ChevronRight son botones
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(2)
  })

  it('botón anterior está deshabilitado en la primera página', () => {
    render(<Pagination page={1} totalPages={5} onPage={vi.fn()} />)
    const [prevBtn] = screen.getAllByRole('button')
    expect(prevBtn).toBeDisabled()
  })

  it('botón siguiente está deshabilitado en la última página', () => {
    render(<Pagination page={5} totalPages={5} onPage={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    const nextBtn = buttons[buttons.length - 1]
    expect(nextBtn).toBeDisabled()
  })

  it('ambos botones están habilitados en una página intermedia', () => {
    render(<Pagination page={3} totalPages={5} onPage={vi.fn()} />)
    const [prevBtn, ...rest] = screen.getAllByRole('button')
    const nextBtn = rest[rest.length - 1]
    expect(prevBtn).not.toBeDisabled()
    expect(nextBtn).not.toBeDisabled()
  })

  it('llama onPage(page-1) al hacer clic en anterior', () => {
    const onPage = vi.fn()
    render(<Pagination page={3} totalPages={5} onPage={onPage} />)
    const [prevBtn] = screen.getAllByRole('button')
    fireEvent.click(prevBtn)
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('llama onPage(page+1) al hacer clic en siguiente', () => {
    const onPage = vi.fn()
    render(<Pagination page={3} totalPages={5} onPage={onPage} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
    expect(onPage).toHaveBeenCalledWith(4)
  })

  it('llama onPage con el número al hacer clic en un botón de página', () => {
    const onPage = vi.fn()
    render(<Pagination page={1} totalPages={3} onPage={onPage} />)
    fireEvent.click(screen.getByText('3'))
    expect(onPage).toHaveBeenCalledWith(3)
  })

  it('siempre muestra la primera y última página', () => {
    render(<Pagination page={5} totalPages={10} onPage={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('muestra "…" (ellipsis) cuando hay páginas omitidas', () => {
    render(<Pagination page={5} totalPages={10} onPage={vi.fn()} />)
    const ellipses = screen.getAllByText('…')
    expect(ellipses.length).toBeGreaterThan(0)
  })

  it('la página actual tiene estilo activo (bg-indigo-600)', () => {
    render(<Pagination page={2} totalPages={5} onPage={vi.fn()} />)
    const activeBtn = screen.getByText('2')
    expect(activeBtn.className).toContain('bg-indigo-600')
  })

  it('páginas no activas no tienen bg-indigo-600', () => {
    render(<Pagination page={2} totalPages={5} onPage={vi.fn()} />)
    const inactiveBtn = screen.getByText('1')
    expect(inactiveBtn.className).not.toContain('bg-indigo-600')
  })
})
