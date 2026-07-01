'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { PlusCircle, Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { RoleBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { MODULES, MODULE_LABELS, buildPermissionsMap, type OperatorPermissions, type Module } from '@/lib/permissionsShared'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['admin', 'gerente', 'agent', 'client', 'operador']),
  departmentId: z.coerce.number().int().positive('Seleccioná un departamento'),
  phone: z.string().optional().or(z.literal('')),
  whatsappKey: z.string().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof schema>

// ──────────────────────────────────────────────────────────────
// PermissionsGrid — tabla de permisos para rol operador
// ──────────────────────────────────────────────────────────────
function PermissionsGrid({
  value,
  onChange,
}: {
  value: OperatorPermissions
  onChange: (v: OperatorPermissions) => void
}) {
  function toggle(module: Module, access: 'read' | 'write') {
    const current = value[module] ?? { read: false, write: false }
    let next = { ...current, [access]: !current[access] }
    if (access === 'write' && next.write) next.read = true
    if (access === 'read' && !next.read) next.write = false
    onChange({ ...value, [module]: next })
  }

  return (
    <div className="mt-1 rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
            <th className="text-left px-3 py-2">Módulo</th>
            <th className="text-center px-3 py-2 w-24">Lectura</th>
            <th className="text-center px-3 py-2 w-24">Escritura</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MODULES.map(mod => {
            const meta = MODULE_LABELS[mod]
            const perm = value[mod] ?? { read: false, write: false }
            return (
              <tr key={mod} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 font-medium text-slate-700">{meta.label}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={perm.read}
                    onChange={() => toggle(mod, 'read')}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {meta.hasWrite ? (
                    <input
                      type="checkbox"
                      checked={perm.write}
                      onChange={() => toggle(mod, 'write')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ActiveToggle
// ──────────────────────────────────────────────────────────────
function ActiveToggle({ userId, active, disabled }: { userId: number; active: boolean; disabled?: boolean }) {
  const qc = useQueryClient()
  const toggle = useMutation({
    mutationFn: () => axios.patch(`/api/users/${userId}`, { active: !active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(active ? 'Usuario desactivado' : 'Usuario activado')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error'),
  })

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={disabled || toggle.isPending}
      title={active ? 'Desactivar usuario' : 'Activar usuario'}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
        }
      `}
    >
      {toggle.isPending ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      )}
      {active ? 'Activo' : 'Inactivo'}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────
// UsersPage
// ──────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
  const [selectedEstructura, setSelectedEstructura] = useState<string>('')
  const [operatorPerms, setOperatorPerms] = useState<OperatorPermissions>({})

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => axios.get('/api/users', { params: { page, search, perPage: 25 } }).then(r => r.data),
  })

  const { data: estructuras } = useQuery({
    queryKey: ['estructuras'],
    queryFn: () => axios.get('/api/estructuras').then(r => r.data),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments', selectedEstructura],
    queryFn: () => axios.get('/api/departments', {
      params: selectedEstructura ? { estructuraId: selectedEstructura } : {},
    }).then(r => r.data),
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const watchedRole = useWatch({ control, name: 'role' })

  function openCreate() {
    setEditing(null)
    setSelectedEstructura('')
    setOperatorPerms({})
    reset({ name: '', email: '', password: '', role: 'client', departmentId: 0, phone: '', whatsappKey: '' })
    setModalOpen(true)
  }

  function openEdit(user: any) {
    setEditing(user)
    const estructId = user.department?.estructura?.id
    setSelectedEstructura(estructId ? String(estructId) : '')
    reset({ name: user.name, email: user.email, password: '', role: user.role, departmentId: user.department?.id, phone: user.phone ?? '', whatsappKey: user.whatsappKey ?? '' })
    if (user.role === 'operador' && user.permissions) {
      setOperatorPerms(buildPermissionsMap(user.permissions))
    } else {
      setOperatorPerms({})
    }
    setModalOpen(true)
  }

  function handleEstructuraChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedEstructura(e.target.value)
    setValue('departmentId', 0)
  }

  const save = useMutation({
    mutationFn: (data: FormValues) => {
      const payload: any = { ...data, ...(data.password === '' ? { password: undefined } : {}) }
      if (data.role === 'operador') payload.permissions = operatorPerms
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
      setDeleteTarget(null)
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
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Empresa</th>
                    <th>Departamento</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">No hay usuarios</td></tr>
                  )}
                  {data?.data?.map((u: any) => (
                    <tr key={u.id} className={!u.active ? 'opacity-60' : ''}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            u.active
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {u.name[0]}
                          </div>
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="text-slate-500 text-sm">{u.email}</td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        <ActiveToggle userId={u.id} active={u.active} />
                      </td>
                      <td>
                        {u.department?.estructura?.name ? (
                          <span className="text-sm text-indigo-700 font-medium">{u.department.estructura.name}</span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-slate-500 text-sm">{u.department?.name ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(u)}
                            title="Editar usuario"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-medium"
                          >
                            <Pencil size={12} />
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                            title="Eliminar usuario"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors text-xs font-medium"
                          >
                            <Trash2 size={12} />
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
          <div>
            <label className="form-label">Rol *</label>
            <select {...register('role')} className="form-select">
              <option value="client">Cliente</option>
              <option value="agent">Agente</option>
              <option value="gerente">Gerente</option>
              <option value="operador">Operador</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {watchedRole === 'operador' && (
            <div>
              <label className="form-label">Permisos del Operador</label>
              <PermissionsGrid value={operatorPerms} onChange={setOperatorPerms} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Empresa (Estructura)</label>
              <select value={selectedEstructura} onChange={handleEstructuraChange} className="form-select">
                <option value="">Todas</option>
                {(estructuras ?? []).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Teléfono WhatsApp (opcional)</label>
              <input {...register('phone')} className="form-input" placeholder="+54911..." />
            </div>
            <div>
              <label className="form-label">API Key Callmebot</label>
              <input {...register('whatsappKey')} className="form-input" placeholder="123456" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal eliminar */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Eliminar Usuario" size="sm">
        <p className="text-slate-600 mb-1">
          ¿Eliminás a <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>?
        </p>
        <p className="text-xs text-slate-400 mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => remove.mutate(deleteTarget!.id)}
            disabled={remove.isPending}
            className="btn-danger"
          >
            {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  )
}
