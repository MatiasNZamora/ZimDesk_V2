import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, escapeHtml } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse('No autorizado', { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(params.id) },
    include: {
      creator: { include: { department: true } },
      agent: true,
      status: true,
      priority: true,
      category: true,
      messages: {
        include: { user: true, attachments: true },
        orderBy: { createdAt: 'asc' },
      },
      logs: { include: { user: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!ticket) return new NextResponse('No encontrado', { status: 404 })

  const messagesHtml = ticket.messages.map(m => `
    <div style="margin-bottom:16px;padding:12px;background:${['admin','agent'].includes(m.user.role) ? '#f0f4ff' : '#f8f9fa'};border-radius:8px;border-left:3px solid ${['admin','agent'].includes(m.user.role) ? '#6366f1' : '#e2e8f0'}">
      <div style="font-size:12px;color:#64748b;margin-bottom:8px"><strong>${escapeHtml(m.user.name)}</strong> · ${formatDate(m.createdAt)}</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${escapeHtml(m.message)}</div>
    </div>`).join('')

  const logsHtml = ticket.logs.map(l => `
    <div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">
      <span style="color:#94a3b8">${formatDate(l.createdAt)}</span> · ${l.action}
    </div>`).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<style>body{font-family:Arial,sans-serif;color:#1e293b;padding:32px;font-size:13px;line-height:1.6}
h1{font-size:18px;color:#1e293b;margin:0 0 4px}
h2{font-size:14px;color:#475569;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px}
.meta-item label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.meta-item p{margin:2px 0;font-weight:600}</style></head>
<body>
<div style="border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:24px">
  <div style="color:#6366f1;font-weight:800;font-size:20px;margin-bottom:4px">ZimDesk</div>
  <h1>Ticket #${ticket.id}: ${ticket.subject}</h1>
  <div style="font-size:12px;color:#64748b">Generado el ${formatDate(new Date())}</div>
</div>

<div class="meta">
  <div class="meta-item"><label>Estado</label><p>${ticket.status.name}</p></div>
  <div class="meta-item"><label>Prioridad</label><p>${ticket.priority.name}</p></div>
  <div class="meta-item"><label>Categoría</label><p>${ticket.category.name}</p></div>
  <div class="meta-item"><label>Creado por</label><p>${ticket.creator.name} (${ticket.creator.department?.name ?? '—'})</p></div>
  <div class="meta-item"><label>Agente</label><p>${ticket.agent?.name ?? 'Sin asignar'}</p></div>
  <div class="meta-item"><label>Fecha</label><p>${formatDate(ticket.createdAt)}</p></div>
  ${ticket.closedAt ? `<div class="meta-item"><label>Cerrado</label><p>${formatDate(ticket.closedAt)}</p></div>` : ''}
  ${ticket.firstResponseAt ? `<div class="meta-item"><label>1ª Respuesta</label><p>${formatDate(ticket.firstResponseAt)}</p></div>` : ''}
</div>

<h2>Descripción</h2>
<div style="padding:12px;background:#f8fafc;border-radius:8px;white-space:pre-wrap;font-size:13px">${escapeHtml(ticket.description)}</div>

${ticket.messages.length > 0 ? `<h2>Conversación (${ticket.messages.length} mensajes)</h2>${messagesHtml}` : ''}
${ticket.logs.length > 0 ? `<h2>Historial de Acciones</h2>${logsHtml}` : ''}
</body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="ticket-${ticket.id}.html"`,
    },
  })
}
