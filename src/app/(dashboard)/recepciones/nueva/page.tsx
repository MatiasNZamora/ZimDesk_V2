'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, ArrowLeft, Search, PlusCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { SignaturePad } from '@/components/recepciones/SignaturePad'
import { CONDITION_OPTIONS } from '@/components/recepciones/ReceptionBadges'

type Estructura = {
  id: number
  name: string
  departments: { id: number; name: string }[]
}

export default function NuevaRecepcionPage() {
  const router  = useRouter()
  const qc      = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  // ── Estructura / cliente ──────────────────────────────────────────────────
  const [estructuraQuery,    setEstructuraQuery]    = useState('')
  const [selectedEstructura, setSelectedEstructura] = useState<Estructura | null>(null)
  const [departmentId,       setDepartmentId]       = useState('')
  const [dropdownOpen,       setDropdownOpen]       = useState(false)
  const [showCreateForm,     setShowCreateForm]     = useState(false)
  const [newEstructuraName,  setNewEstructuraName]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Contacto en la empresa ───────────────────────────────────────────────
  const [contactName,  setContactName]  = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // ── Responsable (solo admin puede cambiarlo) ──────────────────────────────
  const [responsibleId, setResponsibleId] = useState('')

  // ── Equipo ────────────────────────────────────────────────────────────────
  const [brand,        setBrand]        = useState('')
  const [model,        setModel]        = useState('')
  const [categoryId,   setCategoryId]   = useState('')
  const [condition,    setCondition]    = useState('BUENO')
  const [intakeDate,   setIntakeDate]   = useState(() => new Date().toISOString().split('T')[0])
  const [observations, setObservations] = useState('')
  const [signature,    setSignature]    = useState<string | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: estructuras = [] } = useQuery<Estructura[]>({
    queryKey: ['estructuras'],
    queryFn:  () => axios.get('/api/estructuras').then(r => r.data),
  })

  const { data: staffUsers = [] } = useQuery({
    queryKey: ['users-staff'],
    queryFn:  () => axios.get('/api/users?role=staff').then(r => r.data),
    enabled:  isAdmin,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['reception-categories'],
    queryFn:  () => axios.get('/api/reception-categories?active=true').then(r => r.data),
  })

  // ── Autocompletado de estructura ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = estructuraQuery.trim().toLowerCase()
    if (!q) return estructuras
    return estructuras.filter(e => e.name.toLowerCase().includes(q))
  }, [estructuras, estructuraQuery])

  function selectEstructura(e: Estructura) {
    setSelectedEstructura(e)
    setEstructuraQuery(e.name)
    setDepartmentId('')
    setDropdownOpen(false)
    setShowCreateForm(false)
  }

  function clearEstructura() {
    setSelectedEstructura(null)
    setEstructuraQuery('')
    setDepartmentId('')
    setDropdownOpen(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Crear estructura nueva ────────────────────────────────────────────────
  const createEstructura = useMutation({
    mutationFn: (name: string) => axios.post('/api/estructuras', { name }).then(r => r.data as Estructura),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['estructuras'] })
      selectEstructura({ ...data, departments: data.departments ?? [] })
      setNewEstructuraName('')
      setShowCreateForm(false)
      toast.success(`Estructura "${data.name}" creada`)
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear la estructura'),
  })

  // ── Submit ────────────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (data: any) => axios.post('/api/recepciones', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Recepción creada correctamente')
      router.push('/recepciones')
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear la recepción'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEstructura) { toast.error('Seleccioná una estructura / cliente'); return }
    if (!signature)          { toast.error('La firma del cliente es requerida'); return }

    create.mutate({
      estructuraId: selectedEstructura.id,
      departmentId: departmentId ? Number(departmentId) : undefined,
      condition,
      intakeDate,
      signatureBase64: signature,
      ...(isAdmin && responsibleId ? { responsibleId: Number(responsibleId) } : {}),
      brand:        brand        || undefined,
      model:        model        || undefined,
      categoryId:   categoryId   ? Number(categoryId) : undefined,
      observations: observations || undefined,
      contactName:  contactName  || undefined,
      contactPhone: contactPhone || undefined,
    })
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/recepciones" className="btn-ghost btn-sm p-1.5"><ArrowLeft size={16} /></Link>
        <h1 className="text-xl font-bold text-slate-800">Nueva Recepción</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* 1. Estructura / Cliente */}
        <Section title="Estructura / Cliente">
          <div>
            <label className="form-label">Empresa *</label>
            <div className="relative">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={estructuraQuery}
                  onChange={e => {
                    setEstructuraQuery(e.target.value)
                    setSelectedEstructura(null)
                    setDropdownOpen(true)
                    setShowCreateForm(false)
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Buscar empresa..."
                  className="form-input pl-8 pr-8"
                  autoComplete="off"
                />
                {estructuraQuery && (
                  <button type="button" onClick={clearEstructura} className="absolute right-2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {dropdownOpen && !selectedEstructura && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {filtered.length > 0 ? (
                      filtered.map(e => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => selectEstructura(e)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span className="font-medium">{e.name}</span>
                          {e.departments.length > 0 && (
                            <span className="text-xs text-slate-400">{e.departments.length} áreas</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">
                        No se encontró "{estructuraQuery}"
                      </div>
                    )}

                    {/* Crear nueva */}
                    {!showCreateForm && (
                      <button
                        type="button"
                        onClick={() => { setShowCreateForm(true); setNewEstructuraName(estructuraQuery) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <PlusCircle size={13} /> Crear nueva estructura
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Form inline de creación */}
            {showCreateForm && (
              <div className="mt-2 p-3 border border-indigo-200 rounded-xl bg-indigo-50 space-y-2">
                <p className="text-xs font-semibold text-indigo-700">Nueva estructura</p>
                <input
                  value={newEstructuraName}
                  onChange={e => setNewEstructuraName(e.target.value)}
                  placeholder="Nombre de la empresa"
                  className="form-input text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => newEstructuraName.trim() && createEstructura.mutate(newEstructuraName.trim())}
                    disabled={!newEstructuraName.trim() || createEstructura.isPending}
                    className="btn-primary btn-sm flex items-center gap-1"
                  >
                    {createEstructura.isPending ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                    Crear
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary btn-sm">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Badge de selección */}
            {selectedEstructura && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                <span className="font-medium text-indigo-700">{selectedEstructura.name}</span>
                <button type="button" onClick={clearEstructura} className="ml-auto text-indigo-400 hover:text-indigo-700">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Selector de departamento (solo si la estructura tiene áreas) */}
          {selectedEstructura && selectedEstructura.departments.length > 0 && (
            <div>
              <label className="form-label">Área / Departamento</label>
              <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                <option value="">Sin área específica</option>
                {selectedEstructura.departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </Section>

        {/* 2. Contacto en la empresa */}
        <Section title="Contacto en la Empresa">
          <p className="text-xs text-slate-400 -mt-1">Persona de referencia del lado del cliente (opcional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nombre del contacto</label>
              <input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="form-input"
                placeholder="Ej: Juan García"
                maxLength={150}
              />
            </div>
            <div>
              <label className="form-label">Teléfono del contacto</label>
              <input
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="form-input"
                placeholder="Ej: +54 11 1234-5678"
                maxLength={50}
              />
            </div>
          </div>
        </Section>

        {/* 3. Equipo */}
        <Section title="Datos del Equipo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Marca</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} className="form-input" placeholder="Ej: Samsung" maxLength={100} />
            </div>
            <div>
              <label className="form-label">Modelo</label>
              <input value={model} onChange={e => setModel(e.target.value)} className="form-input" placeholder="Ej: Galaxy S21" maxLength={100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="form-input">
                <option value="">Sin categoría</option>
                {(categories as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Condición *</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="form-input" required>
                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Fecha de ingreso *</label>
            <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Observaciones</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Estado del equipo, accesorios incluidos, problemas reportados..."
            />
          </div>
        </Section>

        {/* 4. Responsable — solo admin puede elegir otro */}
        {isAdmin && (
          <Section title="Responsable Interno">
            <p className="text-xs text-slate-400 -mt-1">Por defecto se asigna tu usuario. Podés reasignarlo.</p>
            <select value={responsibleId} onChange={e => setResponsibleId(e.target.value)} className="form-input">
              <option value="">Mi usuario (por defecto)</option>
              {(staffUsers as any[]).map((u: any) => (
                <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
              ))}
            </select>
          </Section>
        )}

        {/* 5. Firma */}
        <Section title="Firma de Conformidad">
          <SignaturePad
            label="Firma del cliente *"
            onSave={setSignature}
            savedSignature={signature}
          />
        </Section>

        <div className="flex items-center justify-end gap-3">
          <Link href="/recepciones" className="btn-secondary">Cancelar</Link>
          <button
            type="submit"
            disabled={!signature || !selectedEstructura || create.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Crear Recepción
          </button>
        </div>
      </form>
    </div>
  )
}
