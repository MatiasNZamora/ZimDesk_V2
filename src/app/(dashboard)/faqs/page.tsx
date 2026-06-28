'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

export default function FaqsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => axios.get('/api/faqs').then(r => r.data),
  })

  const save = useMutation({
    mutationFn: () => editing
      ? axios.put(`/api/faqs/${editing.id}`, { question, answer })
      : axios.post('/api/faqs', { question, answer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faqs'] })
      setModalOpen(false)
      toast.success(editing ? 'FAQ actualizada' : 'FAQ creada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/faqs/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs'] }); setDeleteId(null); toast.success('FAQ eliminada') },
  })

  function openCreate() { setEditing(null); setQuestion(''); setAnswer(''); setModalOpen(true) }
  function openEdit(f: any) { setEditing(f); setQuestion(f.question); setAnswer(f.answer); setModalOpen(true) }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Preguntas Frecuentes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Respuestas a las dudas más comunes</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary btn-sm"><PlusCircle size={15} /> Nueva FAQ</button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).length === 0 && (
            <div className="card p-8 text-center text-slate-400">Sin preguntas frecuentes</div>
          )}
          {(data ?? []).map((faq: any, idx: number) => (
            <div key={faq.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-800 pr-4">{faq.question}</span>
                {openIdx === idx ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </button>
              {openIdx === idx && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <p className="text-slate-600 text-sm leading-relaxed pt-4 whitespace-pre-wrap">{faq.answer}</p>
                  {isAdmin && (
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openEdit(faq)} className="btn-secondary btn-sm">
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => setDeleteId(faq.id)} className="btn-sm btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar FAQ' : 'Nueva FAQ'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="form-label">Pregunta *</label>
            <input value={question} onChange={e => setQuestion(e.target.value)} className="form-input" placeholder="¿Cómo...?" />
          </div>
          <div>
            <label className="form-label">Respuesta *</label>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={5} className="form-textarea" placeholder="Respuesta detallada..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={!question.trim() || !answer.trim() || save.isPending} className="btn-primary">
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Eliminar FAQ" size="sm">
        <p className="text-slate-600 mb-4">¿Eliminás esta pregunta frecuente?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => remove.mutate(deleteId!)} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </div>
  )
}
