FROM node:20-alpine AS base
RUN apk add --no-cache openssl

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_DOMAIN=localhost
ENV NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/prisma   ./node_modules/prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/@prisma  ./node_modules/@prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads && \
    chmod +x ./docker-entrypoint.sh

ENV HOME=/app \
    npm_config_cache=/tmp/.npm \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
