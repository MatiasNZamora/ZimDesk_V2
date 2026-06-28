'use client'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts'
import { Loader2, Ticket, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { formatMinutes } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  abierto: '#f59e0b', en_progreso: '#6366f1', en_espera_cliente: '#0ea5e9',
  respuesta_cliente: '#8b5cf6', resuelto: '#22c55e', cerrado: '#64748b',
  reabierto: '#a78bfa', cancelado: '#ef4444',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? 'client'

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear]   = useState(new Date().getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: () => axios.get(`/api/dashboard?month=${month}&year=${year}`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  )

  const destacados = [
    { slug: 'abierto',     label: 'Abiertos',    icon: Ticket,       color: 'amber' },
    { slug: 'en_progreso', label: 'En Progreso',  icon: Clock,        color: 'indigo' },
    { slug: 'resuelto',    label: 'Resueltos',    icon: CheckCircle,  color: 'green' },
    { slug: 'cancelado',   label: 'Cancelados',   icon: AlertTriangle,color: 'red' },
  ]

  const colorMap: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bienvenido, {session?.user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="form-select w-auto text-sm py-1.5"
          >
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
              .map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="form-select w-auto text-sm py-1.5"
          >
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {destacados.map(({ slug, label, icon: Icon, color }) => {
          const estado = data?.estados?.find((e: any) => e.slug === slug)
          return (
            <div key={slug} className={`card p-5 border ${colorMap[color]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{label}</span>
                <Icon size={18} />
              </div>
              <p className="text-3xl font-bold">{estado?.total ?? 0}</p>
              <p className="text-xs mt-1 opacity-70">{estado?.porcentaje ?? 0}% del total</p>
            </div>
          )
        })}
      </div>

      {role === 'admin' && data?.slaPromedioMinutos !== undefined && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-sm font-medium text-slate-500 mb-1">SLA — Tiempo promedio 1ª respuesta</p>
            <p className="text-2xl font-bold text-slate-800">
              {data.slaPromedioMinutos !== null ? formatMinutes(data.slaPromedioMinutos) : 'Sin datos'}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm font-medium text-slate-500 mb-1">Sin primera respuesta</p>
            <p className="text-2xl font-bold text-red-600">{data.ticketsSinPrimeraRespuesta ?? 0}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estados */}
        {data?.estados && data.estados.some((e: any) => e.total > 0) && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-700">Tickets por Estado</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.estados.filter((e: any) => e.total > 0)}
                    dataKey="total"
                    nameKey="nombre"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    label={({ nombre, total }) => `${nombre}: ${total}`}
                    labelLine={false}
                  >
                    {data.estados.filter((e: any) => e.total > 0).map((e: any) => (
                      <Cell key={e.slug} fill={STATUS_COLORS[e.slug] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Categorías */}
        {data?.categoriasData && data.categoriasData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-700">Tickets por Categoría</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.categoriasData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Prioridades */}
        {data?.prioridadesData && data.prioridadesData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-700">Tickets por Prioridad</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.prioridadesData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {data.prioridadesData.map((p: any, i: number) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Agentes (solo admin) */}
        {role === 'admin' && data?.agentesData && data.agentesData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-700">Tickets por Agente</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.agentesData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de estados completa */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-slate-700">Detalle por Estado</h2>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Cantidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {(data?.estados ?? []).map((e: any) => (
                <tr key={e.id}>
                  <td className="font-medium">{e.nombre}</td>
                  <td>{e.total}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[120px]">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${e.porcentaje}%`, backgroundColor: STATUS_COLORS[e.slug] ?? '#94a3b8' }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{e.porcentaje}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
