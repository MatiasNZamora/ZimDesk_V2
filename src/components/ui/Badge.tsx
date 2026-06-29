import { cn } from '@/lib/utils'
import { STATUS_STYLES } from '@/lib/utils'

export function StatusBadge({ slug, name }: { slug: string; name: string }) {
  const style = STATUS_STYLES[slug] ?? { color: 'text-slate-700', bg: 'bg-slate-100' }
  return (
    <span className={cn('badge', style.bg, style.color)}>
      {name}
    </span>
  )
}

export function PriorityBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {name}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const styles = {
    admin:   'bg-purple-100 text-purple-700',
    gerente: 'bg-teal-100 text-teal-700',
    agent:   'bg-blue-100 text-blue-700',
    client:  'bg-slate-100 text-slate-700',
  }[role] ?? 'bg-slate-100 text-slate-700'
  const labels = { admin: 'Admin', gerente: 'Gerente', agent: 'Agente', client: 'Cliente' }
  return <span className={cn('badge', styles)}>{labels[role as keyof typeof labels] ?? role}</span>
}
