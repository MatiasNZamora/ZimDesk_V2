import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { prisma } from '@/lib/prisma'

async function getAppConfig() {
  try {
    const rows = await prisma.appConfig.findMany({ where: { key: { in: ['app_name', 'favicon_url'] } } })
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return { name: map['app_name'] ?? 'ZimDesk', faviconUrl: map['favicon_url'] ?? '' }
  } catch {
    return { name: 'ZimDesk', faviconUrl: '' }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { name, faviconUrl } = await getAppConfig()
  return {
    title: { default: name, template: `%s · ${name}` },
    description: 'Sistema de Mesa de Ayuda',
    ...(faviconUrl ? { icons: { icon: faviconUrl, shortcut: faviconUrl } } : {}),
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema antes del paint para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('zimdesk-theme');
            const prefer = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'dark' || (!t && prefer)) document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
