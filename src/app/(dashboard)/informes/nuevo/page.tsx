'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Suspense } from 'react'

type Reception = { id: number; orderNumber: string; brand: string | null; model: string | null; estructura: { name: string } | null; responsible: { name: string } | null; intakeDate: string }
type Ticket    = { id: number; subject: string; agent: { name: string } | null; createdAt: string; creator: { name: string } }

type EquipmentSpec = { component: string; spec: string }
type ListItem      = { text: string }
type RecAction     = { action: string; priority: string; time: string; cost: string }

type OriginMode = 'recepcion' | 'ticket' | 'independiente'

const STATUS_OPTIONS   = ['En análisis', 'Diagnóstico completado', 'Pendiente de aprobación', 'Reparación en curso', 'Cerrado']
const PRIORITY_OPTIONS = ['Alta', 'Media', 'Baja']

function DynamicList({ items, onChange, placeholder }: { items: ListItem[]; onChange: (v: ListItem[]) => void; placeholder?: string }) {
  function update(i: number, val: string) {
    const next = [...items]; next[i] = { text: val }; onChange(next)
  }
  function add()    { onChange([...items, { text: '' }]) }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={item.text}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder ?? 'Descripción...'}
            className="form-input flex-1"
          />
          <button type="button" onClick={() => remove(i)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary btn-sm flex items-center gap-1.5 text-xs">
        <Plus size={12} /> Agregar ítem
      </button>
    </div>
  )
}

function SpecsTable({ rows, onChange }: { rows: EquipmentSpec[]; onChange: (v: EquipmentSpec[]) => void }) {
  function update(i: number, field: keyof EquipmentSpec, val: string) {
    const next = [...rows]; next[i] = { ...next[i], [field]: val }; onChange(next)
  }
  function add()    { onChange([...rows, { component: '', spec: '' }]) }
  function remove(i: number) { onChange(rows.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input value={row.component} onChange={e => update(i, 'component', e.target.value)} placeholder="Componente (ej: Placa madre)" className="form-input" />
          <input value={row.spec}      onChange={e => update(i, 'spec',      e.target.value)} placeholder="Especificación" className="form-input" />
          <button type="button" onClick={() => remove(i)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-slate-400 px-1">
          <span>Componente</span><span>Especificación</span><span></span>
        </div>
      )}
      <button type="button" onClick={add} className="btn-secondary btn-sm flex items-center gap-1.5 text-xs">
        <Plus size={12} /> Agregar fila
      </button>
    </div>
  )
}

