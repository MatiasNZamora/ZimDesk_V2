'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

export type FilterDef = {
  key: string
  label: string
  type: 'select' | 'boolean' | 'date' | 'text'
  options?: { value: string; label: string }[]
  defaultValue: string | boolean
}

export type FilterValues = Record<string, string | boolean>
export type FilterVisibility = Record<string, boolean>

interface FilterConfigModalProps {
  isOpen: boolean
  onClose: () => void
  filterDefs: FilterDef[]
  values: FilterValues
  visibility: FilterVisibility
  onApply: (values: FilterValues, visibility: FilterVisibility) => void
}

export function FilterConfigModal({
  isOpen,
  onClose,
  filterDefs,
  values,
  visibility,
  onApply,
}: FilterConfigModalProps) {
  const [localValues, setLocalValues] = useState<FilterValues>(values)
  const [localVisibility, setLocalVisibility] = useState<FilterVisibility>(visibility)

  useEffect(() => {
    if (isOpen) {
      setLocalValues(values)
      setLocalVisibility(visibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleApply = () => {
    onApply(localValues, localVisibility)
    onClose()
  }

  const handleClear = () => {
    const cleared: FilterValues = {}
    for (const def of filterDefs) cleared[def.key] = def.defaultValue
    setLocalValues(cleared)
  }

  const toggleVisibility = (key: string) => {
    setLocalVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const setValue = (key: string, value: string | boolean) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Configurar filtros" size="lg">
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        Elegí qué filtros mostrar en la barra y configurá sus valores
      </p>

      <div className="overflow-y-auto max-h-[55vh] -mx-6 px-6 space-y-3">
        {filterDefs.map(def => {
          const isActive = localValues[def.key] !== def.defaultValue
          const isVisible = localVisibility[def.key] ?? false
          const isHiddenButActive = isActive && !isVisible

          return (
            <div
              key={def.key}
              className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100 last:border-0"
            >
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleVisibility(def.key)}
                  className="h-4 w-4 accent-indigo-600 rounded"
                />
                <span className="text-xs text-slate-500 select-none">Barra</span>
              </label>

              <span className="text-sm font-medium text-slate-700 flex-1 min-w-0">
                {def.label}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                {isActive && (
                  <span className="badge bg-indigo-100 text-indigo-700">
                    activo
                  </span>
                )}
                {isHiddenButActive && (
                  <span className="badge bg-amber-100 text-amber-700">
                    oculto
                  </span>
                )}
              </div>

              <div className="shrink-0">
                {def.type === 'select' ? (
                  <select
                    value={localValues[def.key] as string}
                    onChange={e => setValue(def.key, e.target.value)}
                    className="form-select py-1.5 min-w-[150px]"
                  >
                    <option value={def.defaultValue as string}>Todas</option>
                    {def.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : def.type === 'date' ? (
                  <input
                    type="date"
                    value={localValues[def.key] as string}
                    onChange={e => setValue(def.key, e.target.value)}
                    className="form-input py-1.5"
                  />
                ) : def.type === 'text' ? (
                  <input
                    type="text"
                    value={localValues[def.key] as string}
                    onChange={e => setValue(def.key, e.target.value)}
                    placeholder="Buscar..."
                    className="form-input py-1.5 min-w-[150px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setValue(def.key, !localValues[def.key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                      localValues[def.key] ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        localValues[def.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          Limpiar todo
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={handleApply} className="btn-primary">Aplicar</button>
        </div>
      </div>
    </Modal>
  )
}

interface GearFilterButtonProps {
  activeFilterCount: number
  onClick: () => void
}

export function GearFilterButton({ activeFilterCount, onClick }: GearFilterButtonProps) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        title="Configurar filtros"
        className={
          activeFilterCount > 0
            ? 'btn bg-indigo-600 text-white hover:bg-indigo-700 p-2'
            : 'btn-secondary p-2'
        }
      >
        <SlidersHorizontal size={16} />
      </button>
      {activeFilterCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {activeFilterCount > 9 ? '9+' : activeFilterCount}
        </span>
      )}
    </div>
  )
}
