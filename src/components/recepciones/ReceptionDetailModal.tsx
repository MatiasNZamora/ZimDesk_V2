'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import { FileText, Download, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge, ConditionBadge, VALID_TRANSITIONS, STATUS_OPTIONS } from './ReceptionBadges'
import { SignaturePad } from './SignaturePad'

interface Reception {
  id: number
  orderNumber: string
  brand: string | null
  model: string | null
  condition: string
  status: string
  intakeDate: string
  observations: string | null
  contactName: string | null
  contactPhone: string | null
  signatureBase64: string | null
  deliverySignatureBase64: string | null
  category: { name: string } | null
  estructura: { name: string } | null
  department: { name: string } | null
  responsible: { name: string; email: string } | null
  createdAt: string
}

interface Props {
  reception: Reception | null
  onClose: () => void
  canEdit: boolean
  isAdmin?: boolean
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

export function ReceptionDetailModal({ reception, onClose, canEdit, isAdmin }: Props) {
  const qc = useQueryClient()
  const [newStatus, setNewStatus]               = useState('')
  const [deliverySig, setDeliverySig]           = useState<string | null>(null)

  const update = useMutation({
    mutationFn: (data: any) => axios.patch(`/api/recepciones/${reception!.id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recepciones'] })
      toast.success('Recepción actualizada')
      onClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al actualizar'),
  })

  if (!reception) return null

  const availableTransitions = VALID_TRANSITIONS[reception.status] ?? []
  const needsDeliverySig = newStatus === 'ENTREGADO'
  const canSubmit = newStatus && (!needsDeliverySig || !!deliverySig)

  function handleStatusUpdate() {
    if (!newStatus) return
    update.mutate({ status: newStatus, ...(deliverySig ? { deliverySignatureBase64: deliverySig } : {}) })
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <Modal open={!!reception} onClose={onClose} title={reception.orderNumber} size="lg">
      <div className="space-y-5">
        {/* Header con estado y fecha */}
        <div className="flex items-center gap-3">
          <StatusBadge status={reception.status} />
          <span className="text-xs text-slate-400">Ingreso: {fmt(reception.intakeDate)}</span>
        </div>

        {/* Estructura / Cliente */}
        {reception.estructura && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estructura / Cliente</h3>
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <Field label="Empresa"           value={reception.estructura.name} />
              <Field label="Área / Dpto."      value={reception.department?.name} />
              <Field label="Contacto"          value={reception.contactName} />
              <Field label="Tel. contacto"     value={reception.contactPhone} />
            </div>
          </section>
        )}

        {/* Equipo */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Equipo</h3>
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
            <Field label="Marca"     value={reception.brand} />
            <Field label="Modelo"    value={reception.model} />
            <Field label="Categoría" value={reception.category?.name} />
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Condición</p>
              <ConditionBadge condition={reception.condition} />
            </div>
          </div>
          {reception.observations && (
            <p className="mt-2 text-sm text-slate-600 p-3 bg-amber-50 rounded-lg border border-amber-100">
              {reception.observations}
            </p>
          )}
        </section>

        {/* Responsable */}
        {reception.responsible && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responsable</h3>
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <Field label="Nombre" value={reception.responsible.name} />
              <Field label="Email"  value={reception.responsible.email} />
            </div>
          </section>
        )}

        {/* Firma de ingreso */}
        {reception.signatureBase64 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Firma de ingreso</h3>
            <img src={reception.signatureBase64} alt="Firma" className="max-w-xs border border-slate-200 rounded-lg" />
          </section>
        )}

        {/* Firma de entrega (si existe) */}
        {reception.deliverySignatureBase64 && (
          <section>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Firma de entrega</h3>
            <img src={reception.deliverySignatureBase64} alt="Firma entrega" className="max-w-xs border border-slate-200 rounded-lg" />
          </section>
        )}

        {/* Cambio de estado */}
        {canEdit && availableTransitions.length > 0 && (
          <section className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Actualizar estado</h3>
            <select
              value={newStatus}
              onChange={e => { setNewStatus(e.target.value); setDeliverySig(null) }}
              className="form-input mb-3"
            >
              <option value="">Seleccionar nuevo estado...</option>
              {availableTransitions.map(s => {
                const opt = STATUS_OPTIONS.find(o => o.value === s)
                return <option key={s} value={s}>{opt?.label ?? s}</option>
              })}
            </select>

            {needsDeliverySig && (
              <SignaturePad
                label="Firma de entrega del cliente *"
                onSave={setDeliverySig}
                savedSignature={deliverySig}
              />
            )}

            {newStatus && (
              <button
                onClick={handleStatusUpdate}
                disabled={!canSubmit || update.isPending}
                className="btn-primary btn-sm mt-3"
              >
                {update.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                Actualizar
              </button>
            )}
          </section>
        )}

        {/* Acciones PDF */}
        <div className="flex gap-2 border-t border-slate-100 pt-4">
          <a
            href={`/api/recepciones/${reception.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <FileText size={13} /> Ver PDF
          </a>
          <a
            href={`/api/recepciones/${reception.id}/pdf?download=1`}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <Download size={13} /> Descargar PDF
          </a>
        </div>
      </div>
    </Modal>
  )
}
