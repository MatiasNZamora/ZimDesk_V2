import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'
import type { Session } from 'next-auth'
import {
  MODULES, MODULE_LABELS, buildPermissionsMap,
  type Module, type ModulePerm, type OperatorPermissions,
} from './permissionsShared'

export { MODULES, MODULE_LABELS, buildPermissionsMap }
export type { Module, ModulePerm, OperatorPermissions }

export function hasModulePerm(
  session: Session,
  module: Module,
  access: 'read' | 'write'
): boolean {
  const { role, permissions } = session.user as any
  if (role === 'admin') return true
  if (role === 'operador') return (permissions as OperatorPermissions | undefined)?.[module]?.[access] === true
  return false
}

export async function requireAccess(
  module: Module,
  access: 'read' | 'write',
  allowedRoles: string[] = []
): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { role } = session.user
  if (role === 'admin' || allowedRoles.includes(role)) return { session }

  if (role === 'operador') {
    return hasModulePerm(session, module, access)
      ? { session }
      : NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
