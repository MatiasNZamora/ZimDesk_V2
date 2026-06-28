import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es })
}

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  abierto:           { label: 'Abierto',                color: 'text-amber-700',  bg: 'bg-amber-100' },
  en_proceso:        { label: 'En Proceso',             color: 'text-blue-700',   bg: 'bg-blue-100' },
  en_progreso:       { label: 'En Progreso',            color: 'text-blue-700',   bg: 'bg-blue-100' },
  en_espera_cliente: { label: 'En Espera del Cliente',  color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  respuesta_cliente: { label: 'Respuesta del Cliente',  color: 'text-indigo-700', bg: 'bg-indigo-100' },
  resuelto:          { label: 'Resuelto',               color: 'text-green-700',  bg: 'bg-green-100' },
  cerrado:           { label: 'Cerrado',                color: 'text-slate-700',  bg: 'bg-slate-100' },
  reabierto:         { label: 'Reabierto',              color: 'text-violet-700', bg: 'bg-violet-100' },
  cancelado:         { label: 'Cancelado',              color: 'text-red-700',    bg: 'bg-red-100' },
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4', 'video/mpeg',
]