function ActionsTable({ rows, onChange }: { rows: RecAction[]; onChange: (v: RecAction[]) => void }) {
  function update(i: number, field: keyof RecAction, val: string) {
    const next = [...rows]; next[i] = { ...next[i], [field]: val }; onChange(next)
  }
  function add()    { onChange([...rows, { action: '', priority: 'Alta', time: 'A coordinar', cost: 'A cotizar' }]) }
  function remove(i: number) { onChange(rows.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs text-slate-400 px-1">
          <span>Acción</span><span>Prioridad</span><span>Tiempo est.</span><span>Costo est.</span><span></span>
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
          <input value={row.action}   onChange={e => update(i, 'action',   e.target.value)} placeholder="Descripción de la acción" className="form-input" />
          <select value={row.priority} onChange={e => update(i, 'priority', e.target.value)} className="form-input">
            {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
            <option value="Recomendado">Recomendado</option>
          </select>
          <input value={row.time}     onChange={e => update(i, 'time',     e.target.value)} placeholder="A coordinar" className="form-input" />
          <input value={row.cost}     onChange={e => update(i, 'cost',     e.target.value)} placeholder="A cotizar" className="form-input" />
          <button type="button" onClick={() => remove(i)} className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary btn-sm flex items-center gap-1.5 text-xs">
        <Plus size={12} /> Agregar acción
      </button>
    </div>
  )
}

function Section({ title, children, optional }: { title: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</h2>
        {optional && <span className="text-xs text-slate-400">(opcional)</span>}
      </div>
      {children}
    </div>
  )
}

function NuevoInformeInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const qc           = useQueryClient()
  const { data: session } = useSession()

  // ── Origen del informe ───────────────────────────────────────────────────────
  const [originMode, setOriginMode] = useState<OriginMode>('recepcion')

  // Recepción
  const [receptionQuery,    setReceptionQuery]    = useState('')
  const [selectedReception, setSelectedReception] = useState<Reception | null>(null)
  const [receptionDropdown, setReceptionDropdown] = useState(false)

  // Ticket
  const [ticketQuery,    setTicketQuery]    = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketDropdown, setTicketDropdown] = useState(false)

  // ── Datos del encabezado ─────────────────────────────────────────────────────
  const [title,          setTitle]          = useState('')
  const [status,         setStatus]         = useState('En análisis')
  const [priority,       setPriority]       = useState('Media')
  const [clientName,     setClientName]     = useState('')
  const [equipmentName,  setEquipmentName]  = useState('')
  const [entryDate,      setEntryDate]      = useState(() => new Date().toISOString().split('T')[0])
  const [technicianName, setTechnicianName] = useState('')

  // ── Tarjetas de resumen ──────────────────────────────────────────────────────
  const [statusSummary,  setStatusSummary]  = useState('')
  const [rootCause,      setRootCause]      = useState('')
  const [recommendation, setRecommendation] = useState('')

  // ── Secciones ────────────────────────────────────────────────────────────────
  const [caseSummary,   setCaseSummary]   = useState('')
  const [clientQuote,   setClientQuote]   = useState('')
  const [equipSpecs,    setEquipSpecs]    = useState<EquipmentSpec[]>([{ component: '', spec: '' }])
  const [symptoms,      setSymptoms]      = useState<ListItem[]>([{ text: '' }])
  const [procedure,     setProcedure]     = useState<ListItem[]>([{ text: '' }])
  const [findings,      setFindings]      = useState<ListItem[]>([{ text: '' }])
  const [findingsNote,  setFindingsNote]  = useState('')
  const [diagnosis,     setDiagnosis]     = useState('')
  const [technicalRec,  setTechnicalRec]  = useState('')
  const [recActions,    setRecActions]    = useState<RecAction[]>([])
  const [conclusion,    setConclusion]    = useState('')

  // ── Logo cliente ─────────────────────────────────────────────────────────────
  const [clientLogoBase64, setClientLogoBase64] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  // ── Pre-selección por query param ─────────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.name) setTechnicianName(session.user.name)
  }, [session])

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: receptions = [] } = useQuery<Reception[]>({
    queryKey: ['recepciones-select'],
    queryFn: () => axios.get('/api/recepciones?limit=200').then(r => r.data.data),
    enabled: originMode === 'recepcion',
  })

  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets-select'],
    queryFn: () => axios.get('/api/tickets?limit=200').then(r => r.data.data ?? r.data),
    enabled: originMode === 'ticket',
  })

  const filteredReceptions = receptionQuery.trim()
    ? receptions.filter(r =>
        r.orderNumber.toLowerCase().includes(receptionQuery.toLowerCase()) ||
        r.estructura?.name.toLowerCase().includes(receptionQuery.toLowerCase()) ||
        [r.brand, r.model].filter(Boolean).join(' ').toLowerCase().includes(receptionQuery.toLowerCase())
      )
    : receptions.slice(0, 20)

  const filteredTickets = ticketQuery.trim()
    ? tickets.filter(t => t.subject.toLowerCase().includes(ticketQuery.toLowerCase()))
    : tickets.slice(0, 20)

  function selectReception(r: Reception) {
    setSelectedReception(r)
    setReceptionQuery(`${r.orderNumber} — ${r.estructura?.name ?? ''}`)
    setReceptionDropdown(false)
    setClientName(r.estructura?.name ?? '')
    setEquipmentName([r.brand, r.model].filter(Boolean).join(' '))
    setEntryDate(r.intakeDate.split('T')[0])
    if (r.responsible?.name) setTechnicianName(r.responsible.name)
  }

  function selectTicket(t: Ticket) {
    setSelectedTicket(t)
    setTicketQuery(`#${t.id} — ${t.subject}`)
    setTicketDropdown(false)
    setTitle(t.subject)
    setEntryDate(t.createdAt.split('T')[0])
    if (t.agent?.name) setTechnicianName(t.agent.name)
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return }
    const reader = new FileReader()
    reader.onload = ev => setClientLogoBase64(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (data: any) => axios.post('/api/informes', data).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Informe ${data.reportNumber} creado`)
      qc.invalidateQueries({ queryKey: ['informes'] })
      router.push('/informes')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear el informe'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim())         { toast.error('El título es requerido'); return }
    if (!caseSummary.trim())   { toast.error('El resumen del caso es requerido'); return }
    if (!diagnosis.trim())     { toast.error('El diagnóstico es requerido'); return }
    if (!conclusion.trim())    { toast.error('La conclusión es requerida'); return }
    if (!technicianName.trim()){ toast.error('El nombre del técnico es requerido'); return }

    create.mutate({
      receptionId:     originMode === 'recepcion' ? selectedReception?.id : undefined,
      ticketId:        originMode === 'ticket'    ? selectedTicket?.id    : undefined,
      clientName:      clientName   || undefined,
      equipmentName:   equipmentName || undefined,
      entryDate:       entryDate    || undefined,
      title,
      status,
      priority,
      statusSummary,
      rootCause,
      recommendation,
      caseSummary,
      clientQuote:     clientQuote || undefined,
      equipmentSpecs:  equipSpecs.filter(s => s.component.trim()),
      symptoms:        symptoms.filter(s => s.text.trim()),
      procedure:       procedure.filter(s => s.text.trim()),
      findings:        findings.filter(s => s.text.trim()),
      findingsNote:    findingsNote || undefined,
      diagnosis,
      technicalRec,
      recActions:      recActions.filter(a => a.action.trim()),
      conclusion,
      technicianName,
      clientLogoBase64: clientLogoBase64 || undefined,
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/informes" className="btn-ghost btn-sm p-1.5"><ArrowLeft size={16} /></Link>
        <h1 className="text-xl font-bold text-slate-800">Nuevo Informe Técnico</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Origen ─────────────────────────────────────────────────────────── */}
        <Section title="Origen del informe">
          <div className="flex gap-2 flex-wrap">
            {(['recepcion', 'ticket', 'independiente'] as OriginMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOriginMode(mode)
                  setSelectedReception(null); setReceptionQuery('')
                  setSelectedTicket(null);    setTicketQuery('')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  originMode === mode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {{ recepcion: 'Recepción', ticket: 'Ticket / Inspección', independiente: 'Independiente' }[mode]}
              </button>
            ))}
          </div>

          {/* Recepción */}
          {originMode === 'recepcion' && (
            <div>
              <label className="form-label">Recepción vinculada</label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    value={receptionQuery}
                    onChange={e => { setReceptionQuery(e.target.value); setSelectedReception(null); setReceptionDropdown(true) }}
                    onFocus={() => setReceptionDropdown(true)}
                    placeholder="Buscar por N.º orden, cliente o equipo..."
                    className="form-input pl-8 pr-8"
                    autoComplete="off"
                  />
                  {receptionQuery && (
                    <button type="button" onClick={() => { setSelectedReception(null); setReceptionQuery(''); setReceptionDropdown(false) }} className="absolute right-2 text-slate-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {receptionDropdown && !selectedReception && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setReceptionDropdown(false)} />
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {filteredReceptions.length > 0 ? filteredReceptions.map(r => (
                        <button key={r.id} type="button" onClick={() => selectReception(r)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-semibold text-indigo-600">{r.orderNumber}</span>
                            <span className="ml-2 text-slate-600">{r.estructura?.name ?? ''}</span>
                          </div>
                          <span className="text-xs text-slate-400">{[r.brand, r.model].filter(Boolean).join(' ')}</span>
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-sm text-slate-400">Sin resultados</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {selectedReception && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                  <span className="font-mono font-semibold text-indigo-700">{selectedReception.orderNumber}</span>
                  <span className="text-slate-600">{selectedReception.estructura?.name}</span>
                  <button type="button" onClick={() => { setSelectedReception(null); setReceptionQuery('') }} className="ml-auto text-indigo-400 hover:text-indigo-700"><X size={13} /></button>
                </div>
              )}
            </div>
          )}

          {/* Ticket */}
          {originMode === 'ticket' && (
            <div>
              <label className="form-label">Ticket vinculado (inspección en el lugar)</label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    value={ticketQuery}
                    onChange={e => { setTicketQuery(e.target.value); setSelectedTicket(null); setTicketDropdown(true) }}
                    onFocus={() => setTicketDropdown(true)}
                    placeholder="Buscar ticket por asunto..."
                    className="form-input pl-8 pr-8"
                    autoComplete="off"
                  />
                  {ticketQuery && (
                    <button type="button" onClick={() => { setSelectedTicket(null); setTicketQuery(''); setTicketDropdown(false) }} className="absolute right-2 text-slate-400"><X size={14} /></button>
                  )}
                </div>
                {ticketDropdown && !selectedTicket && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTicketDropdown(false)} />
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {filteredTickets.length > 0 ? filteredTickets.map(t => (
                        <button key={t.id} type="button" onClick={() => selectTicket(t)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50">
                          <span className="font-mono text-slate-400 mr-2">#{t.id}</span>
                          <span className="font-medium">{t.subject}</span>
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-sm text-slate-400">Sin resultados</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {selectedTicket && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                  <span className="font-mono text-slate-500">#{selectedTicket.id}</span>
                  <span className="font-medium text-indigo-700">{selectedTicket.subject}</span>
                  <button type="button" onClick={() => { setSelectedTicket(null); setTicketQuery('') }} className="ml-auto text-indigo-400 hover:text-indigo-700"><X size={13} /></button>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Encabezado ──────────────────────────────────────────────────────── */}
        <Section title="Encabezado del informe">
          <div>
            <label className="form-label">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="Ej: Falla de encendido — CX Slim 5835 Black" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Estado del informe</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="form-input">
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Prioridad</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="form-input">
                {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Cliente / Empresa</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="form-input" placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="form-label">Equipo / Dispositivo</label>
              <input value={equipmentName} onChange={e => setEquipmentName(e.target.value)} className="form-input" placeholder="Ej: CX Slim 5835 Black" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha de ingreso</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="form-input" />
            </div>
            <div>
              <label className="form-label">Técnico responsable *</label>
              <input value={technicianName} onChange={e => setTechnicianName(e.target.value)} className="form-input" placeholder="Nombre del técnico" required />
            </div>
          </div>
        </Section>

        {/* ── Logo cliente ─────────────────────────────────────────────────────── */}
        <Section title="Logo del cliente" optional>
          <p className="text-xs text-slate-400 -mt-1">Aparece en el encabezado del PDF junto al logo de ZimTech.</p>
          <div className="flex items-center gap-4">
            {clientLogoBase64 && (
              <img src={clientLogoBase64} alt="Logo cliente" className="h-12 object-contain border border-slate-200 rounded-lg p-1" />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => logoRef.current?.click()} className="btn-secondary btn-sm">
                {clientLogoBase64 ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {clientLogoBase64 && (
                <button type="button" onClick={() => setClientLogoBase64(null)} className="btn-ghost btn-sm text-red-500">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </Section>

        {/* ── Resumen ejecutivo ─────────────────────────────────────────────────── */}
        <Section title="Resumen ejecutivo (tarjetas del PDF)">
          <div>
            <label className="form-label">Estado del diagnóstico</label>
            <input value={statusSummary} onChange={e => setStatusSummary(e.target.value)} className="form-input" placeholder="Ej: Diagnóstico completado" />
          </div>
          <div>
            <label className="form-label">Causa raíz</label>
            <input value={rootCause} onChange={e => setRootCause(e.target.value)} className="form-input" placeholder="Ej: Daño eléctrico en CPU y placa madre" />
          </div>
          <div>
            <label className="form-label">Recomendación (resumen)</label>
            <input value={recommendation} onChange={e => setRecommendation(e.target.value)} className="form-input" placeholder="Ej: Reemplazo de componentes + estabilizador" />
          </div>
        </Section>

        {/* ── Sección 1: Resumen ───────────────────────────────────────────────── */}
        <Section title="1. Resumen del caso">
          <textarea value={caseSummary} onChange={e => setCaseSummary(e.target.value)} className="form-input" rows={4}
            placeholder="Descripción general del caso, equipo involucrado, técnico asignado y clasificación..." />
        </Section>

        {/* ── Sección 2: Entrevista ─────────────────────────────────────────────── */}
        <Section title="2. Entrevista con el solicitante" optional>
          <textarea value={clientQuote} onChange={e => setClientQuote(e.target.value)} className="form-input" rows={3}
            placeholder="Declaración del solicitante al momento del ingreso (se renderiza como cita en el PDF)..." />
        </Section>

        {/* ── Sección 3: Equipo evaluado ────────────────────────────────────────── */}
        <Section title="3. Equipo evaluado" optional>
          <SpecsTable rows={equipSpecs} onChange={setEquipSpecs} />
        </Section>

        {/* ── Sección 4: Síntomas ───────────────────────────────────────────────── */}
        <Section title="4. Síntomas reportados">
          <DynamicList items={symptoms} onChange={setSymptoms} placeholder="Describí el síntoma..." />
        </Section>

        {/* ── Sección 5: Procedimiento ──────────────────────────────────────────── */}
        <Section title="5. Procedimiento de diagnóstico">
          <DynamicList items={procedure} onChange={setProcedure} placeholder="Paso del procedimiento..." />
        </Section>

        {/* ── Sección 6: Hallazgos ─────────────────────────────────────────────── */}
        <Section title="6. Hallazgos">
          <DynamicList items={findings} onChange={setFindings} placeholder="Hallazgo observado..." />
          <div>
            <label className="form-label">Nota / observación adicional <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea value={findingsNote} onChange={e => setFindingsNote(e.target.value)} className="form-input" rows={2}
              placeholder="Aparece como callout en el PDF..." />
          </div>
        </Section>

        {/* ── Sección 7: Diagnóstico ───────────────────────────────────────────── */}
        <Section title="7. Diagnóstico y causa raíz">
          <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="form-input" rows={4}
            placeholder="Descripción técnica de la causa raíz identificada (se renderiza como callout crítico en el PDF)..." />
        </Section>

        {/* ── Sección 8: Recomendación ─────────────────────────────────────────── */}
        <Section title="8. Recomendación técnica">
          <div>
            <label className="form-label">Párrafo de recomendación</label>
            <textarea value={technicalRec} onChange={e => setTechnicalRec(e.target.value)} className="form-input" rows={3}
              placeholder="Descripción de las acciones recomendadas..." />
          </div>
          <div>
            <label className="form-label">Tabla de acciones recomendadas <span className="text-slate-400 font-normal">(opcional)</span></label>
            <ActionsTable rows={recActions} onChange={setRecActions} />
          </div>
        </Section>

        {/* ── Sección 9: Conclusión ────────────────────────────────────────────── */}
        <Section title="9. Conclusión">
          <textarea value={conclusion} onChange={e => setConclusion(e.target.value)} className="form-input" rows={4}
            placeholder="Resumen final, disponibilidad para coordinar reparación, próximos pasos..." />
        </Section>

        <div className="flex items-center justify-end gap-3">
          <Link href="/informes" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={create.isPending} className="btn-primary flex items-center gap-2">
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Crear Informe
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NuevoInformePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>}>
      <NuevoInformeInner />
    </Suspense>
  )
}
