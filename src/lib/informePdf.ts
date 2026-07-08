import { escapeHtml } from '@/lib/utils'

type EquipmentSpec  = { component: string; spec: string }
type ListItem       = { text: string }
type RecAction      = { action: string; priority: string; time: string; cost: string }

export interface InformeData {
  reportNumber:    string
  title:           string
  status:          string
  priority:        string
  statusSummary:   string
  rootCause:       string
  recommendation:  string
  caseSummary:     string
  clientQuote:     string | null
  equipmentSpecs:  EquipmentSpec[]
  symptoms:        ListItem[]
  procedure:       ListItem[]
  findings:        ListItem[]
  findingsNote:    string | null
  diagnosis:       string
  technicalRec:    string
  recActions:      RecAction[]
  conclusion:      string
  technicianName:  string
  clientLogoBase64: string | null
  clientName:      string | null
  equipmentName:   string | null
  entryDate:       Date | string | null
  createdAt:       Date | string
}

function h(s: string | null | undefined): string {
  return escapeHtml(s ?? '')
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusPillClass(status: string, priority: string): string {
  if (status === 'Diagnóstico completado') return 'status-pill--done'
  if (status === 'Crítico') return 'status-pill--critical'
  return ''
}

function priorityPillClass(priority: string): string {
  if (priority === 'Alta') return 'status-pill--critical'
  return ''
}

function checklist(items: ListItem[]): string {
  if (!items.length) return '<p style="color:var(--text-muted);font-size:0.88rem;">Sin ítems registrados.</p>'
  return `<ul class="checklist">
    ${items.map(i => `
      <li>
        <span class="box checked"></span>
        <span>${h(i.text)}</span>
      </li>`).join('')}
  </ul>`
}

export function buildInformeHtml(
  data: InformeData,
  cfg: Record<string, string>
): string {
  const appName = cfg['app_name'] ?? 'ZimTech'
  const logoUrl = cfg['logo_url'] ?? ''

  const logoHtml = logoUrl
    ? `<img src="${h(logoUrl)}" alt="${h(appName)}" />`
    : `<div style="font-weight:700;font-size:1.1rem;color:var(--accent)">${h(appName)}</div>`

  const clientLogoHtml = data.clientLogoBase64
    ? `<img src="${data.clientLogoBase64}" alt="Logo cliente" />`
    : `<span style="font-size:0.82rem;color:var(--text-muted)">${h(data.clientName ?? '')}</span>`

  const statusPill  = `<span class="status-pill ${statusPillClass(data.status, data.priority)}">${h(data.status)}</span>`
  const priorityPill = `<span class="status-pill ${priorityPillClass(data.priority)}">Prioridad ${h(data.priority)}</span>`

  const specsRows = data.equipmentSpecs.map(s =>
    `<tr><td>${h(s.component)}</td><td>${h(s.spec)}</td></tr>`
  ).join('')

  const recRows = data.recActions.map(a =>
    `<tr>
      <td>${h(a.action)}</td>
      <td>${h(a.priority)}</td>
      <td>${h(a.time)}</td>
      <td class="${a.cost === 'A cotizar' ? 'pending-cell' : ''}">${h(a.cost)}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Informe Técnico ${h(data.reportNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..800&family=Inter:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@300..800&display=swap" rel="stylesheet"/>
<style>
  :root {
    --zt-teal-50:  #E6F7FA;
    --zt-teal-100: #C2ECF2;
    --zt-teal-200: #8FDBE5;
    --zt-teal-300: #5BC6D5;
    --zt-teal-400: #2DAEC2;
    --zt-teal-500: #039FB3;
    --zt-teal-600: #027F8F;
    --zt-teal-700: #02606C;
    --zt-teal-800: #014049;
    --zt-teal-900: #002327;
    --zt-azul-500: #005CDC;
    --zt-warning:  #F59E0B;
    --zt-warning-bg: #FFFBEB;
    --zt-warning-ink: #92400E;
    --zt-danger:   #DC2626;
    --zt-success:  #16A34A;
    --page-bg:     #EEF0F4;
    --card-bg:     #FFFFFF;
    --text-primary:   #050608;
    --text-secondary: #5C6473;
    --text-muted:     #8B93A3;
    --border-soft:    #DDE1E8;
    --border-strong:  #B8BFCC;
    --accent:         #027F8F;
    --letterhead-bg:  #F7F8FA;
    --pending-bg:     #FFFBEB;
    --pending-border: #F3D19E;
    --pending-ink:    #92400E;
    --footer-bg:      #002327;
    --footer-ink:     #C2ECF2;
    --done-bg:    #E6F7FA;
    --done-border:#8FDBE5;
    --done-ink:   #02606C;
    --critical-bg:    #FEF2F2;
    --critical-border:#FECACA;
    --critical-ink:   #991B1B;
    --watermark-opacity: 0.05;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:var(--page-bg);
    color:var(--text-primary);
    font-family:'Inter',system-ui,sans-serif;
    font-size:15px;
    line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }
  .page-wrap{
    position:relative;
    max-width:900px;
    margin:0 auto;
    padding:40px 20px 64px;
  }
  .doc{
    position:relative;
    z-index:1;
    background:var(--card-bg);
    border:1px solid var(--border-soft);
    border-radius:4px;
    box-shadow:0 1px 2px rgba(0,0,0,.04),0 16px 40px -24px rgba(2,20,24,.35);
    overflow:hidden;
  }
  .doc::before{
    content:"";
    display:block;
    height:6px;
    background:linear-gradient(90deg,var(--zt-teal-600) 0%,var(--zt-teal-400) 100%);
  }
  .letterhead{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:24px;
    padding:28px 40px;
    background:var(--letterhead-bg);
    border-bottom:1px solid var(--border-soft);
  }
  .brand-block{display:flex;align-items:center;gap:14px}
  .brand-block img{height:44px;width:auto;display:block}
  .brand-copy{display:flex;flex-direction:column;gap:2px}
  .brand-name{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.05rem;color:var(--text-primary)}
  .brand-tag{font-family:'JetBrains Mono',monospace;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted)}
  .letterhead-divider{width:1px;align-self:stretch;background:var(--border-strong);min-height:40px}
  .client-block{display:flex;align-items:center;gap:12px}
  .client-block img{height:38px;width:auto;display:block}
  .client-label{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
  .title-block{padding:36px 40px 28px;border-bottom:1px solid var(--border-soft)}
  .doc-eyebrow{font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
  h1.doc-title{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:clamp(1.5rem,1rem + 2vw,2.1rem);line-height:1.15;letter-spacing:-.01em;margin:0 0 18px;color:var(--text-primary)}
  .doc-meta-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px 20px;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--text-secondary)}
  .doc-meta-row .sep{color:var(--border-strong)}
  .status-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:3px;background:var(--pending-bg);border:1px solid var(--pending-border);color:var(--pending-ink);font-family:'JetBrains Mono',monospace;font-size:.7rem;letter-spacing:.04em;text-transform:uppercase}
  .status-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--zt-warning)}
  .status-pill--done{background:var(--done-bg);border-color:var(--done-border);color:var(--done-ink)}
  .status-pill--done::before{background:var(--zt-teal-500)}
  .status-pill--critical{background:var(--critical-bg);border-color:var(--critical-border);color:var(--critical-ink)}
  .status-pill--critical::before{background:var(--zt-danger)}
  .summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-soft);border-bottom:1px solid var(--border-soft)}
  .summary-card{background:var(--card-bg);padding:20px 22px;border-top:3px solid var(--card-accent,var(--accent));display:flex;flex-direction:column;gap:6px}
  .summary-card .k{font-family:'JetBrains Mono',monospace;font-size:.64rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
  .summary-card .v{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1rem;line-height:1.3;color:var(--text-primary)}
  .summary-card--status{--card-accent:var(--zt-azul-500)}
  .summary-card--critical{--card-accent:var(--zt-danger)}
  .summary-card--action{--card-accent:var(--zt-teal-500)}
  .service-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border-soft);border-bottom:1px solid var(--border-soft)}
  .service-item{background:var(--card-bg);padding:18px 22px;display:flex;flex-direction:column;gap:6px}
  .service-item .k{font-family:'JetBrains Mono',monospace;font-size:.64rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
  .service-item .v{font-size:.92rem;font-weight:500;color:var(--text-primary)}
  .v.priority-high{color:var(--critical-ink);font-weight:700;display:inline-flex;align-items:center;gap:6px}
  .v.priority-high::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--zt-danger)}
  .section{padding:32px 40px;border-bottom:1px solid var(--border-soft)}
  .section:last-of-type{border-bottom:none}
  .section-head{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}
  .section-num{font-family:'JetBrains Mono',monospace;font-size:.82rem;color:var(--accent)}
  h2.section-title{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.05rem;margin:0;color:var(--text-primary)}
  .section p{max-width:64ch;color:var(--text-secondary);margin:0 0 12px}
  .section p:last-child{margin-bottom:0}
  .quote-block{margin:0;padding:4px 0 4px 18px;border-left:3px solid var(--zt-azul-500);display:flex;flex-direction:column;gap:8px}
  .quote-block p{font-style:italic;font-size:.96rem;color:var(--text-primary);margin:0;max-width:60ch}
  .quote-attr{font-family:'JetBrains Mono',monospace;font-size:.66rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted)}
  .callout{border:1.5px solid var(--pending-border);background:var(--pending-bg);border-radius:4px;padding:16px 18px;display:flex;flex-direction:column;gap:6px}
  .callout-tag{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--pending-ink);font-weight:600}
  .callout p{color:var(--pending-ink);font-size:.88rem;margin:0;max-width:none}
  .callout--critical{border-color:var(--critical-border);background:var(--critical-bg)}
  .callout--critical .callout-tag,.callout--critical p{color:var(--critical-ink)}
  .checklist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
  .checklist li{display:flex;align-items:flex-start;gap:12px;font-size:.9rem;color:var(--text-secondary)}
  .checklist .box{position:relative;flex:none;width:16px;height:16px;margin-top:2px;border-radius:3px;border:1.5px solid var(--border-strong)}
  .checklist .box.checked{background:var(--accent);border-color:var(--accent)}
  .checklist .box.checked::after{content:"";position:absolute;left:4px;top:2px;width:6px;height:9px;border-right:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(40deg)}
  .checklist strong{color:var(--text-primary);font-weight:600}
  .rec-table-wrap{overflow-x:auto}
  table.rec-table{width:100%;border-collapse:collapse;font-size:.86rem}
  table.rec-table th,table.rec-table td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--border-soft)}
  table.rec-table th{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);font-weight:500}
  table.rec-table td{color:var(--text-secondary)}
  table.rec-table td.pending-cell{font-family:'JetBrains Mono',monospace;color:var(--pending-ink)}
  .signoff{display:grid;grid-template-columns:1fr 1fr;gap:32px;padding:32px 40px 8px}
  .signoff-block{display:flex;flex-direction:column;gap:8px}
  .signoff-line{border-top:1px solid var(--border-strong);padding-top:8px;font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted)}
  .signoff-name{font-size:.92rem;font-weight:500;color:var(--text-primary)}
  .doc-footer{background:var(--footer-bg);color:var(--footer-ink);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
  .doc-footer .fl{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.88rem}
  .doc-footer .fr{font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.04em;opacity:.85}
  @media(max-width:640px){
    .letterhead{flex-direction:column;align-items:flex-start}
    .letterhead-divider{display:none}
    .service-grid,.summary-cards{grid-template-columns:1fr}
    .title-block,.section,.signoff{padding-left:22px;padding-right:22px}
    .signoff{grid-template-columns:1fr}
    .doc-footer{flex-direction:column;align-items:flex-start}
  }
  @media print{
    body{background:white}
    .page-wrap{padding:0}
    .doc{box-shadow:none;border:none}
  }
</style>
</head>
<body>
<div class="page-wrap">
  <div class="doc">

    <div class="letterhead">
      <div class="brand-block">
        ${logoHtml}
        <div class="brand-copy">
          <span class="brand-name">${h(appName)}</span>
          <span class="brand-tag">Soporte &amp; Diagnóstico Técnico</span>
        </div>
      </div>
      <div class="letterhead-divider"></div>
      <div class="client-block">
        <div class="brand-copy" style="align-items:flex-end;">
          <span class="client-label">Cliente</span>
        </div>
        ${clientLogoHtml}
      </div>
    </div>

    <div class="title-block">
      <div class="doc-eyebrow">Informe Técnico de Diagnóstico</div>
      <h1 class="doc-title">${h(data.title)}</h1>
      <div class="doc-meta-row">
        <span>N.º ${h(data.reportNumber)}</span>
        <span class="sep">/</span>
        <span>Emitido ${fmtDate(data.createdAt)}</span>
        <span class="sep">/</span>
        ${statusPill}
        ${priorityPill}
      </div>
    </div>

    <div class="service-grid">
      <div class="service-item">
        <span class="k">Cliente</span>
        <span class="v">${h(data.clientName ?? '—')}</span>
      </div>
      <div class="service-item">
        <span class="k">Equipo</span>
        <span class="v">${h(data.equipmentName ?? '—')}</span>
      </div>
      <div class="service-item">
        <span class="k">Técnico asignado</span>
        <span class="v">${h(data.technicianName)}</span>
      </div>
      <div class="service-item">
        <span class="k">Fecha de ingreso</span>
        <span class="v">${fmtDate(data.entryDate)}</span>
      </div>
      <div class="service-item">
        <span class="k">Prioridad</span>
        <span class="v ${data.priority === 'Alta' ? 'priority-high' : ''}">${h(data.priority)}</span>
      </div>
      <div class="service-item">
        <span class="k">Emitido por</span>
        <span class="v">${h(appName)}</span>
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card summary-card--status">
        <span class="k">Estado</span>
        <span class="v">${h(data.statusSummary)}</span>
      </div>
      <div class="summary-card summary-card--critical">
        <span class="k">Causa raíz</span>
        <span class="v">${h(data.rootCause)}</span>
      </div>
      <div class="summary-card summary-card--action">
        <span class="k">Recomendación</span>
        <span class="v">${h(data.recommendation)}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">1.</span><h2 class="section-title">Resumen del caso</h2></div>
      <p>${h(data.caseSummary)}</p>
    </div>

    ${data.clientQuote ? `
    <div class="section">
      <div class="section-head"><span class="section-num">2.</span><h2 class="section-title">Entrevista con el solicitante</h2></div>
      <blockquote class="quote-block">
        <p>"${h(data.clientQuote)}"</p>
        <span class="quote-attr">Declaración del solicitante, relevada al momento del ingreso del equipo</span>
      </blockquote>
    </div>` : ''}

    ${data.equipmentSpecs.length > 0 ? `
    <div class="section">
      <div class="section-head"><span class="section-num">${data.clientQuote ? '3' : '2'}.</span><h2 class="section-title">Equipo evaluado</h2></div>
      <div class="rec-table-wrap">
        <table class="rec-table">
          <thead><tr><th>Componente</th><th>Especificación</th></tr></thead>
          <tbody>${specsRows}</tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-head"><span class="section-num">4.</span><h2 class="section-title">Síntomas reportados</h2></div>
      ${checklist(data.symptoms)}
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">5.</span><h2 class="section-title">Procedimiento de diagnóstico</h2></div>
      ${checklist(data.procedure)}
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">6.</span><h2 class="section-title">Hallazgos</h2></div>
      ${checklist(data.findings)}
      ${data.findingsNote ? `
      <div class="callout" style="margin-top:14px;">
        <span class="callout-tag">Observación</span>
        <p>${h(data.findingsNote)}</p>
      </div>` : ''}
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">7.</span><h2 class="section-title">Diagnóstico y causa raíz</h2></div>
      <div class="callout callout--critical">
        <span class="callout-tag">Causa raíz identificada</span>
        <p>${h(data.diagnosis)}</p>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">8.</span><h2 class="section-title">Recomendación técnica</h2></div>
      <p>${h(data.technicalRec)}</p>
      ${data.recActions.length > 0 ? `
      <div class="rec-table-wrap">
        <table class="rec-table">
          <thead>
            <tr>
              <th>Acción recomendada</th>
              <th>Prioridad</th>
              <th>Tiempo estimado</th>
              <th>Costo estimado</th>
            </tr>
          </thead>
          <tbody>${recRows}</tbody>
        </table>
      </div>` : ''}
    </div>

    <div class="section">
      <div class="section-head"><span class="section-num">9.</span><h2 class="section-title">Conclusión</h2></div>
      <p>${h(data.conclusion)}</p>
    </div>

    <div class="signoff">
      <div class="signoff-block">
        <span class="signoff-name">${h(data.technicianName)}</span>
        <span class="signoff-line">Técnico responsable — ${h(appName)}</span>
      </div>
      <div class="signoff-block">
        <span class="signoff-name">${fmtDate(data.createdAt)}</span>
        <span class="signoff-line">Fecha de emisión</span>
      </div>
    </div>

    <div class="doc-footer">
      <span class="fl">${h(appName)}</span>
      <span class="fr">${h(data.reportNumber)} · Documento generado digitalmente</span>
    </div>

  </div>
</div>
</body>
</html>`
}
