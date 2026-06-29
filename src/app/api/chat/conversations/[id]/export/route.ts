import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins' }, { status: 403 })
  }

  const { id } = await params
  const convId = Number(id)
  const format = new URL(req.url).searchParams.get('format') ?? 'xlsx'

  const conv = await prisma.chatConversation.findUnique({
    where: { id: convId },
    include: {
      participants: {
        include: { user: { select: { name: true, email: true, role: true } } },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { name: true } },
          attachments: { select: { fileName: true, fileType: true } },
          reactions: { include: { user: { select: { name: true } } } },
        },
      },
    },
  })

  if (!conv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const title = conv.type === 'group' ? (conv.name ?? 'Grupo') : 'Chat directo'
  const participants = conv.participants.map(p => `${p.user.name} (${p.user.role})`).join(', ')

  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Chat')

    // Info header
    ws.addRow(['Conversación', title])
    ws.addRow(['Tipo', conv.type === 'group' ? 'Grupo' : 'Directo'])
    ws.addRow(['Participantes', participants])
    ws.addRow(['Exportado', new Date().toLocaleString('es-AR')])
    ws.addRow([])

    // Columnas
    ws.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Remitente', key: 'sender', width: 22 },
      { header: 'Mensaje', key: 'content', width: 60 },
      { header: 'Adjuntos', key: 'attachments', width: 30 },
      { header: 'Reacciones', key: 'reactions', width: 20 },
    ]

    const headerRow = ws.getRow(6)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } }

    conv.messages.forEach(msg => {
      ws.addRow({
        date: msg.createdAt.toLocaleString('es-AR'),
        sender: msg.sender.name,
        content: msg.content ?? '[solo adjunto]',
        attachments: msg.attachments.map(a => a.fileName).join(', ') || '—',
        reactions: msg.reactions.length > 0
          ? Object.entries(msg.reactions.reduce((acc: any, r) => {
              acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc
            }, {})).map(([e, c]) => `${e}×${c}`).join(' ')
          : '—',
      })
    })

    const buf = await wb.xlsx.writeBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="chat-${convId}.xlsx"`,
      },
    })
  }

  // PDF — HTML básico convertido a respuesta descargable
  const rows = conv.messages.map(msg => `
    <tr>
      <td style="white-space:nowrap;color:#666;font-size:11px">${msg.createdAt.toLocaleString('es-AR')}</td>
      <td style="font-weight:600;padding:0 8px">${msg.sender.name}</td>
      <td>${msg.content ?? '<em>solo adjunto</em>'}${msg.attachments.length ? `<br><small>📎 ${msg.attachments.map(a => a.fileName).join(', ')}</small>` : ''}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Chat Export</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; margin: 24px; }
    h1 { font-size: 18px; } p { color: #555; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #e8eaf6; text-align: left; padding: 6px 8px; font-size: 12px; }
    td { border-bottom: 1px solid #eee; padding: 6px 8px; vertical-align: top; }
  </style></head><body>
  <h1>${title}</h1>
  <p><strong>Tipo:</strong> ${conv.type === 'group' ? 'Grupo' : 'Chat directo'}</p>
  <p><strong>Participantes:</strong> ${participants}</p>
  <p><strong>Exportado:</strong> ${new Date().toLocaleString('es-AR')}</p>
  <table><thead><tr><th>Fecha</th><th>Remitente</th><th>Mensaje</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="chat-${convId}.html"`,
    },
  })
}
