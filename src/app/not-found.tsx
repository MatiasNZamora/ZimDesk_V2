import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-4">
      <p className="text-8xl font-bold text-slate-200 select-none">404</p>
      <h1 className="text-2xl font-bold text-slate-800 mt-4">Página no encontrada</h1>
      <p className="text-slate-500 mt-2 max-w-sm">La página que buscás no existe o fue movida a otra dirección.</p>
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-indigo-700 transition-colors">
        <Home size={15} /> Ir al Dashboard
      </Link>
    </div>
  )
}
