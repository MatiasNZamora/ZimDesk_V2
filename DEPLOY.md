# Deploy — ZimDesk v2

ZimDesk corre en una VPS de Hostinger (`72.61.133.86` / `srv1072552.hstgr.cloud`) que
**también hostea Vortex POS en producción**. Todo lo de acá está diseñado para convivir con
ese vecino sin tocarlo.

## Arquitectura

```
Internet :443
    │
    ▼
Nginx Proxy Manager  (contenedor preexistente del host, fuera de este repo)
    ├── vortexpos.com.ar        → vortex-api:3000     [red vortex_network]   ← no tocar
    └── soportezimtech.com.ar   → zimdesk-app:3000    [red zimdesk_network]  ← este proyecto
                                        │
                          proyecto compose  -p zimdesk   en /opt/zimdesk-app
                          ├── zimdesk-app     (imagen de GHCR, expose 3000, sin puertos al host)
                          ├── zimdesk-db      (postgres:16, sin puertos, vol. zimdesk_pgdata)
                          └── zimdesk-backup  (pg_dump + tar diario, cron de alertas SLA)
                          volumen zimdesk_uploads → /app/public/uploads
```

Ningún puerto se publica al host. NPM llega a los contenedores conectándose a
`zimdesk_network`.

## Reglas de convivencia (no negociables)

- Siempre `-p zimdesk` explícito en cualquier comando `docker compose`.
- **Nunca** `--remove-orphans`, **nunca** `docker system prune -a`, **nunca**
  `docker compose down` sin `-p`. Solo `docker image prune -f` (dangling).
- No publicar puertos al host. Nada de `ports:`, solo `expose:`.

## Pipeline (push a `main`)

```
test ──► build-push ──► deploy ──► verify
lint      build a GHCR    backup DB    smoke test público
typecheck tags: sha,      pull imagen  https://soportezimtech.com.ar/api/public/health
vitest    latest          up -d --wait
```

Las migraciones (`prisma migrate deploy`) corren en el `docker-entrypoint.sh` del
contenedor `zimdesk-app`, antes de levantar el server — si fallan, `--wait` hace fallar el
job y el contenedor viejo sigue sirviendo tráfico.

### Rollback

Las imágenes quedan taggeadas por SHA en GHCR (`ghcr.io/matiasnzamora/zimdesk_v2:sha-XXXXXXX`).

```bash
ssh -p 2222 deploy@72.61.133.86
cd /opt/zimdesk-app
sed -i 's|^ZIMDESK_IMAGE=.*|ZIMDESK_IMAGE=ghcr.io/matiasnzamora/zimdesk_v2:sha-<anterior>|' .env
docker compose -p zimdesk -f docker-compose.production.yml --env-file .env pull app
docker compose -p zimdesk -f docker-compose.production.yml --env-file .env up -d --wait --wait-timeout 180 app
```

**El rollback de imagen no revierte la base de datos.** Si la migración desplegada fue
destructiva, hay que restaurar desde backup (ver abajo).

## Backups y restore

El contenedor `zimdesk-backup` corre `scripts/backup.sh` todos los días a las 3am: un
`pg_dump -Fc` de la base + un `tar` de los uploads, en el volumen `zimdesk_backups`, con
retención configurable (`BACKUP_RETENTION_DAYS`, default 14 días). El deploy también hace un
backup puntual de la DB antes de aplicar migraciones (`backups/pre-deploy-*.dump` en
`/opt/zimdesk-app`).

Restore (manual, deliberadamente no automatizado):

```bash
docker exec -i zimdesk-db pg_restore -U zimdesk -d zimdesk --clean --if-exists < backup.dump
tar xzf uploads_YYYYMMDD_HHMMSS.tar.gz -C <ruta_del_volumen_uploads>
```

## Bootstrap inicial (una sola vez por servidor)

1. **DNS**: apuntar `soportezimtech.com.ar` (y `www`) a `72.61.133.86` con registro A.
   Hoy resuelve a hosting compartido de Hostinger — hay que sacarlo de ahí primero.
2. En la VPS, como `deploy`:
   ```bash
   mkdir -p /opt/zimdesk-app && cd /opt/zimdesk-app
   git clone git@github.com:MatiasNZamora/ZimDesk_V2.git .
   # crear .env con las variables (ver tabla abajo), chmod 600 .env
   docker login ghcr.io -u <usuario> --password-stdin   # primer login manual
   docker compose -p zimdesk -f docker-compose.production.yml --env-file .env up -d --wait
   ```
