'use client'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, ExternalLink } from 'lucide-react'

type TechnicalReport = {
  id: number
  reportNumber: string
  title: string
  status: string
  priority: string
  technicianName: string
  clientName: string | null
  equipmentName: string | null
  entryDate: string | null
  createdAt: string
  statusSummary: string
  rootCause: string
  recommendation: string
  caseSummary: string
  clientQuote: string | null
  equipmentSpecs: { component: string; spec: string }[]
  symptoms: { text: string }[]
  procedure: { text: string }[]
  findings: { text: string }[]
  findingsNote: string | null
  diagnosis: string
  technicalRec: string
  recActions: { action: string; priority: string; time: string; cost: string }[]
  conclusion: string
  clientLogoBase64: string | null
  reception: { orderNumber: string; brand: string | null; model: string | null } | null
  ticket: { id: number; subject: string } | null
  createdBy: { name: string }
}

const PRIORITY_STYLES: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja:  'bg-green-100 text-green-700',
}

function SectionBlock({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-mono text-indigo-500">{num}.</span>
        <h3 className="font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function InformeDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: report, isLoading } = useQuery<TechnicalReport>({
    queryKey: ['informe', id],
    queryFn: () => axios.get(`/api/informes/${id}`).then(r => r.data),
  })

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
  if (!report)   return <div className="text-slate-400 py-12 text-center">Informe no encontrado</div>

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/informes" className="btn-ghost btn-sm p-1.5"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-indigo-600 font-semibold">{report.reportNumber}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[report.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                {report.priority}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-0.5">{report.title}</h1>
          </div>
        </div>
        <a
          href={`/api/informes/${id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary btn-sm flex items-center gap-1.5 shrink-0"
        >
          <FileText size={14} /> Ver PDF <ExternalLink size={12} />
        </a>
      </div>

      {/* Vínculo */}
      {(report.reception || report.ticket) && (
        <div className="card px-4 py-3 flex items-center gap-2 text-sm text-slate-600">
          {report.reception && (
            <>
              <span className="text-slate-400">Recepción:</span>
              <span className="font-mono font-semibold text-indigo-600">{report.reception.orderNumber}</span>
              <span>{[report.reception.brand, report.reception.model].filter(Boolean).join(' ')}</span>
            </>
          )}
          {report.ticket && (
            <>
              <span className="text-slate-400">Ticket:</span>
              <Link href={`/tickets/${report.ticket.id}`} className="font-semibold text-indigo-600 hover:underline">
                #{report.ticket.id} — {report.ticket.subject}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Grilla de datos */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { k: 'Estado', v: report.status },
            { k: 'Técnico', v: report.technicianName },
            { k: 'Fecha emisión', v: fmt(report.createdAt) },
            { k: 'Cliente', v: report.clientName ?? '—' },
            { k: 'Equipo', v: report.equipmentName ?? '—' },
            { k: 'Fecha ingreso', v: fmt(report.entryDate) },
          ].map(({ k, v }) => (
            <div key={k} className="px-4 py-3 border-b border-slate-100">
              <div className="text-xs text-slate-400 uppercase tracking-wide font-mono">{k}</div>
              <div className="text-sm font-medium mt-0.5 text-slate-700">{v}</div>
            </div>
          ))}
        </div>

        {/* Resumen ejecutivo */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50">
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-mono">Estado</div>
            <div className="text-sm font-semibold mt-0.5 text-slate-700">{report.statusSummary || '—'}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-mono">Causa raíz</div>
            <div className="text-sm font-semibold mt-0.5 text-slate-700">{report.rootCause || '—'}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-mono">Recomendación</div>
            <div className="text-sm font-semibold mt-0.5 text-slate-700">{report.recommendation || '—'}</div>
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="card p-5 space-y-5">

        <SectionBlock num={1} title="Resumen del caso">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.caseSummary}</p>
        </SectionBlock>

        {report.clientQuote && (
          <SectionBlock num={2} title="Entrevista con el solicitante">
            <blockquote className="border-l-4 border-blue-400 pl-4 italic text-slate-600 text-sm">
              &ldquo;{report.clientQuote}&rdquo;
            </blockquote>
          </SectionBlock>
        )}

        {report.equipmentSpecs.length > 0 && (
          <SectionBlock num={3} title="Equipo evaluado">
            <table className="table text-sm w-full">
              <thead><tr><th>Componente</th><th>Especificación</th></tr></thead>
              <tbody>{report.equipmentSpecs.map((s, i) => <tr key={i}><td>{s.component}</td><td>{s.spec}</td></tr>)}</tbody>
            </table>
          </SectionBlock>
        )}

        {report.symptoms.length > 0 && (
          <SectionBlock num={4} title="Síntomas reportados">
            <ul className="space-y-1">{report.symptoms.map((s, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-indigo-400 mt-0.5">✓</span>{s.text}</li>)}</ul>
          </SectionBlock>
        )}

        {report.procedure.length > 0 && (
          <SectionBlock num={5} title="Procedimiento de diagnóstico">
            <ul className="space-y-1">{report.procedure.map((s, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-indigo-400 mt-0.5">✓</span>{s.text}</li>)}</ul>
          </SectionBlock>
        )}

        {report.findings.length > 0 && (
          <SectionBlock num={6} title="Hallazgos">
            <ul className="space-y-1 mb-3">{report.findings.map((s, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-indigo-400 mt-0.5">✓</span>{s.text}</li>)}</ul>
            {report.findingsNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                <span className="font-semibold text-xs uppercase tracking-wide block mb-1">Observación</span>
                {report.findingsNote}
              </div>
            )}
          </SectionBlock>
        )}

        <SectionBlock num={7} title="Diagnóstico y causa raíz">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
            <span className="font-semibold text-xs uppercase tracking-wide block mb-1">Causa raíz identificada</span>
            <p className="whitespace-pre-wrap">{report.diagnosis}</p>
          </div>
        </SectionBlock>

        <SectionBlock num={8} title="Recomendación técnica">
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-3">{report.technicalRec}</p>
          {report.recActions.length > 0 && (
            <table className="table text-sm w-full">
              <thead><tr><th>Acción</th><th>Prioridad</th><th>Tiempo est.</th><th>Costo est.</th></tr></thead>
              <tbody>{report.recActions.map((a, i) => <tr key={i}><td>{a.action}</td><td>{a.priority}</td><td>{a.time}</td><td>{a.cost}</td></tr>)}</tbody>
            </table>
          )}
        </SectionBlock>

        <SectionBlock num={9} title="Conclusión">
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.conclusion}</p>
        </SectionBlock>

      </div>

      {/* Footer */}
      <div className="text-xs text-slate-400 text-right">
        Creado por {report.createdBy.name} · {fmt(report.createdAt)}
      </div>
    </div>
  )
}
