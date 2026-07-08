#!/bin/bash
# =============================================================
# Setup inicial de ZimDesk v2 en VPS Hostinger
# Servidor: srv1072552.hstgr.cloud
# Ejecutar UNA sola vez como root
# =============================================================

set -e

DEPLOY_DIR="/opt/zimdesk"
REPO_URL="git@github.com:MatiasNZamora/ZimDesk_V2.git"
COMPOSE_FILE="docker-compose.production.yml"

echo "=== ZimDesk v2 — Setup inicial ==="

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
  echo "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "Docker ya instalado: $(docker --version)"
fi

# 2. Crear directorio de despliegue
mkdir -p "$DEPLOY_DIR"
echo "Directorio $DEPLOY_DIR listo."

# 3. Configurar deploy key para GitHub (si no existe)
DEPLOY_KEY="/root/.ssh/zimdesk_deploy"
if [ ! -f "$DEPLOY_KEY" ]; then
  echo ""
  echo "Generando deploy key para GitHub..."
  ssh-keygen -t ed25519 -C "zimdesk-deploy@srv1072552" -f "$DEPLOY_KEY" -N ""
  echo ""
  echo "========================================================"
  echo "DEPLOY KEY PUBLICA (agregar en GitHub > Settings > Deploy Keys):"
  echo "========================================================"
  cat "${DEPLOY_KEY}.pub"
  echo "========================================================"
  echo ""
  echo "Presiona ENTER una vez que hayas agregado la deploy key en GitHub..."
  read -r

  # Configurar SSH para usar esta key con GitHub
  cat >> /root/.ssh/config <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  StrictHostKeyChecking no
EOF
fi

# 4. Clonar el repositorio (si no existe)
if [ ! -d "$DEPLOY_DIR/.git" ]; then
  echo "Clonando repositorio..."
  git clone "$REPO_URL" "$DEPLOY_DIR"
else
  echo "Repositorio ya clonado, actualizando..."
  cd "$DEPLOY_DIR" && git pull origin main
fi

# 5. Verificar que existe el .env
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo ""
  echo "========================================================"
  echo "FALTA el archivo .env en $DEPLOY_DIR"
  echo "Crea el archivo con las variables de produccion:"
  echo "  nano $DEPLOY_DIR/.env"
  echo ""
  echo "Usa .env.production como plantilla."
  echo "========================================================"
  exit 1
fi

# 6. Construir y levantar contenedores
cd "$DEPLOY_DIR"
echo "Construyendo imagen Docker (puede tardar 5-10 min)..."
docker compose -f "$COMPOSE_FILE" build

echo "Iniciando base de datos..."
docker compose -f "$COMPOSE_FILE" up -d db

echo "Esperando que la DB esté lista..."
sleep 10

echo "Ejecutando migraciones..."
docker compose -f "$COMPOSE_FILE" run --rm app npx prisma db push

echo "Levantando todos los servicios..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "=== Setup completado ==="
echo "Estado de los contenedores:"
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "ZimDesk corre en 127.0.0.1:8084"
echo "Configurar Nginx Proxy Manager apuntando al puerto 8084"
echo "Ver logs: docker compose -f $COMPOSE_FILE logs -f"
