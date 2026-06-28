'use client'
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error('[Dashboard Error]', error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-6">
      <AlertTriangle size={48} className="text-red-400" />
      <h2 className="text-xl font-bold text-slate-800">Algo salió mal</h2>
      <p className="text-slate-500 max-w-md text-sm">
        {error.message || 'Ocurrió un error inesperado. Por favor intentá nuevamente.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw size={14} /> Reintentar
      </button>
    </div>
  )
}
