'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, Send, Paperclip, X, FileText,
  Download, Lock, Unlock, RefreshCw, XCircle, CheckCircle, User,
} from 'lucide-react'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { formatDate, timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import type { TicketWithRelations } from '@/types'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'

export default function TicketDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { data: session } = useSession()
  const qc = useQueryClient()
  const role = session?.user?.role

  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

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
      const msgs: Record<string, string> = {
        cerrar: 'Ticket cerrado', reabrir: 'Ticket reabierto',
        cancelar: 'Ticket cancelado', marcar_resuelto: 'Marcado como resuelto',
      }
      toast.success(msgs[action] ?? 'Estado actualizado')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error'),
  })

  const assignTicket = useMutation({
    mutationFn: (data: { assignedTo?: number | null; priorityId?: number }) =>
      axios.patch(`/api/tickets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      toast.success('Ticket actualizado')
    },
    onError: () => toast.error('Error al actualizar'),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  )
  if (!ticket) return <div className="text-center py-12 text-slate-400">Ticket no encontrado</div>

  const isClosed = ['cerrado', 'resuelto', 'cancelado'].includes(ticket.status.slug)
  const userId = Number(session?.user?.id)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <Link href="/tickets" className="btn-ghost btn-sm p-2 mt-0.5">
          <ChevronLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-slate-400 text-sm font-mono">#{ticket.id}</span>
            <StatusBadge slug={ticket.status.slug} name={ticket.status.name} />
            <PriorityBadge name={ticket.priority.name} color={ticket.priority.color} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 truncate">{ticket.subject}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {ticket.creator.name} · {ticket.creator.department?.name} · {formatDate(ticket.createdAt)}
          </p>
        </div>
        <a
          href={`/api/tickets/${id}/pdf`}
          target="_blank"
          className="btn-secondary btn-sm hidden sm:flex"
        >
          <Download size={14} /> PDF
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hilo de conversación */}
        <div className="lg:col-span-2 space-y-4">
          {/* Descripción inicial */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-semibold">
                {ticket.creator.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{ticket.creator.name}</p>
                <p className="text-xs text-slate-400">{timeAgo(ticket.createdAt)}</p>
              </div>
            </div>
            <RichTextDisplay content={ticket.description} className="text-sm text-slate-700 leading-relaxed" />

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Adjuntos del ticket</p>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map(a => (
                    <a
                      key={a.id}
                      href={a.filePath}
                      target="_blank"
                      className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      <FileText size={13} /> {a.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mensajes */}
          {ticket.messages?.map(msg => {
            const isStaff = ['admin', 'agent'].includes(msg.user.role)
            return (
              <div key={msg.id} className={`card p-5 ${isStaff ? 'border-indigo-200 bg-indigo-50/30' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isStaff ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {msg.user.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{msg.user.name}</p>
                      {isStaff && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                        {msg.user.role === 'admin' ? 'Admin' : 'Agente'}
                      </span>}
                    </div>
                    <p className="text-xs text-slate-400">{timeAgo(msg.createdAt)}</p>
                  </div>
                </div>
                <RichTextDisplay content={msg.message} className="text-sm text-slate-700 leading-relaxed" />
                {msg.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {msg.attachments.map(a => (
                      <a
                        key={a.id}
                        href={a.filePath}
                        target="_blank"
                        className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
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
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Responder</h3>
              <div className="mb-3">
                <RichTextEditor
                  value={message}
                  onChange={setMessage}
                  placeholder="Escribí tu respuesta..."
                  minHeight="120px"
                />
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                      <FileText size={12} className="text-slate-400" />
                      <span className="text-slate-600 max-w-[100px] truncate">{f.name}</span>
                      <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost btn-sm"
                >
                  <Paperclip size={14} /> Adjuntar
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => setFiles(p => [...p, ...Array.from(e.target.files ?? [])])}
                />
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

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Info del ticket */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Información</h3>
            <dl className="space-y-2.5">
              <div className="flex justify-between">
                <dt className="text-xs text-slate-500">Estado</dt>
                <dd><StatusBadge slug={ticket.status.slug} name={ticket.status.name} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-slate-500">Prioridad</dt>
                <dd><PriorityBadge name={ticket.priority.name} color={ticket.priority.color} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-slate-500">Categoría</dt>
                <dd className="text-sm text-slate-700">{ticket.category.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-slate-500">Agente</dt>
                <dd className="text-sm text-slate-700">
                  {ticket.agent?.name ?? <span className="text-amber-500">Sin asignar</span>}
                </dd>
              </div>
              {ticket.firstResponseAt && (
                <div className="flex justify-between">
                  <dt className="text-xs text-slate-500">1ª Respuesta</dt>
                  <dd className="text-xs text-slate-600">{formatDate(ticket.firstResponseAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Acciones admin */}
          {role === 'admin' && (
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Gestión</h3>
              <div>
                <label className="form-label text-xs">Asignar Agente</label>
                <select
                  className="form-select text-sm"
                  value={ticket.assignedTo ?? ''}
                  onChange={e => assignTicket.mutate({ assignedTo: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Sin asignar</option>
                  {(agents ?? []).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Prioridad</label>
                <select
                  className="form-select text-sm"
                  value={ticket.priorityId}
                  onChange={e => assignTicket.mutate({ priorityId: Number(e.target.value) })}
                >
                  {(priorities ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="card p-5 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Acciones</h3>
            {!isClosed && (role === 'admin' || role === 'agent') && (
              <button
                onClick={() => changeStatus.mutate('cerrar')}
                disabled={changeStatus.isPending}
                className="btn-secondary btn-sm w-full justify-start"
              >
                <Lock size={14} /> Cerrar ticket
              </button>
            )}
            {ticket.status.slug === 'cerrado' && role === 'admin' && (
              <button
                onClick={() => changeStatus.mutate('marcar_resuelto')}
                disabled={changeStatus.isPending}
                className="w-full btn btn-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 justify-start"
              >
                <CheckCircle size={14} /> Marcar resuelto
              </button>
            )}
            {['cerrado', 'resuelto'].includes(ticket.status.slug) && (
              <button
                onClick={() => changeStatus.mutate('reabrir')}
                disabled={changeStatus.isPending}
                className="btn-secondary btn-sm w-full justify-start"
              >
                <Unlock size={14} /> Reabrir ticket
              </button>
            )}
            {ticket.status.slug === 'abierto' && !ticket.assignedTo && role === 'admin' && (
              <button
                onClick={() => changeStatus.mutate('cancelar')}
                disabled={changeStatus.isPending}
                className="w-full btn btn-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 justify-start"
              >
                <XCircle size={14} /> Cancelar ticket
              </button>
            )}
          </div>

          {/* Logs */}
          {ticket.logs && ticket.logs.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historial</h3>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {ticket.logs.map(log => (
                  <div key={log.id} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600 leading-relaxed">{log.action}</p>
                      <p className="text-xs text-slate-400">{formatDate(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
