'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { PlusCircle, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

export default function DepartmentsPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => axios.get('/api/departments').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing
      ? axios.put(`/api/departments/${editing.id}`, { name })
      : axios.post('/api/departments', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] })
      setModalOpen(false)
      toast.success(editing ? 'Departamento actualizado' : 'Departamento creado')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeleteId(null); toast.success('Eliminado') },
    onError: () => toast.error('No se puede eliminar (tiene usuarios asociados)'),
  })

  function openCreate() { setEditing(null); setName(''); setModalOpen(true) }
  function openEdit(d: any) { setEditing(d); setName(d.name); setModalOpen(true) }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Departamentos</h1>
        <button onClick={openCreate} className="btn-primary btn-sm"><PlusCircle size={15} /> Nuevo</button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
        ) : (
          <table className="table">
            <thead><tr><th>Nombre</th><th></th></tr></thead>
            <tbody>
              {(data ?? []).map((d: any) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.name}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(d)} className="btn-ghost btn-sm p-1.5"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(d.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Departamento' : 'Nuevo Departamento'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Ej: IT, Recursos Humanos..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className="btn-primary">
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar Departamento" size="sm">
        <p className="text-slate-600 mb-4">¿Eliminás este departamento?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => remove.mutate(deleteId!)} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}
