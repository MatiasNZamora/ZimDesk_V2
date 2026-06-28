'use client'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Bell, ChevronDown, LogOut, User, Sun, Moon, Search } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
  onCmdK?: () => void
}

export function Header({ onMenuClick, onCmdK }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, toggle } = useTheme()
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const [userOpen, setUserOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleLabel = { admin: 'Administrador', agent: 'Agente', client: 'Cliente' }[session?.user?.role ?? 'client']

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Menu size={20} />
        </button>

        {/* Cmd+K trigger */}
        <button
          onClick={onCmdK}
          className="hidden lg:flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Search size={13} />
          <span>Buscar...</span>
          <kbd className="text-xs bg-white dark:bg-slate-600 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-500 ml-1">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => { setBellOpen(v => !v); if (!bellOpen && unreadCount > 0) {} }}
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                    Marcar todo como leído
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Sin notificaciones</p>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <Link
                      key={n.id}
                      href={`/tickets/${n.ticketId}`}
                      onClick={() => { markRead(n.id); setBellOpen(false) }}
                      className={cn(
                        'flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                        !n.read && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                      )}
                    >
                      {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
                      <div className={cn('min-w-0', n.read && 'pl-5')}>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(n.createdAt)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen(v => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
              {session?.user?.avatar
                ? <img src={session.user.avatar} alt="" className="w-full h-full object-cover" />
                : session?.user?.name?.[0]?.toUpperCase() ?? 'U'
              }
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-none">{session?.user?.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{session?.user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session?.user?.email}</p>
              </div>
              <Link href="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <User size={15} /> Mi Perfil
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
