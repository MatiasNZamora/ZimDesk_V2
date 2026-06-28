'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

const schema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})
type FormValues = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const token  = Array.isArray(params.token) ? params.token[0] : params.token

  const [showPass, setShowPass] = useState(false)
  const [done, setDone]         = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setApiError('')
    try {
      await axios.post('/api/auth/reset-password', { token, password: data.password })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setApiError(err?.response?.data?.error ?? 'Error al restablecer la contraseña')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">ZimDesk</span>
          </div>
          <p className="text-slate-400 text-sm">Sistema de Mesa de Ayuda</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-400 mx-auto" />
              <h1 className="text-white text-xl font-semibold">Contraseña restablecida</h1>
              <p className="text-slate-400 text-sm">
                Tu contraseña fue actualizada correctamente. Serás redirigido al inicio de sesión en unos segundos.
              </p>
              <Link href="/login" className="block text-indigo-400 hover:text-indigo-300 text-sm">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-white text-xl font-semibold mb-1">Nueva contraseña</h1>
              <p className="text-slate-400 text-sm mb-6">Ingresá y confirmá tu nueva contraseña.</p>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4 flex items-start gap-2">
                  <XCircle size={15} className="shrink-0 mt-0.5" />
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmá la contraseña</label>
                  <input
                    {...register('confirm')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                  {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} ZimTech · ZimDesk v2
        </p>
      </div>
    </div>
  )
}
