'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Ticket, PlusCircle, Users, Building2, Layers,
  Tag, HelpCircle, FileText, CheckSquare, Settings, Settings2, X,
  ClipboardList, BarChart2,
} from 'lucide-react'
import { useAppConfig } from '@/lib/useAppConfig'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
  section?: string
}

const navItems: NavItem[] = [
  { href: '/dashboard',              label: 'Dashboard',            icon: LayoutDashboard, roles: ['admin', 'gerente', 'agent', 'client'], section: 'General' },
  { href: '/tickets?view=empresa',   label: 'Tickets de mi empresa',icon: Ticket,          roles: ['gerente'], section: 'Supervisión' },
  { href: '/tickets/create',         label: 'Nuevo Ticket',         icon: PlusCircle,      roles: ['client'], section: 'Tickets' },
  { href: '/tickets',                label: 'Mis Tickets',          icon: Ticket,          roles: ['client'] },
  { href: '/tickets?view=asignados', label: 'Mis Asignados',        icon: ClipboardList,   roles: ['agent'], section: 'Tickets' },
  { href: '/tickets?view=gestion',   label: 'Gestionar Tickets',    icon: Settings,        roles: ['admin'], section: 'Gestión' },
  { href: '/tickets?view=conformidad',label: 'Conformidad',         icon: CheckSquare,     roles: ['admin'] },
  { href: '/users',                  label: 'Usuarios',             icon: Users,           roles: ['admin'], section: 'Mantenimiento' },
  { href: '/estructuras',            label: 'Estructuras',          icon: Building2,       roles: ['admin'] },
  { href: '/departments',            label: 'Departamentos',        icon: Layers,          roles: ['admin'] },
  { href: '/categories',             label: 'Categorías',           icon: Tag,             roles: ['admin'] },
  { href: '/faqs',                   label: 'FAQs',                 icon: HelpCircle,      roles: ['admin'] },
  { href: '/platform-norms',         label: 'Normas de Plataforma', icon: FileText,        roles: ['admin'] },
  { href: '/reports',                label: 'Auditoría',            icon: BarChart2,       roles: ['admin'] },
  { href: '/settings',               label: 'Configuración',        icon: Settings2,       roles: ['admin'] },
  { href: '/faqs',                   label: 'Preguntas Frecuentes', icon: HelpCircle,      roles: ['agent', 'client', 'gerente'], section: 'Ayuda' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function SidebarNav({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const role = session?.user?.role ?? 'client'
  const { data: cfg } = useAppConfig()
  const appName = cfg?.app_name ?? 'ZimDesk'
  const logoUrl = cfg?.logo_url ?? ''
  const footerText = cfg?.footer_text ?? 'ZimDesk v2 · ZimTech'

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  function isActive(href: string): boolean {
    const [hrefPath, hrefQuery] = href.split('?')

    if (hrefPath === '/dashboard') return pathname === '/dashboard'
    if (hrefPath === '/tickets/create') return pathname === '/tickets/create'

    if (hrefQuery) {
      // Nav item tiene query param (e.g. /tickets?view=gestion)
      if (pathname !== hrefPath) return false
      const params = new URLSearchParams(hrefQuery)
      return searchParams.get('view') === params.get('view')
    }

    if (hrefPath === '/tickets') {
      // "Mis Tickets" (client): activo en /tickets o en detalle de ticket
      return pathname === '/tickets' || (pathname.startsWith('/tickets/') && pathname !== '/tickets/create')
    }

    if (hrefPath === '/faqs') return pathname.startsWith('/faqs')

    return pathname.startsWith(hrefPath)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300',
        'bg-sidebar-bg border-r border-sidebar-border',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto',
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 flex items-center justify-center overflow-hidden shrink-0 ${logoUrl ? '' : 'bg-indigo-600 rounded-lg'}`}>
              {logoUrl
                ? <img src={logoUrl} alt={appName} className="w-8 h-8 object-contain" />
                : <span className="text-white font-bold text-sm">{appName[0]}</span>
              }
            </div>
            <span className="text-white font-bold text-lg tracking-tight">{appName}</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visibleItems.map((item, idx) => {
            const prevItem = visibleItems[idx - 1]
            const showSection = item.section && item.section !== prevItem?.section
            const Icon = item.icon

            return (
              <div key={`${item.href}-${item.label}`}>
                {showSection && (
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 pt-4 pb-1">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'sidebar-link',
                    isActive(item.href) && 'active',
                  )}
                >
                  <Icon size={17} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </div>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
          <p className="text-xs text-slate-600">{footerText}</p>
        </div>
      </aside>
    </>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarNav open={open} onClose={onClose} />
    </Suspense>
  )
}
