#!/bin/sh
set -e

echo "Aplicando migraciones..."
node ./node_modules/prisma/build/index.js migrate deploy

exec node server.js
