import { useState, useEffect } from 'react'
import type { FilterDef, FilterValues, FilterVisibility } from '@/components/ui/FilterConfigModal'

export function useFilterConfig(
  pageKey: string,
  filterDefs: FilterDef[],
  values: FilterValues,
  defaultVisibility: FilterVisibility
): {
  visibility: FilterVisibility
  setVisibility: (v: FilterVisibility) => void
  activeFilterCount: number
} {
  const storageKey = `zimdesk_filters_${pageKey}`

  // Nunca leer localStorage en el estado inicial: estas páginas se pre-renderizan
  // en el servidor y localStorage no existe ahí (crashea o produce hydration mismatch).
  const [visibility, setVisibilityState] = useState<FilterVisibility>(defaultVisibility)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as FilterVisibility
        setVisibilityState({ ...defaultVisibility, ...parsed })
        return
      }
    } catch {
      // JSON corrupto → usar defaults
    }
    setVisibilityState(defaultVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey])

  const setVisibility = (v: FilterVisibility) => {
    setVisibilityState(v)
    try {
      localStorage.setItem(storageKey, JSON.stringify(v))
    } catch {
      // Ignorar errores de storage (ej: modo privado con storage lleno)
    }
  }

  const activeFilterCount = filterDefs.reduce((count, def) => {
    const val = values[def.key]
    return val !== def.defaultValue ? count + 1 : count
  }, 0)

  return { visibility, setVisibility, activeFilterCount }
}
