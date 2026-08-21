'use client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ExternalLink } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  FilterConfigModal,
  GearFilterButton,
  type FilterDef,
  type FilterValues,
  type FilterVisibility,
} from '@/components/ui/FilterConfigModal'
import { useFilterConfig } from '@/hooks/useFilterConfig'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', agent: 'Agente', client: 'Cliente',
}

const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin' },
  { value: 'agent',  label: 'Agente' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'operador', label: 'Operador' },
  { value: 'client', label: 'Cliente' },
]

const AUDITORIA_DEFAULT_VISIBILITY: FilterVisibility = {
  search: true, userRole: false, ticketId: false, dateFrom: false, dateTo: false,
}

const AUDITORIA_FILTER_DEFS: FilterDef[] = [
  { key: 'search', label: 'Búsqueda', type: 'text', defaultValue: '' },
  { key: 'userRole', label: 'Rol del usuario', type: 'select', defaultValue: '', options: ROLE_OPTIONS },
  { key: 'ticketId', label: 'ID de ticket', type: 'text', defaultValue: '' },
  { key: 'dateFrom', label: 'Fecha desde', type: 'date', defaultValue: '' },
  { key: 'dateTo', label: 'Fecha hasta', type: 'date', defaultValue: '' },
]

function ReportsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [debounced, setDebounced] = useState('')
  const [userRole, setUserRole]   = useState('')
  const [ticketId, setTicketId]   = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const filterValues: FilterValues = { search, userRole, ticketId, dateFrom, dateTo }

  const { visibility, setVisibility, activeFilterCount } = useFilterConfig(
    'auditoria', AUDITORIA_FILTER_DEFS, filterValues, AUDITORIA_DEFAULT_VISIBILITY,
  )

  // Redirigir si no es admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, debounced, userRole, ticketId, dateFrom, dateTo],
    queryFn: () =>
      axios.get('/api/logs', {
        params: {
          page, perPage: 50,
          search: debounced || undefined,
          userRole: userRole || undefined,
          ticketId: ticketId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      }).then(r => r.data),
    enabled: session?.user?.role === 'admin',
  })

  if (status === 'loading' || session?.user?.role !== 'admin') {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-600" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Auditoría de Actividad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registro de todas las acciones sobre tickets</p>
        </div>
        {data?.total !== undefined && (
          <span className="text-sm text-slate-500">{data.total.toLocaleString()} registros en total</span>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {visibility.search && (
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por acción, usuario o ticket..."
              className="form-input pl-9"
            />
          </div>
        )}
        {visibility.userRole && (
          <select value={userRole} onChange={e => { setUserRole(e.target.value); setPage(1) }} className="form-select w-44">
            <option value="">Todos los roles</option>
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
        {visibility.ticketId && (
          <input
            value={ticketId}
            onChange={e => { setTicketId(e.target.value); setPage(1) }}
            placeholder="ID de ticket..."
            className="form-input w-36"
          />
        )}
        {visibility.dateFrom && (
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="form-input w-40" />
        )}
        {visibility.dateTo && (
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="form-input w-40" />
        )}
        <GearFilterButton activeFilterCount={activeFilterCount} onClick={() => setShowFilterModal(true)} />
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
                    <th>Fecha</th>
                    <th>Ticket</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(!data?.data || data.data.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        No hay registros para mostrar
                      </td>
                    </tr>
                  )}
                  {data?.data?.map((log: any) => (
                    <tr key={log.id}>
                      <td className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td>
                        <Link
                          href={`/tickets/${log.ticket.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          #{log.ticket.id}
                          <ExternalLink size={11} />
                        </Link>
                        <p className="text-xs text-slate-400 max-w-[160px] truncate">{log.ticket.subject}</p>
                      </td>
                      <td>
                        <p className="text-sm font-medium text-slate-800">{log.user.name}</p>
                        <p className="text-xs text-slate-400">{log.user.email}</p>
                      </td>
                      <td>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          log.user.role === 'admin'  ? 'bg-purple-100 text-purple-700' :
                          log.user.role === 'agent'  ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ROLE_LABEL[log.user.role] ?? log.user.role}
                        </span>
                      </td>
                      <td className="text-sm text-slate-700 max-w-xs">{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                {data?.total ?? 0} registros encontrados
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

      <FilterConfigModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterDefs={AUDITORIA_FILTER_DEFS}
        values={filterValues}
        visibility={visibility}
        onApply={(newValues, newVisibility) => {
          setSearch(newValues.search as string)
          setUserRole(newValues.userRole as string)
          setTicketId(newValues.ticketId as string)
          setDateFrom(newValues.dateFrom as string)
          setDateTo(newValues.dateTo as string)
          setVisibility(newVisibility)
          setPage(1)
        }}
      />
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>}>
      <ReportsContent />
    </Suspense>
  )
}
