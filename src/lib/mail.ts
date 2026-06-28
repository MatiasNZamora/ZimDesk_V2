import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

interface MailOptions {
  to: string | string[]
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: MailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    })
  } catch (err) {
    console.error('[MAIL ERROR]', err)
  }
}

function baseLayout(content: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px">
    <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0">
      <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e2e8f0">
        <span style="font-size:20px;font-weight:700;color:#6366f1">ZimDesk</span>
      </div>
      ${content}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
        Sistema ZimDesk · ZimTech — Este es un mensaje automático.
      </div>
    </div>
  </div>`
}

export function mailTicketCreated(ticket: { id: number; subject: string; creator: { name: string } }) {
  return baseLayout(`
    <h2 style="color:#1e293b;margin:0 0 16px">Nuevo ticket recibido</h2>
    <p style="color:#475569">Se ha creado el ticket <strong>#${ticket.id}</strong>.</p>
    <table style="width:100%;margin:16px 0;border-collapse:collapse">
      <tr><td style="padding:8px;color:#64748b;font-size:14px">Asunto</td><td style="padding:8px;font-weight:600;color:#1e293b">${ticket.subject}</td></tr>
      <tr><td style="padding:8px;color:#64748b;font-size:14px">Creado por</td><td style="padding:8px;color:#1e293b">${ticket.creator.name}</td></tr>
    </table>`)
}

export function mailTicketAssigned(ticket: { id: number; subject: string }, recipientName: string, isAgent: boolean) {
  return baseLayout(`
    <h2 style="color:#1e293b;margin:0 0 16px">${isAgent ? 'Ticket asignado' : 'Tu ticket fue tomado'}</h2>
    <p style="color:#475569">Hola ${recipientName}, el ticket <strong>#${ticket.id} — ${ticket.subject}</strong>
    ${isAgent ? 'ha sido asignado a tu cuenta.' : 'ha sido asignado a un agente de soporte.'}</p>`)
}

export function mailTicketReply(ticket: { id: number; subject: string }, senderName: string, preview: string, recipientName: string) {
  return baseLayout(`
    <h2 style="color:#1e293b;margin:0 0 16px">Nueva respuesta en tu ticket</h2>
    <p style="color:#475569">Hola ${recipientName}, <strong>${senderName}</strong> respondió al ticket <strong>#${ticket.id} — ${ticket.subject}</strong>.</p>
    <blockquote style="border-left:4px solid #6366f1;margin:16px 0;padding:12px 16px;background:#f8f7ff;border-radius:0 8px 8px 0;color:#475569;font-size:14px">
      ${preview.substring(0, 300)}${preview.length > 300 ? '...' : ''}
    </blockquote>`)
}

export function mailTicketStatusChange(ticket: { id: number; subject: string }, newStatus: string, recipientName: string) {
  return baseLayout(`
    <h2 style="color:#1e293b;margin:0 0 16px">Estado del ticket actualizado</h2>
    <p style="color:#475569">Hola ${recipientName}, el ticket <strong>#${ticket.id} — ${ticket.subject}</strong>
    cambió su estado a <strong>${newStatus}</strong>.</p>`)
}
