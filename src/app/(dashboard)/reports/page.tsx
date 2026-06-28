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

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', agent: 'Agente', client: 'Cliente',
}

function ReportsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Redirigir si no es admin
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, debounced],
    queryFn: () =>
      axios.get('/api/logs', { params: { page, search: debounced, perPage: 50 } }).then(r => r.data),
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

      {/* Buscador */}
      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por acción, usuario o ticket..."
            className="form-input pl-9"
          />
        </div>
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
