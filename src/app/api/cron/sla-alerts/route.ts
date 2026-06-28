import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mail'

const SLA_MINUTES = Number(process.env.SLA_THRESHOLD_MINUTES ?? 120)

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  // Vercel Cron envía: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true

  // Activación manual: GET /api/cron/sla-alerts?secret=<CRON_SECRET>
  return req.nextUrl.searchParams.get('secret') === cronSecret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const threshold = new Date(Date.now() - SLA_MINUTES * 60 * 1000)

  // Tickets sin primera respuesta que superaron el umbral y no fueron alertados
  const breached = await prisma.ticket.findMany({
    where: {
      firstResponseAt: null,
      slaAlertedAt: null,
      createdAt: { lte: threshold },
      status: { slug: { in: ['abierto', 'en_progreso', 'reabierto'] } },
    },
    include: {
      creator:  { select: { name: true, email: true } },
      agent:    { select: { name: true } },
      category: true,
      priority: true,
    },
  })

  if (breached.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // Marcar como alertados
  await prisma.ticket.updateMany({
    where: { id: { in: breached.map(t => t.id) } },
    data: { slaAlertedAt: new Date() },
  })

  // Notificaciones y emails a admins
  const adminUsers = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true } })
  const notifRecords = adminUsers.flatMap(admin =>
    breached.map(ticket => ({
      userId:   admin.id,
      type:     'sla_breach',
      ticketId: ticket.id,
      message:  `SLA superado: ticket #${ticket.id} — "${ticket.subject}"`,
    }))
  )
  await prisma.notification.createMany({ data: notifRecords })

  // Email a admins
  const ticketRows = breached.map(t =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">#${t.id}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${t.subject}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${t.priority.name}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${t.agent?.name ?? 'Sin asignar'}</td>
    </tr>`
  ).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#ef4444">⚠️ Alerta de SLA — ${breached.length} ticket${breached.length !== 1 ? 's' : ''} sin respuesta</h2>
      <p style="color:#475569">Los siguientes tickets superaron el umbral de ${SLA_MINUTES} minutos sin primera respuesta:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px;text-align:left;font-size:12px;color:#64748b">ID</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#64748b">Asunto</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#64748b">Prioridad</th>
          <th style="padding:8px;text-align:left;font-size:12px;color:#64748b">Agente</th>
        </tr></thead>
        <tbody>${ticketRows}</tbody>
      </table>
    </div>`

  if (adminUsers.length > 0 && process.env.MAIL_HOST) {
    sendMail({
      to: adminUsers.map(a => a.email),
      subject: `[ZimDesk] ⚠️ Alerta SLA — ${breached.length} tickets sin respuesta`,
      html,
    }).catch(console.error)
  } else {
    console.log(`[SLA ALERT] ${breached.length} tickets breached:`, breached.map(t => `#${t.id}`))
  }

  return NextResponse.json({ ok: true, processed: breached.length, tickets: breached.map(t => t.id) })
}
