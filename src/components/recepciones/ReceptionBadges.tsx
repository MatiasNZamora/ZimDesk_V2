'use client'

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  RECIBIDO:      { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'Recibido' },
  EN_REVISION:   { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b', label: 'En Revisión' },
  EN_REPARACION: { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'En Reparación' },
  LISTO:         { bg: '#d1fae5', text: '#065f46', dot: '#10b981', label: 'Listo' },
  ENTREGADO:     { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af', label: 'Entregado' },
}

const CONDITION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  NUEVO:   { bg: '#e0f2fe', text: '#0369a1', label: 'Nuevo' },
  BUENO:   { bg: '#dcfce7', text: '#166534', label: 'Bueno' },
  REGULAR: { bg: '#fef9c3', text: '#854d0e', label: 'Regular' },
  DANADO:  { bg: '#fee2e2', text: '#991b1b', label: 'Dañado' },
}

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.RECIBIDO
  return (
    <span style={{ background: c.bg, color: c.text, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {c.label}
    </span>
  )
}

export function ConditionBadge({ condition }: { condition: string }) {
  const c = CONDITION_CONFIG[condition] ?? CONDITION_CONFIG.BUENO
  return (
    <span style={{ background: c.bg, color: c.text, padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
      {c.label}
    </span>
  )
}

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, c]) => ({ value, label: c.label }))
export const CONDITION_OPTIONS = Object.entries(CONDITION_CONFIG).map(([value, c]) => ({ value, label: c.label }))
export const VALID_TRANSITIONS: Record<string, string[]> = {
  RECIBIDO:      ['EN_REVISION'],
  EN_REVISION:   ['EN_REPARACION', 'LISTO'],
  EN_REPARACION: ['LISTO'],
  LISTO:         ['ENTREGADO'],
  ENTREGADO:     [],
}
