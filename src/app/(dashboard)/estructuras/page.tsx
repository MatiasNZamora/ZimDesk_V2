'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { PlusCircle, Pencil, Trash2, Loader2, Building2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export default function EstructurasPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['estructuras'],
    queryFn: () => axios.get('/api/estructuras').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing
      ? axios.put(`/api/estructuras/${editing.id}`, { name })
      : axios.post('/api/estructuras', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estructuras'] })
      setModalOpen(false)
      toast.success(editing ? 'Estructura actualizada' : 'Estructura creada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/estructuras/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estructuras'] })
      setDeleteId(null)
      toast.success('Estructura eliminada')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'No se puede eliminar'
      toast.error(msg)
    },
  })

  function openCreate() { setEditing(null); setName(''); setModalOpen(true) }
  function openEdit(e: any) { setEditing(e); setName(e.name); setModalOpen(true) }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">Estructuras</h1>
        </div>
        <button onClick={openCreate} className="btn-primary btn-sm">
          <PlusCircle size={15} /> Nueva
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Las estructuras representan las empresas a las que el equipo brinda soporte. Cada departamento pertenece a una estructura.
      </p>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th className="text-center">Departamentos</th>
                <th>Creada</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    No hay estructuras. Creá la primera.
                  </td>
                </tr>
              )}
              {(data ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
                        <Building2 size={15} />
                      </span>
                      <span className="font-medium text-slate-800">{e.name}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2">
                      {e._count?.departments ?? 0}
                    </span>
                  </td>
                  <td className="text-sm text-slate-500">{formatDate(e.createdAt)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(e)} className="btn-ghost btn-sm p-1.5">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(e.id)}
                        className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Estructura' : 'Nueva Estructura'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre de la empresa *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input"
              placeholder="Ej: Empresa SA, Cliente ABC..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => save.mutate()}
              disabled={!name.trim() || save.isPending}
              className="btn-primary"
            >
              {save.isPending && <Loader2 size={13} className="animate-spin" />}
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar Estructura"
        size="sm"
      >
        <p className="text-slate-600 mb-4">
          ¿Seguro que querés eliminar esta estructura? Solo se puede eliminar si no tiene departamentos asociados.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => remove.mutate(deleteId!)}
            disabled={remove.isPending}
            className="btn-danger"
          >
            {remove.isPending && <Loader2 size={13} className="animate-spin" />}
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
