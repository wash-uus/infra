# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace config for pnpm
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared-types  packages/shared-types/
COPY packages/shared-utils  packages/shared-utils/
COPY packages/firebase-admin packages/firebase-admin/
COPY services/jobs-service  services/jobs-service/

# Install pnpm and deps
RUN corepack enable && pnpm install --filter @infra/jobs-service... --frozen-lockfile

WORKDIR /app/services/jobs-service
RUN pnpm build

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 jobs

WORKDIR /app

COPY --from=builder --chown=jobs:nodejs /app/services/jobs-service/dist  dist/
COPY --from=builder --chown=jobs:nodejs /app/services/jobs-service/package.json .
COPY --from=builder --chown=jobs:nodejs /app/node_modules  node_modules/

USER jobs

ENV NODE_ENV=production \
    PORT=8004

EXPOSE 8004

CMD ["node", "dist/index.js"]
