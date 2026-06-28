'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { PlusCircle, Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['admin', 'agent', 'client']),
  departmentId: z.coerce.number().int().positive('Seleccioná un departamento'),
})
type FormValues = z.infer<typeof schema>

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => axios.get('/api/users', { params: { page, search, perPage: 25 } }).then(r => r.data),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => axios.get('/api/departments').then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    setEditing(null)
    reset({ name: '', email: '', password: '', role: 'client', departmentId: 0 })
    setModalOpen(true)
  }

  function openEdit(user: any) {
    setEditing(user)
    reset({ name: user.name, email: user.email, password: '', role: user.role, departmentId: user.department?.id })
    setModalOpen(true)
  }

  const save = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = { ...data, ...(data.password === '' ? { password: undefined } : {}) }
      return editing
        ? axios.put(`/api/users/${editing.id}`, payload)
        : axios.post('/api/users', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setDeleteId(null)
      toast.success('Usuario eliminado')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Usuarios</h1>
        <button onClick={openCreate} className="btn-primary btn-sm">
          <PlusCircle size={15} /> Nuevo Usuario
        </button>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre o email..."
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
        ) : (
          <>
            <div className="table-container border-0 rounded-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Departamento</th>
                    <th>Creado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-slate-400">No hay usuarios</td></tr>
                  )}
                  {data?.data?.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-semibold">
                            {u.name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-500">{u.email}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td className="text-slate-500">{u.department?.name ?? '—'}</td>
                      <td className="text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} className="btn-ghost btn-sm p-1.5">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteId(u.id)} className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">{data?.total ?? 0} usuarios</p>
              <Pagination page={page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
          <div>
            <label className="form-label">Nombre *</label>
            <input {...register('name')} className="form-input" placeholder="Nombre completo" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input {...register('email')} type="email" className="form-input" placeholder="email@empresa.com" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Contraseña {editing ? '(dejar vacío para no cambiar)' : '*'}</label>
            <input {...register('password')} type="password" className="form-input" placeholder="••••••••" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Rol *</label>
              <select {...register('role')} className="form-select">
                <option value="client">Cliente</option>
                <option value="agent">Agente</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Departamento *</label>
              <select {...register('departmentId')} className="form-select">
                <option value="">Seleccionar</option>
                {(departments ?? []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="form-error">{errors.departmentId.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal eliminar */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar Usuario" size="sm">
        <p className="text-slate-600 mb-4">¿Estás seguro de que querés eliminar este usuario? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending} className="btn-danger">
            {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
