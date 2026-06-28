'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Loader2, Download, AlertTriangle, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { PriorityBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, timeAgo } from '@/lib/utils'
import type { TicketWithRelations, PaginatedResponse } from '@/types'

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shrink-0 ${color}`}>
      {initials}
    </span>
  )
}

function TicketsContent() {
  const { data: session } = useSession()
  const searchParamsObj = useSearchParams()
  const router = useRouter()
  const role = session?.user?.role

  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityId, setPriorityId] = useState('')

  // Debounce: esperar 350ms antes de disparar la query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Vista: puede venir de la URL (?view=gestion) o calcularse del rol
  const viewFromUrl = searchParamsObj.get('view')
  const defaultView = role === 'agent' ? 'asignados' : role === 'admin' ? 'gestion' : 'mine'
  const view = viewFromUrl ?? defaultView

  const { data, isLoading } = useQuery<PaginatedResponse<TicketWithRelations>>({
    queryKey: ['tickets', page, debouncedSearch, statusFilter, priorityId, view],
    queryFn: () => {
      const isGroup = statusFilter === 'en_proceso'
      return axios.get('/api/tickets', {
        params: {
          page,
          search: debouncedSearch,
          statusId:    isGroup ? undefined : (statusFilter || undefined),
          statusGroup: isGroup ? 'en_proceso' : undefined,
          priorityId:  priorityId || undefined,
          view,
          perPage: 25,
        },
      }).then(r => r.data)
    },
  })

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => axios.get('/api/statuses').then(r => r.data),
  })

  const { data: priorities } = useQuery({
    queryKey: ['priorities'],
    queryFn: () => axios.get('/api/priorities').then(r => r.data),
  })

  const pageTitle =
    view === 'conformidad' ? 'Conformidad'
    : role === 'admin' ? 'Gestión de Tickets'
    : role === 'agent' ? 'Mis Tickets Asignados'
    : 'Mis Tickets'

  // Columnas dinámicas según rol
  const colCount = 6 + (role !== 'client' ? 1 : 0) + (role === 'admin' ? 1 : 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(role === 'admin' || role === 'agent') && (
            <a
              href={`/api/tickets/export?view=${view}${statusFilter === 'en_proceso' ? '&statusGroup=en_proceso' : statusFilter ? `&statusId=${statusFilter}` : ''}${priorityId ? `&priorityId=${priorityId}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`}
              className="btn-secondary btn-sm"
              download
            >
              <Download size={14} /> Exportar CSV
            </a>
          )}
          {role === 'client' && (
            <Link href="/tickets/create" className="btn-primary btn-sm">
              <PlusCircle size={15} /> Nuevo Ticket
            </Link>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por ID o asunto..."
            className="form-input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-select sm:w-48"
        >
          <option value="">Todos los estados</option>
          <option value="en_proceso">En Proceso</option>
          {(statuses ?? [])
            .filter((s: any) => ![2, 3, 4].includes(s.id))
            .map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
        </select>
        <select
          value={priorityId}
          onChange={e => { setPriorityId(e.target.value); setPage(1) }}
          className="form-select sm:w-48"
        >
          <option value="">Todas las prioridades</option>
          {(priorities ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-16">#</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    {role !== 'client' && <th>Creador</th>}
                    {role === 'admin' && <th>Agente</th>}
                    <th>Fecha</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Search size={32} className="text-slate-300" />
                          <span>No hay tickets para mostrar</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {data?.data?.map(ticket => (
                    <tr
                      key={ticket.id}
                      onClick={() => router.push(`/tickets/${ticket.id}`)}
                      className="cursor-pointer"
                      style={{ borderLeft: `3px solid ${ticket.priority.color}` }}
                    >
                      <td>
                        <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-mono font-semibold px-2 py-0.5 rounded">
                          #{ticket.id}
                        </span>
                      </td>
                      <td className="max-w-[260px]">
                        <div className="flex items-center gap-2">
                          {ticket.slaAlertedAt && !ticket.firstResponseAt && (
                            <span title="SLA incumplido — sin primera respuesta" className="shrink-0">
                              <AlertTriangle size={13} className="text-amber-500" />
                            </span>
                          )}
                          <span className="font-medium text-slate-800 dark:text-slate-100 truncate" title={ticket.subject}>
                            {ticket.subject}
                          </span>
                        </div>
                      </td>
                      <td>{
                        ['en_progreso', 'en_espera_cliente', 'respuesta_cliente'].includes(ticket.status.slug)
                          ? <StatusBadge slug="en_proceso" name="En Proceso" />
                          : <StatusBadge slug={ticket.status.slug} name={ticket.status.name} />
                      }</td>
                      <td><PriorityBadge name={ticket.priority.name} color={ticket.priority.color} /></td>
                      {role !== 'client' && (
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={ticket.creator.name} />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{ticket.creator.name}</div>
                              {ticket.creator.department?.name && (
                                <div className="text-xs text-slate-400 truncate">
                                  {ticket.creator.department.name}
                                  {ticket.creator.department.estructura?.name && (
                                    <span> · <span className="text-indigo-500">{ticket.creator.department.estructura.name}</span></span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {role === 'admin' && (
                        <td>
                          {ticket.agent ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={ticket.agent.name} />
                              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{ticket.agent.name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                              Sin asignar
                            </span>
                          )}
                        </td>
                      )}
                      <td>
                        <span
                          className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
                          title={formatDate(ticket.createdAt)}
                        >
                          {timeAgo(ticket.createdAt)}
                        </span>
                      </td>
                      <td className="align-middle" onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          <ChevronRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400">
                {data?.total ?? 0} ticket{(data?.total ?? 0) !== 1 ? 's' : ''} encontrado{(data?.total ?? 0) !== 1 ? 's' : ''}
              </p>
              <Pagination
                page={page}
                totalPages={data?.totalPages ?? 1}
                onPage={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>}>
      <TicketsContent />
    </Suspense>
  )
}
