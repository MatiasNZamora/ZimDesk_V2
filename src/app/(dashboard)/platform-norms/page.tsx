'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PlusCircle, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { RichTextDisplay } from '@/components/ui/RichTextDisplay'
import { toast } from 'sonner'

type PlatformNorm = { id: number; title: string; content: string }

function PlatformNormsContent() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const openParam = searchParams.get('open')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlatformNorm | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  // Id de la norma abierta (no índice): permite deep-linkear una norma puntual
  // desde una mención "@" en tickets/chat vía /platform-norms?open=<id>.
  const [openId, setOpenId] = useState<number | null>(openParam ? Number(openParam) : null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const { data, isLoading } = useQuery({
    queryKey: ['platform-norms'],
    queryFn: () => axios.get('/api/platform-norms').then(r => r.data as PlatformNorm[]),
  })

  useEffect(() => {
    if (!data || data.length === 0) return
    if (openParam) {
      setOpenId(Number(openParam))
      cardRefs.current.get(Number(openParam))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (openId === null) {
      setOpenId(data[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, openParam])

  const save = useMutation({
    mutationFn: () => editing
      ? axios.put(`/api/platform-norms/${editing.id}`, { title, content })
      : axios.post('/api/platform-norms', { title, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-norms'] })
      setModalOpen(false)
      toast.success(editing ? 'Norma actualizada' : 'Norma creada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/platform-norms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platform-norms'] }); setDeleteId(null); toast.success('Norma eliminada') },
    onError: () => toast.error('Error al eliminar'),
  })

  function openCreate() { setEditing(null); setTitle(''); setContent(''); setModalOpen(true) }
  function openEdit(norm: PlatformNorm) { setEditing(norm); setTitle(norm.title); setContent(norm.content); setModalOpen(true) }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Normas de la Plataforma</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reglas y lineamientos del sistema de tickets</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary btn-sm"><PlusCircle size={15} /> Nueva Norma</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).length === 0 && (
            <div className="card p-8 text-center text-slate-400">No hay normas configuradas todavía.</div>
          )}
          {(data ?? []).map(norm => (
            <div
              key={norm.id}
              ref={el => { if (el) cardRefs.current.set(norm.id, el); else cardRefs.current.delete(norm.id) }}
              className="card overflow-hidden scroll-mt-4"
            >
              <button
                onClick={() => setOpenId(openId === norm.id ? null : norm.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800 pr-4">{norm.title}</span>
                {openId === norm.id ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </button>
              {openId === norm.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <RichTextDisplay content={norm.content} />
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openEdit(norm)} className="btn-secondary btn-sm">
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => setDeleteId(norm.id)} className="btn-sm btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Norma' : 'Nueva Norma'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="form-label">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="Ej: General, Uso del sistema, Horarios..." />
          </div>
          <div>
            <label className="form-label">Descripción *</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Describí la norma. Podés resaltar texto en negrita/cursiva, usar listas y emojis 🙂"
              minHeight="150px"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={!title.trim() || !content.trim() || save.isPending} className="btn-primary">
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar Norma" size="sm">
        <p className="text-slate-600 mb-4">¿Eliminás esta norma de la plataforma?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => remove.mutate(deleteId!)} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}

export default function PlatformNormsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>}>
      <PlatformNormsContent />
    </Suspense>
  )
}
