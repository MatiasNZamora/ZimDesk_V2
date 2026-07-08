'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PlusCircle, Loader2, FileText, Trash2, Eye, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'

type TechnicalReport = {
  id: number
  reportNumber: string
  title: string
  status: string
  priority: string
  technicianName: string
  clientName: string | null
  equipmentName: string | null
  createdAt: string
  reception: { id: number; orderNumber: string; brand: string | null; model: string | null; estructura: { name: string } | null } | null
  ticket: { id: number; subject: string } | null
  createdBy: { id: number; name: string }
}

const PRIORITY_STYLES: Record<string, string> = {
  Alta:   'bg-red-100 text-red-700',
  Media:  'bg-yellow-100 text-yellow-700',
  Baja:   'bg-green-100 text-green-700',
}

export default function InformesPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const canDelete = role === 'admin'

  const [search,   setSearch]   = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['informes'],
    queryFn: () => axios.get('/api/informes?limit=200').then(r => r.data.data as TechnicalReport[]),
  })

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.toLowerCase()
    if (!q) return data
    return data.filter(r =>
      r.reportNumber.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.technicianName.toLowerCase().includes(q) ||
      r.clientName?.toLowerCase().includes(q) ||
      r.reception?.estructura?.name.toLowerCase().includes(q) ||
      r.ticket?.subject.toLowerCase().includes(q)
    )
  }, [data, search])

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/informes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['informes'] }); setDeleteId(null); toast.success('Informe eliminado') },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al eliminar'),
  })

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  function getClientDisplay(r: TechnicalReport) {
    if (r.reception?.estructura?.name) return r.reception.estructura.name
    if (r.clientName) return r.clientName
    return '—'
  }

  function getEquipmentDisplay(r: TechnicalReport) {
    if (r.reception) return [r.reception.brand, r.reception.model].filter(Boolean).join(' ') || '—'
    if (r.equipmentName) return r.equipmentName
    if (r.ticket) return r.ticket.subject
    return '—'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Informes Técnicos</h1>
        <Link href="/informes/nuevo" className="btn-primary btn-sm flex items-center gap-1.5">
          <PlusCircle size={15} /> Nuevo Informe
        </Link>
      </div>

      <div className="flex gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número, título, cliente, técnico..."
          className="form-input flex-1"
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>N.º</th>
                <th>Título</th>
                <th>Cliente / Equipo</th>
                <th>Técnico</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/informes/${r.id}`} className="font-mono font-semibold text-indigo-600 hover:underline text-sm">
                      {r.reportNumber}
                    </Link>
                  </td>
                  <td className="text-sm font-medium max-w-xs truncate">{r.title}</td>
                  <td>
                    <div className="text-sm font-medium">{getClientDisplay(r)}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[160px]">{getEquipmentDisplay(r)}</div>
                  </td>
                  <td className="text-sm">{r.technicianName}</td>
                  <td>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="text-sm text-slate-600">{r.status}</td>
                  <td className="text-sm text-slate-500">{fmt(r.createdAt)}</td>
                  <td className="whitespace-nowrap">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                        className="btn-secondary btn-sm flex items-center gap-1.5"
                      >
                        Acciones <ChevronDown size={13} />
                      </button>
                      {openMenu === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-48">
                            <Link
                              href={`/informes/${r.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Eye size={13} /> Ver informe
                            </Link>
                            <a
                              href={`/api/informes/${r.id}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setOpenMenu(null)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileText size={13} /> Ver PDF
                            </a>
                            {canDelete && (
                              <button
                                onClick={() => { setDeleteId(r.id); setOpenMenu(null) }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <Trash2 size={13} /> Eliminar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Sin informes</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar Informe" size="sm">
        <p className="text-slate-600 mb-4">¿Eliminás este informe técnico? La acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending} className="btn-danger">
            {remove.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
