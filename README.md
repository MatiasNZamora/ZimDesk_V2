# ZimDesk v2

Sistema de Mesa de Ayuda (Help Desk) desarrollado para ZimTech. Permite gestionar tickets de soporte entre clientes, agentes y administradores con notificaciones en tiempo real, editor de texto enriquecido, modo oscuro y exportación a CSV.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript 5 |
| ORM | Prisma 5 + PostgreSQL 16 |
| Autenticación | NextAuth v4 (JWT) |
| UI | Tailwind CSS 3 + Lucide Icons |
| Formularios | React Hook Form + Zod |
| Estado servidor | TanStack Query v5 |
| Editor | TipTap v3 |
| Notificaciones | Server-Sent Events (SSE) |
| Emails | Nodemailer |
| Testing | Vitest 4 + Testing Library |
| Contenedores | Docker + Docker Compose |
| Deploy | Vercel (con Vercel Cron) |

---

## Roles de Usuario

| Rol | Permisos |
|---|---|
| **admin** | Acceso total: gestiona tickets, usuarios, departamentos, reportes y logs de auditoría |
| **agent** | Ve y responde tickets asignados, puede cerrar tickets |
| **client** | Crea tickets, ve sus propios tickets, puede responder y reabrir |

---

## Requisitos Previos

- Node.js >= 18
- Docker y Docker Compose (para la base de datos)
- npm >= 9

---

## Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/zimdesk-v2.git
cd zimdesk-v2
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos (Docker local)
DATABASE_URL="postgresql://zimdesk:zimdesk@localhost:5433/zimdesk?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cambia-esto-por-un-secret-seguro"

# Email (dejar vacío en desarrollo — los links se loguean en consola)
MAIL_HOST=""
MAIL_PORT="465"
MAIL_USER=""
MAIL_PASSWORD=""
MAIL_FROM="noreply@zimtech.com.ar"
MAIL_TICKET_NOTIFICATION=""

# Cron jobs (SLA alerts)
CRON_SECRET="cambia-esto-por-un-secret-seguro"
SLA_THRESHOLD_MINUTES="120"
```

> En producción usar valores generados con `openssl rand -base64 32`.

### 4. Levantar la base de datos

```bash
docker compose up -d db
```

Levanta PostgreSQL en el puerto `5433` (para no colisionar con instalaciones locales).

### 5. Sincronizar el esquema

```bash
npm run db:push
npm run db:generate
```

### 6. Cargar datos de prueba

```bash
npm run db:seed
```

### 7. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

---

## Usuarios de Prueba (Seed)

Todos los usuarios tienen la contraseña: **`zimdesk2026`**

| Email | Rol | Departamento | Nombre |
|---|---|---|---|
| `admin@zimtech.com.ar` | Admin | IT & Sistemas | Matías Zamora |
| `agente@zimtech.com.ar` | Agente | IT & Sistemas | Lucas Herrera |
| `soporte@zimtech.com.ar` | Agente | IT & Sistemas | Valentina Torres |
| `cliente@zimtech.com.ar` | Cliente | Recursos Humanos | Cliente Demo |
| `maria.gonzalez@zimtech.com.ar` | Cliente | Operaciones | María González |
| `carlos.mendez@zimtech.com.ar` | Cliente | Finanzas | Carlos Méndez |
| `lucia.fernandez@zimtech.com.ar` | Cliente | Marketing | Lucía Fernández |
| `pedro.rojas@zimtech.com.ar` | Cliente | RRHH | Pedro Rojas |

El seed también crea: 8 estados de ticket, 4 prioridades, 5 categorías, 5 FAQs, normas de plataforma y ~20 tickets de demo con mensajes y logs.

---

## Comandos Disponibles

```bash
# Desarrollo
npm run dev             # Servidor de desarrollo (puerto 3000)
npm run build           # Build de producción
npm run start           # Servidor de producción (requiere build previo)
npm run lint            # ESLint

