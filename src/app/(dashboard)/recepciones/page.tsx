'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PlusCircle, Loader2, MoreHorizontal, FileText, Download, Clipboard, MessageCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge, ConditionBadge, STATUS_OPTIONS } from '@/components/recepciones/ReceptionBadges'
import { ReceptionDetailModal } from '@/components/recepciones/ReceptionDetailModal'
import { Modal } from '@/components/ui/Modal'

type Reception = {
  id: number
  orderNumber: string
  brand: string | null
  model: string | null
  condition: string
  status: string
  intakeDate: string
  signatureBase64: string | null
  deliverySignatureBase64: string | null
  observations: string | null
  contactName: string | null
  contactPhone: string | null
  category: { name: string } | null
  estructura: { id: number; name: string } | null
  department: { id: number; name: string } | null
  responsible: { id: number; name: string; email: string } | null
  createdAt: string
}

export default function RecepcionesPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const canEdit   = ['admin', 'agent'].includes(role)
  const canDelete = role === 'admin'

  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [detail,     setDetail]     = useState<Reception | null>(null)
  const [deleteId,   setDeleteId]   = useState<number | null>(null)
  const [openMenu,   setOpenMenu]   = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['recepciones'],
    queryFn: () => axios.get('/api/recepciones?limit=200').then(r => r.data.data as Reception[]),
  })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q) ||
        r.estructura?.name.toLowerCase().includes(q) ||
        r.department?.name.toLowerCase().includes(q) ||
        r.responsible?.name.toLowerCase().includes(q) ||
        r.category?.name.toLowerCase().includes(q)
      const matchStatus = !filterStatus || r.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [data, search, filterStatus])

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/recepciones/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recepciones'] }); setDeleteId(null); toast.success('Eliminada') },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al eliminar'),
  })

  function copyLink(r: Reception) {
    const url = `${window.location.origin}/seguimiento?pedido=${r.orderNumber}`
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado'))
  }

  function sendWhatsApp(r: Reception) {
    const phone = r.contactPhone?.replace(/\D/g, '')
    if (!phone) { toast.error('El contacto no tiene teléfono registrado'); return }
    const url     = `${window.location.origin}/seguimiento?pedido=${r.orderNumber}`
    const nombre  = r.contactName ?? r.estructura?.name ?? ''
    const message = encodeURIComponent(`Hola${nombre ? ` ${nombre}` : ''}, tu equipo con número de pedido ${r.orderNumber} puede consultarse en: ${url}`)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Recepciones</h1>
        {canEdit && (
          <Link href="/recepciones/nueva" className="btn-primary btn-sm flex items-center gap-1.5">
            <PlusCircle size={15} /> Nueva
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número, equipo, cliente..."
          className="form-input flex-1 min-w-48"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input w-48">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Categoría</th>
                <th>Condición</th>
                <th>Estado</th>
                <th>Ingreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <button onClick={() => setDetail(r)} className="font-mono font-semibold text-indigo-600 hover:underline text-sm">
                      {r.orderNumber}
                    </button>
                  </td>
                  <td>
                    <div className="text-sm font-medium">{r.estructura?.name ?? '—'}</div>
                    {r.department && <div className="text-xs text-slate-400">{r.department.name}</div>}
                  </td>
                  <td className="text-sm">{[r.brand, r.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="text-sm">{r.category?.name ?? '—'}</td>
                  <td><ConditionBadge condition={r.condition} /></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-sm text-slate-500">{fmt(r.intakeDate)}</td>
                  <td>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                        className="btn-ghost btn-sm p-1.5"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-52">
                            <button onClick={() => { setDetail(r); setOpenMenu(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                              <FileText size={13} /> Ver detalle
                            </button>
                            <a href={`/api/recepciones/${r.id}/pdf`} target="_blank" rel="noreferrer" onClick={() => setOpenMenu(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                              <FileText size={13} /> Ver PDF
                            </a>
                            <a href={`/api/recepciones/${r.id}/pdf?download=1`} onClick={() => setOpenMenu(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                              <Download size={13} /> Descargar PDF
                            </a>
                            <button onClick={() => { copyLink(r); setOpenMenu(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                              <Clipboard size={13} /> Copiar link seguimiento
                            </button>
                            <button onClick={() => { sendWhatsApp(r); setOpenMenu(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-green-600">
                              <MessageCircle size={13} /> Enviar por WhatsApp
                            </button>
                            {canDelete && (
                              <button onClick={() => { setDeleteId(r.id); setOpenMenu(null) }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
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
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Sin recepciones</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <ReceptionDetailModal reception={detail} onClose={() => setDetail(null)} canEdit={canEdit} isAdmin={role === 'admin'} />

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar Recepción" size="sm">
        <p className="text-slate-600 mb-4">¿Eliminás esta recepción? La acción no se puede deshacer desde la interfaz.</p>
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
