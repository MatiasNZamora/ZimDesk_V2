'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function PlatformNormsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const qc = useQueryClient()
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-norms'],
    queryFn: () => axios.get('/api/platform-norms').then(r => r.data),
  })

  useEffect(() => {
    if (data?.content) setContent(data.content)
  }, [data])

  const save = useMutation({
    mutationFn: () => axios.put('/api/platform-norms', { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-norms'] })
      setEditing(false)
      toast.success('Normas actualizadas')
    },
    onError: () => toast.error('Error al guardar'),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Normas de la Plataforma</h1>
          <p className="text-sm text-slate-500 mt-0.5">Reglas y lineamientos del sistema de tickets</p>
        </div>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">Editar</button>
        )}
      </div>

      {editing ? (
        <div className="card p-6 space-y-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={16}
            className="form-textarea font-mono text-sm"
            placeholder="Escribí las normas en Markdown o texto plano..."
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          {content ? (
            <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap leading-relaxed text-slate-700">
              {content}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-6">No hay normas configuradas todavía.</p>
          )}
        </div>
      )}
    </div>
  )
}
