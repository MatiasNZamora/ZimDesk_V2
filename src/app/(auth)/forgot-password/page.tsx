'use client'
import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ChevronLeft, Mail, CheckCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
})
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    await axios.post('/api/auth/forgot-password', data)
    setSent(true)
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
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-green-400 mx-auto" />
              <h1 className="text-white text-xl font-semibold">Revisá tu email</h1>
              <p className="text-slate-400 text-sm">
                Si el email está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="text-slate-500 text-xs">
                En modo desarrollo, el enlace se imprime en la consola del servidor.
              </p>
              <Link href="/login" className="block text-indigo-400 hover:text-indigo-300 text-sm mt-4">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-300 text-sm mb-6">
                <ChevronLeft size={14} /> Volver
              </Link>
              <h1 className="text-white text-xl font-semibold mb-1">Olvidé mi contraseña</h1>
              <p className="text-slate-400 text-sm mb-6">
                Ingresá tu email y te enviaremos un enlace para restablecerla.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="nombre@empresa.com"
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 rounded-lg px-3 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
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
