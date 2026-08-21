'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PlusCircle, Loader2, MoreHorizontal, FileText, Download, Clipboard, MessageCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge, ConditionBadge, STATUS_OPTIONS, CONDITION_OPTIONS } from '@/components/recepciones/ReceptionBadges'
import { ReceptionDetailModal } from '@/components/recepciones/ReceptionDetailModal'
import { Modal } from '@/components/ui/Modal'
import {
  FilterConfigModal,
  GearFilterButton,
  type FilterDef,
  type FilterValues,
  type FilterVisibility,
} from '@/components/ui/FilterConfigModal'
import { useFilterConfig } from '@/hooks/useFilterConfig'

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
  category: { id: number; name: string } | null
  estructura: { id: number; name: string } | null
  department: { id: number; name: string } | null
  responsible: { id: number; name: string; email: string } | null
  createdAt: string
}

const RECEPCIONES_DEFAULT_VISIBILITY: FilterVisibility = {
  search: true, status: true, condition: true,
  estructuraId: false, categoryId: false, responsibleId: false,
  dateFrom: false, dateTo: false, pendienteEntrega: false,
}

export default function RecepcionesPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const canEdit   = ['admin', 'agent'].includes(role)
  const canDelete = role === 'admin'

  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [condition,  setCondition]  = useState('')
  const [estructuraId,  setEstructuraId]  = useState('')
  const [categoryId,    setCategoryId]    = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [pendienteEntrega, setPendienteEntrega] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [detail,     setDetail]     = useState<Reception | null>(null)
  const [deleteId,   setDeleteId]   = useState<number | null>(null)
  const [openMenu,   setOpenMenu]   = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['recepciones'],
    queryFn: () => axios.get('/api/recepciones?limit=200').then(r => r.data.data as Reception[]),
  })

  const estructuraOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of data ?? []) if (r.estructura) map.set(r.estructura.id, r.estructura.name)
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of data ?? []) if (r.category) map.set(r.category.id, r.category.name)
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  const responsibleOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of data ?? []) if (r.responsible) map.set(r.responsible.id, r.responsible.name)
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  const filterDefs = useMemo<FilterDef[]>(() => [
    { key: 'search', label: 'Búsqueda', type: 'text', defaultValue: '' },
    { key: 'status', label: 'Estado', type: 'select', defaultValue: '', options: STATUS_OPTIONS },
    { key: 'condition', label: 'Condición', type: 'select', defaultValue: '', options: CONDITION_OPTIONS },
    { key: 'estructuraId', label: 'Sucursal', type: 'select', defaultValue: '', options: estructuraOptions },
    { key: 'categoryId', label: 'Categoría', type: 'select', defaultValue: '', options: categoryOptions },
    { key: 'responsibleId', label: 'Responsable', type: 'select', defaultValue: '', options: responsibleOptions },
    { key: 'dateFrom', label: 'Ingreso desde', type: 'date', defaultValue: '' },
    { key: 'dateTo', label: 'Ingreso hasta', type: 'date', defaultValue: '' },
    { key: 'pendienteEntrega', label: 'Pendiente de entrega', type: 'boolean', defaultValue: false },
  ], [estructuraOptions, categoryOptions, responsibleOptions])

  const filterValues: FilterValues = {
    search, status: filterStatus, condition, estructuraId, categoryId, responsibleId,
    dateFrom, dateTo, pendienteEntrega,
  }

  const { visibility, setVisibility, activeFilterCount } = useFilterConfig(
    'recepciones', filterDefs, filterValues, RECEPCIONES_DEFAULT_VISIBILITY,
  )

  const filtered = useMemo(() => {
    if (!data) return []
    const from = dateFrom ? new Date(dateFrom) : null
    const to   = dateTo ? new Date(`${dateTo}T23:59:59`) : null
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
      const matchStatus       = !filterStatus || r.status === filterStatus
      const matchCondition    = !condition || r.condition === condition
      const matchEstructura   = !estructuraId || r.estructura?.id === Number(estructuraId)
      const matchCategory     = !categoryId || r.category?.id === Number(categoryId)
      const matchResponsible  = !responsibleId || r.responsible?.id === Number(responsibleId)
      const intake = new Date(r.intakeDate)
      const matchFrom = !from || intake >= from
      const matchTo   = !to || intake <= to
      const matchPendiente = !pendienteEntrega || r.deliverySignatureBase64 === null
      return matchSearch && matchStatus && matchCondition && matchEstructura &&
        matchCategory && matchResponsible && matchFrom && matchTo && matchPendiente
    })
  }, [data, search, filterStatus, condition, estructuraId, categoryId, responsibleId, dateFrom, dateTo, pendienteEntrega])

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
      <div className="flex gap-3 flex-wrap items-center">
        {visibility.search && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número, equipo, cliente..."
            className="form-input flex-1 min-w-48"
          />
        )}
        {visibility.status && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select w-48">
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        {visibility.condition && (
          <select value={condition} onChange={e => setCondition(e.target.value)} className="form-select w-40">
            <option value="">Todas las condiciones</option>
            {CONDITION_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
        {visibility.estructuraId && (
          <select value={estructuraId} onChange={e => setEstructuraId(e.target.value)} className="form-select w-48">
            <option value="">Todas las sucursales</option>
            {estructuraOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {visibility.categoryId && (
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="form-select w-48">
            <option value="">Todas las categorías</option>
            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {visibility.responsibleId && (
          <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)} className="form-select w-48">
            <option value="">Todos los responsables</option>
            {responsibleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {visibility.dateFrom && (
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input w-40" />
        )}
        {visibility.dateTo && (
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input w-40" />
        )}
        {visibility.pendienteEntrega && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 px-1">
            <input type="checkbox" checked={pendienteEntrega} onChange={e => setPendienteEntrega(e.target.checked)} className="h-4 w-4 accent-indigo-600 rounded" />
            Pendiente de entrega
          </label>
        )}
        <GearFilterButton activeFilterCount={activeFilterCount} onClick={() => setShowFilterModal(true)} />
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

      <FilterConfigModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterDefs={filterDefs}
        values={filterValues}
        visibility={visibility}
        onApply={(newValues, newVisibility) => {
          setSearch(newValues.search as string)
          setFilterStatus(newValues.status as string)
          setCondition(newValues.condition as string)
          setEstructuraId(newValues.estructuraId as string)
          setCategoryId(newValues.categoryId as string)
          setResponsibleId(newValues.responsibleId as string)
          setDateFrom(newValues.dateFrom as string)
          setDateTo(newValues.dateTo as string)
          setPendienteEntrega(newValues.pendienteEntrega as boolean)
          setVisibility(newVisibility)
        }}
      />

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
