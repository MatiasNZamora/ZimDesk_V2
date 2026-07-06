export const MODULES = [
  'tickets', 'users', 'estructuras', 'departments',
  'categories', 'faqs', 'platform_norms', 'reports', 'settings', 'recepciones',
] as const

export type Module = typeof MODULES[number]
export interface ModulePerm { read: boolean; write: boolean }
export type OperatorPermissions = Partial<Record<Module, ModulePerm>>

export const MODULE_LABELS: Record<Module, { label: string; hasWrite: boolean }> = {
  tickets:        { label: 'Tickets',              hasWrite: true },
  users:          { label: 'Usuarios',             hasWrite: true },
  estructuras:    { label: 'Estructuras',          hasWrite: true },
  departments:    { label: 'Departamentos',        hasWrite: true },
  categories:     { label: 'Categorías',           hasWrite: true },
  faqs:           { label: 'FAQs',                 hasWrite: true },
  platform_norms: { label: 'Normas de Plataforma', hasWrite: true },
  reports:        { label: 'Auditoría',            hasWrite: false },
  settings:       { label: 'Configuración',        hasWrite: true },
  recepciones:    { label: 'Recepciones',          hasWrite: true },
}

export function buildPermissionsMap(
  records: { module: string; canRead: boolean; canWrite: boolean }[]
): OperatorPermissions {
  const map: OperatorPermissions = {}
  for (const r of records) {
    if ((MODULES as readonly string[]).includes(r.module)) {
      map[r.module as Module] = { read: r.canRead, write: r.canWrite }
    }
  }
  return map
}

export function hasModulePerm(
  permissions: OperatorPermissions | undefined,
  module: Module,
  access: 'read' | 'write'
): boolean {
  return permissions?.[module]?.[access] === true
}
