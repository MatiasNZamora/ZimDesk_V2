'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, Send, Paperclip, X, FileText,
  Download, Lock, Unlock, XCircle, CheckCircle,
  UserCheck, Clock, Play, Settings2, AlertTriangle, History,
} from 'lucide-react'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { formatDate, timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import type { TicketWithRelations } from '@/types'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'
import { Modal } from '@/components/ui/Modal'

// ─── Botón de acción reutilizable ────────────────────────────────────────────
function ActionBtn({
  onClick, disabled, icon, label, description, variant = 'secondary',
}: {
  onClick: () => void
  disabled: boolean
  icon: React.ReactNode
  label: string
  description?: string
  variant?: 'primary' | 'secondary' | 'green' | 'yellow' | 'blue' | 'red'
}) {
  const base = 'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary:   'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
    green:     'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    yellow:    'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    blue:      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
    red:       'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs opacity-70 mt-0.5">{description}</div>}
      </div>
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { data: session } = useSession()
  const qc = useQueryClient()
  const role   = session?.user?.role
  const userId = Number(session?.user?.id)

  // Reply form
  const [message, setMessage] = useState('')
  const [files, setFiles]     = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Modal de gestión (admin)
  const [modalOpen,       setModalOpen]       = useState(false)
  const [pendingAgent,    setPendingAgent]    = useState('')
  const [pendingPriority, setPendingPriority] = useState('')

  // Modal de acciones
  const [actionsModalOpen, setActionsModalOpen] = useState(false)

  // Modal de historial
  const [historialOpen, setHistorialOpen] = useState(false)

  const openManagementModal = () => {
    setPendingAgent(String(ticket?.assignedTo ?? ''))
    setPendingPriority(String(ticket?.priorityId ?? ''))
    setModalOpen(true)
  }

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: ticket, isLoading } = useQuery<TicketWithRelations>({
    queryKey: ['ticket', id],
    queryFn: () => axios.get(`/api/tickets/${id}`).then(r => r.data),
  })

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    enabled: role === 'admin',
    queryFn: () => axios.get('/api/users?role=agent').then(r => r.data),
  })

  const { data: priorities } = useQuery({
    queryKey: ['priorities'],
    enabled: role === 'admin',
    queryFn: () => axios.get('/api/priorities').then(r => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('message', message)
      files.forEach(f => fd.append('files', f))
      return axios.post(`/api/tickets/${id}/messages`, fd)
    },
    onSuccess: () => {
      setMessage(''); setFiles([])
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('Respuesta enviada')
    },
    onError: () => toast.error('Error al enviar la respuesta'),
  })

  const changeStatus = useMutation({
    mutationFn: (action: string) => axios.post(`/api/tickets/${id}/status`, { action }),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      setActionsModalOpen(false)
      const msgs: Record<string, string> = {
        cerrar:          'Ticket cerrado',
        reabrir:         'Ticket reabierto',
        cancelar:        'Ticket cancelado',
        marcar_resuelto: 'Marcado como resuelto',
        tomar:           'Ticket tomado — ahora te está asignado',
        en_espera:       'Ticket en espera del cliente',
        reactivar:       'Ticket reactivado',
      }
      toast.success(msgs[action] ?? 'Estado actualizado')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error'),
  })

  const saveManagement = useMutation({
    mutationFn: () =>
      axios.patch(`/api/tickets/${id}`, {
        assignedTo: pendingAgent ? Number(pendingAgent) : null,
        priorityId: Number(pendingPriority),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      setModalOpen(false)
      toast.success('Cambios guardados — agente notificado')
    },
    onError: () => toast.error('Error al guardar cambios'),
  })

  // ── Estados derivados ─────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  )
  if (!ticket) return <div className="text-center py-12 text-slate-400">Ticket no encontrado</div>

  const slug    = ticket.status.slug
  const isAdmin = role === 'admin'
  const isAgent = role === 'agent'
  const isStaff = isAdmin || isAgent

  const isClosed  = ['cerrado', 'resuelto', 'cancelado'].includes(slug)
  const isWaiting = ['en_espera_cliente', 'respuesta_cliente'].includes(slug)

  const isMyTicket = ticket.assignedTo === userId // el agente ya tiene este ticket

  const actionPending = changeStatus.isPending

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Encabezado ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link href="/tickets" className="btn-ghost btn-sm p-2 mt-0.5">
          <ChevronLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-slate-400 text-sm font-mono">#{ticket.id}</span>
            <StatusBadge slug={slug} name={ticket.status.name} />
            <PriorityBadge name={ticket.priority.name} color={ticket.priority.color} />
            {ticket.slaAlertedAt && !ticket.firstResponseAt && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} /> SLA vencido
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{ticket.subject}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {ticket.creator.name} · {ticket.creator.department?.name} · {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ticket.logs && ticket.logs.length > 0 && (
            <button onClick={() => setHistorialOpen(true)} className="btn-secondary btn-sm hidden sm:flex">
              <History size={14} /> Historial
            </button>
          )}
          <a href={`/api/tickets/${id}/pdf`} target="_blank" className="btn-secondary btn-sm hidden sm:flex">
            <Download size={14} /> PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Hilo de conversación ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Descripción inicial */}
          <div className="card p-5 border-l-4 border-l-slate-300 dark:border-l-slate-600">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-200 shrink-0">
                {ticket.creator.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ticket.creator.name}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                    Cliente
                  </span>
                </div>
                <p className="text-xs text-slate-400">{timeAgo(ticket.createdAt)}</p>
              </div>
            </div>
            <RichTextDisplay content={ticket.description} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" />
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 mb-2">Adjuntos del ticket</p>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map(a => (
                    <a key={a.id} href={a.filePath} target="_blank"
                      className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600">
                      <FileText size={13} /> {a.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mensajes */}
          {ticket.messages?.map(msg => {
            const isAgent = msg.user.role === 'agent'
            const isAdmin = msg.user.role === 'admin'
            const isClient = msg.user.role === 'client'

            const avatarClass = isAdmin
              ? 'bg-violet-600 text-white'
              : isAgent
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'

            const cardClass = isAdmin
              ? 'border-l-4 border-l-violet-400 bg-violet-50/40 dark:bg-violet-900/10 dark:border-l-violet-600'
              : isAgent
              ? 'border-l-4 border-l-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/10 dark:border-l-indigo-600'
              : 'border-l-4 border-l-slate-300 dark:border-l-slate-600'

            const badgeClass = isAdmin
              ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400'
              : isAgent
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'

            const badgeLabel = isAdmin ? 'Admin' : isAgent ? 'Agente' : 'Cliente'

            return (
              <div key={msg.id} className={`card p-5 ${cardClass}`}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarClass}`}>
                    {msg.user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{msg.user.name}</p>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{timeAgo(msg.createdAt)}</p>
                  </div>
                </div>
                <RichTextDisplay content={msg.message} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" />
                {msg.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                    {msg.attachments.map(a => (
                      <a key={a.id} href={a.filePath} target="_blank"
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600">
                        <FileText size={12} /> {a.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Formulario de respuesta */}
          {!isClosed && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Responder</h3>
              <div className="mb-3">
                <RichTextEditor value={message} onChange={setMessage} placeholder="Escribí tu respuesta..." minHeight="120px" />
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs">
                      <FileText size={12} className="text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300 max-w-[100px] truncate">{f.name}</span>
                      <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 justify-between">
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost btn-sm">
                  <Paperclip size={14} /> Adjuntar
                </button>
                <input ref={fileRef} type="file" multiple className="hidden"
                  onChange={e => setFiles(p => [...p, ...Array.from(e.target.files ?? [])])} />
                <button
                  onClick={() => sendMessage.mutate()}
                  disabled={message.replace(/<[^>]*>/g, '').trim().length === 0 || sendMessage.isPending}
                  className="btn-primary btn-sm"
                >
                  {sendMessage.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Panel lateral ─────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Info del ticket */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Información</h3>
            <dl className="space-y-2.5">
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Estado</dt>
                <dd><StatusBadge slug={slug} name={ticket.status.name} /></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Prioridad</dt>
                <dd><PriorityBadge name={ticket.priority.name} color={ticket.priority.color} /></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Categoría</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300">{ticket.category.name}</dd>
              </div>
              <div className="pt-1 pb-0.5 border-t border-slate-100 dark:border-slate-700" />
              <div className="flex justify-between items-start">
                <dt className="text-xs text-slate-500 mt-0.5">Empresa</dt>
                <dd>
                  {ticket.creator.department?.estructura?.name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      {ticket.creator.department.estructura.name}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Solicitante</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300">{ticket.creator.name}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Departamento</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300">
                  {ticket.creator.department?.name ?? '—'}
                </dd>
              </div>
              <div className="pt-1 pb-0.5 border-t border-slate-100 dark:border-slate-700" />
              <div className="flex justify-between items-center">
                <dt className="text-xs text-slate-500">Agente</dt>
                <dd className="text-sm text-slate-700 dark:text-slate-300">
                  {ticket.agent?.name ?? (
                    <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                      Sin asignar
                    </span>
                  )}
                </dd>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-slate-500">1ª Respuesta</dt>
                  <dd className="text-xs text-slate-600 dark:text-slate-400" title={formatDate(ticket.firstResponseAt)}>
                    {timeAgo(ticket.firstResponseAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Botón de gestión (solo admin) */}
          {isAdmin && (
            <button
              onClick={openManagementModal}
              className="btn-secondary w-full justify-center gap-2"
            >
              <Settings2 size={15} />
              Gestionar ticket
            </button>
          )}

          {/* Botón de acciones */}
          <button
            onClick={() => setActionsModalOpen(true)}
            className="btn-secondary w-full justify-center gap-2"
          >
            <Play size={15} />
            Acciones del ticket
          </button>

        </div>
      </div>

      {/* ── Modal de historial ───────────────────────────────────────────── */}
      <Modal
        open={historialOpen}
        onClose={() => setHistorialOpen(false)}
        title="Historial del ticket"
        size="sm"
      >
        <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-slate-500 font-medium mb-0.5">Ticket #{ticket.id}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{ticket.subject}</p>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {(ticket.logs ?? []).map((log, i) => (
            <div key={log.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1" />
                {i < (ticket.logs?.length ?? 0) - 1 && (
                  <div className="w-px flex-1 bg-slate-200 mt-1" />
                )}
              </div>
              <div className="pb-3">
                <p className="text-sm text-slate-700 leading-relaxed">{log.action}</p>
                <p className="text-xs text-slate-400 mt-0.5" title={formatDate(log.createdAt)}>
                  {timeAgo(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button onClick={() => setHistorialOpen(false)} className="btn-secondary btn-sm w-full justify-center">
            Cerrar
          </button>
        </div>
      </Modal>

      {/* ── Modal de acciones ────────────────────────────────────────────── */}
      <Modal
        open={actionsModalOpen}
        onClose={() => setActionsModalOpen(false)}
        title="Acciones del ticket"
        size="sm"
      >
        {/* Resumen del ticket */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-slate-500 font-medium mb-0.5">Ticket #{ticket.id}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge slug={slug} name={ticket.status.name} />
            <PriorityBadge name={ticket.priority.name} color={ticket.priority.color} />
          </div>
        </div>

        <div className="space-y-2">
          {/* TOMAR TICKET */}
          {isAgent && !isClosed && !isMyTicket && (
            <ActionBtn
              onClick={() => changeStatus.mutate('tomar')}
              disabled={actionPending}
              icon={<UserCheck size={15} />}
              label="Tomar ticket"
              description="Te asignás y ponés en progreso"
              variant="primary"
            />
          )}

          {/* EN ESPERA DEL CLIENTE */}
          {isStaff && !isClosed && !isWaiting && (
            <ActionBtn
              onClick={() => changeStatus.mutate('en_espera')}
              disabled={actionPending}
              icon={<Clock size={15} />}
              label="En espera del cliente"
              description="Esperando respuesta del solicitante"
              variant="yellow"
            />
          )}

          {/* REACTIVAR */}
          {isStaff && isWaiting && (
            <ActionBtn
              onClick={() => changeStatus.mutate('reactivar')}
              disabled={actionPending}
              icon={<Play size={15} />}
              label="Reactivar"
              description="Volver a En Progreso"
              variant="blue"
            />
          )}

          {/* CERRAR */}
          {isStaff && !isClosed && (
            <ActionBtn
              onClick={() => changeStatus.mutate('cerrar')}
              disabled={actionPending}
              icon={<Lock size={15} />}
              label="Cerrar ticket"
              description="Marcar como cerrado"
              variant="secondary"
            />
          )}

          {/* MARCAR RESUELTO */}
          {isAdmin && slug === 'cerrado' && (
            <ActionBtn
              onClick={() => changeStatus.mutate('marcar_resuelto')}
              disabled={actionPending}
              icon={<CheckCircle size={15} />}
              label="Marcar como resuelto"
              description="Confirmar resolución definitiva"
              variant="green"
            />
          )}

          {/* DAR CONFORMIDAD — solo cliente cuando está resuelto */}
          {slug === 'resuelto' && role === 'client' && (
            <ActionBtn
              onClick={() => changeStatus.mutate('dar_conformidad')}
              disabled={actionPending}
              icon={<CheckCircle size={15} />}
              label="Dar conformidad"
              description="Confirmar que la solución es satisfactoria"
              variant="green"
            />
          )}

          {/* REABRIR */}
          {['cerrado', 'resuelto'].includes(slug) && (role === 'admin' || role === 'client') && (
            <ActionBtn
              onClick={() => changeStatus.mutate('reabrir')}
              disabled={actionPending}
              icon={<Unlock size={15} />}
              label="Reabrir ticket"
              description="Volver a estado abierto"
              variant="secondary"
            />
          )}

          {/* CANCELAR */}
          {isAdmin && !['cancelado', 'resuelto'].includes(slug) && (
            <ActionBtn
              onClick={() => changeStatus.mutate('cancelar')}
              disabled={actionPending}
              icon={<XCircle size={15} />}
              label="Cancelar ticket"
              description="Cancelar sin resolver"
              variant="red"
            />
          )}

          {/* Sin acciones */}
          {isClosed && !isAdmin && role !== 'client' && (
            <p className="text-xs text-slate-400 text-center py-4">No hay acciones disponibles para este estado</p>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActionsModalOpen(false)}
            className="btn-secondary btn-sm w-full justify-center"
            disabled={actionPending}
          >
            Cerrar
          </button>
        </div>
      </Modal>

      {/* ── Modal de gestión (admin) ──────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Gestionar ticket"
        size="sm"
      >
        {/* Resumen del ticket */}
        <div className="bg-slate-50 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-slate-500 font-medium mb-0.5">Ticket #{ticket.id}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge slug={slug} name={ticket.status.name} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Agente */}
          <div>
            <label className="form-label">Agente asignado</label>
            <select
              className="form-select"
              value={pendingAgent}
              onChange={e => setPendingAgent(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {(agents ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {pendingAgent && pendingAgent !== String(ticket.assignedTo ?? '') && (
              <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                <UserCheck size={11} />
                El agente recibirá una notificación al guardar
              </p>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="form-label">Prioridad</label>
            <div className="grid grid-cols-2 gap-2">
              {(priorities ?? []).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPendingPriority(String(p.id))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    pendingPriority === String(p.id)
                      ? 'border-2 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={pendingPriority === String(p.id) ? {
                    borderColor: p.color,
                    backgroundColor: `${p.color}12`,
                    color: p.color,
                  } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="btn-secondary btn-sm"
            disabled={saveManagement.isPending}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => saveManagement.mutate()}
            disabled={saveManagement.isPending}
            className="btn-primary btn-sm"
          >
            {saveManagement.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <Settings2 size={13} />}
            Guardar cambios
          </button>
        </div>
      </Modal>
    </div>
  )
}
