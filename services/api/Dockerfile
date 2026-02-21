# =============================================================================
# Stage 1: Base image with pnpm
# =============================================================================
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# =============================================================================
# Stage 2: Install dependencies
# =============================================================================
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY services/api/package.json ./services/api/

RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 3: Build the application
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/tsconfig/node_modules ./packages/tsconfig/node_modules
COPY --from=deps /app/services/api/node_modules ./services/api/node_modules

COPY package.json turbo.json pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY services/api ./services/api

RUN pnpm --filter=@staq/api build

# =============================================================================
# Stage 4: Production image
# =============================================================================
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/tsconfig ./packages/tsconfig

COPY --from=builder /app/services/api/package.json ./services/api/
COPY --from=builder /app/services/api/dist ./services/api/dist

RUN pnpm install --frozen-lockfile --prod --filter=@staq/api

USER expressjs

EXPOSE 4000

ENV PORT=4000

CMD ["node", "services/api/dist/index.js"]
