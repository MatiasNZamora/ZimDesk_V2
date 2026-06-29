import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const TOKEN_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',     type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { department: { include: { estructura: true } } },
        })

        if (!user || !(await bcrypt.compare(credentials.password, user.password))) return null

        return {
          id:             String(user.id),
          name:           user.name,
          email:          user.email,
          role:           user.role,
          avatar:         user.avatar,
          departmentId:   user.departmentId,
          departmentName: user.department.name,
          estructuraId:   user.department.estructuraId ?? null,
          tokenVersion:   user.tokenVersion,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primer login: poblamos el token con los datos del usuario
      if (user) {
        token.id             = user.id
        token.role           = (user as any).role
        token.avatar         = (user as any).avatar
        token.departmentId   = (user as any).departmentId
        token.departmentName = (user as any).departmentName
        token.estructuraId   = (user as any).estructuraId
        token.tokenVersion   = (user as any).tokenVersion
        token.lastCheckedAt  = Date.now()
        return token
      }

      // Verificación periódica contra la DB (cada 5 minutos)
      const lastChecked = (token.lastCheckedAt as number) ?? 0
      if (Date.now() - lastChecked < TOKEN_CHECK_INTERVAL_MS) {
        return token
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          select: {
            id: true, name: true, role: true, avatar: true,
            tokenVersion: true, departmentId: true,
            department: { select: { name: true, estructuraId: true } },
          },
        })

        // Usuario eliminado o versión de token cambiada (rol/dept modificado) → invalida sesión
        if (!dbUser || dbUser.tokenVersion !== (token.tokenVersion as number)) {
          return null as any
        }

        // Refrescar datos del token desde la DB
        token.name           = dbUser.name
        token.role           = dbUser.role
        token.avatar         = dbUser.avatar
        token.departmentId   = dbUser.departmentId
        token.departmentName = dbUser.department.name
        token.estructuraId   = dbUser.department.estructuraId ?? null
        token.tokenVersion   = dbUser.tokenVersion
        token.lastCheckedAt  = Date.now()
      } catch {
        // En caso de error de DB, mantenemos el token existente
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id             = token.id as string
        session.user.role           = token.role as string
        session.user.avatar         = token.avatar as string | null
        session.user.departmentId   = token.departmentId as number
        session.user.departmentName = token.departmentName as string
        session.user.estructuraId   = token.estructuraId as number | null
      }
      return session
    },
  },
}
