import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password', '/seguimiento']
const PUBLIC_API   = ['/api/auth', '/api/public/', '/api/cron/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas de auth pública siempre pasan
  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Páginas públicas (login, forgot-password, reset-password)
  if (PUBLIC_PAGES.some(p => pathname.startsWith(p))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Incluye /uploads/ para protegerlos con auth
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