3. **Conectar NPM a la red de ZimDesk** (una sola vez; se pierde si NPM se recrea):
   ```bash
   docker network connect zimdesk_network <contenedor-npm>
   ```
4. **Proxy Host en NPM** para `soportezimtech.com.ar` → `zimdesk-app:3000` (usar el
   `container_name`, no un alias — NPM está en varias redes):
   - Certificado Let's Encrypt + Force SSL, Websockets Support ON.
   - `client_max_body_size 500m` (los uploads llegan a decenas de MB).
   - `proxy_buffering off` en `/api/notifications/stream` (SSE, se rompe con buffering).
5. **Crear el primer admin**, con la password fuera de cualquier log/secret de GitHub:
   ```bash
   ssh -p 2222 deploy@72.61.133.86
   cd /opt/zimdesk-app
   read -rsp "Password del admin inicial (>=12 caracteres): " ADMPASS; echo
   docker compose -p zimdesk -f docker-compose.production.yml --env-file .env \
     run --rm --no-deps \
     -e ADMIN_EMAIL=devmatiasnzamora@gmail.com \
     -e ADMIN_NAME='Matías Zamora' \
     -e ADMIN_PASSWORD="$ADMPASS" \
     app node scripts/bootstrap.mjs
   unset ADMPASS
   ```
   `scripts/bootstrap.mjs` también crea los catálogos mínimos que la app necesita para
   funcionar (estados, prioridades, categoría, estructura/departamento) — sin esto la DB
   migrada pero vacía no deja crear tickets. Es idempotente: si ya hay un admin, no hace nada.

## Variables de entorno / secrets de GitHub

| Nombre | Tipo | Valor |
|---|---|---|
| `VPS_HOST` | secret | `72.61.133.86` |
| `VPS_USER` | secret | `deploy` |
| `VPS_SSH_KEY` | secret | clave privada dedicada al deploy |
| `VPS_PORT` | variable | `2222` |
| `GHCR_USERNAME` | secret | usuario de GitHub con acceso al package |
| `GHCR_PAT` | secret | PAT classic, scope `read:packages` únicamente |
| `NEXT_PUBLIC_DOMAIN` | variable | `soportezimtech.com.ar` (sin protocolo, sin barra) |
| `NEXTAUTH_URL` | variable | `https://soportezimtech.com.ar` |
| `NEXTAUTH_SECRET` | secret | `openssl rand -base64 48` |
| `DB_PASSWORD` | secret | password de Postgres |
| `DATABASE_URL` | secret | `postgresql://zimdesk:<DB_PASSWORD>@db:5432/zimdesk?schema=public` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_FROM`, `MAIL_TICKET_NOTIFICATION` | variable | SMTP |
| `MAIL_PASSWORD` | secret | password SMTP |
| `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `MAX_VIDEO_SIZE_MB` | variable | `public/uploads`, `10`, `80` |
| `CRON_SECRET` | secret | protege `/api/cron/sla-alerts` |
| `SLA_THRESHOLD_MINUTES` | variable | `120` |

`NEXT_PUBLIC_DOMAIN` se usa como build-arg (queda inlineado en el bundle del cliente para
`images.remotePatterns` y `serverActions.allowedOrigins`) — **cambiarlo exige rebuild**, no
alcanza con editar `.env`.

`ADMIN_EMAIL` / `ADMIN_PASSWORD` **no van como secrets de GitHub**: solo se usan una vez, a
mano, en el bootstrap inicial (paso 5). Un secret que nunca existe en CI no puede filtrarse
por CI.

## Notas

- El seed de demo (`prisma/seed.ts`) nunca corre en producción: aborta si
  `NODE_ENV=production` y además requiere `SEED_DEFAULT_PASSWORD` en el entorno. El primer
  admin de producción se crea con `scripts/bootstrap.mjs` (paso 5), no con el seed.
- `/api/cron/sla-alerts` está en el prefijo público del middleware (`/api/cron/`) porque se
  autentica sola con `CRON_SECRET` (header `Authorization: Bearer` o `?secret=`); el
  contenedor `zimdesk-backup` la llama cada 30 min vía cron interno.
