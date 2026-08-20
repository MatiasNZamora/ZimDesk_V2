#!/bin/sh
# Backup diario: pg_dump de la DB + tar de los uploads.
# Corre dentro del contenedor `backup` vía cron (ver docker-compose.production.yml).
set -eu

STAMP="$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
OUT_DIR="/backups"

echo "[$(date -Iseconds)] Iniciando backup..."

pg_dump -Fc --no-owner --no-acl -f "$OUT_DIR/zimdesk_${STAMP}.dump"
tar czf "$OUT_DIR/uploads_${STAMP}.tar.gz" -C /app/public/uploads .

echo "[$(date -Iseconds)] Backup completado: zimdesk_${STAMP}.dump"

# Se borran ambos archivos de un backup viejo juntos, nunca uno sin el otro.
find "$OUT_DIR" -maxdepth 1 -name 'zimdesk_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete
find "$OUT_DIR" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date -Iseconds)] Retención aplicada (${RETENTION_DAYS} días)"