# Base de datos
npm run db:push         # Sincroniza el schema con la DB
npm run db:migrate      # Crea y aplica una migración
npm run db:generate     # Regenera el cliente Prisma
npm run db:seed         # Carga datos de prueba
npm run db:studio       # Abre Prisma Studio (GUI para la DB)

# Tests
npm test                # Ejecuta todos los tests una vez
npm run test:watch      # Tests en modo watch
npm run test:coverage   # Tests + reporte de cobertura en /coverage/
npm run test:ui         # Tests con interfaz visual (Vitest UI)
```

---

## Testing

### Estructura de tests

```
src/__tests__/
├── setup.ts                    # Setup global (jest-dom, mocks de navegación)
├── helpers/
│   └── mocks.ts                # Factories: createPrismaMock(), makeSession()
├── unit/
│   ├── sanitize.test.ts        # XSS prevention: sanitizeMessage(), isRichText()
│   ├── rateLimit.test.ts       # Rate limiting: rateLimit(), getClientIp()
│   ├── mime.test.ts            # Validación MIME por magic bytes: getRealMime()
│   └── utils.test.ts           # Utilidades: cn(), escapeHtml(), formatMinutes()
├── api/
│   ├── auth-forgot.test.ts     # POST /api/auth/forgot-password
│   ├── auth-reset.test.ts      # POST /api/auth/reset-password
│   ├── ticket-status.test.ts   # POST /api/tickets/[id]/status
│   ├── cron-sla.test.ts        # GET /api/cron/sla-alerts
│   └── notifications.test.ts   # GET + PATCH /api/notifications
└── components/
    ├── Badge.test.tsx           # StatusBadge, PriorityBadge, RoleBadge
    └── Pagination.test.tsx      # Navegación, disabled states, callbacks
