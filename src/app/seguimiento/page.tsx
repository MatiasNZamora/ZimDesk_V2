'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download, Search, Loader2, Package } from 'lucide-react'

const STATUS_STEPS = [
  { key: 'RECIBIDO',      label: 'Recibido',             desc: 'Tu equipo fue recibido' },
  { key: 'EN_REVISION',   label: 'En Revisión',          desc: 'Nuestro equipo técnico está evaluando' },
  { key: 'EN_REPARACION', label: 'En Reparación',        desc: 'Tu equipo está siendo reparado' },
  { key: 'LISTO',         label: 'Listo para Retirar',   desc: '¡Tu equipo está listo!' },
  { key: 'ENTREGADO',     label: 'Entregado',            desc: 'Tu equipo fue entregado' },
]

const CONDITION_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo', BUENO: 'Bueno', REGULAR: 'Regular', DANADO: 'Dañado',
}

type ReceptionPublic = {
  orderNumber: string
  brand: string | null
  model: string | null
  condition: string
  status: string
  intakeDate: string
  observations: string | null
  category: { name: string } | null
}

function TrackingContent() {
  const searchParams  = useSearchParams()
  const initialPedido = searchParams.get('pedido') ?? ''

  const [pedido,    setPedido]    = useState(initialPedido)
  const [input,     setInput]     = useState(initialPedido)
  const [reception, setReception] = useState<ReceptionPublic | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [branding,  setBranding]  = useState<{ app_name?: string; logo_url?: string }>({})

  useEffect(() => {
    fetch('/api/public/branding').then(r => r.json()).then(setBranding).catch(() => {})
  }, [])

  useEffect(() => {
    if (!pedido) return
    setLoading(true)
    setError('')
    setReception(null)
    fetch(`/api/public/recepciones/${encodeURIComponent(pedido.toUpperCase())}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setReception)
      .catch(code => setError(code === 404 ? 'Número de pedido no encontrado.' : 'Error al consultar. Intentá de nuevo.'))
      .finally(() => setLoading(false))
  }, [pedido])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) setPedido(input.trim())
  }

  const currentStep = reception ? STATUS_STEPS.findIndex(s => s.key === reception.status) : -1
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const appName = branding.app_name ?? 'ZimDesk'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {branding.logo_url
            ? <img src={branding.logo_url} alt={appName} className="h-8 object-contain" />
            : <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">{appName[0]}</div>
          }
          <span className="font-bold text-slate-800">{appName}</span>
          <span className="text-slate-300 text-sm ml-2">· Seguimiento de equipo</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Buscador */}
        <div className="card p-6 space-y-3">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            Consultar estado de mi equipo
          </h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Número de pedido (ej: REC-0001)"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
            />
            <button type="submit" disabled={!input.trim() || loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Consultar
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {/* Resultado */}
        {reception && (
          <div className="space-y-5">
            {/* Header de resultado */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-lg text-indigo-600">{reception.orderNumber}</span>
                <span className="text-xs text-slate-400">Ingreso: {fmt(reception.intakeDate)}</span>
              </div>
              <div className="text-sm text-slate-600">
                {[reception.brand, reception.model].filter(Boolean).join(' ') || 'Equipo sin identificar'}
                {reception.category && <span className="ml-2 text-slate-400">· {reception.category.name}</span>}
              </div>
              <div className="text-xs text-slate-400 mt-1">Condición al ingreso: {CONDITION_LABELS[reception.condition] ?? reception.condition}</div>
              {reception.observations && (
                <p className="mt-3 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg p-3">{reception.observations}</p>
              )}
            </div>

            {/* Stepper */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-slate-600 mb-5">Estado del servicio</h2>
              <div className="relative">
                {/* Línea de progreso */}
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-slate-200" />
                {currentStep >= 0 && (
                  <div
                    className="absolute left-4 top-6 w-0.5 bg-indigo-500 transition-all"
                    style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                  />
                )}
                <div className="space-y-6 relative">
                  {STATUS_STEPS.map((step, idx) => {
                    const done    = idx < currentStep
                    const current = idx === currentStep
                    return (
                      <div key={step.key} className="flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors z-10 ${
                          current ? 'bg-indigo-600 border-indigo-600' :
                          done    ? 'bg-indigo-100 border-indigo-400' :
                                    'bg-white border-slate-300'
                        }`}>
                          {done ? (
                            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <span className={`text-xs font-bold ${current ? 'text-white' : 'text-slate-400'}`}>{idx + 1}</span>
                          )}
                        </div>
                        <div className="pt-1">
                          <p className={`text-sm font-semibold ${current ? 'text-indigo-700' : done ? 'text-slate-500' : 'text-slate-400'}`}>{step.label}</p>
                          {current && <p className="text-xs text-indigo-500 mt-0.5">{step.desc}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Descargar PDF */}
            <a
              href={`/api/public/recepciones/${reception.orderNumber}/pdf`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-indigo-200 text-indigo-700 font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              <Download size={15} /> Descargar comprobante PDF
            </a>
          </div>
        )}
      </main>
    </div>
  )
}

export default function SeguimientoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>}>
      <TrackingContent />
    </Suspense>
  )
}
