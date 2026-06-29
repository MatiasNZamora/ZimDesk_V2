import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'usuario'
}

async function ensureHandle(userId: number, name: string, usedHandles: Set<string>): Promise<string> {
  let base = slugifyHandle(name)
  let handle = base
  let suffix = 2
  while (usedHandles.has(handle)) handle = `${base}.${suffix++}`
  usedHandles.add(handle)
  await prisma.user.update({ where: { id: userId }, data: { chatHandle: handle } })
  return handle
}

function daysAgo(n: number, offsetHours = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(d.getHours() - offsetHours)
  return d
}

async function main() {
  console.log('🌱 Iniciando seed de demo ZimDesk v2...')

  // ─── ESTRUCTURAS (EMPRESAS) ───────────────────────────────────
  const zimtech = await prisma.estructura.upsert({
    where: { id: 1 },
    update: { name: 'ZimTech Interna' },
    create: { id: 1, name: 'ZimTech Interna' },
  })
  const empresa2 = await prisma.estructura.upsert({
    where: { id: 2 },
    update: { name: 'Empresa Demo SA' },
    create: { id: 2, name: 'Empresa Demo SA' },
  })

  // ─── DEPARTAMENTOS ────────────────────────────────────────────
  const deps = await Promise.all([
    prisma.department.upsert({ where: { id: 1 }, update: { name: 'IT & Sistemas',    estructuraId: zimtech.id  }, create: { name: 'IT & Sistemas',    estructuraId: zimtech.id  } }),
    prisma.department.upsert({ where: { id: 2 }, update: { name: 'Recursos Humanos', estructuraId: zimtech.id  }, create: { name: 'Recursos Humanos', estructuraId: zimtech.id  } }),
    prisma.department.upsert({ where: { id: 3 }, update: { name: 'Operaciones',      estructuraId: empresa2.id }, create: { name: 'Operaciones',      estructuraId: empresa2.id } }),
    prisma.department.upsert({ where: { id: 4 }, update: { name: 'Finanzas',         estructuraId: empresa2.id }, create: { name: 'Finanzas',         estructuraId: empresa2.id } }),
    prisma.department.upsert({ where: { id: 5 }, update: { name: 'Marketing',        estructuraId: empresa2.id }, create: { name: 'Marketing',        estructuraId: empresa2.id } }),
    prisma.department.upsert({ where: { id: 6 }, update: { name: 'Dirección',        estructuraId: zimtech.id  }, create: { name: 'Dirección',        estructuraId: zimtech.id  } }),
    prisma.department.upsert({ where: { id: 7 }, update: { name: 'Dirección',        estructuraId: empresa2.id }, create: { name: 'Dirección',        estructuraId: empresa2.id } }),
  ])
  const [itDep, hrDep, opsDep, finDep, mktDep, dirZimtech, dirEmpresa2] = deps

  // ─── ESTADOS ─────────────────────────────────────────────────
  const statuses = [
    { id: 1, name: 'Abierto',                slug: 'abierto' },
    { id: 2, name: 'En Progreso',            slug: 'en_progreso' },
    { id: 3, name: 'En Espera del Cliente',  slug: 'en_espera_cliente' },
    { id: 4, name: 'Respuesta del Cliente',  slug: 'respuesta_cliente' },
    { id: 5, name: 'Resuelto',               slug: 'resuelto' },
    { id: 6, name: 'Cerrado',                slug: 'cerrado' },
    { id: 7, name: 'Reabierto',              slug: 'reabierto' },
    { id: 8, name: 'Cancelado',              slug: 'cancelado' },
  ]
  for (const s of statuses) {
    await prisma.status.upsert({ where: { id: s.id }, update: { name: s.name, slug: s.slug }, create: s })
  }

  // ─── PRIORIDADES ─────────────────────────────────────────────
  const priorities = [
    { id: 1, name: 'Baja',    slug: 'baja',    color: '#22c55e' },
    { id: 2, name: 'Media',   slug: 'media',   color: '#facc15' },
    { id: 3, name: 'Alta',    slug: 'alta',    color: '#f97316' },
    { id: 4, name: 'Urgente', slug: 'urgente', color: '#ef4444' },
  ]
  for (const p of priorities) {
    await prisma.priority.upsert({ where: { id: p.id }, update: {}, create: p })
  }

  // ─── CATEGORÍAS ──────────────────────────────────────────────
  const catNames = ['Soporte Técnico', 'Facturación', 'Consultas Generales', 'Acceso y Permisos', 'Infraestructura']
  const cats = []
  for (let i = 0; i < catNames.length; i++) {
    const c = await prisma.category.upsert({ where: { id: i + 1 }, update: { name: catNames[i] }, create: { name: catNames[i] } })
    cats.push(c)
  }
  const [catSoporte, catFacturacion, catConsultas, catAcceso, catInfra] = cats

  // ─── USUARIOS ────────────────────────────────────────────────
  const pass = await bcrypt.hash('zimdesk2026', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zimtech.com.ar' },
    update: { name: 'Matías Zamora' },
    create: { name: 'Matías Zamora', email: 'admin@zimtech.com.ar', password: pass, role: 'admin', departmentId: itDep.id },
  })
  const agente1 = await prisma.user.upsert({
    where: { email: 'agente@zimtech.com.ar' },
    update: { name: 'Lucas Herrera' },
    create: { name: 'Lucas Herrera', email: 'agente@zimtech.com.ar', password: pass, role: 'agent', departmentId: itDep.id },
  })
  const agente2 = await prisma.user.upsert({
    where: { email: 'soporte@zimtech.com.ar' },
    update: { name: 'Valentina Torres' },
    create: { name: 'Valentina Torres', email: 'soporte@zimtech.com.ar', password: pass, role: 'agent', departmentId: itDep.id },
  })
  const cliente1 = await prisma.user.upsert({
    where: { email: 'cliente@zimtech.com.ar' },
    update: { name: 'Cliente Demo' },
    create: { name: 'Cliente Demo', email: 'cliente@zimtech.com.ar', password: pass, role: 'client', departmentId: hrDep.id },
  })
  const cliente2 = await prisma.user.upsert({
    where: { email: 'maria.gonzalez@zimtech.com.ar' },
    update: { name: 'María González' },
    create: { name: 'María González', email: 'maria.gonzalez@zimtech.com.ar', password: pass, role: 'client', departmentId: opsDep.id },
  })
  const cliente3 = await prisma.user.upsert({
    where: { email: 'carlos.mendez@zimtech.com.ar' },
    update: { name: 'Carlos Méndez' },
    create: { name: 'Carlos Méndez', email: 'carlos.mendez@zimtech.com.ar', password: pass, role: 'client', departmentId: finDep.id },
  })
  const cliente4 = await prisma.user.upsert({
    where: { email: 'lucia.fernandez@zimtech.com.ar' },
    update: { name: 'Lucía Fernández' },
    create: { name: 'Lucía Fernández', email: 'lucia.fernandez@zimtech.com.ar', password: pass, role: 'client', departmentId: mktDep.id },
  })
  const cliente5 = await prisma.user.upsert({
    where: { email: 'pedro.rojas@zimtech.com.ar' },
    update: { name: 'Pedro Rojas' },
    create: { name: 'Pedro Rojas', email: 'pedro.rojas@zimtech.com.ar', password: pass, role: 'client', departmentId: hrDep.id },
  })

  // ── GERENTES ─────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'gerente@zimtech.com.ar' },
    update: { name: 'Andrés Morales' },
    create: { name: 'Andrés Morales', email: 'gerente@zimtech.com.ar', password: pass, role: 'gerente', departmentId: dirZimtech.id },
  })
  await prisma.user.upsert({
    where: { email: 'gerente@empresademo.com' },
    update: { name: 'Sofía Acuña' },
    create: { name: 'Sofía Acuña', email: 'gerente@empresademo.com', password: pass, role: 'gerente', departmentId: dirEmpresa2.id },
  })

  console.log('✅ Usuarios creados')

  // ─── FAQs ────────────────────────────────────────────────────
  const faqs = [
    { id: 1, question: '¿Cómo creo un nuevo ticket?', answer: 'Desde el menú lateral, hacé clic en "Nuevo Ticket". Completá el formulario con el asunto, descripción detallada y categoría, luego presioná Enviar. Recibirás confirmación y un número de ticket asignado.' },
    { id: 2, question: '¿Cuánto tiempo demoran en responder?', answer: 'El tiempo objetivo de primera respuesta es de 4 horas hábiles para tickets de prioridad media. Los tickets urgentes tienen respuesta en menos de 1 hora. La prioridad baja puede demorar hasta 24 horas hábiles.' },
    { id: 3, question: '¿Puedo adjuntar archivos al ticket?', answer: 'Sí. Podés adjuntar imágenes (JPG, PNG), documentos (PDF, Word, Excel) y videos (MP4) tanto al crear el ticket como al responder. El tamaño máximo por archivo es de 10MB.' },
    { id: 4, question: '¿Qué significa cada estado del ticket?', answer: 'Abierto: recibido, esperando asignación.\nEn Progreso: un agente lo está trabajando.\nEn Espera del Cliente: el agente respondió y aguarda tu respuesta.\nRespuesta del Cliente: respondiste y el agente lo revisará.\nCerrado: resuelto satisfactoriamente.\nResuelto: confirmado como solucionado.\nRea bierto: fue cerrado pero se volvió a abrir.\nCancelado: se canceló por solicitud o inactividad.' },
    { id: 5, question: '¿Puedo reabrir un ticket cerrado?', answer: 'Sí. Si el problema persiste o volvió a ocurrir, podés reabrir el ticket desde la vista de detalle usando el botón "Reabrir ticket". Esto notificará al equipo de soporte automáticamente.' },
  ]
  for (const f of faqs) {
    await prisma.faq.upsert({ where: { id: f.id }, update: { question: f.question, answer: f.answer }, create: f })
  }

  // ─── NORMA DE PLATAFORMA ─────────────────────────────────────
  await prisma.platformNorm.upsert({
    where: { id: 1 },
    update: { content: `# Normas de la Plataforma ZimDesk

## 1. Creación de Tickets
- Describir el problema con el mayor detalle posible.
- Incluir los pasos para reproducir el error.
- Adjuntar capturas de pantalla o archivos relevantes.
- Un ticket por problema — no agrupar múltiples incidencias.

## 2. Comunicación
- Responder dentro de las 24 horas hábiles cuando el agente solicite información.
- Mantener un tono respetuoso en todas las comunicaciones.
- No escalar a otros canales mientras el ticket está activo.

## 3. Seguimiento
- Si no recibís respuesta en 48 horas, podés hacer una consulta de seguimiento en el mismo ticket.
- Ante dudas generales, consultá primero las FAQs antes de abrir un ticket.

## 4. Cierre de Tickets
- Un ticket se cierra cuando el problema queda resuelto.
- Si el problema reaparece, usar el botón "Reabrir" en lugar de crear uno nuevo.
- Tickets sin actividad por más de 7 días se cierran automáticamente.` },
    create: { content: '# Normas de la Plataforma ZimDesk\n\nVer contenido completo.' },
  })

  console.log('✅ FAQs y normas creadas')

  // ─── TICKETS DE DEMO ─────────────────────────────────────────
  // Helper para crear ticket + logs + mensajes
  async function crearTicket(opts: {
    userId: number
    subject: string
    description: string
    categoryId: number
    statusId: number
    priorityId: number
    assignedTo?: number
    firstResponseAt?: Date
    closedAt?: Date
    createdAt: Date
    mensajes?: Array<{
      userId: number
      message: string
      createdAt: Date
    }>
    logs?: Array<{
      userId: number
      action: string
      createdAt: Date
    }>
  }) {
    const existing = await prisma.ticket.findFirst({ where: { subject: opts.subject } })
    if (existing) return existing

    const ticket = await prisma.ticket.create({
      data: {
        userId: opts.userId,
        subject: opts.subject,
        description: opts.description,
        categoryId: opts.categoryId,
        statusId: opts.statusId,
        priorityId: opts.priorityId,
        assignedTo: opts.assignedTo ?? null,
        firstResponseAt: opts.firstResponseAt ?? null,
        closedAt: opts.closedAt ?? null,
        createdAt: opts.createdAt,
      },
    })

    if (opts.logs) {
      for (const log of opts.logs) {
        await prisma.log.create({ data: { ticketId: ticket.id, userId: log.userId, action: log.action, createdAt: log.createdAt } })
      }
    }
    if (opts.mensajes) {
      for (const m of opts.mensajes) {
        await prisma.ticketMessage.create({ data: { ticketId: ticket.id, userId: m.userId, message: m.message, createdAt: m.createdAt } })
      }
    }
    return ticket
  }

  async function adjuntar(ticketId: number, archivos: { name: string; type: string; size: number }[]) {
    const existing = await prisma.attachmentTicket.count({ where: { ticketId } })
    if (existing > 0) return
    for (const a of archivos) {
      await prisma.attachmentTicket.create({
        data: {
          ticketId,
          filePath: `/uploads/tickets/demo/${a.name}`,
          fileType: a.type,
          fileName: a.name,
          fileSize: a.size,
        },
      })
    }
  }

  // ── TICKETS ABIERTOS (sin asignar) ──────────────────────────
  const ticketVpn = await crearTicket({
    userId: cliente1.id,
    subject: 'No puedo acceder a la VPN corporativa desde casa',
    description: 'Desde ayer a las 18hs no logro conectarme a la VPN. El cliente Cisco AnyConnect muestra el error "Connection attempt has failed due to server communication errors". Ya reinicié el equipo y desinstalé/reinstalé el cliente pero el problema persiste.\n\nSistema operativo: Windows 11 Pro 23H2\nVersión AnyConnect: 4.10.08029',
    categoryId: catSoporte.id,
    statusId: 1, // abierto
    priorityId: 3, // alta
    createdAt: daysAgo(1, 2),
    logs: [{ userId: cliente1.id, action: 'Cliente Demo creó el ticket "No puedo acceder a la VPN corporativa desde casa" (#auto).', createdAt: daysAgo(1, 2) }],
  })

  await crearTicket({
    userId: cliente2.id,
    subject: 'Solicitud de alta de usuario en sistema SAP',
    description: 'Necesito dar de alta a un nuevo empleado en el sistema SAP. Datos del nuevo usuario:\n- Nombre: Roberto Silva\n- Puesto: Analista de Operaciones\n- Área: Operaciones\n- Fecha de ingreso: próximo lunes\n- Módulos necesarios: MM (Materiales) y SD (Ventas)\n\nEs urgente para que pueda arrancar trabajar desde el primer día.',
    categoryId: catAcceso.id,
    statusId: 1, // abierto
    priorityId: 2, // media
    createdAt: daysAgo(0, 3),
    logs: [{ userId: cliente2.id, action: 'María González creó el ticket "Solicitud de alta de usuario en sistema SAP" (#auto).', createdAt: daysAgo(0, 3) }],
  })

  await crearTicket({
    userId: cliente5.id,
    subject: 'Pantalla en sala de reuniones Piso 3 no enciende',
    description: 'La pantalla Samsung de 55" ubicada en la sala de reuniones del piso 3 no enciende. El led de power está en rojo (modo standby) pero al presionar el control remoto o el botón físico no responde.\n\nYa verifiqué que el cable de alimentación está bien conectado y probé con otro tomacorriente. El problema comenzó hoy a la mañana.',
    categoryId: catInfra.id,
    statusId: 1, // abierto
    priorityId: 1, // baja
    createdAt: daysAgo(0, 1),
    logs: [{ userId: cliente5.id, action: 'Pedro Rojas creó el ticket "Pantalla en sala de reuniones Piso 3 no enciende" (#auto).', createdAt: daysAgo(0, 1) }],
  })

  // ── TICKETS EN PROGRESO ──────────────────────────────────────
  const ticketFactura = await crearTicket({
    userId: cliente3.id,
    subject: 'Error en factura #F-2026-0482 — monto incorrecto',
    description: 'La factura F-2026-0482 emitida el 15 de junio tiene un monto de $125.000 pero debería ser $112.500 según el contrato vigente. La diferencia es de $12.500.\n\nAdjunto el contrato y la factura para su revisión. Necesito que se emita una nota de crédito antes del cierre del mes para poder cuadrar la contabilidad.',
    categoryId: catFacturacion.id,
    statusId: 2, // en_progreso
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(3, -2),
    createdAt: daysAgo(4),
    logs: [
      { userId: cliente3.id, action: 'Carlos Méndez creó el ticket "Error en factura #F-2026-0482 — monto incorrecto".', createdAt: daysAgo(4) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(3, 8) },
      { userId: agente2.id, action: 'Valentina Torres respondió al ticket.', createdAt: daysAgo(3, -2) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Carlos, recibí tu ticket y estoy revisando la factura junto al equipo de Finanzas. Voy a necesitar que me confirmes el número de contrato para buscar la tarifa vigente en nuestro sistema. ¿Podés enviarlo?\n\nSaludos, Valentina',
        createdAt: daysAgo(3, -2),
      },
      {
        userId: cliente3.id,
        message: 'Hola Valentina. El número de contrato es CONT-2025-089, firmado el 12 de noviembre de 2025. La tarifa acordada en la cláusula 4.2 es de $112.500 mensuales con actualización trimestral.\n\nQuedo a disposición.',
        createdAt: daysAgo(2, 6),
      },
    ],
  })

  const ticketEmail = await crearTicket({
    userId: cliente4.id,
    subject: 'Campaña de email no se envió correctamente — 0% de apertura',
    description: 'Lanzamos ayer la campaña "Promo Julio 2026" desde Mailchimp y según las métricas tenemos 0% de tasa de apertura en 1.200 envíos. Lo raro es que los envíos de prueba sí llegaron a nuestras casillas internas.\n\nSospechamos que los emails están cayendo en spam o hay un problema con el dominio de envío. Necesitamos resolverlo urgente porque la promo vence el domingo.',
    categoryId: catSoporte.id,
    statusId: 2, // en_progreso
    priorityId: 4, // urgente
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(1, -1),
    createdAt: daysAgo(1, 4),
    logs: [
      { userId: cliente4.id, action: 'Lucía Fernández creó el ticket "Campaña de email no se envió correctamente — 0% de apertura".', createdAt: daysAgo(1, 4) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(1, 2) },
      { userId: agente1.id, action: 'Lucas Herrera respondió al ticket.', createdAt: daysAgo(1, -1) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola Lucía, tomé tu caso con urgencia. Ya revisé el registro SPF y DKIM del dominio zimtech.com.ar y están configurados correctamente. El problema podría ser:\n\n1. Lista de destinatarios con muchos bounces previos\n2. Contenido del email activando filtros de spam\n3. IP de envío de Mailchimp con reputación comprometida\n\nEstoy analizando los headers de los emails devueltos. ¿Podés pasarme el ID de campaña en Mailchimp?\n\nLucas',
        createdAt: daysAgo(1, -1),
      },
    ],
  })

  // ── TICKETS EN ESPERA DEL CLIENTE ────────────────────────────
  const ticketExcel = await crearTicket({
    userId: cliente1.id,
    subject: 'Excel no abre archivos .xlsx — error de formato',
    description: 'Desde que actualizaron el Office (versión 2406) no puedo abrir ningún archivo .xlsx. El error dice "Excel no puede abrir el archivo porque el formato o la extensión no son válidos".\n\nProbé con varios archivos que antes abrían sin problema y todos fallan. Los archivos .xls (formato viejo) sí abren correctamente.',
    categoryId: catSoporte.id,
    statusId: 3, // en_espera_cliente
    priorityId: 2, // media
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(5, -3),
    createdAt: daysAgo(6),
    logs: [
      { userId: cliente1.id, action: 'Cliente Demo creó el ticket "Excel no abre archivos .xlsx — error de formato".', createdAt: daysAgo(6) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(5, 10) },
      { userId: agente1.id, action: 'Lucas Herrera respondió al ticket.', createdAt: daysAgo(5, -3) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola, para resolver esto necesito que sigas estos pasos:\n\n1. Abrí Excel\n2. Ir a Archivo → Opciones → Centro de confianza → Configuración del Centro de confianza\n3. Clic en "Ubicaciones de confianza"\n4. Verificar si hay alguna ubicación bloqueada\n\nSi no funciona, intentá reparar Office desde Panel de Control → Programas → clic derecho en Microsoft Office → Cambiar → Reparación rápida.\n\nContame qué pasó.',
        createdAt: daysAgo(5, -3),
      },
    ],
  })

  await crearTicket({
    userId: cliente2.id,
    subject: 'Impresora del sector no imprime en doble faz',
    description: 'La impresora HP LaserJet Pro M428fdw del sector de Operaciones (piso 2, junto al servidor) no imprime en doble faz automático. Sí lo hace en forma manual pero el dúplex automático no funciona desde hace 3 días.\n\nYa instalé el driver más actualizado desde la web de HP pero el problema sigue.',
    categoryId: catInfra.id,
    statusId: 3, // en_espera_cliente
    priorityId: 1, // baja
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(7, -4),
    createdAt: daysAgo(8),
    logs: [
      { userId: cliente2.id, action: 'María González creó el ticket "Impresora del sector no imprime en doble faz".', createdAt: daysAgo(8) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(7, 8) },
      { userId: agente2.id, action: 'Valentina Torres respondió al ticket.', createdAt: daysAgo(7, -4) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola María. El problema de dúplex en esa impresora suele ser por un atasco de papel en la unidad dúplex. Para verificarlo:\n\n1. Apagá la impresora\n2. Abrí la tapa trasera\n3. Retirá la bandeja de salida\n4. Revisá si hay un trozo de papel atascado en la unidad dúplex (parte trasera)\n\nSi no hay papel atascado, haceme saber el código de error que aparece en el panel de la impresora.\n\nValentina',
        createdAt: daysAgo(7, -4),
      },
    ],
  })

  const ticketReembolso = await crearTicket({
    userId: cliente3.id,
    subject: 'Consulta sobre política de reembolso — servicio cancelado',
    description: '¿Cuál es el proceso para solicitar el reembolso del servicio de licencias #LIC-789 que cancelamos el mes pasado? El cargo aún aparece en nuestra cuenta. Necesito los formularios y los plazos estimados.',
    categoryId: catConsultas.id,
    statusId: 3, // en_espera_cliente
    priorityId: 2, // media
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(2, -5),
    createdAt: daysAgo(3),
    logs: [
      { userId: cliente3.id, action: 'Carlos Méndez creó el ticket "Consulta sobre política de reembolso — servicio cancelado".', createdAt: daysAgo(3) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(2, 8) },
      { userId: agente1.id, action: 'Lucas Herrera respondió al ticket.', createdAt: daysAgo(2, -5) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola Carlos. Para gestionar el reembolso de licencias canceladas, el proceso es:\n\n1. Completar el formulario FR-014 (lo adjunto en el próximo mensaje)\n2. Indicar número de licencia, fecha de cancelación y monto a reembolsar\n3. El plazo de acreditación es de 15 días hábiles desde la aprobación\n\nNecesito que me confirmes: ¿la cancelación fue solicitada por vía formal (email al equipo de cuentas) o directamente desde el portal?\n\nLucas',
        createdAt: daysAgo(2, -5),
      },
    ],
  })

  // ── TICKET CON RESPUESTA DEL CLIENTE ─────────────────────────
  const ticketAnalytics = await crearTicket({
    userId: cliente4.id,
    subject: 'Acceso al panel de Google Analytics bloqueado',
    description: 'Desde hace 2 días no puedo acceder a Google Analytics con mi cuenta corporativa lucia.fernandez@zimtech.com.ar. El error es "No tenés permiso para ver esta propiedad".\n\nNecesito acceso a la propiedad GA4-2891-XXX para generar el informe mensual de Marketing.',
    categoryId: catAcceso.id,
    statusId: 4, // respuesta_cliente
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(9, -2),
    createdAt: daysAgo(10),
    logs: [
      { userId: cliente4.id, action: 'Lucía Fernández creó el ticket "Acceso al panel de Google Analytics bloqueado".', createdAt: daysAgo(10) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(9, 10) },
      { userId: agente2.id, action: 'Valentina Torres respondió al ticket.', createdAt: daysAgo(9, -2) },
      { userId: cliente4.id, action: 'Lucía Fernández respondió al ticket.', createdAt: daysAgo(8, 4) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Lucía. Revisé las propiedades de GA4 en la cuenta corporativa y veo que tu usuario fue removido del acceso hace 12 días. Esto suele pasar cuando se renueva el contrato de servicios.\n\n¿Podés confirmarme qué nivel de acceso necesitás? Las opciones son:\n- Lector (solo ver reportes)\n- Analista (ver y comparar)\n- Editor (ver, comparar y editar configuraciones)\n\nValentina',
        createdAt: daysAgo(9, -2),
      },
      {
        userId: cliente4.id,
        message: 'Hola Valentina! Necesito acceso de Analista para poder comparar períodos y exportar los datos. El nivel de Editor no es necesario.\n\nGracias!',
        createdAt: daysAgo(8, 4),
      },
    ],
  })

  // ── TICKETS CERRADOS ─────────────────────────────────────────
  await crearTicket({
    userId: cliente5.id,
    subject: 'Reseteo de contraseña — cuenta corporativa bloqueada',
    description: 'Mi cuenta de Windows se bloqueó luego de 5 intentos fallidos. Necesito que la desbloqueen y me reseteen la contraseña.',
    categoryId: catAcceso.id,
    statusId: 6, // cerrado
    priorityId: 3, // alta
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(14, -1),
    closedAt: daysAgo(13, 6),
    createdAt: daysAgo(15),
    logs: [
      { userId: cliente5.id, action: 'Pedro Rojas creó el ticket "Reseteo de contraseña — cuenta corporativa bloqueada".', createdAt: daysAgo(15) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(14, 8) },
      { userId: agente1.id, action: 'Lucas Herrera cerró el ticket "Reseteo de contraseña — cuenta corporativa bloqueada" (#auto).', createdAt: daysAgo(13, 6) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola Pedro. Desbloqueé tu cuenta en el Active Directory y reseteé la contraseña temporal a "ZimTech#2026". Al ingresar te va a pedir que la cambies.\n\nPasos para entrar:\n1. Ctrl + Alt + Supr → Cambiar contraseña\n2. Contraseña actual: ZimTech#2026\n3. Nueva contraseña: elegí una de mínimo 8 caracteres con mayúscula, minúscula y número\n\nAvísame si funciona.',
        createdAt: daysAgo(14, -1),
      },
      {
        userId: cliente5.id,
        message: 'Perfecto, entré sin problema! Gracias por la rapidez.',
        createdAt: daysAgo(13, 8),
      },
      {
        userId: agente1.id,
        message: 'Genial, cierro el ticket. Cualquier problema no dudes en abrir uno nuevo.',
        createdAt: daysAgo(13, 6),
      },
    ],
  })

  await crearTicket({
    userId: cliente1.id,
    subject: 'Configurar firma de email corporativa en Outlook',
    description: 'Necesito ayuda para configurar la firma corporativa nueva en Outlook. Me mandaron el HTML de la firma pero no sé cómo insertarlo correctamente.',
    categoryId: catConsultas.id,
    statusId: 6, // cerrado
    priorityId: 1, // baja
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(18, -3),
    closedAt: daysAgo(17),
    createdAt: daysAgo(19),
    logs: [
      { userId: cliente1.id, action: 'Cliente Demo creó el ticket "Configurar firma de email corporativa en Outlook".', createdAt: daysAgo(19) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(18, 10) },
      { userId: agente2.id, action: 'Valentina Torres cerró el ticket.', createdAt: daysAgo(17) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola! Para insertar la firma HTML en Outlook:\n\n1. Archivo → Opciones → Correo → Firmas\n2. Clic en "Nueva", dale un nombre\n3. Clic en el botón de código fuente (icono &lt;/&gt;) o presioná la tecla en la barra\n4. Pegá el HTML de la firma\n5. Guardar y asignar a tu cuenta\n\nSi el botón de código fuente no aparece, podés abrir el archivo HTML en el navegador, seleccionar todo (Ctrl+A), copiarlo y pegarlo directamente en el editor de firma.\n\nValentina',
        createdAt: daysAgo(18, -3),
      },
      {
        userId: cliente1.id,
        message: '¡Funcionó con la segunda opción! Muchas gracias.',
        createdAt: daysAgo(17, 2),
      },
    ],
  })

  await crearTicket({
    userId: cliente2.id,
    subject: 'Lentitud en el sistema de gestión de stock',
    description: 'El sistema de gestión de stock (módulo WMS) está respondiendo muy lento desde hace 3 días. Operaciones que antes tardaban 2 segundos ahora demoran 30-40 segundos. Afecta a todo el sector.',
    categoryId: catInfra.id,
    statusId: 6, // cerrado
    priorityId: 3, // alta
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(11, -1),
    closedAt: daysAgo(10, 4),
    createdAt: daysAgo(12),
    logs: [
      { userId: cliente2.id, action: 'María González creó el ticket "Lentitud en el sistema de gestión de stock".', createdAt: daysAgo(12) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera con prioridad Alta.', createdAt: daysAgo(11, 9) },
      { userId: agente1.id, action: 'Lucas Herrera cerró el ticket.', createdAt: daysAgo(10, 4) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola María. Revisé el servidor de base de datos del WMS y encontré el problema: la tabla de movimientos_stock no tenía índice en la columna fecha_movimiento, lo que causaba full table scans en cada consulta. Con 2 millones de registros, eso explica la demora.\n\nCreé el índice y optimicé las 3 queries más pesadas. Podés probar ahora.',
        createdAt: daysAgo(11, -1),
      },
      {
        userId: cliente2.id,
        message: 'Excelente! Está volando ahora. Menos de 1 segundo en todas las operaciones. Muchas gracias Lucas.',
        createdAt: daysAgo(10, 5),
      },
    ],
  })

  // ── TICKETS RESUELTOS ─────────────────────────────────────────
  const ticketDoblecobro = await crearTicket({
    userId: cliente3.id,
    subject: 'Doble cobro en factura de junio — línea de servicio cloud',
    description: 'En la factura de junio aparecen dos cargos por el servicio Cloud Storage Pro: uno de $45.000 el día 3 y otro de $45.000 el día 5. Solo deberíamos tener un cargo mensual. Por favor verificar y emitir nota de crédito.',
    categoryId: catFacturacion.id,
    statusId: 5, // resuelto
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(20, -2),
    closedAt: daysAgo(17, 3),
    createdAt: daysAgo(21),
    logs: [
      { userId: cliente3.id, action: 'Carlos Méndez creó el ticket "Doble cobro en factura de junio".', createdAt: daysAgo(21) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(20, 9) },
      { userId: agente2.id, action: 'Valentina Torres cerró el ticket.', createdAt: daysAgo(17, 3) },
      { userId: admin.id, action: 'Matías Zamora marcó como resuelto el ticket.', createdAt: daysAgo(16) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Carlos. Confirmado: hubo un error en el sistema de facturación el 5 de junio que generó un cargo duplicado. Ya coordiné con el equipo de Finanzas para emitir la Nota de Crédito NC-2026-0134 por $45.000 a tu favor. La verás reflejada en la próxima factura.\n\nValentina',
        createdAt: daysAgo(20, -2),
      },
      {
        userId: cliente3.id,
        message: 'Perfecto, gracias por resolverlo rápidamente. Quedo en espera de verlo reflejado.',
        createdAt: daysAgo(18),
      },
    ],
  })

  await crearTicket({
    userId: cliente4.id,
    subject: 'El servidor de archivos compartidos no es accesible desde la oficina',
    description: 'No podemos acceder al servidor de archivos \\\\ZIMTECH-FS01\\Compartidos desde ninguna PC del piso de Marketing. El error es "No se puede tener acceso a la ruta de red especificada". El problema inició después del corte de luz de anoche.',
    categoryId: catInfra.id,
    statusId: 5, // resuelto
    priorityId: 4, // urgente
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(22, -1),
    closedAt: daysAgo(21, 5),
    createdAt: daysAgo(22, 3),
    logs: [
      { userId: cliente4.id, action: 'Lucía Fernández creó el ticket "El servidor de archivos compartidos no es accesible".', createdAt: daysAgo(22, 3) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera con prioridad Urgente.', createdAt: daysAgo(22, 1) },
      { userId: agente1.id, action: 'Lucas Herrera cerró el ticket.', createdAt: daysAgo(21, 5) },
      { userId: admin.id, action: 'Matías Zamora marcó como resuelto el ticket.', createdAt: daysAgo(20) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola Lucía. El servidor ZIMTECH-FS01 quedó con el servicio de archivos detenido después del corte de luz (el UPS no aguantó el tiempo de apagado). Reinicié el servicio y está disponible nuevamente. Probalo.',
        createdAt: daysAgo(22, -1),
      },
      {
        userId: cliente4.id,
        message: 'Volvió! Todos en el piso ya podemos acceder. Gracias por la rapidez.',
        createdAt: daysAgo(21, 6),
      },
    ],
  })

  // ── TICKET REABIERTO ──────────────────────────────────────────
  const ticketTeams = await crearTicket({
    userId: cliente1.id,
    subject: 'Teams no carga el historial de chats — segunda vez',
    description: 'El problema del historial de Teams volvió a ocurrir. Ya lo habían "solucionado" hace 2 semanas pero desde esta mañana el historial aparece vacío nuevamente.\n\nLo reabro porque el fix anterior no fue permanente.',
    categoryId: catSoporte.id,
    statusId: 7, // reabierto
    priorityId: 2, // media
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(2, -3),
    createdAt: daysAgo(3, 2),
    logs: [
      { userId: cliente1.id, action: 'Cliente Demo creó el ticket "Teams no carga el historial de chats — segunda vez".', createdAt: daysAgo(3, 2) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(2, 10) },
      { userId: agente2.id, action: 'Valentina Torres respondió al ticket.', createdAt: daysAgo(2, -3) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola. Veo que el problema reapareció. El fix de la semana pasada fue temporal. Ahora voy a limpiar la caché de Teams de forma completa:\n\n1. Cerrá Teams completamente\n2. Abrí el Explorador de archivos\n3. Navegá a %appdata%\\Microsoft\\Teams\n4. Eliminá todo el contenido de esa carpeta\n5. Reiniciá Teams\n\nAdemás voy a escalar al equipo de Microsoft 365 para revisar si hay un problema con tu tenant. Te aviso.',
        createdAt: daysAgo(2, -3),
      },
    ],
  })

  // ── TICKET CANCELADO ──────────────────────────────────────────
  await crearTicket({
    userId: cliente5.id,
    subject: 'Consulta sobre disponibilidad de sala de capacitación',
    description: 'Quería consultar si la sala de capacitación del piso 4 está disponible para el jueves 3 de julio de 9 a 12hs para una reunión de inducción.',
    categoryId: catConsultas.id,
    statusId: 8, // cancelado
    priorityId: 1, // baja
    createdAt: daysAgo(5, 5),
    logs: [
      { userId: cliente5.id, action: 'Pedro Rojas creó el ticket "Consulta sobre disponibilidad de sala de capacitación".', createdAt: daysAgo(5, 5) },
      { userId: admin.id, action: 'Matías Zamora canceló el ticket (ticket duplicado, se gestionó por canal interno).', createdAt: daysAgo(5, 3) },
    ],
  })

  // ── TICKETS EXTRA — ZimTech Interna (para gerente@zimtech.com.ar) ─────
  await crearTicket({
    userId: cliente1.id,
    subject: 'Solicitud de notebook para nuevo empleado — área RRHH',
    description: 'Necesitamos una notebook para el nuevo empleado que ingresa el lunes 6 de julio al área de Recursos Humanos. Requerimientos mínimos: 16 GB RAM, SSD 512 GB, Windows 11 Pro. De ser posible el mismo modelo que tienen los demás en el área.',
    categoryId: catInfra.id,
    statusId: 2, // en_progreso
    priorityId: 2, // media
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(0, -2),
    createdAt: daysAgo(1, 1),
    logs: [
      { userId: cliente1.id, action: 'Cliente Demo creó el ticket "Solicitud de notebook para nuevo empleado — área RRHH".', createdAt: daysAgo(1, 1) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(0, 5) },
      { userId: agente1.id, action: 'Lucas Herrera respondió al ticket.', createdAt: daysAgo(0, -2) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola. Voy a verificar el stock de equipos disponibles. Si no hay en stock, el tiempo de entrega estimado con nuestro proveedor es de 3 días hábiles. Te confirmo antes del mediodía.',
        createdAt: daysAgo(0, -2),
      },
    ],
  })

  const ticketConformidad = await crearTicket({
    userId: cliente5.id,
    subject: 'Problema al iniciar sesión en el portal de empleados',
    description: 'No puedo acceder al portal de empleados de RRHH desde hace dos días. Ingreso mis credenciales y aparece el mensaje "Sesión expirada, intente nuevamente" inmediatamente. Probé desde distintos navegadores y equipos con el mismo resultado.',
    categoryId: catAcceso.id,
    statusId: 5, // resuelto  ← cliente puede dar conformidad
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(4, -1),
    createdAt: daysAgo(5),
    logs: [
      { userId: cliente5.id, action: 'Pedro Rojas creó el ticket "Problema al iniciar sesión en el portal de empleados".', createdAt: daysAgo(5) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(4, 8) },
      { userId: agente2.id, action: 'Valentina Torres marcó el ticket como Resuelto.', createdAt: daysAgo(3, 3) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Pedro. El problema era que tu token de sesión en la base de datos había quedado corrompido por una actualización del servidor. Lo limpié y restablecí tu acceso. Podés intentar ingresar ahora con tus credenciales habituales.',
        createdAt: daysAgo(4, -1),
      },
      {
        userId: cliente5.id,
        message: 'Perfecto, ya pude ingresar sin problema. Muchas gracias por la resolución rápida.',
        createdAt: daysAgo(3, 5),
      },
    ],
  })

  await crearTicket({
    userId: cliente1.id,
    subject: 'Error al exportar reportes en el sistema de RRHH',
    description: 'Al intentar exportar el reporte mensual de asistencia en formato Excel desde el sistema de RRHH, el archivo se descarga vacío (0 KB). El PDF sí funciona correctamente. El problema empezó con la última actualización del sistema.',
    categoryId: catSoporte.id,
    statusId: 6, // cerrado
    priorityId: 2, // media
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(15, -2),
    closedAt: daysAgo(13, 4),
    createdAt: daysAgo(16),
    logs: [
      { userId: cliente1.id, action: 'Cliente Demo creó el ticket "Error al exportar reportes en el sistema de RRHH".', createdAt: daysAgo(16) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera.', createdAt: daysAgo(15, 8) },
      { userId: agente1.id, action: 'Lucas Herrera cerró el ticket.', createdAt: daysAgo(13, 4) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola. El bug estaba en la librería de generación de Excel que se actualizó sin compatibilidad retroactiva. Apliqué el parche del proveedor. Ya podés exportar normalmente.',
        createdAt: daysAgo(15, -2),
      },
      { userId: cliente1.id, message: 'Perfecto, funciona. Gracias!', createdAt: daysAgo(13, 5) },
    ],
  })

  // ── TICKETS EXTRA — Empresa Demo SA (para gerente@empresademo.com) ──────
  await crearTicket({
    userId: cliente2.id,
    subject: 'El módulo de pedidos no guarda cambios al editar',
    description: 'Al editar un pedido existente en el módulo de Operaciones (sistema interno ERP), al hacer clic en "Guardar" la página se recarga pero los cambios no se persisten. El problema ocurre solo con pedidos de más de 10 ítems. Los pedidos nuevos se crean sin problema.',
    categoryId: catSoporte.id,
    statusId: 4, // respuesta_cliente
    priorityId: 4, // urgente
    assignedTo: agente1.id,
    firstResponseAt: daysAgo(0, -3),
    createdAt: daysAgo(1, 2),
    logs: [
      { userId: cliente2.id, action: 'María González creó el ticket "El módulo de pedidos no guarda cambios al editar".', createdAt: daysAgo(1, 2) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket al agente Lucas Herrera con prioridad Urgente.', createdAt: daysAgo(1, 0) },
      { userId: agente1.id, action: 'Lucas Herrera respondió al ticket.', createdAt: daysAgo(0, -3) },
      { userId: cliente2.id, action: 'María González respondió al ticket.', createdAt: daysAgo(0, -1) },
    ],
    mensajes: [
      {
        userId: agente1.id,
        message: 'Hola María. Para reproducir el problema, necesito que me pases:\n1. El número de algún pedido que falla\n2. Los navegador y versión que usás\n3. Si hay algún mensaje de error en la consola del navegador (F12 → Consola)\n\nLo estoy investigando en el entorno de testing. Lucas',
        createdAt: daysAgo(0, -3),
      },
      {
        userId: cliente2.id,
        message: 'El pedido #PED-2026-1089 falla siempre. Usamos Chrome 126. En la consola dice: "Payload Too Large 413". Espero que ayude.',
        createdAt: daysAgo(0, -1),
      },
    ],
  })

  await crearTicket({
    userId: cliente3.id,
    subject: 'Acceso a Power BI bloqueado para el equipo de Finanzas',
    description: 'Desde el lunes, ningún usuario del equipo de Finanzas puede acceder a los dashboards de Power BI. La página carga pero muestra "No tenés licencia para ver este contenido". Somos 5 usuarios afectados: carlos.mendez, paula.suarez, roberto.diaz, ana.perez y juan.lopez.',
    categoryId: catAcceso.id,
    statusId: 2, // en_progreso
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(2, -4),
    createdAt: daysAgo(3, 1),
    logs: [
      { userId: cliente3.id, action: 'Carlos Méndez creó el ticket "Acceso a Power BI bloqueado para el equipo de Finanzas".', createdAt: daysAgo(3, 1) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(2, 9) },
      { userId: agente2.id, action: 'Valentina Torres respondió al ticket.', createdAt: daysAgo(2, -4) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Carlos. Ya identifiqué el problema: las licencias de Power BI Pro del equipo de Finanzas no fueron renovadas en el ciclo de facturación de julio. Estoy coordinando con el área de compras para activarlas. El tiempo estimado es de 24-48 horas hábiles. Valentina',
        createdAt: daysAgo(2, -4),
      },
    ],
  })

  await crearTicket({
    userId: cliente4.id,
    subject: 'Solicitud de integración Mailchimp ↔ CRM',
    description: 'Necesitamos integrar nuestro CRM interno con Mailchimp para sincronizar automáticamente los contactos nuevos. Actualmente lo hacemos en forma manual (exportar CSV → importar en Mailchimp), lo que nos genera trabajo extra y errores.\n\nEstimado de contactos nuevos por mes: ~200. La integración debería sincronizar nombre, email, empresa y segmento.',
    categoryId: catConsultas.id,
    statusId: 1, // abierto
    priorityId: 2, // media
    createdAt: daysAgo(0, 2),
    logs: [
      { userId: cliente4.id, action: 'Lucía Fernández creó el ticket "Solicitud de integración Mailchimp ↔ CRM".', createdAt: daysAgo(0, 2) },
    ],
  })

  await crearTicket({
    userId: cliente3.id,
    subject: 'Discrepancia en reporte de ventas de mayo — totales incorrectos',
    description: 'El reporte de ventas de mayo del sistema muestra $2.340.000 pero el balance manual que preparamos muestra $2.218.500. La diferencia es de $121.500. Sospechamos que hay transacciones duplicadas o que alguna devolución no fue registrada correctamente.',
    categoryId: catFacturacion.id,
    statusId: 6, // cerrado
    priorityId: 3, // alta
    assignedTo: agente2.id,
    firstResponseAt: daysAgo(25, -2),
    closedAt: daysAgo(22, 5),
    createdAt: daysAgo(26),
    logs: [
      { userId: cliente3.id, action: 'Carlos Méndez creó el ticket "Discrepancia en reporte de ventas de mayo".', createdAt: daysAgo(26) },
      { userId: admin.id, action: 'Matías Zamora asignó el ticket a la agente Valentina Torres.', createdAt: daysAgo(25, 9) },
      { userId: agente2.id, action: 'Valentina Torres cerró el ticket.', createdAt: daysAgo(22, 5) },
    ],
    mensajes: [
      {
        userId: agente2.id,
        message: 'Hola Carlos. Encontré el problema: la devolución #DEV-2026-0091 del 28 de mayo fue registrada dos veces en el sistema por un error de doble clic al guardar. Eliminé el duplicado y el total cuadra ahora: $2.218.500. Valentina',
        createdAt: daysAgo(25, -2),
      },
      { userId: cliente3.id, message: 'Confirmado, los números cuadran. Gracias!', createdAt: daysAgo(22, 6) },
    ],
  })

  // ── ADJUNTOS DE DEMO ────────────────────────────────────────
  await adjuntar(ticketVpn.id, [
    { name: 'captura-error-vpn.png', type: 'image/png', size: 284210 },
  ])
  await adjuntar(ticketFactura.id, [
    { name: 'factura-F-2026-0482.pdf',    type: 'application/pdf', size: 215040 },
    { name: 'contrato-CONT-2025-089.pdf', type: 'application/pdf', size: 189440 },
  ])
  await adjuntar(ticketEmail.id, [
    { name: 'captura-mailchimp-stats.png',    type: 'image/png', size: 512000 },
    { name: 'reporte-apertura-emails.xlsx',   type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 98304 },
  ])
  await adjuntar(ticketExcel.id, [
    { name: 'captura-excel-error.png', type: 'image/png', size: 345600 },
  ])
  await adjuntar(ticketReembolso.id, [
    { name: 'formulario-reembolso-FR014.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 73728 },
  ])
  await adjuntar(ticketAnalytics.id, [
    { name: 'captura-analytics-error.png', type: 'image/png', size: 423936 },
  ])
  await adjuntar(ticketDoblecobro.id, [
    { name: 'nota-credito-NC-2026-0134.pdf', type: 'application/pdf', size: 102400 },
  ])
  await adjuntar(ticketTeams.id, [
    { name: 'captura-teams-historial.png', type: 'image/png', size: 298496 },
  ])
  await adjuntar(ticketConformidad.id, [
    { name: 'captura-portal-error.png', type: 'image/png', size: 198400 },
  ])

  console.log('✅ Tickets de demo creados')
  console.log('')
  console.log('══════════════════════════════════════════════════════════')
  console.log('  Usuarios disponibles para testing:')
  console.log('══════════════════════════════════════════════════════════')
  console.log('  ADMIN    admin@zimtech.com.ar              → zimdesk2026')
  console.log('           Ve todo · gestiona usuarios y sistema')
  console.log('')
  console.log('  GERENTE  gerente@zimtech.com.ar            → zimdesk2026')
  console.log('           Ve tickets de ZimTech Interna (IT + RRHH + Dir)')
  console.log('')
  console.log('  GERENTE  gerente@empresademo.com           → zimdesk2026')
  console.log('           Ve tickets de Empresa Demo SA (Ops + Fin + Mkt + Dir)')
  console.log('')
  console.log('  AGENTE   agente@zimtech.com.ar             → zimdesk2026')
  console.log('           Lucas Herrera — ve sus tickets asignados')
  console.log('')
  console.log('  AGENTE   soporte@zimtech.com.ar            → zimdesk2026')
  console.log('           Valentina Torres — ve sus tickets asignados')
  console.log('')
  console.log('  CLIENTE  cliente@zimtech.com.ar            → zimdesk2026')
  console.log('           Cliente Demo — Dep. RRHH (ZimTech Interna)')
  console.log('')
  console.log('  CLIENTE  pedro.rojas@zimtech.com.ar        → zimdesk2026')
  console.log('           Pedro Rojas — tiene ticket RESUELTO para dar conformidad')
  console.log('')
  console.log('  CLIENTE  maria.gonzalez@zimtech.com.ar     → zimdesk2026')
  console.log('  CLIENTE  carlos.mendez@zimtech.com.ar      → zimdesk2026')
  console.log('  CLIENTE  lucia.fernandez@zimtech.com.ar    → zimdesk2026')
  console.log('           Empresa Demo SA (Ops / Finanzas / Marketing)')
  console.log('══════════════════════════════════════════════════════════')
  console.log('  Total tickets: ~22 distribuidos en todos los estados')
  console.log('══════════════════════════════════════════════════════════')

  // ─── @HANDLES DE CHAT ────────────────────────────────────────────────────
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, chatHandle: true } })
  const usedHandles = new Set<string>(allUsers.map(u => u.chatHandle).filter(Boolean) as string[])

  for (const u of allUsers) {
    if (!u.chatHandle) {
      await ensureHandle(u.id, u.name, usedHandles)
    }
  }
  console.log('✅ @handles de chat generados')
}

main().catch(console.error).finally(() => prisma.$disconnect())
