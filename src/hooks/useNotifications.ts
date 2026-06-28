'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

export interface AppNotification {
  id: number
  type: string
  ticketId: number
  message: string
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const { data: session, status } = useSession()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  const fetchInitial = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data)
      setUnreadCount(data.filter((n: AppNotification) => !n.read).length)
    } catch { /* ignorar */ }
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  const markRead = useCallback(async (id: number) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' || !session) return

    fetchInitial()

    const es = new EventSource('/api/notifications/stream')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'ping') return

        const notif: AppNotification = data
        setNotifications(prev => [notif, ...prev.slice(0, 49)])
        setUnreadCount(prev => prev + 1)

        toast.info(notif.message, {
          action: { label: 'Ver', onClick: () => window.location.href = `/tickets/${notif.ticketId}` },
        })
      } catch { /* ignorar */ }
    }

    es.onerror = () => {
      es.close()
      // Reconectar después de 15 segundos
      setTimeout(() => {
        if (status === 'authenticated') {
          const newEs = new EventSource('/api/notifications/stream')
          esRef.current = newEs
        }
      }, 15_000)
    }

    return () => { es.close(); esRef.current = null }
  }, [status, session, fetchInitial])

  return { notifications, unreadCount, markAllRead, markRead }
}
