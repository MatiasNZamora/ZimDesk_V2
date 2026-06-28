import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mail'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  // Rate limit: máx 3 solicitudes por IP cada 15 minutos
  const ip = getClientIp(req as any)
  if (!rateLimit(`forgot:${ip}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 })) {
    return NextResponse.json({ ok: true }) // Respuesta genérica para no revelar el límite
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email requerido' }, { status: 422 })
  }

  // Respuesta genérica siempre para no revelar si el email existe
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // Invalidar tokens anteriores del usuario
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const token     = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`

  // En dev, loguear el link a consola si no hay SMTP
  if (!process.env.MAIL_HOST) {
    console.log(`[PASSWORD RESET] Link para ${email}: ${resetUrl}`)
  } else {
    sendMail({
      to: user.email,
      subject: '[ZimDesk] Restablecé tu contraseña',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px">
          <div style="background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0">
            <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e2e8f0">
              <span style="font-size:20px;font-weight:700;color:#6366f1">ZimDesk</span>
            </div>
            <h2 style="color:#1e293b;margin:0 0 16px">Restablecer contraseña</h2>
            <p style="color:#475569">Hola ${user.name}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p style="color:#475569">Hacé clic en el botón a continuación. El enlace expira en <strong>1 hora</strong>.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${resetUrl}" style="background:#6366f1;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block">
                Restablecer contraseña
              </a>
            </div>
            <p style="color:#94a3b8;font-size:13px">Si no solicitaste este cambio, podés ignorar este email.</p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
              Sistema ZimDesk · ZimTech — Este es un mensaje automático.
            </div>
          </div>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