```

### Ejecutar todos los tests

```bash
npm test
```

Resultado esperado: **11 archivos, 131 tests, 0 fallos**.

### Cobertura de código

```bash
npm run test:coverage
```

El reporte HTML queda en `./coverage/index.html`. Umbrales configurados:

| Métrica | Umbral |
|---|---|
| Lines | 70% |
| Functions | 70% |
| Branches | 60% |

### Qué cubren los tests

| Suite | Casos verificados |
|---|---|
| **sanitize** | Strips `<script>`, `onerror`, `javascript:`, `data:` URIs; preserva tags permitidos; agrega `rel="noopener"` a links |
| **rateLimit** | Permite hasta maxRequests, bloquea al superarlo, resetea al expirar la ventana, keys independientes |
| **mime** | Detecta JPEG/PNG/PDF por magic bytes, rechaza binarios renombrados como imagen, valida text/plain |
| **utils** | `cn()` resuelve conflictos Tailwind, `escapeHtml()` escapa todos los caracteres peligrosos |
| **auth-forgot** | Respuesta genérica anti-enumeración de emails, rate limit silencioso, invalida tokens previos |
| **auth-reset** | Token válido/expirado/inexistente, elimina token tras uso, actualiza el userId correcto |
| **ticket-status** | Admin/agente pueden cerrar; solo admin cancela/resuelve; cliente puede reabrir; permisos por rol |
| **cron-sla** | Auth dual (Bearer header + query param), procesa tickets incumplidos, notifica a todos los admins |
| **notifications** | GET filtra por userId y limita a 30; PATCH marca por id o all:true |
| **Badge** | Colores correctos por slug/rol, fallback para valores desconocidos |
| **Pagination** | Disabled states, callbacks onPage, ellipsis, página activa, null cuando totalPages <= 1 |

---

## Funcionalidades Principales

- **Tickets**: creación con adjuntos, asignación a agentes, cambio de estado, prioridades, categorías
- **Editor TipTap**: negrita, listas, bloques de código, sanitización XSS server + client
- **Notificaciones en tiempo real**: SSE con badge de no leídos y reconexión automática
- **Alertas SLA**: cron cada 30 min detecta tickets sin primera respuesta pasado el umbral
- **Dark mode**: toggle en header, persiste en localStorage, sin flash al cargar
- **Command Palette**: `Cmd+K` para navegar a tickets, páginas y usuarios
- **Exportación CSV**: con todos los filtros activos, solo para admin y agente
- **Dashboard**: métricas con gráficos, SLA%, tendencia de 30 días
- **Logs de auditoría**: paginados y buscables, solo admin
- **Reset de contraseña**: token de un solo uso con 1 hora de vigencia
- **Validación MIME real**: magic bytes con `file-type`, no confía en el `Content-Type` del cliente

---

## Arquitectura de Seguridad

| Mecanismo | Implementación |
|---|---|
| Rate limiting | `src/lib/rateLimit.ts` — ventana deslizante en memoria por IP/userId |
| Sanitización HTML | Server: `sanitize-html` con allowlist estricta; Client: `DOMPurify` |
| Validación MIME | `src/lib/mime.ts` — `file-type` lee magic bytes, rechaza extensiones falsificadas |
| JWT invalidation | Campo `tokenVersion` en DB + chequeo periódico cada 5 min al cambiar rol/dept |
| Archivos protegidos | Middleware protege `/uploads/*`, requiere sesión válida |
| Transacciones atómicas | `prisma.$transaction()` en creación de tickets y mensajes |
| CRON protegido | `Authorization: Bearer <CRON_SECRET>` — solo Vercel puede invocar el cron |

---

## Deployment en Vercel

### Variables de entorno

En el dashboard de Vercel → Settings → Environment Variables:

```
DATABASE_URL           URL de PostgreSQL en producción (Supabase, Neon, Railway)
NEXTAUTH_URL           https://tu-dominio.vercel.app
NEXTAUTH_SECRET        openssl rand -base64 32
MAIL_HOST              smtp.tu-proveedor.com
MAIL_PORT              465
MAIL_USER              tu-usuario@dominio.com
MAIL_PASSWORD          tu-contraseña
MAIL_FROM              noreply@tu-dominio.com
CRON_SECRET            openssl rand -base64 32
SLA_THRESHOLD_MINUTES  120
```

### Cron Job (SLA Alerts)

`vercel.json` ya configura el cron automáticamente. Vercel llama al endpoint cada 30 minutos con `Authorization: Bearer <CRON_SECRET>`.

Para activación manual:

```bash
curl "https://tu-app.vercel.app/api/cron/sla-alerts?secret=TU_CRON_SECRET"
```

### Nota sobre uploads

Vercel tiene filesystem efímero. Para producción, migrar a **Vercel Blob**, **AWS S3** o **Cloudinary**.

---

## Docker (entorno completo)

```bash
# Levantar todo (app + DB + Redis)
docker compose up -d

# Solo la base de datos (desarrollo local)
docker compose up -d db

# Logs en tiempo real
docker compose logs -f app

# Detener todo
docker compose down
```

| Servicio | Puerto local |
|---|---|
| App | 3000 |
| PostgreSQL | 5433 |
| Redis | 6380 |

---

## Estructura del Proyecto

```
zimdesk-v2/
├── prisma/
│   ├── schema.prisma          # Modelos de DB
│   └── seed.ts                # Datos de prueba (8 usuarios, ~20 tickets)
├── public/
│   └── uploads/               # Archivos subidos (protegidos por middleware)
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, forgot-password, reset-password
│   │   ├── (dashboard)/       # Dashboard, tickets, usuarios, reportes, perfil
│   │   └── api/               # Endpoints REST
│   ├── components/
│   │   ├── layout/            # Header, Sidebar, DashboardShell
│   │   └── ui/                # Badge, Pagination, RichTextEditor, CommandPalette
│   ├── hooks/                 # useTheme, useNotifications
│   ├── lib/                   # auth, prisma, mail, rateLimit, sanitize, mime, utils
│   ├── types/                 # Interfaces TypeScript
│   └── __tests__/             # Tests unitarios, de API y de componentes
├── vitest.config.ts           # Configuración de Vitest
├── vercel.json                # Cron jobs
└── docker-compose.yml         # Servicios Docker
```

---

## Licencia

Proyecto privado — ZimTech © 2026
