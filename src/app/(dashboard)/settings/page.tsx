'use client'
import { useAppConfig } from '@/lib/useAppConfig'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2, Globe, Palette, Mail, Shield, Upload, X, Link2 } from 'lucide-react'

type ConfigForm = {
  app_name: string
  logo_url: string
  favicon_url: string
  accent_color: string
  support_email: string
  footer_text: string
  max_attach_mb: string
  tickets_per_page: string
  allow_client_create: string
}

// ── Componente dual: subir archivo o pegar URL ─────────────────────────────
function BrandingInput({
  field,
  value,
  onChange,
  accept,
  label,
  previewSize = 40,
}: {
  field: 'logo' | 'favicon'
  value: string
  onChange: (url: string) => void
  accept: string
  label: string
  previewSize?: number
}) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', field)
      const res = await axios.post('/api/config/upload', fd)
      onChange(res.data.url)
      toast.success('Archivo subido correctamente')
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Error al subir el archivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {/* Toggle modo */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            mode === 'url'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 font-medium'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Link2 size={12} /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
            mode === 'file'
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 font-medium'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Upload size={12} /> Subir archivo
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Preview */}
        {value ? (
          <div
            className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center"
            style={{ width: previewSize, height: previewSize }}
          >
            <img src={value} alt={label} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            className="shrink-0 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600"
            style={{ width: previewSize, height: previewSize }}
          >
            <Upload size={16} />
          </div>
        )}

        {/* Input según modo */}
        {mode === 'url' ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="url"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="https://mi-empresa.com/logo.png"
              className="form-input flex-1"
            />
            {value && (
              <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-1">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 size={14} className="animate-spin text-indigo-600" />
              ) : (
                <Upload size={14} className="text-slate-400" />
              )}
              <span className="text-sm text-slate-500">{uploading ? 'Subiendo…' : 'Elegir archivo'}</span>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                onChange={handleFile}
                disabled={uploading}
                className="sr-only"
              />
            </label>
            {value && (
              <p className="text-xs text-slate-400 truncate" title={value}>{value}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Secciones ──────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-700">
      <div className="px-5 py-4 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <Icon size={15} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
      <div className="sm:pt-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: config, isLoading } = useAppConfig()

  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<ConfigForm>()

  useEffect(() => {
    if (config) reset(config)
  }, [config, reset])

  const save = useMutation({
    mutationFn: (data: ConfigForm) => axios.post('/api/config', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-config'] })
      toast.success('Configuración guardada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al guardar'),
  })

  // Usamos getValues() en onSubmit para garantizar que los campos
  // actualizados via setValue (logo_url, favicon_url) estén incluidos
  function onSubmit() {
    save.mutate(getValues())
  }

  const logoUrl      = watch('logo_url')     ?? ''
  const faviconUrl   = watch('favicon_url')  ?? ''
  const appName      = watch('app_name')     ?? ''
  // Fallback explícito: type="color" falla con string vacío
  const accentColor  = watch('accent_color') || '#4f46e5'
  const clientCreate = watch('allow_client_create')

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="space-y-5 max-w-3xl">
      {/* Campos ocultos registrados para logo y favicon — garantizan inclusión en getValues() */}
      <input type="hidden" {...register('logo_url')} />
      <input type="hidden" {...register('favicon_url')} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Configuración del sistema</h1>
        <button type="submit" disabled={save.isPending} className="btn-primary btn-sm">
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Guardar cambios
        </button>
      </div>

      {/* Vista previa del branding */}
      <div className="card p-4 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
        <div
          className={`w-10 h-10 flex items-center justify-center shrink-0 ${logoUrl ? '' : 'rounded-xl'}`}
          style={{ background: logoUrl ? 'transparent' : accentColor }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="w-10 h-10 object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">{(appName || 'Z')[0]}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{appName || 'ZimDesk'}</p>
            <p className="text-xs text-slate-400">Vista previa · sidebar</p>
          </div>
          {faviconUrl && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1">
              <img src={faviconUrl} alt="favicon" className="w-4 h-4 object-contain" />
              <span className="text-xs text-slate-500">favicon</span>
            </div>
          )}
        </div>
      </div>

      <Section icon={Globe} title="Identidad del sistema">
        <Field label="Nombre del sistema" hint="Aparece en el sidebar y en el título del navegador">
          <input {...register('app_name')} className="form-input" placeholder="ZimDesk" />
        </Field>

        <Field label="Logo" hint="PNG, SVG o JPG cuadrado (máx. 2 MB). Se muestra en el sidebar.">
          <BrandingInput
            field="logo"
            value={logoUrl}
            onChange={v => setValue('logo_url', v, { shouldDirty: true })}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            label="Logo"
            previewSize={48}
          />
        </Field>

        <Field label="Favicon" hint="ICO, PNG o SVG (máx. 2 MB). Aparece en la pestaña del navegador.">
          <BrandingInput
            field="favicon"
            value={faviconUrl}
            onChange={v => setValue('favicon_url', v, { shouldDirty: true })}
            accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
            label="Favicon"
            previewSize={32}
          />
        </Field>

        <Field label="Texto del pie de página" hint="Aparece en la parte inferior del sidebar">
          <input {...register('footer_text')} className="form-input" placeholder="ZimDesk v2 · Mi Empresa" />
        </Field>
      </Section>

      <Section icon={Palette} title="Apariencia">
        <Field label="Color de acento" hint="Color principal de botones y elementos destacados">
          <div className="flex items-center gap-3">
            {/* Color picker no registrado: solo actualiza el campo de texto via setValue */}
            <input
              type="color"
              value={accentColor}
              onChange={e => setValue('accent_color', e.target.value, { shouldDirty: true })}
              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer p-0.5"
            />
            {/* Campo de texto registrado: es la fuente de verdad */}
            <input
              {...register('accent_color')}
              className="form-input font-mono w-36"
              placeholder="#4f46e5"
            />
            <div
              className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
              style={{ background: accentColor }}
            />
          </div>
        </Field>
      </Section>

      <Section icon={Mail} title="Soporte y contacto">
        <Field label="Email de soporte" hint="Dirección de contacto mostrada a los usuarios">
          <input {...register('support_email')} className="form-input" placeholder="soporte@mi-empresa.com" />
        </Field>
      </Section>

      <Section icon={Shield} title="Permisos y límites">
        <Field label="Clientes pueden crear tickets" hint="Si está desactivado, solo admins y agentes crean tickets">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={clientCreate === 'true' || clientCreate === true as any}
              onChange={e => setValue('allow_client_create', e.target.checked ? 'true' : 'false', { shouldDirty: true })}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">Habilitado</span>
          </label>
        </Field>
        <Field label="Tamaño máximo de adjuntos" hint="En megabytes (MB) por archivo. Next.js soporta hasta ~4 GB con streaming.">
          <div className="flex items-center gap-2">
            <input
              {...register('max_attach_mb')}
              type="number"
              min="1"
              className="form-input w-28"
            />
            <span className="text-sm text-slate-500">MB</span>
          </div>
        </Field>
        <Field label="Tickets por página" hint="En la lista de gestión de tickets">
          <select {...register('tickets_per_page')} className="form-select w-32">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end">
        <button type="submit" disabled={save.isPending} className="btn-primary">
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          Guardar configuración
        </button>
      </div>
    </form>
  )
}
