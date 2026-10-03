# Multi-stage build producing a minimal Next.js `standalone` image.
# Bun installs dependencies and runs scripts; Node 24 is the runtime.
# Works with both `docker build` and `podman build`:
#   podman build -f docker/Dockerfile -t automotive-site .

ARG NODE_IMAGE=docker.io/library/node:24-alpine
ARG BUN_IMAGE=docker.io/oven/bun:1.4.2-alpine

FROM ${BUN_IMAGE} AS bun

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ may be empty (and so absent from git); the runner stage copies it.
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
# Baked into prerendered pages (canonical/Open Graph URLs); the runtime App Setting must match.
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=${SITE_URL}
RUN bun run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
