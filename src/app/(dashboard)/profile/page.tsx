'use client'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useRef } from 'react'
import axios from 'axios'
import { Loader2, Save, Camera } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
}).refine(d => !d.newPassword || d.currentPassword, {
  message: 'Ingresá tu contraseña actual para cambiarla',
  path: ['currentPassword'],
})

type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const { data: session } = useSession()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: session?.user?.name ?? '' },
  })
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(session?.user?.avatar ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onSubmit(data: FormValues) {
    try {
      await axios.put('/api/profile', data)
      toast.success('Perfil actualizado. Volvé a iniciar sesión para ver el nombre actualizado.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Error al actualizar')
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarUploading(true)
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)

    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const { data } = await axios.post('/api/profile/avatar', fd)
      setAvatarPreview(data.avatar)
      toast.success('Avatar actualizado. Se verá en el header al recargar la página.')
    } catch (err: any) {
      setAvatarPreview(session?.user?.avatar ?? null)
      toast.error(err?.response?.data?.error ?? 'Error al subir la imagen')
    } finally {
      setAvatarUploading(false)
    }
  }

  const roleLabel = { admin: 'Administrador', agent: 'Agente', client: 'Cliente' }[session?.user?.role ?? 'client']
  const initials  = session?.user?.name?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-sm text-slate-500 mt-0.5">Actualizá tu información personal</p>
      </div>

      {/* Avatar */}
      <div className="card p-6 flex items-center gap-5">
        <div className="relative group">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            {avatarUploading
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Camera size={18} className="text-white" />
            }
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div>
          <p className="font-semibold text-slate-800">{session?.user?.name}</p>
          <p className="text-sm text-slate-500">{session?.user?.email}</p>
          <p className="text-xs text-indigo-600 font-medium mt-0.5">{roleLabel} · {session?.user?.departmentName}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="text-xs text-slate-500 hover:text-indigo-600 mt-1 underline"
          >
            Cambiar foto
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Información Personal</h2>

        <div>
          <label className="form-label">Nombre</label>
          <input {...register('name')} className="form-input" />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        <div>
          <label className="form-label">Email</label>
          <input value={session?.user?.email ?? ''} disabled className="form-input" />
          <p className="text-xs text-slate-400 mt-1">El email no se puede cambiar desde aquí</p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Cambiar Contraseña</h3>
          <div className="space-y-3">
            <div>
              <label className="form-label">Contraseña Actual</label>
              <input {...register('currentPassword')} type="password" className="form-input" placeholder="••••••••" />
              {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="form-label">Nueva Contraseña</label>
              <input {...register('newPassword')} type="password" className="form-input" placeholder="••••••••" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  )
}
