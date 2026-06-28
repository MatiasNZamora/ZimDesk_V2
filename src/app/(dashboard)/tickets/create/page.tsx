'use client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Loader2, Upload, X, FileText, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ALLOWED_MIME } from '@/lib/utils'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

const schema = z.object({
  subject: z.string().min(3, 'Mínimo 3 caracteres').max(255),
  description: z.string().min(10, 'Describí el problema con más detalle'),
  categoryId: z.string().min(1, 'Seleccioná una categoría'),
})

type FormValues = z.infer<typeof schema>

export default function CreateTicketPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [description, setDescription] = useState('')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axios.get('/api/categories').then(r => r.data),
  })

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted].slice(0, 5))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(ALLOWED_MIME.map(m => [m, []])),
    maxFiles: 5,
    maxSize: 80 * 1024 * 1024,
  })

  async function onSubmit(data: FormValues) {
    const formData = new FormData()
    formData.append('subject', data.subject)
    formData.append('description', description || data.description)
    formData.append('categoryId', data.categoryId)
    files.forEach(f => formData.append('files', f))

    try {
      const res = await axios.post('/api/tickets', formData)
      toast.success('Ticket creado exitosamente')
      router.push(`/tickets/${res.data.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al crear el ticket')
    }
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tickets" className="btn-ghost btn-sm p-2">
          <ChevronLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Nuevo Ticket</h1>
          <p className="text-sm text-slate-500">Describí tu problema y te responderemos a la brevedad</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="card p-6 space-y-5">
          <div>
            <label className="form-label">Asunto *</label>
            <input
              {...register('subject')}
              placeholder="Resumí el problema en una línea"
              className="form-input"
            />
            {errors.subject && <p className="form-error">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="form-label">Categoría *</label>
            <select {...register('categoryId')} className="form-select">
              <option value="">Seleccioná una categoría</option>
              {(categories ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="form-error">{errors.categoryId.message}</p>}
          </div>

          <div>
            <label className="form-label">Descripción *</label>
            <RichTextEditor
              value={description}
              onChange={(html) => {
                setDescription(html)
                setValue('description', html, { shouldValidate: true })
              }}
              placeholder="Describí el problema en detalle. Incluí pasos para reproducirlo si es posible."
              minHeight="160px"
            />
            {errors.description && <p className="form-error">{errors.description.message}</p>}
          </div>
        </div>

        {/* Adjuntos */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Archivos adjuntos (opcional)</h2>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">
              {isDragActive ? 'Soltá los archivos aquí' : 'Arrastrá archivos o hacé clic para seleccionar'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Máx. 5 archivos · 10MB c/u (videos hasta 80MB)</p>
          </div>

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-slate-400">{formatSize(f.size)}</span>
                  <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 p-0.5">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Link href="/tickets" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {isSubmitting ? 'Enviando...' : 'Crear Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
