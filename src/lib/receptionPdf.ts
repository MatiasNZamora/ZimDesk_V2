import { escapeHtml } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO:      'Recibido',
  EN_REVISION:   'En Revisión',
  EN_REPARACION: 'En Reparación',
  LISTO:         'Listo para Retirar',
  ENTREGADO:     'Entregado',
}

const CONDITION_LABELS: Record<string, string> = {
  NUEVO:   'Nuevo',
  BUENO:   'Bueno',
  REGULAR: 'Regular',
  DANADO:  'Dañado',
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildReceptionHtml(
  r: {
    orderNumber: string
    brand: string | null
    model: string | null
    condition: string
    status: string
    intakeDate: Date | string
    observations: string | null
    contactName: string | null
    contactPhone: string | null
    signatureBase64: string | null
    deliverySignatureBase64: string | null
    category: { name: string } | null
    estructura: { name: string } | null
    department: { name: string } | null
    responsible: { name: string; email: string } | null
    createdAt: Date | string
  },
  cfg: Record<string, string>,
  includeSignatures: boolean
): string {
  const appName = cfg['app_name'] ?? 'ZimDesk'
  const logoUrl = cfg['logo_url'] ?? ''
  const phone   = cfg['phone']   ?? ''
  const address = cfg['address'] ?? ''

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" style="height:40px;object-fit:contain" />`
    : `<div style="font-size:24px;font-weight:800;color:#405189">${escapeHtml(appName)}</div>`

  const sigHtml = (b64: string | null, label: string) =>
    b64 ? `<div style="margin-top:20px">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">${label}</div>
      <img src="${b64}" alt="Firma" style="max-width:300px;border:1px solid #e2e8f0;border-radius:6px;display:block" />
    </div>` : ''

  const clientLabel = [
    r.estructura?.name,
    r.department ? `(${r.department.name})` : null,
  ].filter(Boolean).join(' ')

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Recepción ${escapeHtml(r.orderNumber)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1e293b;padding:32px;font-size:13px;line-height:1.6;max-width:800px;margin:0 auto}
  h2{font-size:13px;color:#475569;margin:20px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;padding:12px;border-radius:8px}
  .field label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;display:block}
  .field p{margin:2px 0;font-weight:600}
  .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;background:#dbeafe;color:#1d4ed8}
  @media print{body{padding:16px}}
</style>
</head><body>

<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #405189;padding-bottom:16px;margin-bottom:24px">
  ${logoHtml}
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:800;color:#405189">Orden de Recepción</div>
    <div style="font-size:15px;font-weight:600">${escapeHtml(r.orderNumber)}</div>
    <div style="font-size:12px;color:#64748b">Ingreso: ${fmt(r.intakeDate)}</div>
    ${phone   ? `<div style="font-size:12px;color:#64748b">${escapeHtml(phone)}</div>`   : ''}
    ${address ? `<div style="font-size:12px;color:#64748b">${escapeHtml(address)}</div>` : ''}
  </div>
</div>

<h2>Estado actual</h2>
<span class="badge">${escapeHtml(STATUS_LABELS[r.status] ?? r.status)}</span>

${r.estructura ? `
<h2>Cliente / Estructura</h2>
<div class="grid">
  <div class="field"><label>Empresa</label><p>${escapeHtml(r.estructura.name)}</p></div>
  ${r.department ? `<div class="field"><label>Área / Departamento</label><p>${escapeHtml(r.department.name)}</p></div>` : ''}
  ${r.contactName  ? `<div class="field"><label>Contacto</label><p>${escapeHtml(r.contactName)}</p></div>`  : ''}
  ${r.contactPhone ? `<div class="field"><label>Tel. Contacto</label><p>${escapeHtml(r.contactPhone)}</p></div>` : ''}
</div>` : ''}

<h2>Equipo</h2>
<div class="grid">
  ${r.brand    ? `<div class="field"><label>Marca</label><p>${escapeHtml(r.brand)}</p></div>`         : ''}
  ${r.model    ? `<div class="field"><label>Modelo</label><p>${escapeHtml(r.model)}</p></div>`        : ''}
  ${r.category ? `<div class="field"><label>Categoría</label><p>${escapeHtml(r.category.name)}</p></div>` : ''}
  <div class="field"><label>Condición al ingreso</label><p>${escapeHtml(CONDITION_LABELS[r.condition] ?? r.condition)}</p></div>
</div>
${r.observations ? `<div style="margin-top:8px;padding:10px;background:#f8fafc;border-radius:6px;font-size:12px;white-space:pre-wrap">${escapeHtml(r.observations)}</div>` : ''}

${r.responsible ? `
<h2>Responsable interno</h2>
<div class="grid">
  <div class="field"><label>Nombre</label><p>${escapeHtml(r.responsible.name)}</p></div>
  <div class="field"><label>Email</label><p>${escapeHtml(r.responsible.email)}</p></div>
</div>` : ''}

${includeSignatures ? `
<h2>Firmas</h2>
${sigHtml(r.signatureBase64, 'Firma de ingreso (cliente)')}
${sigHtml(r.deliverySignatureBase64, 'Firma de entrega (cliente)')}
` : ''}

<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
  Documento generado por ${escapeHtml(appName)} · ${new Date().toLocaleDateString('es-AR')}
</div>
</body></html>`
}
