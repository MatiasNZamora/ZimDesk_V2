'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Loader2, Eye, Download, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { PriorityBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import type { TicketWithRelations, PaginatedResponse } from '@/types'

function TicketsContent() {
  const { data: session } = useSession()
  const searchParamsObj = useSearchParams()
  const role = session?.user?.role

  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusId, setStatusId]   = useState('')
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
    queryKey: ['tickets', page, debouncedSearch, statusId, priorityId, view],
    queryFn: () =>
      axios.get('/api/tickets', {
        params: { page, search: debouncedSearch, statusId, priorityId, view, perPage: 25 },
      }).then(r => r.data),
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
  const colCount = 7 + (role !== 'client' ? 1 : 0) + (role === 'admin' ? 1 : 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{pageTitle}</h1>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {(role === 'admin' || role === 'agent') && (
            <a
              href={`/api/tickets/export?view=${view}${statusId ? `&statusId=${statusId}` : ''}${priorityId ? `&priorityId=${priorityId}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`}
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
          value={statusId}
          onChange={e => { setStatusId(e.target.value); setPage(1) }}
          className="form-select sm:w-44"
        >
          <option value="">Todos los estados</option>
          {(statuses ?? []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={priorityId}
          onChange={e => { setPriorityId(e.target.value); setPage(1) }}
          className="form-select sm:w-40"
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
            <div className="table-container border-0 rounded-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Categoría</th>
                    {role !== 'client' && <th>Creador</th>}
                    {role === 'admin' && <th>Agente</th>}
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="text-center py-10 text-slate-400">
                        No hay tickets para mostrar
                      </td>
                    </tr>
                  )}
                  {data?.data?.map(ticket => (
                    <tr key={ticket.id}>
                      <td className="font-mono text-slate-500 text-xs">#{ticket.id}</td>
                      <td className="max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{ticket.subject}</span>
                          {ticket.slaAlertedAt && !ticket.firstResponseAt && (
                            <span title="SLA incumplido — sin primera respuesta">
                              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td><StatusBadge slug={ticket.status.slug} name={ticket.status.name} /></td>
                      <td><PriorityBadge name={ticket.priority.name} color={ticket.priority.color} /></td>
                      <td className="text-slate-600 text-sm">{ticket.category.name}</td>
                      {role !== 'client' && (
                        <td className="text-sm">
                          <div>{ticket.creator.name}</div>
                          <div className="text-xs text-slate-400">{ticket.creator.department?.name}</div>
                        </td>
                      )}
                      {role === 'admin' && (
                        <td className="text-sm text-slate-600">
                          {ticket.agent?.name ?? <span className="text-amber-500 text-xs">Sin asignar</span>}
                        </td>
                      )}
                      <td className="text-xs text-slate-400 whitespace-nowrap">{formatDate(ticket.createdAt)}</td>
                      <td>
                        <Link href={`/tickets/${ticket.id}`} className="btn-ghost btn-sm">
                          <Eye size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
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
