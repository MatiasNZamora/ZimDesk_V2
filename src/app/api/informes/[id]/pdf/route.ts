import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildInformeHtml, type InformeData } from '@/lib/informePdf'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const report = await prisma.technicalReport.findUnique({
    where: { id: Number(params.id) },
  })
  if (!report) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const cfgRecords = await prisma.appConfig.findMany()
  const cfg = Object.fromEntries(cfgRecords.map(r => [r.key, r.value]))

  const data: InformeData = {
    reportNumber:     report.reportNumber,
    title:            report.title,
    status:           report.status,
    priority:         report.priority,
    statusSummary:    report.statusSummary,
    rootCause:        report.rootCause,
    recommendation:   report.recommendation,
    caseSummary:      report.caseSummary,
    clientQuote:      report.clientQuote,
    equipmentSpecs:   report.equipmentSpecs as any,
    symptoms:         report.symptoms       as any,
    procedure:        report.procedure      as any,
    findings:         report.findings       as any,
    findingsNote:     report.findingsNote,
    diagnosis:        report.diagnosis,
    technicalRec:     report.technicalRec,
    recActions:       report.recActions     as any,
    conclusion:       report.conclusion,
    technicianName:   report.technicianName,
    clientLogoBase64: report.clientLogoBase64,
    clientName:       report.clientName,
    equipmentName:    report.equipmentName,
    entryDate:        report.entryDate,
    createdAt:        report.createdAt,
  }

  const html = buildInformeHtml(data, cfg)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
