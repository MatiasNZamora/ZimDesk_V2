'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Search, Ticket, Users, BarChart2, HelpCircle, FileText, Tag, Building2, Settings, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  action: () => void
  keywords?: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user?.role
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: ticketResults } = useQuery({
    queryKey: ['cmd-tickets', query],
    queryFn: () => axios.get(`/api/tickets?search=${encodeURIComponent(query)}&perPage=5`).then(r => r.data.data),
    enabled: open && query.trim().length >= 2,
    staleTime: 5_000,
  })

  const nav = useCallback((href: string) => { router.push(href); onClose() }, [router, onClose])

  const staticItems: CommandItem[] = [
    { id: 'dashboard',    label: 'Dashboard',            icon: BarChart2,  action: () => nav('/dashboard'),                     keywords: 'inicio home' },
    { id: 'tickets',      label: 'Mis Tickets',          icon: Ticket,     action: () => nav('/tickets'),                       keywords: 'ticket lista' },
    ...(role === 'client' ? [
      { id: 'new-ticket', label: 'Nuevo Ticket',         icon: Ticket,     action: () => nav('/tickets/create'),                keywords: 'crear abrir nuevo' },
    ] : []),
    ...(role === 'admin' ? [
      { id: 'users',       label: 'Usuarios',            icon: Users,      action: () => nav('/users'),                         keywords: 'user gestion' },
      { id: 'departments', label: 'Departamentos',       icon: Building2,  action: () => nav('/departments'),                   keywords: 'dept area' },
      { id: 'categories',  label: 'Categorías',          icon: Tag,        action: () => nav('/categories'),                    keywords: 'cat tag' },
      { id: 'reports',     label: 'Auditoría',           icon: BarChart2,  action: () => nav('/reports'),                       keywords: 'logs audit' },
      { id: 'gestion',     label: 'Gestionar Tickets',   icon: Settings,   action: () => nav('/tickets?view=gestion'),          keywords: 'admin gestión' },
      { id: 'conformidad', label: 'Conformidad',         icon: Settings,   action: () => nav('/tickets?view=conformidad'),      keywords: 'cerrado resuelto' },
    ] : []),
    { id: 'faqs',        label: 'Preguntas Frecuentes',  icon: HelpCircle, action: () => nav('/faqs'),                          keywords: 'faq ayuda help' },
    { id: 'norms',       label: 'Normas de Plataforma',  icon: FileText,   action: () => nav('/platform-norms'),                keywords: 'normas reglas' },
    { id: 'profile',     label: 'Mi Perfil',             icon: Users,      action: () => nav('/profile'),                       keywords: 'perfil cuenta' },
  ]

  const ticketItems: CommandItem[] = (ticketResults ?? []).map((t: any) => ({
    id: `ticket-${t.id}`,
    label: `#${t.id} — ${t.subject}`,
    description: `${t.status.name} · ${t.priority.name}`,
    icon: Hash,
    action: () => nav(`/tickets/${t.id}`),
  }))

  const filtered = query.trim()
    ? [
        ...staticItems.filter(i =>
          i.label.toLowerCase().includes(query.toLowerCase()) ||
          (i.keywords ?? '').toLowerCase().includes(query.toLowerCase())
        ),
        ...ticketItems,
      ]
    : staticItems

  useEffect(() => { setSelected(0) }, [query, open])
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery('') }
  }, [open])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar páginas o tickets..."
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin resultados para "{query}"</p>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelected(idx)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    selected === idx
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    selected === idx ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium truncate', selected === idx ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>
                      {item.label}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-400 truncate">{item.description}</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">↑↓</kbd> navegar</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">↵</kbd> abrir</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
