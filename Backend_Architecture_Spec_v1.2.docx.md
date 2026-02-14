
**BACKEND ARCHITECTURE**

Technical Specification

*Express.js 5  |  TypeScript  |  PostgreSQL  |  Redis  |  Socket.io  |  BullMQ*

Prepared by Kayode

February 8, 2026  |  Version 1.1

**Personal Product  |  Pre-Launch Planning**

# **Table of Contents**

1\. Overview and Stack Decision

2\. Project Structure and Barrel Exports

3\. Express Application Bootstrap

4\. Middleware Chain

5\. Route Handlers and API Contracts

6\. Database Schema (PostgreSQL via Supabase)

7\. Settings Table and Runtime Configuration

8\. Multi-Model AI Gateway

9\. Backend Integration Hub

10\. Component AST Engine

11\. Code Generation Pipeline

12\. Socket.io Server (Real-Time Layer)

13\. BullMQ Job Queue Architecture

14\. Authentication and Authorization

15\. Billing Engine (Stripe \+ Paystack)

16\. File System and Project Management

17\. Preview Architecture (Client-Side via Expo Snack SDK)

18\. Security

19\. Deployment (Docker, PM2, Railway)

20\. Environment Variables

21\. Monitoring and Observability

22\. Performance Targets

# **1\. Overview and Stack Decision**

This document specifies the complete backend architecture for the AI-powered mobile app builder platform. The backend is a standalone Express.js server separate from the Next.js frontend. It owns all business logic: AI code generation, backend integration orchestration, AST operations, billing, real-time sync, and project management.

## **1.1 Stack Summary**

| Technology | Version | Role |
| :---- | :---- | :---- |
| Express.js | 5.x | HTTP framework. REST API, middleware chain, route handling. Chosen for ecosystem maturity, Socket.io integration, and team familiarity. |
| TypeScript | 5.7+ | Type safety end-to-end. Strict mode. Shared types with frontend via monorepo @packages/shared. |
| Node.js | 22 LTS | Runtime. Native fetch, improved ESM support, performance improvements over v20. |
| PostgreSQL | 16 (via Supabase) | Primary data store. Users, projects, conversations, files, billing, settings. RLS for row-level security. |
| Redis | 7 (Upstash or Railway) | Cache (AST hot storage), BullMQ job queue, rate limiting, session store. |
| Socket.io | 4.x | WebSocket server. Real-time AST sync, preview updates, terminal streaming, presence. |
| BullMQ | 5.x | Job queue for async AI generation, deployment, GitHub export, scheduled cleanup. |
| Supabase Client | @supabase/supabase-js 2.x | Auth verification, storage, real-time subscriptions. |
| TypeORM | 0.3.x | ORM for PostgreSQL. Entity-based schema, migrations, repositories, subscribers. BaseEntity for audit columns. |
| Zod | 3.x | Request validation. Shared schemas with frontend for end-to-end type safety. |
| Pino | 9.x | Structured JSON logging. Request correlation IDs. Shipped to Axiom. |
| PM2 | 5.x | Process manager. Cluster mode, auto-restart, graceful shutdown, log rotation. |
| Helmet | 8.x | Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options. |
| Sentry | @sentry/node 8.x | Error tracking, performance monitoring, distributed tracing. |

## **1.2 Why Express.js**

* Ecosystem depth: Socket.io, BullMQ, Passport.js, Multer, Helmet all have first-class Express integration. Zero adapter work.

* Team familiarity: Express patterns are well-established from Lendsqr infrastructure. No ramp-up time.

* Sufficient performance: the bottleneck is AI API latency (30-60 seconds per generation), not HTTP routing speed.

* PM2 clustering: Express runs in PM2 cluster mode for horizontal scaling on a single machine.

* Streaming support: Express handles Server-Sent Events (SSE) for AI generation streaming natively.

* Migration path: if needed at scale, hot routes can migrate to Fastify or Hono. The service layer is framework-agnostic.

# **2\. Project Structure and Barrel Exports**

The backend lives in services/api/ within the Turborepo monorepo. Every directory has an index.ts barrel export. All imports reference the folder, never individual files. This convention matches the frontend architecture.

## **2.1 Directory Structure**

services/api/

  src/

    index.ts                       \# Server entry point

    app.ts                         \# Express app factory (createApp)

    config/

      index.ts                     \# Barrel export

      env.ts                       \# Validated env vars via envalid

      redis.ts                     \# Redis client singleton (ioredis)

      supabase.ts                  \# Supabase admin client singleton

      sentry.ts                    \# Sentry initialization

      logger.ts                    \# Pino logger instance

    constants/

      index.ts                     \# Barrel export

      error-codes.ts              \# Machine-readable error code enum

      socket-events.ts            \# Socket event name constants

      plans.ts                     \# Plan tier enum and defaults

      limits.ts                    \# Rate limits, body size limits, credit limits

    routes/

      index.ts                     \# Barrel export, mounts all v1 routes

      v1/

        index.ts                   \# Router combining all v1 route modules

        auth.routes.ts

        projects.routes.ts

        generate.routes.ts

        files.routes.ts

        models.routes.ts

        backends.routes.ts

        billing.routes.ts

        deploy.routes.ts

        settings.routes.ts

        admin.routes.ts

    middleware/

      index.ts                     \# Barrel export

      auth.ts                      \# JWT verification via Supabase

      rate-limit.ts               \# Redis sliding window rate limiter

      validate.ts                  \# Zod schema validation factory

      credits.ts                   \# Message credit check and reservation

      plan-gate.ts                 \# Plan-based feature gating

      require-admin.ts             \# Admin table check \+ permission verification

      error-handler.ts             \# Global error handler with Sentry

      request-id.ts               \# X-Request-Id generation

      cors.ts                      \# CORS configuration

    services/

      index.ts                     \# Barrel export

      ai-gateway/                  \# Multi-Model AI Gateway

        index.ts                   \# Barrel export

        gateway.ts                 \# Router, adapter registry, fallback

        prompt-builder.ts          \# System prompt construction

        response-parser.ts         \# Normalize LLM output to AST ops

        cost-estimator.ts          \# Token and cost estimation

        adapters/

          index.ts                 \# Barrel export

          base-adapter.ts          \# Abstract adapter interface

          anthropic.adapter.ts     \# Claude (Sonnet 4, Opus 4\)

          openai.adapter.ts        \# GPT-5, GPT-4o, o3

          xai.adapter.ts           \# Grok 3, Grok 3 Mini

          google.adapter.ts        \# Gemini 2.5 Pro, Flash

          mistral.adapter.ts       \# Mistral Large, Codestral

          deepseek.adapter.ts      \# DeepSeek V3, Coder

          self-hosted.adapter.ts   \# Ollama / vLLM (Month 3\)

      backend-hub/                 \# Backend Integration Hub

        index.ts                   \# Barrel export

        hub.ts                     \# Router, adapter registry

        schema-discovery.ts        \# Parse OpenAPI, Postman, GraphQL

        client-generator.ts        \# Generate typed API client

        adapters/

          index.ts                 \# Barrel export

          base-adapter.ts          \# Abstract adapter interface

          supabase.adapter.ts

          firebase.adapter.ts

          appwrite.adapter.ts

          custom-api.adapter.ts    \# REST and GraphQL

      ast-engine/                  \# Component AST operations

        index.ts                   \# Barrel export

        ast.ts                     \# Core CRUD operations

        serializer.ts              \# AST to React Native source

        parser.ts                  \# React Native source to AST

        differ.ts                  \# JSON Patch diff generation

        validator.ts               \# AST integrity validation

      project-manager.ts           \# Project lifecycle, templates

      billing-engine.ts            \# Credits, Stripe, Paystack

      \# preview-server.ts removed — preview handled client-side via Expo Snack SDK

      settings-service.ts          \# Settings table read/write \+ cache

      encryption.ts                \# AES-256-GCM encrypt/decrypt

    socket/

      index.ts                     \# Barrel export, Socket.io setup

      auth.ts                      \# Socket authentication middleware

      handlers/

        index.ts                   \# Barrel export

        ast-sync.handler.ts

        \# preview.handler.ts removed — preview handled client-side via Snack SDK

        terminal.handler.ts

        presence.handler.ts

    jobs/

      index.ts                     \# Barrel export, queue defs

      queues.ts                    \# BullMQ queue instances

      processors/

        index.ts                   \# Barrel export

        generate.processor.ts

        deploy.processor.ts

        export.processor.ts

        cleanup.processor.ts

    db/

      index.ts                     \# Barrel export

      data-source.ts               \# TypeORM DataSource config

      entities/                     \# TypeORM entities

        index.ts                   \# Barrel export

        base.entity.ts             \# Abstract BaseEntity (audit columns)

        user.entity.ts

        admin.entity.ts

        project.entity.ts

        conversation.entity.ts

        ai-model.entity.ts

        project-file.entity.ts

        subscription.entity.ts

        subscription-usage.entity.ts

        setting.entity.ts

      repositories/                 \# Custom TypeORM repositories

        index.ts                   \# Barrel export

        base.repository.ts         \# Scoped repo (auto deleted\_flag filter)

        user.repository.ts

        project.repository.ts

        subscription.repository.ts \# getCreditsRemaining, reserveCredit

        ai-model.repository.ts

        setting.repository.ts

      migrations/                  \# TypeORM migration files

      subscribers/                 \# TypeORM entity subscribers

        index.ts                   \# Barrel export

        audit.subscriber.ts        \# Auto-populate updated\_by

    helpers/

      index.ts                     \# Barrel export

      async-handler.ts             \# Wrap async route handlers

      response.ts                  \# Standard API response envelope

      pagination.ts                \# Pagination helpers

      crypto.ts                    \# Hash, random token generation

    types/

      index.ts                     \# Barrel export

      express.d.ts                 \# Extended Express Request

      api.types.ts                 \# Request/response DTOs

      ast.types.ts                 \# AST node, operation types

      gateway.types.ts             \# AI adapter interfaces

      hub.types.ts                 \# Backend adapter interfaces

  Dockerfile

  ecosystem.config.js              \# PM2 configuration

  tsconfig.json

  package.json

# **3\. Express Application Bootstrap**

The Express app is created via a factory function in app.ts and started in index.ts. This separation allows the app to be imported without starting the server (useful for testing with supertest).

## **3.1 App Factory (app.ts)**

import express from 'express';

import { createServer } from 'http';

import { initSocketServer } from './socket';

import { mountMiddleware } from './middleware';

import { mountRoutes } from './routes';

import { errorHandler } from './middleware';

export function createApp() {

  const app \= express();

  const httpServer \= createServer(app);

  mountMiddleware(app);     // Global middleware chain

  mountRoutes(app);         // API v1 routes

  app.use(errorHandler);    // Must be last

  const io \= initSocketServer(httpServer);

  return { app, httpServer, io };

}

## **3.2 Server Entry (index.ts)**

import { createApp } from './app';

import { env, logger, redis, initSentry } from './config';

import { initQueues } from './jobs';

async function main() {

  initSentry();

  await redis.connect();

  await initQueues();

  const { httpServer } \= createApp();

  httpServer.listen(env.PORT || 4000, () \=\> {

    logger.info({ port: env.PORT || 4000 }, 'Server started');

  });

  process.on('SIGTERM', async () \=\> {

    logger.info('SIGTERM received, draining connections');

    httpServer.close();

    await redis.quit();

    process.exit(0);

  });

}

main().catch(err \=\> { logger.fatal(err, 'Startup failed'); process.exit(1); });

## **3.3 Startup Sequence**

1. Initialize Sentry for error tracking before anything else.

2. Connect to Redis (required for rate limiting, caching, and BullMQ).

3. Initialize BullMQ queues and attach job processors.

4. Create Express app: mount middleware, mount routes, attach error handler.

5. Initialize Socket.io server on the same HTTP server instance.

6. Start HTTP server on configured port (default 4000).

7. Register SIGTERM handler: stop accepting connections, drain active requests, close Redis, exit.

# **4\. Middleware Chain**

Every request passes through the middleware chain in strict order. Route-specific middleware (validate, credits, plan-gate) is applied per-route, not globally.

## **4.1 Global Middleware (all routes)**

| Order | Middleware | Module | Purpose |
| :---- | :---- | :---- | :---- |
| 1 | Request ID | request-id.ts | Generate UUID v4, set X-Request-Id header, attach to req.requestId for logging and Sentry. |
| 2 | Pino Logger | pino-http | Structured request log: method, url, status, duration, requestId. JSON for Axiom. |
| 3 | Sentry | @sentry/node | Attach request context to Sentry scope for error tracking. |
| 4 | CORS | cors.ts | Allowlist frontend origins: production, Vercel preview URLs, localhost:3000. |
| 5 | Helmet | helmet | Security headers: CSP, HSTS (1yr), X-Frame-Options DENY, nosniff, strict referrer. |
| 6 | Body Parser | express.json | JSON body, 10MB default. Overridden per-route for file uploads (50MB). |
| 7 | Rate Limiter | rate-limit.ts | Redis sliding window. 200 req/min per IP. 429 with Retry-After on exceed. |

## **4.2 Route-Specific Middleware**

| Middleware | Module | Applied To | Purpose |
| :---- | :---- | :---- | :---- |
| auth | auth.ts | All except /health, /auth/\*, /settings | Verify Supabase JWT. Extract user ID, email, plan. Attach to req.user. 401 if invalid. |
| validate | validate.ts | Routes with request bodies | Factory: validate(zodSchema). Validates req.body/params/query. 400 with structured errors. |
| credits | credits.ts | POST /generate only | Check credits \> 0\. Atomic decrement in PostgreSQL. Attach reservationId for refund on failure. 402 if insufficient. |
| plan-gate | plan-gate.ts | Plan-gated routes | Factory: requirePlan('starter'). Checks req.user.plan meets minimum tier. 403 with upgrade prompt. |
| require-admin | require-admin.ts | Admin routes | Queries admins table by req.user.id. Optionally checks permission: requireAdmin('manage\_models'). 403 if not admin. |

## **4.3 Auth Middleware Implementation**

export async function auth(req: Request, res: Response, next: NextFunction) {

  const token \= req.headers.authorization?.replace('Bearer ', '');

  if (\!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });

  const { data: { user }, error } \= await supabase.auth.getUser(token);

  if (error || \!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });

  const dbUser \= await getUserById(user.id);

  req.user \= { id: user.id, email: user.email, plan: dbUser.plan, creditsRemaining: dbUser.credits\_remaining };

  next();

}

## **4.4 Rate Limiter Implementation**

const globalLimiter \= new RateLimiterRedis({ storeClient: redis, keyPrefix: 'rl:global', points: 200, duration: 60, blockDuration: 60 });

const generateLimiter \= new RateLimiterRedis({ storeClient: redis, keyPrefix: 'rl:generate', points: 20, duration: 60 });

const authLimiter \= new RateLimiterRedis({ storeClient: redis, keyPrefix: 'rl:auth', points: 10, duration: 300 });

## **4.5 Validation Factory**

export function validate(schema: ZodSchema, source: 'body'|'params'|'query' \= 'body') {

  return (req, res, next) \=\> {

    const result \= schema.safeParse(req\[source\]);

    if (\!result.success) return res.status(400).json({ error: { code: 'VALIDATION\_ERROR', details: result.error.flatten() } });

    req\[source\] \= result.data; next();

  };

}

## **4.6 Credit Reservation**

export async function credits(req, res, next) {

  const remaining \= await subscriptionRepo.getCreditsRemaining(req.user.id);

  if (remaining \<= 0\) return res.status(402).json({ error: { code: 'INSUFFICIENT\_CREDITS' } });

  const reservation \= await subscriptionRepo.reserveCredit(req.user.id); // Insert into subscription\_usage

  if (\!reservation) return res.status(402).json({ error: { code: 'INSUFFICIENT\_CREDITS' } });

  req.creditReservationId \= reservation.id;

  next();

}

If generation fails, the error handler calls subscriptionRepo.refundCredit(req.creditReservationId) to insert a credit\_refunded row into subscription\_usage.

# **5\. Route Handlers and API Contracts**

All routes are prefixed /api/v1. Every response uses the envelope: { data, error, meta }. Paginated responses include meta: { total, page, limit, hasMore }.

## **5.1 Response Envelope**

export function success\<T\>(res, data: T, status=200, meta?) { return res.status(status).json({ data, error: null, meta }); }

export function error(res, code, message, status=400, details?) { return res.status(status).json({ data: null, error: { code, message, details } }); }

## **5.2 Auth Routes (/api/v1/auth)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| POST | /auth/register | authLimiter, validate | { email, password, displayName } | { user, accessToken, refreshToken } |
| POST | /auth/login | authLimiter, validate | { email, password } | { user, accessToken, refreshToken } |
| POST | /auth/refresh | validate | { refreshToken } | { accessToken, refreshToken } |
| POST | /auth/logout | auth | {} | 204 No Content |
| POST | /auth/forgot-password | authLimiter, validate | { email } | { message } |
| POST | /auth/reset-password | validate | { token, newPassword } | { message } |
| GET | /auth/callback | \- | ?code, ?provider | Redirect to frontend with tokens in cookies |
| GET | /auth/me | auth | \- | { user } |

Auth routes proxy to Supabase Auth. The backend handles all Supabase interaction. Frontend never needs Supabase credentials.

## **5.3 Settings Routes (/api/v1/settings)**

| Method | Endpoint | Middleware | Response | Cache |
| :---- | :---- | :---- | :---- | :---- |
| GET | /settings | None (public) | { supabaseUrl, supabaseAnonKey, stripePublishableKey, paystackPublicKey, plans, enabledModels, enabledBackends, featureFlags, maxProjectsPerPlan, maintenanceMode } | Redis 60s |
| GET | /settings/admin | auth, requireAdmin() | All settings including secrets (masked), usage stats | No cache |
| PATCH | /settings/admin | auth, requireAdmin(), validate | { updated settings } | Invalidates cache |

Public GET /settings returns frontend-safe config only. Server secrets are never included. The settings-service caches responses in Redis for 60 seconds.

## **5.4 Project Routes (/api/v1/projects)**

| Method | Endpoint | Middleware | Body / Params | Response |
| :---- | :---- | :---- | :---- | :---- |
| POST | /projects | auth, validate | { name, description?, templateId? } | { project } 201 |
| GET | /projects | auth | ?page, ?limit, ?archived, ?search | { projects\[\], meta } |
| GET | /projects/:id | auth | \- | { project, stats } |
| PATCH | /projects/:id | auth, validate | { name?, description?, settings? } | { project } |
| DELETE | /projects/:id | auth | \- | 204 |
| POST | /projects/:id/duplicate | auth, validate | { name } | { project } 201 |
| POST | /projects/:id/archive | auth | \- | { project } |

## **5.5 Generate Routes (/api/v1/generate)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| POST | /generate | auth, generateLimiter, credits, validate | { projectId, prompt, modelId?, conversationHistory? } | SSE stream: text, ast\_operation, file\_update, progress, done, error |
| GET | /projects/:id/conversations | auth | ?page, ?limit | { messages\[\], meta } |
| DELETE | /projects/:id/conversations | auth | \- | 204 (clear history) |

## **5.6 File Routes (/api/v1/projects/:id/files)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| GET | /projects/:id/files | auth | \- | { fileTree } |
| GET | /projects/:id/files/\*path | auth | \- | { file: { path, content, hash } } |
| PUT | /projects/:id/files/\*path | auth, planGate('starter'), validate | { content } | { file } |
| POST | /projects/:id/files | auth, planGate('starter'), validate | { path, content } | { file } 201 |
| DELETE | /projects/:id/files/\*path | auth, planGate('starter') | \- | 204 |

## **5.7 Model Routes (/api/v1/models)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| GET | /models | auth | \- | { models\[\] } (filtered by user plan) |
| GET | /models/:id/estimate | auth | ?prompt, ?projectId | { estimatedTokens, estimatedCost } |
| POST | /admin/models | auth, requireAdmin(), validate | { provider, modelKey, displayName, costs, apiKey, ... } | { model } 201 |
| PATCH | /admin/models/:id | auth, requireAdmin(), validate | { partial model fields } | { model } |
| DELETE | /admin/models/:id | auth, requireAdmin() | \- | 204 |

## **5.8 Backend Integration Routes (/api/v1/projects/:id/backend)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| POST | /projects/:id/backend/connect | auth, validate | { provider, config } | { connection, schema } |
| GET | /projects/:id/backend/schema | auth | \- | { schema } |
| POST | /projects/:id/backend/test | auth | \- | { healthy, latencyMs } |
| DELETE | /projects/:id/backend/disconnect | auth | \- | 204 |
| POST | /projects/:id/backend/import-spec | auth, planGate('pro'), validate | { type: openapi\|postman\|graphql, spec } | { schema, endpointCount } |

## **5.9 Billing Routes (/api/v1/billing)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| GET | /billing | auth | \- | { plan, creditsRemaining, creditsTotal, resetAt, invoices\[\], paymentMethods\[\] } |
| POST | /billing/subscribe | auth, validate | { planId, paymentMethodId, provider: stripe\|paystack } | { subscription } |
| POST | /billing/change-plan | auth, validate | { newPlanId } | { subscription, proratedAmount } |
| POST | /billing/cancel | auth | \- | { subscription, endsAt } |
| POST | /billing/webhook/stripe | Stripe signature | Stripe event | 200 |
| POST | /billing/webhook/paystack | Paystack signature | Paystack event | 200 |

## **5.10 Deploy Routes (/api/v1/projects/:id/deploy)**

| Method | Endpoint | Middleware | Body | Response |
| :---- | :---- | :---- | :---- | :---- |
| POST | /projects/:id/deploy/eas | auth, planGate('pro'), validate | { platform: ios\|android\|both, profile } | { jobId, status: queued } |
| GET | /projects/:id/deploy/status | auth | \- | { builds\[\] } |
| POST | /projects/:id/export/github | auth, planGate('starter'), validate | { repoName, isPrivate } | { jobId, repoUrl } |
| GET | /projects/:id/export/zip | auth | \- | Binary .zip download |

# **6\. Database Schema (PostgreSQL via Supabase)**

All tables use an auto-incrementing integer PK plus a UUID column for external references. The ORM is TypeORM with DataSource configured against Supabase PostgreSQL. Entities extend a shared BaseEntity that defines the standard audit columns. RLS is enabled on every table as a defense-in-depth layer on top of TypeORM query scoping.

## **6.1 Standard Audit Columns (BaseEntity)**

Every entity extends a shared BaseEntity abstract class. These columns are inherited automatically and never repeated in individual table definitions. All TypeORM repositories use a custom scoped repository that appends deleted\_flag \= false to every query unless explicitly bypassed (e.g. audit reports).

**Important:** All entity properties use snake\_case to match database columns directly, reducing mapping complexity.

```typescript
// db/entities/base.entity.ts

@Entity()
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'integer', unsigned: true })
  id: number;

  @Column({ type: 'uuid', default: () => 'uuid_generate_v4()', unique: true })
  uuid: string;

  @Column({ type: 'jsonb', default: {} })
  meta: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_on: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_on: Date;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @Column({ type: 'boolean', default: false })
  deleted_flag: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_on: Date | null;

  @Column({ type: 'uuid', nullable: true })
  deleted_by: string | null;
}
```

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | integer | PK, AUTO INCREMENT, UNSIGNED | Internal primary key for joins and indexing |
| uuid | uuid | NOT NULL, UNIQUE, DEFAULT uuid\_generate\_v4() | External identifier for API responses and references |
| meta | jsonb | NOT NULL, DEFAULT '{}' | Flexible metadata (extensible per-table without migrations) |
| created\_on | timestamptz | NOT NULL, DEFAULT now() | Record creation timestamp |
| created\_by | uuid | FK to users(uuid), NULLABLE | User who created the record (null for system-created) |
| updated\_on | timestamptz | NOT NULL, DEFAULT now() | Last modification timestamp |
| updated\_by | uuid | FK to users(uuid), NULLABLE | User who last modified the record |
| deleted\_flag | boolean | NOT NULL, DEFAULT false | Soft delete flag. True \= logically deleted. |
| deleted\_on | timestamptz | NULLABLE | When the record was soft-deleted |
| deleted\_by | uuid | FK to users(uuid), NULLABLE | User who deleted the record |

* Soft delete: DELETE endpoints set deleted\_flag \= true, deleted\_on \= now(), deleted\_by \= req.user.id. No physical deletes except cleanup jobs (30+ days).

* Scoped repository: custom TypeORM repository class auto-appends deleted\_flag \= false to all find/query operations. Admin service bypasses for audit.

* Index: every table has a partial index WHERE deleted\_flag \= false for efficient filtered queries.

* TypeORM subscriber: a global entity subscriber auto-populates updated\_by from request context on every update.

## **6.1.1 TypeORM Configuration**

// config/typeorm.ts

export const dataSource \= new DataSource({

  type: 'postgres',

  url: env.DATABASE\_URL,

  entities: \['dist/db/entities/\*\*/\*.entity.js'\],

  migrations: \['dist/db/migrations/\*\*/\*.js'\],

  subscribers: \['dist/db/subscribers/\*\*/\*.js'\],

  synchronize: false,      // Never in production

  migrationsRun: true,     // Auto-run on startup

  logging: env.NODE\_ENV \=== 'development',

  extra: { max: 60 },      // PgBouncer pool

});

## **6.2 Multi-Tenant Organization Model**

The platform uses an organization-based multi-tenant architecture that allows users to belong to multiple organizations with different roles. This is essential for enterprise scalability and team collaboration.

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   users     │────▶│  organization_members │◀────│  organizations  │
└─────────────┘     └──────────────────────┘     └─────────────────┘
                            │                           │
                            │                           │
                            ▼                           ▼
                  (user_id, org_id, role)         ┌──────────┐
                                                  │ projects │
                                                  └──────────┘
```

**Key Benefits:**
- Users can belong to multiple organizations (personal + work + clients)
- Role-based access control per organization
- Billing and plans are at the organization level
- Projects are scoped to organizations, not individual users
- Enables enterprise features like team management

## **6.3 organizations**

Organizations are the primary tenant unit. Every user has a personal organization created on signup. Users can create additional organizations or be invited to existing ones.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| name | varchar(255) | NOT NULL | Organization display name |
| slug | varchar(255) | NOT NULL, UNIQUE | URL-safe identifier |
| logo\_url | text | NULLABLE | Organization logo URL |
| plan | plan\_tier | NOT NULL, DEFAULT 'free' | free, starter, pro, team, enterprise |
| is\_personal | boolean | NOT NULL, DEFAULT false | True for auto-created personal orgs |

\+ standard audit columns (id, uuid, meta, created\_on, created\_by, updated\_on, updated\_by, deleted\_flag, deleted\_on, deleted\_by)

RLS: SELECT, UPDATE where user is member of org AND deleted\_flag \= false. Indexes: (slug), (is\_personal, deleted\_flag).

## **6.4 organization\_members**

Junction table linking users to organizations with role-based access. Users can be members of multiple organizations with different roles in each.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| organization\_id | integer | FK to organizations(id), NOT NULL | Parent organization |
| user\_id | integer | FK to users(id), NOT NULL | Member user |
| role | org\_role | NOT NULL, DEFAULT 'member' | owner, admin, member, viewer |
| invited\_by | integer | FK to users(id), NULLABLE | User who sent the invitation |
| invited\_at | timestamptz | NULLABLE | When the invitation was sent |
| joined\_at | timestamptz | NULLABLE | When the user accepted |
| status | varchar(20) | NOT NULL, DEFAULT 'active' | active, pending, suspended |

\+ standard audit columns (id, uuid, meta, created\_on, created\_by, updated\_on, updated\_by, deleted\_flag, deleted\_on, deleted\_by)

**Role Permissions:**
- **owner**: Full control including billing, plan changes, delete org. Only one owner per org.
- **admin**: Manage members, create/delete projects, manage settings. Cannot change billing.
- **member**: Create projects, edit own projects, view all org projects.
- **viewer**: Read-only access to all org projects.

RLS: SELECT where auth.uid() is member of same org AND deleted\_flag \= false. INSERT/UPDATE/DELETE restricted by role. Unique: (organization\_id, user\_id) WHERE deleted\_flag \= false. Indexes: (user\_id, status), (organization\_id, role).

## **6.5 users**

Regular platform users. Does not include admin accounts (see 6.11 admins). User identity is linked to Supabase Auth via auth\_user\_id.

```typescript
// db/entities/user.entity.ts

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  auth_user_id: string;  // FK to auth.users(id)

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 200 })
  display_name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'boolean', default: false })
  activated_flag: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  activated_on: Date | null;

  @Column({ type: 'uuid', nullable: true })
  activated_by: string | null;

  @Column({ type: 'boolean', default: false })
  onboarding_completed: boolean;

  // Relations
  @OneToMany(() => OrganizationMember, (om) => om.user)
  organization_memberships: OrganizationMember[];
}
```

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| auth\_user\_id | uuid | NOT NULL, UNIQUE | Supabase Auth user ID (FK to auth.users) |
| first\_name | text | NOT NULL | User first name |
| last\_name | text | NOT NULL | User last name |
| display\_name | text | NOT NULL | Computed or user-set display name |
| email | text | NOT NULL, UNIQUE | User email address |
| avatar\_url | text | NULLABLE | Profile photo URL |
| activated\_flag | boolean | NOT NULL, DEFAULT false | Account activation status |
| activated\_on | timestamptz | NULLABLE | When the account was activated |
| activated\_by | uuid | NULLABLE | Admin or system that activated the account |
| onboarding\_completed | boolean | NOT NULL, DEFAULT false | Whether user finished onboarding wizard |

\+ standard audit columns (inherited from BaseEntity)

RLS: SELECT, UPDATE where auth.uid() \= auth\_user\_id AND deleted\_flag \= false. Trigger: on auth.users INSERT, create public.users row. Credits are tracked in subscription\_usage (see 6.8), not on the user.

## **6.6 projects**

Projects belong to organizations, not individual users. Access is controlled via organization membership and roles.

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| organization\_id | integer | FK to organizations(id), NOT NULL | Parent organization |
| name | varchar(255) | NOT NULL | Project display name |
| description | text | NULLABLE | Project description |
| slug | varchar(255) | NOT NULL | URL-safe identifier, unique per org |
| framework\_version | varchar(20) | NOT NULL, DEFAULT 'expo-52' | Expo SDK version |
| ast\_snapshot | jsonb | NOT NULL, DEFAULT '{}' | Latest AST checkpoint |
| file\_tree | jsonb | NOT NULL, DEFAULT '\[\]' | File structure metadata |
| settings | jsonb | NOT NULL, DEFAULT '{}' | Project config (theme, nav, app.json) |
| backend\_provider | varchar(50) | NULLABLE | supabase, firebase, appwrite, custom |
| backend\_config | text | NULLABLE | Encrypted (AES-256-GCM) backend connection config |
| default\_model\_id | integer | FK to ai\_models(id), NULLABLE | Default AI model for this project |
| last\_generated\_at | timestamptz | NULLABLE | Last AI generation timestamp |
| is\_archived | boolean | NOT NULL, DEFAULT false | Soft archive (not deleted, just hidden) |

\+ standard audit columns (id, uuid, meta, created\_on, created\_by, updated\_on, updated\_by, deleted\_flag, deleted\_on, deleted\_by)

RLS: ALL where user is member of organization AND deleted\_flag \= false. Write operations restricted by org role (member+ can edit, viewer cannot). Indexes: (organization\_id, is\_archived, deleted\_flag), (organization\_id, updated\_on DESC). Unique: (organization\_id, slug) WHERE deleted\_flag \= false.

## **6.4 conversations**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | uuid | PK | Message identifier |
| project\_id | uuid | FK to projects(id) ON DELETE CASCADE | Parent project |
| role | text | NOT NULL, CHECK IN ('user','assistant') | Message author role |
| content | text | NOT NULL | Message text content |
| model\_id | uuid | FK to ai\_models(id), NULLABLE | AI model used (null for user messages) |
| ast\_diff | jsonb | NULLABLE | JSON Patch diff applied by this message |
| tokens\_in | integer | NULLABLE | Input tokens consumed |
| tokens\_out | integer | NULLABLE | Output tokens generated |
| cost\_usd | numeric(10,6) | NULLABLE | Estimated cost in USD |
| duration\_ms | integer | NULLABLE | Generation time in milliseconds |
| error | text | NULLABLE | Error message if generation failed |

\+ standard audit columns

RLS: SELECT, INSERT where project owner matches AND deleted\_flag \= false. Index: (project\_id, created\_on ASC).

## **6.5 ai\_models**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | uuid | PK | Model identifier |
| provider | text | NOT NULL | anthropic, openai, xai, google, mistral, deepseek, self\_hosted |
| model\_key | text | NOT NULL, UNIQUE | Provider model string (claude-sonnet-4-20250514) |
| display\_name | text | NOT NULL | User-facing name |
| description | text | NULLABLE | Capability description for model selector |
| capability\_tags | text\[\] | DEFAULT '{}' | Tags: ui, logic, fast, advanced, cost\_effective |
| is\_enabled | boolean | NOT NULL, DEFAULT true | Admin toggle |
| is\_default | boolean | NOT NULL, DEFAULT false | Default model for new projects |
| min\_plan | text | NOT NULL, DEFAULT 'free' | Minimum plan tier to use this model |
| cost\_per\_1k\_input | numeric(10,6) | NOT NULL | Cost per 1K input tokens USD |
| cost\_per\_1k\_output | numeric(10,6) | NOT NULL | Cost per 1K output tokens USD |
| max\_context\_tokens | integer | NOT NULL | Max context window size |
| priority | integer | NOT NULL, DEFAULT 0 | Fallback priority (higher \= tried first) |
| api\_key\_encrypted | text | NOT NULL | AES-256-GCM encrypted API key |
| rate\_limit\_rpm | integer | NOT NULL, DEFAULT 60 | Requests per minute cap |
| daily\_budget\_usd | numeric(10,2) | NULLABLE | Max daily spend (null \= unlimited) |
| daily\_spend\_usd | numeric(10,2) | NOT NULL, DEFAULT 0 | Current day spend (reset at midnight UTC) |

\+ standard audit columns

RLS: SELECT where is\_enabled \= true AND deleted\_flag \= false (auth users). Admin: full CRUD via service role. Index: (is\_enabled, priority DESC, deleted\_flag).

## **6.6 project\_files**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | uuid | PK | File identifier |
| project\_id | uuid | FK to projects(id) ON DELETE CASCADE | Parent project |
| path | text | NOT NULL | Relative file path (src/screens/Home.tsx) |
| content | text | NOT NULL | File source code |
| content\_hash | text | NOT NULL | SHA-256 hash for change detection |
| last\_modified\_by | text | NOT NULL, DEFAULT 'system' | agent, builder, code\_editor, system |

\+ standard audit columns

Unique: (project\_id, path) WHERE deleted\_flag \= false. RLS: ALL where user owns project AND deleted\_flag \= false. Index: (project\_id, deleted\_flag).

## **6.9 subscriptions**

Tracks all organization subscriptions. Each organization can have one active subscription at a time. Historical subscriptions are preserved (deleted\_flag \= false, status \= 'cancelled' or 'expired') for billing audit. Subscriptions are managed by organization owners.

@Entity('subscriptions')

export class Subscription extends BaseEntity {

  @ManyToOne(() \=\> Organization, (o) \=\> o.subscriptions)

  @JoinColumn({ name: 'organization\_id' })

  organization: Organization;

  @Column({ name: 'plan', default: 'free' })

  plan: string; // free, starter, pro, team

  @Column({ name: 'status', default: 'active' })

  status: string; // active, past\_due, cancelled, expired, trialing

  @Column({ name: 'payment\_provider', nullable: true })

  paymentProvider: string | null; // stripe, paystack (null for free plan)

  @Column({ name: 'provider\_subscription\_id', nullable: true })

  providerSubscriptionId: string | null;

  @Column({ name: 'provider\_customer\_id', nullable: true })

  providerCustomerId: string | null;

  @Column({ name: 'credits\_total', default: 20 })

  creditsTotal: number;

  @Column({ name: 'current\_period\_start', type: 'timestamptz' })

  currentPeriodStart: Date;

  @Column({ name: 'current\_period\_end', type: 'timestamptz' })

  currentPeriodEnd: Date;

  @Column({ name: 'cancel\_at\_period\_end', default: false })

  cancelAtPeriodEnd: boolean;

  @Column({ name: 'cancelled\_on', type: 'timestamptz', nullable: true })

  cancelledOn: Date | null;

  @OneToMany(() \=\> SubscriptionUsage, (su) \=\> su.subscription)

  usageRecords: SubscriptionUsage\[\];

}

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| organization\_id | uuid | FK to organizations(id), NOT NULL | Subscribing organization |
| plan | text | NOT NULL, DEFAULT 'free' | Plan tier: free, starter, pro, team, enterprise |
| status | text | NOT NULL, DEFAULT 'active' | active, past\_due, cancelled, expired, trialing |
| payment\_provider | text | NULLABLE | stripe or paystack (null for free plan) |
| provider\_subscription\_id | text | NULLABLE | Stripe subscription ID or Paystack subscription code |
| provider\_customer\_id | text | NULLABLE | Stripe customer ID or Paystack customer code |
| credits\_total | integer | NOT NULL, DEFAULT 20 | Total credits allocated for this billing period |
| current\_period\_start | timestamptz | NOT NULL | Billing period start |
| current\_period\_end | timestamptz | NOT NULL | Billing period end (credits reset here) |
| cancel\_at\_period\_end | boolean | NOT NULL, DEFAULT false | If true, downgrade to free at period end |
| cancelled\_on | timestamptz | NULLABLE | When the org owner initiated cancellation |

\+ standard audit columns

RLS: SELECT where user is owner of organization AND deleted\_flag \= false. Only org owners can manage subscriptions. Index: (organization\_id, status, deleted\_flag). Unique: only one subscription per organization with status \= 'active' (enforced via partial unique index).

## **6.10 subscription\_usage**

Tracks credit consumption per subscription period at the organization level. Each row represents one credit event (used or refunded). The current balance is computed as subscription.credits\_total \- SUM(credits\_used WHERE NOT refunded) for the active period. Usage is tracked per-user within the organization for analytics.

@Entity('subscription\_usage')

export class SubscriptionUsage extends BaseEntity {

  @ManyToOne(() \=\> Subscription, (s) \=\> s.usageRecords)

  @JoinColumn({ name: 'subscription\_id' })

  subscription: Subscription;

  @ManyToOne(() \=\> Organization)

  @JoinColumn({ name: 'organization\_id' })

  organization: Organization;

  @ManyToOne(() \=\> User)

  @JoinColumn({ name: 'user\_id' })

  user: User;  // Which user consumed the credit (for per-user analytics)

  @Column({ name: 'event\_type' })

  eventType: string; // credit\_used, credit\_refunded

  @Column({ name: 'credits\_delta', default: 0 })

  creditsDelta: number; // \-1 for used, \+1 for refunded

  @ManyToOne(() \=\> AIModel, { nullable: true })

  @JoinColumn({ name: 'model\_id' })

  model: AIModel | null;

  @ManyToOne(() \=\> Project, { nullable: true })

  @JoinColumn({ name: 'project\_id' })

  project: Project | null;

  @Column({ name: 'tokens\_in', nullable: true })

  tokensIn: number | null;

  @Column({ name: 'tokens\_out', nullable: true })

  tokensOut: number | null;

  @Column({ name: 'cost\_usd', type: 'numeric', precision: 10, scale: 6, nullable: true })

  costUsd: number | null;

  @Column({ name: 'duration\_ms', nullable: true })

  durationMs: number | null;

  @Column({ name: 'provider\_event\_id', nullable: true })

  providerEventId: string | null; // Stripe/Paystack event reference for billing events

}

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| subscription\_id | uuid | FK to subscriptions(id), NOT NULL | Parent subscription |
| organization\_id | uuid | FK to organizations(id), NOT NULL | Organization (denormalized for fast queries) |
| user\_id | uuid | FK to users(id), NOT NULL | User who consumed the credit (for analytics) |
| event\_type | text | NOT NULL | credit\_used, credit\_refunded |
| credits\_delta | integer | NOT NULL, DEFAULT 0 | Credit change (-1 \= consumed, \+1 \= refunded) |
| model\_id | uuid | FK to ai\_models(id), NULLABLE | AI model used for this generation |
| project\_id | uuid | FK to projects(id), NULLABLE | Project this usage relates to |
| tokens\_in | integer | NULLABLE | Input tokens consumed |
| tokens\_out | integer | NULLABLE | Output tokens generated |
| cost\_usd | numeric(10,6) | NULLABLE | Estimated cost in USD |
| duration\_ms | integer | NULLABLE | Generation time in milliseconds |
| provider\_event\_id | text | NULLABLE | Stripe/Paystack event ID (for billing reconciliation) |

\+ standard audit columns

RLS: SELECT where user is member of organization AND deleted\_flag \= false. Indexes: (subscription\_id, created\_on DESC), (organization\_id, event\_type, created\_on), (subscription\_id, event\_type) for credit balance computation, (organization\_id, user\_id) for per-user analytics.

### **Credit Balance Computation**

\-- Get remaining credits for an organization's active subscription

SELECT s.credits\_total \- COALESCE(SUM(ABS(su.credits\_delta)) FILTER (WHERE su.event\_type \= 'credit\_used'), 0\)

       \+ COALESCE(SUM(su.credits\_delta) FILTER (WHERE su.event\_type \= 'credit\_refunded'), 0\)

       AS credits\_remaining

FROM subscriptions s

LEFT JOIN subscription\_usage su ON su.subscription\_id \= s.id AND su.deleted\_flag \= false

WHERE s.organization\_id \= $1 AND s.status \= 'active' AND s.deleted\_flag \= false

GROUP BY s.id;

This query is wrapped in a TypeORM custom repository method: subscriptionRepo.getCreditsRemaining(organizationId). The result is cached in Redis (org:{id}:credits, 30s TTL) and invalidated on every credit\_used or credit\_refunded event.

## **6.11 admins**

Admin accounts are stored separately from regular users. This ensures admin privileges cannot be escalated through the users table. An admin can also be a regular user (dual accounts via same auth.users entry), but admin operations use this table.

@Entity('admins')

export class Admin extends BaseEntity {

  @Column({ name: 'auth\_user\_id', type: 'uuid', unique: true })

  authUserId: string;

  @Column({ unique: true })

  email: string;

  @Column({ name: 'first\_name' })

  firstName: string;

  @Column({ name: 'last\_name' })

  lastName: string;

  @Column({ name: 'display\_name' })

  displayName: string;

  @Column({ name: 'role', default: 'admin' })

  role: string; // admin, super\_admin

  @Column({ name: 'permissions', type: 'text', array: true, default: '{}' })

  permissions: string\[\];

  @Column({ name: 'activated\_flag', default: false })

  activatedFlag: boolean;

  @Column({ name: 'activated\_on', type: 'timestamptz', nullable: true })

  activatedOn: Date | null;

  @Column({ name: 'activated\_by', type: 'uuid', nullable: true })

  activatedBy: string | null;

  @Column({ name: 'last\_login\_at', type: 'timestamptz', nullable: true })

  lastLoginAt: Date | null;

}

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| auth\_user\_id | uuid | NOT NULL, UNIQUE | Supabase Auth user ID |
| email | text | NOT NULL, UNIQUE | Admin email |
| first\_name | text | NOT NULL | Admin first name |
| last\_name | text | NOT NULL | Admin last name |
| display\_name | text | NOT NULL | Admin display name |
| role | text | NOT NULL, DEFAULT 'admin' | admin, super\_admin |
| permissions | text\[\] | NOT NULL, DEFAULT '{}' | manage\_users, manage\_models, manage\_settings, manage\_billing, view\_analytics |
| activated\_flag | boolean | NOT NULL, DEFAULT false | Admin account activation status |
| activated\_on | timestamptz | NULLABLE | When the admin account was activated |
| activated\_by | uuid | NULLABLE | Super admin who activated this account |
| last\_login\_at | timestamptz | NULLABLE | Last admin panel login |

\+ standard audit columns

* RLS: SELECT, UPDATE restricted to service role only. No user-facing RLS.

* Auth flow: admin login hits POST /api/v1/admin/auth/login. Backend verifies Supabase Auth credentials, then checks the admins table for a matching auth\_user\_id. If not found, returns 403\.

* Middleware: requireAdmin() middleware replaces requireAdmin(). It checks the admins table, not the users table.

* Permissions: granular array allows fine-grained access. requireAdmin('manage\_models') checks both admin status and specific permission.

* Separation benefit: compromising the users table or a user's JWT does not grant admin access. Admin authorization is a separate database lookup.

# **7\. Settings Table and Runtime Configuration**

The settings table is a key-value store holding all runtime configuration. The frontend fetches public settings via GET /api/v1/settings. The backend reads settings internally via settings-service with Redis caching.

## **7.1 settings table**

| Column | Type | Constraints | Description |
| :---- | :---- | :---- | :---- |
| id | uuid | PK | Setting ID |
| key | text | NOT NULL, UNIQUE | Dot notation key (auth.supabase\_url) |
| value | text | NOT NULL | JSON stringified for complex values |
| is\_secret | boolean | NOT NULL, DEFAULT false | If true, excluded from public GET /settings |
| is\_encrypted | boolean | NOT NULL, DEFAULT false | If true, AES-256-GCM encrypted at rest |
| description | text | NULLABLE | Human-readable for admin panel |
| category | text | NOT NULL, DEFAULT 'general' | auth, payments, ai, backends, features, general |

\+ standard audit columns (created\_on/by, updated\_on/by, deleted\_flag/on/by, meta)

## **7.2 Default Settings Rows**

| Key | Category | Secret | Encrypted | Description |
| :---- | :---- | :---- | :---- | :---- |
| auth.supabase\_url | auth | No | No | Supabase project URL (exposed to frontend) |
| auth.supabase\_anon\_key | auth | No | No | Supabase anon key (frontend-safe, scoped by RLS) |
| auth.supabase\_service\_role\_key | auth | Yes | Yes | Service role key (server-only) |
| auth.jwt\_secret | auth | Yes | Yes | JWT secret for token verification |
| payments.stripe\_publishable\_key | payments | No | No | Stripe publishable key (frontend-safe) |
| payments.stripe\_secret\_key | payments | Yes | Yes | Stripe secret key (server-only) |
| payments.stripe\_webhook\_secret | payments | Yes | Yes | Stripe webhook signing secret |
| payments.paystack\_public\_key | payments | No | No | Paystack public key (frontend-safe) |
| payments.paystack\_secret\_key | payments | Yes | Yes | Paystack secret key (server-only) |
| payments.paystack\_webhook\_secret | payments | Yes | Yes | Paystack webhook secret |
| features.terminal\_enabled | features | No | No | Terminal panel toggle |
| features.model\_comparison\_enabled | features | No | No | Side-by-side model comparison toggle |
| features.collaborative\_editing | features | No | No | Multi-user editing toggle |
| features.maintenance\_mode | features | No | No | Maintenance banner toggle |
| general.max\_projects.free | general | No | No | Max projects for free (default: 3\) |
| general.max\_projects.starter | general | No | No | Max projects for starter (default: 10\) |
| general.max\_projects.pro | general | No | No | Max projects for pro (default: 50\) |
| general.max\_projects.team | general | No | No | Max projects for team (default: unlimited) |

## **7.3 Settings Service Implementation**

class SettingsService {

  private memCache: Map\<string, { value: string; expiresAt: number }\> \= new Map();

  private CACHE\_TTL \= 60\_000;

  async get(key: string): Promise\<string | null\> { /\* mem \-\> redis \-\> postgres \*/ }

  async set(key: string, value: string, userId?: string): Promise\<void\> { /\* write \+ invalidate \*/ }

  async getPublicSettings(): Promise\<PublicSettings\> { /\* redis cache \-\> postgres where is\_secret=false \*/ }

  async getSecretSetting(key: string): Promise\<string\> { /\* decrypt if is\_encrypted=true \*/ }

  invalidateCache(): void { this.memCache.clear(); redis.del('settings:public'); }

}

Public settings cached in Redis (settings:public, 60s TTL). Admin updates invalidate cache. Secret settings cached in-memory only with short TTL, never in Redis. Always decrypted on access.

# **8\. Multi-Model AI Gateway**

The AI Gateway routes prompts to LLM providers, normalizes responses, and manages fallback logic. It lives in services/ai-gateway/ and is called by the generate route handler.

## **8.1 Base Adapter Interface**

export abstract class BaseAIAdapter {

  abstract readonly provider: string;

  abstract readonly modelKey: string;

  abstract generateCode(req: GenerateRequest): Promise\<GenerateResponse\>;

  abstract streamCode(req: GenerateRequest): AsyncIterable\<StreamChunk\>;

  abstract validateConnection(): Promise\<boolean\>;

  abstract estimateCost(req: GenerateRequest): Promise\<CostEstimate\>;

  abstract countTokens(text: string): Promise\<number\>;

  protected buildMessages(req: GenerateRequest): ProviderMessage\[\] { /\* template method \*/ }

}

## **8.2 Anthropic Adapter (Claude)**

export class AnthropicAdapter extends BaseAIAdapter {

  readonly provider \= 'anthropic';

  private client: Anthropic;

  constructor(apiKey: string, public readonly modelKey: string) {

    super(); this.client \= new Anthropic({ apiKey });

  }

  async \*streamCode(req: GenerateRequest): AsyncIterable\<StreamChunk\> {

    const stream \= this.client.messages.stream({

      model: this.modelKey, max\_tokens: 8192,

      system: req.systemPrompt, messages: this.buildMessages(req),

    });

    for await (const event of stream) {

      if (event.type \=== 'content\_block\_delta') yield { type: 'text', content: event.delta.text };

    }

    const final \= await stream.finalMessage();

    yield { type: 'done', tokensUsed: { input: final.usage.input\_tokens, output: final.usage.output\_tokens } };

  }

}

## **8.3 OpenAI Adapter (GPT)**

export class OpenAIAdapter extends BaseAIAdapter {

  readonly provider \= 'openai';

  private client: OpenAI;

  constructor(apiKey: string, public readonly modelKey: string) {

    super(); this.client \= new OpenAI({ apiKey });

  }

  async \*streamCode(req: GenerateRequest): AsyncIterable\<StreamChunk\> {

    const stream \= await this.client.chat.completions.create({

      model: this.modelKey, max\_tokens: 8192,

      messages: this.buildMessages(req), stream: true,

    });

    for await (const chunk of stream) {

      const delta \= chunk.choices\[0\]?.delta?.content;

      if (delta) yield { type: 'text', content: delta };

    }

  }

}

## **8.4 xAI Adapter (Grok)**

xAI uses an OpenAI-compatible API. The Grok adapter extends OpenAI with the xAI base URL:

export class XAIAdapter extends OpenAIAdapter {

  readonly provider \= 'xai';

  constructor(apiKey: string, modelKey: string) {

    super(apiKey, modelKey);

    this.client \= new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

  }

}

## **8.5 Google Adapter (Gemini)**

export class GoogleAdapter extends BaseAIAdapter {

  readonly provider \= 'google';

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, public readonly modelKey: string) {

    super(); this.client \= new GoogleGenerativeAI(apiKey);

  }

  async \*streamCode(req: GenerateRequest): AsyncIterable\<StreamChunk\> {

    const model \= this.client.getGenerativeModel({ model: this.modelKey });

    const chat \= model.startChat({ history: this.buildMessages(req) });

    const result \= await chat.sendMessageStream(req.prompt);

    for await (const chunk of result.stream) {

      yield { type: 'text', content: chunk.text() };

    }

  }

}

## **8.6 Mistral and DeepSeek Adapters**

Both Mistral and DeepSeek use OpenAI-compatible APIs. They extend the OpenAI adapter with their respective base URLs:

export class MistralAdapter extends OpenAIAdapter {

  readonly provider \= 'mistral';

  constructor(apiKey: string, modelKey: string) {

    super(apiKey, modelKey);

    this.client \= new OpenAI({ apiKey, baseURL: 'https://api.mistral.ai/v1' });

  }

}

export class DeepSeekAdapter extends OpenAIAdapter {

  readonly provider \= 'deepseek';

  constructor(apiKey: string, modelKey: string) {

    super(apiKey, modelKey);

    this.client \= new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com/v1' });

  }

}

## **8.7 Gateway Router**

export class AIGateway {

  private adapters: Map\<string, BaseAIAdapter\> \= new Map();

  private fallbackOrder: string\[\] \= \[\];

  registerAdapter(modelId: string, adapter: BaseAIAdapter): void { ... }

  removeAdapter(modelId: string): void { ... }

  async \*generate(req: GenerateRequest): AsyncIterable\<StreamChunk\> {

    const adapter \= this.adapters.get(req.modelId);

    if (\!adapter) throw new AppError('MODEL\_NOT\_FOUND', 404);

    try {

      yield\* adapter.streamCode(req);

    } catch (err) {

      for (const fallbackId of this.fallbackOrder) {

        if (fallbackId \=== req.modelId) continue;

        try { const fb \= this.adapters.get(fallbackId); if (fb) { yield\* fb.streamCode(req); return; } }

        catch { continue; }

      }

      throw err;

    }

  }

  async initFromDatabase(): Promise\<void\> {

    // Load enabled models from ai\_models table, decrypt keys, instantiate adapters, set fallback order by priority

  }

}

Gateway initializes on startup from ai\_models table. Admin model changes trigger re-initialization. Adapters are long-lived singletons.

## **8.8 Prompt Builder**

export function buildSystemPrompt(ctx: PromptContext): string {

  return \[

    LAYER\_1\_PLATFORM,          // You generate React Native \+ Expo \+ TypeScript code

    LAYER\_2\_PROJECT(ctx.ast, ctx.fileTree),  // Current AST and file structure

    LAYER\_3\_CODE\_QUALITY,      // Expo Router, expo-secure-store, typed props, a11y

    LAYER\_4\_OUTPUT\_FORMAT,     // Return structured AST operations, not freeform code

    ctx.backendSchema ? LAYER\_5\_BACKEND(ctx.backendSchema) : '',

  \].filter(Boolean).join('\\n\\n');

}

## **8.9 Response Parser**

* Buffers stream chunks until a complete code block or AST instruction is detected.

* Code blocks tagged with file paths are parsed into file\_update events.

* Structured JSON blocks (AST operations) are parsed into ast\_operation events.

* Conversational text is emitted as text events for the chat panel.

* Parser is stateful per-generation: buffers across chunks to handle partial JSON and split code blocks.

* Validation: parsed AST operations are validated against the AST schema before being emitted.

# **9\. Backend Integration Hub**

## **9.1 Base Adapter Interface**

export abstract class BaseBackendAdapter {

  abstract readonly provider: string;

  abstract connect(config: ConnectionConfig): Promise\<ConnectionResult\>;

  abstract disconnect(): Promise\<void\>;

  abstract testConnection(): Promise\<{ healthy: boolean; latencyMs: number }\>;

  abstract discoverSchema(): Promise\<BackendSchema\>;

  abstract generateClient(schema: BackendSchema): Promise\<GeneratedClientFiles\>;

  generateAuthFlows?(schema: BackendSchema): Promise\<GeneratedAuthFiles\>;

  generateRealtimeSubscriptions?(schema: BackendSchema): Promise\<GeneratedRealtimeFiles\>;

}

## **9.2 Supabase Adapter**

export class SupabaseAdapter extends BaseBackendAdapter {

  async connect(config: { url: string; anonKey: string }) {

    this.client \= createClient(config.url, config.anonKey);

    // Validate connection, return result

  }

  async discoverSchema() {

    // Query information\_schema.tables and columns

    // Return tables, columns, types, foreign keys, RLS policies

  }

  async generateClient(schema) {

    // Generate typed Supabase client: src/lib/supabase.ts, src/types/database.types.ts

  }

}

## **9.3 Firebase Adapter**

export class FirebaseAdapter extends BaseBackendAdapter {

  async connect(config: { projectId: string; apiKey: string }) { /\* init Firebase Admin \*/ }

  async discoverSchema() {

    // Introspect Firestore collections (sample documents for field types)

    // Discover Firebase Auth providers enabled

    // Discover Cloud Storage buckets

  }

  async generateClient(schema) {

    // Generate Firebase client: src/lib/firebase.ts, typed collection helpers

  }

}

## **9.4 Custom API Adapter**

export class CustomAPIAdapter extends BaseBackendAdapter {

  async connect(config: { baseUrl: string; authType: string; authConfig: object }) { /\* validate reachable \*/ }

  async importSpec(type: 'openapi'|'postman'|'graphql', spec: string|object) {

    // OpenAPI: parse paths, operations, schemas, security definitions

    // Postman: parse collections, requests, auth configs

    // GraphQL: introspection query, parse types, queries, mutations

  }

  async generateClient(schema) {

    // Generate typed API client with functions per endpoint

    // TypeScript interfaces from response schemas

    // Auth header injection, error handling, retry logic

    // Output: src/lib/api-client.ts, src/types/api.types.ts

  }

}

## **9.5 Schema Discovery**

export class SchemaDiscovery {

  parseOpenAPI(spec): BackendSchema { ... }

  parsePostman(collection): BackendSchema { ... }

  parseGraphQL(endpoint): Promise\<BackendSchema\> { ... }

  parseCurl(curlCmd): EndpointDefinition { ... }

  fromDescription(text): EndpointDefinition { ... } // AI-assisted

}

BackendSchema is the unified internal format: tables (SQL), endpoints (REST), types (GraphQL), auth requirements. Included in the AI system prompt so the LLM references actual table names and endpoints.

# **10\. Component AST Engine**

The AST Engine maintains the authoritative server-side AST state, applies patches from all editing modes, resolves conflicts, and serializes to React Native source code.

## **10.1 Core Operations**

export class ASTEngine {

  async loadAST(projectId: string): Promise\<ASTNode\> {

    // Redis cache (project:{id}:ast) \-\> PostgreSQL fallback \-\> cache in Redis (1hr TTL)

  }

  async applyPatch(projectId: string, patches: JSONPatch\[\], source: string): Promise\<ASTNode\> {

    // Load from Redis \-\> apply patches (fast-json-patch) \-\> validate integrity

    // Write to Redis \-\> async persist to PostgreSQL (debounced 5s)

  }

  async applyAIOperations(projectId: string, ops: ASTOperation\[\]): Promise\<ASTNode\> {

    // Convert AI ops (create, update, delete, move) to JSON Patches \-\> applyPatch

  }

  async snapshot(projectId: string): Promise\<void\> {

    // Force-persist Redis AST to PostgreSQL ast\_snapshot column

  }

}

## **10.2 Serializer (AST to Source Code)**

export class ASTSerializer {

  serialize(ast: ASTNode, config: ProjectConfig): Map\<string, string\> {

    // Screen nodes \-\> src/app/\[name\].tsx (Expo Router)

    // Navigator nodes \-\> src/app/\_layout.tsx, src/app/(tabs)/\_layout.tsx

    // Component nodes \-\> src/components/\[Name\].tsx

    // StyleSheet.create() from style props

    // Auto-manage imports, generate TypeScript types

    // Return Map\<filePath, fileContent\>

  }

}

## **10.3 Conflict Resolution**

* Version counter in Redis (project:{id}:ast:version) incremented on every mutation.

* Client patches include the version they are based on. Mismatch \= ast:conflict event.

* Client requests fresh ast:snapshot and re-applies local changes.

* AI generation (30-60s): version checked at start and end. If Builder edit occurred mid-generation, AI changes are rebased on current AST.

# **11\. Code Generation Pipeline**

## **11.1 Pipeline Stages**

| Stage | Service | Input | Output | Duration |
| :---- | :---- | :---- | :---- | :---- |
| 1\. Validate | Route \+ middleware | HTTP request | Validated request, reserved credit | \< 50ms |
| 2\. Build Context | Prompt Builder \+ AST Engine | Project ID, prompt | System prompt with AST, files, backend schema | \< 200ms |
| 3\. Route to Model | AI Gateway | Model ID | Selected adapter | \< 10ms |
| 4\. Stream Generation | AI Adapter | System \+ user prompt | Token stream | 10-60s |
| 5\. Parse Response | Response Parser | Raw token stream | SSE events (text, ast\_op, file\_update) | Real-time |
| 6\. Apply AST | AST Engine | AST operations | Updated AST in Redis \+ WS broadcast | \< 50ms/op |
| 7\. Serialize Files | AST Serializer | Updated AST | RN source files to Redis \+ DB | \< 200ms |
| 8\. Finalize | Billing \+ DB | Usage data | Credit confirmed, conversation saved | \< 100ms |

## **11.2 SSE Streaming Implementation**

router.post('/generate', auth, generateLimiter, credits, validate(generateSchema), async (req, res) \=\> {

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

  const { projectId, prompt, modelId } \= req.body;

  const ast \= await astEngine.loadAST(projectId);

  const systemPrompt \= buildSystemPrompt({ ast, fileTree, backendSchema });

  try {

    for await (const chunk of aiGateway.generate({ prompt, systemPrompt, modelId })) {

      for (const event of responseParser.parse(chunk)) {

        res.write(\`event: ${event.type}\\ndata: ${JSON.stringify(event.data)}\\n\\n\`);

        if (event.type \=== 'ast\_operation') {

          await astEngine.applyAIOperations(projectId, \[event.data\]);

          io.to(\`project:${projectId}\`).emit('ast:patched', { patches: event.data, source: 'agent' });

        }

      }

    }

    await astEngine.snapshot(projectId);

    await saveConversation(projectId, prompt, response, usage);

    res.write('event: done\\ndata: ' \+ JSON.stringify(usage) \+ '\\n\\n'); res.end();

  } catch (err) {

    await refundCredit(req.creditReservationId);

    res.write('event: error\\ndata: ' \+ JSON.stringify({ code: err.code, message: err.message }) \+ '\\n\\n'); res.end();

  }

});

# **12\. Socket.io Server (Real-Time Layer)**

## **12.1 Server Setup**

export function initSocketServer(httpServer) {

  const io \= new Server(httpServer, {

    cors: { origin: ALLOWED\_ORIGINS, credentials: true },

    transports: \['websocket', 'polling'\], pingInterval: 25000, pingTimeout: 20000,

  });

  io.use(socketAuth);

  io.on('connection', (socket) \=\> {

    socket.join(\`project:${socket.data.projectId}\`);

    registerASTHandlers(io, socket);

    registerPreviewHandlers(io, socket);

    registerTerminalHandlers(io, socket);

    registerPresenceHandlers(io, socket);

  });

  return io;

}

## **12.2 Event Handlers**

| Event | Direction | Handler | Logic |
| :---- | :---- | :---- | :---- |
| ast:patch | Client \-\> Server | ast-sync | Validate version. Apply via ASTEngine. Broadcast ast:patched to room (excl sender). Emit ast:conflict on mismatch. |
| ast:request-snapshot | Client \-\> Server | ast-sync | Load full AST. Emit ast:snapshot to requesting client only. |
| preview:request-reload | Client \-\> Server | preview | Serialize AST to files. Emit preview:reload with changed file paths. |
| terminal:input | Client \-\> Server | terminal | Forward to project container via Docker exec. Stream output via terminal:output. Team tier gate. |
| terminal:resize | Client \-\> Server | terminal | Resize PTY in container to match client terminal dimensions. |

## **12.3 Socket Authentication**

export async function socketAuth(socket, next) {

  const token \= socket.handshake.auth?.token || socket.handshake.query?.token;

  if (\!token) return next(new Error('UNAUTHORIZED'));

  const { data: { user }, error } \= await supabase.auth.getUser(token);

  if (error || \!user) return next(new Error('UNAUTHORIZED'));

  const project \= await getProjectById(socket.handshake.query?.projectId, user.id);

  if (\!project) return next(new Error('PROJECT\_NOT\_FOUND'));

  socket.data \= { userId: user.id, projectId: project.id, plan: user.plan };

  next();

}

# **13\. BullMQ Job Queue Architecture**

BullMQ handles async background work: deployment, GitHub export, scheduled cleanup. AI generation uses SSE streaming directly but can fall back to BullMQ for batch mode.

## **13.1 Queue Definitions**

| Queue | Concurrency | Retry | Timeout | Purpose |
| :---- | :---- | :---- | :---- | :---- |
| generate | 5 | 2 retries, exponential | 120s | AI generation for batch/async mode |
| deploy | 2 | 1 retry | 600s | EAS build and app store deploy |
| export | 3 | 2 retries | 120s | GitHub repo creation and push |
| cleanup | 1 | No retry | 300s | Stale cache, orphaned files |
| billing | 3 | 3 retries, exponential | 30s | Credit reset, subscription processing |

## **13.2 Deploy Job Processor**

export async function processDeployJob(job: Job\<DeployJobData\>) {

  const { projectId, platform, profile } \= job.data;

  await job.updateProgress(10);  // Export project files

  await job.updateProgress(30);  // npm install

  await job.updateProgress(50);  // eas build

  await job.updateProgress(80);  // Monitor EAS API

  await job.updateProgress(100); // Store artifact URL

  return { buildUrl, status: 'success' };

}

## **13.3 Scheduled Jobs**

| Schedule | Queue | Job | Purpose |
| :---- | :---- | :---- | :---- |
| Daily midnight UTC | cleanup | cache-cleanup | Remove Redis cache for projects inactive 24h |
| Daily midnight UTC | billing | reset-daily-spend | Reset ai\_models.daily\_spend\_usd to 0 |
| Hourly | cleanup | orphan-cleanup | Remove orphaned project files |
| Monthly per user | billing | credit-reset | On renewal: extend current\_period\_end, no row-level reset needed (usage computed from subscription\_usage) |

# **14\. Authentication and Authorization**

## **14.1 Auth Flow**

8. User submits credentials to POST /api/v1/auth/login or /register.

9. Backend calls Supabase Auth (signInWithPassword or signUp).

10. Supabase returns JWT access token (1hr) and refresh token (30 days).

11. Backend returns tokens in response body. Frontend stores in httpOnly cookies.

12. Subsequent requests: access token in Authorization: Bearer header.

13. Auth middleware: supabase.auth.getUser(token) to verify and extract user.

14. Near expiry: POST /api/v1/auth/refresh. Backend proxies to Supabase.

## **14.2 Authorization Matrix (User Plans)**

| Resource | Free | Starter | Pro | Team |
| :---- | :---- | :---- | :---- | :---- |
| Create project | 3 max | 10 max | 50 max | Unlimited |
| Agent credits | 15-20/mo | 100/mo | 300/mo | 700/mo |
| Builder Mode | Unlimited | Unlimited | Unlimited | Unlimited |
| Code Editor (write) | No | Yes | Yes | Yes |
| Terminal | No | No | No | Yes |
| Model Selection | Default | All enabled | All | All \+ compare |
| Backend: managed | Supabase only | All | All | All |
| Backend: custom API | No | No | Yes | Yes |
| GitHub Sync | No | Yes | Yes | Yes |
| EAS Deploy | No | No | Yes | Yes |

## **14.3 Admin Permissions**

Admin access is entirely separate from user plan tiers. Admins are authorized via the admins table, not the users table. Permissions are granular:

| Permission | Scope | Description |
| :---- | :---- | :---- |
| manage\_users | Users | View user list, change plans, reset credits, suspend accounts |
| manage\_models | AI Models | Add/edit/disable AI models, rotate API keys, set budgets |
| manage\_settings | Settings | Edit all settings including secrets (Stripe keys, Supabase keys) |
| manage\_billing | Billing | View all invoices, issue refunds, override plans |
| view\_analytics | Analytics | View usage dashboards, cost reports, model performance |
| manage\_admins | Admins | Add/remove other admins, change permissions (super\_admin only) |

* super\_admin: has all permissions implicitly, regardless of the permissions array.

* admin: only has permissions explicitly listed in their permissions array.

# **15\. Billing Engine (Stripe \+ Paystack)**

## **15.1 Dual Payment Provider**

The billing engine supports Stripe (international) and Paystack (Africa-focused). User selects provider during checkout. Both write to the same subscriptions and subscription\_usage tables.

* Stripe: cards, Apple Pay, Google Pay. Webhook at POST /billing/webhook/stripe.

* Paystack: cards, bank transfers, mobile money (MTN MoMo, M-Pesa). Webhook at POST /billing/webhook/paystack.

* Provider stored per subscription: subscription.payment\_provider and subscription.provider\_subscription\_id.

## **15.2 Credit System**

* One prompt-response cycle \= 1 credit, regardless of tokens or model.

* Credits are tracked in subscription\_usage table, not on the user record.

* Balance \= subscription.credits\_total \- SUM(used) \+ SUM(refunded) for active period.

* Credit reservation: insert credit\_used row in subscription\_usage on generation start. Insert credit\_refunded row on failure.

* Balance cached in Redis (user:{id}:credits, 30s TTL), invalidated on every usage event.

\-- Atomic credit reservation (TypeORM raw query in SubscriptionRepository)

async reserveCredit(organizationId: string, userId: string): Promise\<SubscriptionUsage | null\> {

  return this.manager.transaction(async (em) \=\> {

    const sub \= await em.findOne(Subscription, {

      where: { organization: { id: organizationId }, status: 'active', deletedFlag: false },

      lock: { mode: 'pessimistic\_write' },

    });

    if (\!sub) return null;

    const remaining \= await this.getCreditsRemaining(organizationId);

    if (remaining \<= 0\) return null;

    const usage \= em.create(SubscriptionUsage, {

      subscription: sub,

      organization: { id: organizationId },

      user: { id: userId },  // Track which user consumed the credit

      eventType: 'credit\_used', creditsDelta: \-1,

      createdBy: userId,

    });

    return em.save(usage);

  });

}

## **15.3 Webhook Processing**

* Stripe: verified via stripe.webhooks.constructEvent(body, sig, secret).

* Paystack: verified via HMAC SHA-512 signature comparison.

* Idempotency: provider\_event\_id in subscription\_usage prevents duplicate processing.

* Key events: subscription.created (create Subscription row, set plan \+ credits\_total), invoice.paid (extend current\_period\_end, reset usage), subscription.cancelled (set cancel\_at\_period\_end \= true), subscription.updated (plan change, update credits\_total).

# **16\. File System and Project Management**

## **16.1 Storage Tiers**

* Hot (Redis): project:{id}:file:{path}. 1hr TTL. Sub-10ms reads.

* Warm (PostgreSQL): project\_files table. Persistent truth. Async from Redis (5s debounce).

* Cold (Supabase Storage): .zip archives, binary assets. On demand.

## **16.2 Project Template**

project-name/

  app.json, tsconfig.json, package.json, babel.config.js

  src/

    app/                  \# Expo Router

      \_layout.tsx, index.tsx

      (tabs)/ \_layout.tsx, home.tsx, profile.tsx

    components/, hooks/, lib/, types/, assets/

# **17\. Preview Architecture (Client-Side via Expo Snack SDK)**

Preview is handled entirely on the frontend using the Expo Snack SDK (snack-sdk 4.x). The backend's role is limited to serving project files in the SnackFiles format when requested.

* Browser Preview: Snack web player embedded in an iframe on the frontend. Supports the full Expo SDK module set. Bundling handled by Expo's hosted infrastructure.

* Device Preview (Expo Go): Snack session generates a QR code URL. Users scan with Expo Go for native rendering. No backend dev server or Railway container needed.

* File Serving: GET /api/v1/projects/:id/files?format=snack returns project files in SnackFiles format ({ [path]: { type: 'CODE', contents: string } }) for the frontend to push to the Snack instance.

* Session Lifecycle: managed on the frontend. Snack session created on workspace load, paused after 30 min inactivity, lazily re-created when user returns.

* Cost Savings: eliminates Railway preview containers ($100-300/month savings). Snack SDK is free and open-source (MIT license).

* Framework Constraint: platform commits to Expo managed workflow only. No bare React Native CLI or custom native modules. This constraint ensures Snack preview compatibility.

* Dev build features (push notifications, custom native modules) show a NativeFeatureWarning badge in the preview panel.

# **18\. Security**

## **18.1 Data Protection**

* HTTPS (TLS 1.3). HSTS 1-year max-age.

* API keys: AES-256-GCM at rest. Encryption key from env var, never in code or DB.

* Supabase RLS: row-level access independent of application logic.

* No PII beyond email \+ display name. Payments via Stripe/Paystack entirely.

* Backend configs encrypted in projects.backend\_config.

## **18.2 Encryption Service**

export class EncryptionService {

  private key: Buffer; // from env.ENCRYPTION\_KEY (32 bytes)

  encrypt(plaintext: string): string {

    const iv \= crypto.randomBytes(12);

    const cipher \= crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted \= Buffer.concat(\[cipher.update(plaintext, 'utf8'), cipher.final()\]);

    const tag \= cipher.getAuthTag();

    return Buffer.concat(\[iv, tag, encrypted\]).toString('base64');

  }

  decrypt(ciphertext: string): string {

    const buf \= Buffer.from(ciphertext, 'base64');

    const iv \= buf.subarray(0,12), tag \= buf.subarray(12,28), data \= buf.subarray(28);

    const d \= crypto.createDecipheriv('aes-256-gcm', this.key, iv);

    d.setAuthTag(tag);

    return d.update(data) \+ d.final('utf8');

  }

}

## **18.3 API Security**

* Rate limiting: Redis sliding window per IP and per user.

* Input validation: Zod on every route. Parameterized queries prevent SQLi.

* CORS: frontend origin allowlist. No wildcard.

* Helmet: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.

* JWT: 1hr access tokens, RS256 (Supabase). Refresh via backend proxy.

* Body size: 10MB default, 50MB for file uploads, per-route config.

## **18.4 Generated Code Security**

* Secrets: expo-secure-store in generated apps. Never AsyncStorage.

* Backend configs: env vars in app.config.js, not source code.

* Fintech templates (cert pinning, secure inputs, biometrics): hand-reviewed, not AI-generated.

# **19\. Deployment (Docker, PM2, Railway)**

## **19.1 Infrastructure**

| Component | Service | Region | Config |
| :---- | :---- | :---- | :---- |
| Express Backend | Railway | US East | Docker. PM2 cluster. Auto-scale on CPU. |
| PostgreSQL | Supabase | US East | Pro. PITR. Daily backups. PgBouncer. |
| Redis | Upstash / Railway | US East | Persistent. allkeys-lru. 256MB MVP. |
| File Storage | Supabase \+ R2 | Global | Projects in Supabase. Assets in R2. |
| Preview | Client-side (Expo Snack SDK) | N/A | No backend infrastructure. Bundling via Expo hosted services. |
| Monitoring | Sentry \+ Axiom | Cloud | Errors \+ structured log search. |
| CI/CD | GitHub Actions | \- | Lint, test, build, deploy on merge. |

## **19.2 Dockerfile**

FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@latest \--activate

FROM base AS build

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages/ packages/

COPY services/api/ services/api/

RUN pnpm install \--frozen-lockfile

RUN pnpm turbo build \--filter=api

FROM base AS runtime

WORKDIR /app

COPY \--from=build /app/services/api/dist ./dist

COPY \--from=build /app/node\_modules ./node\_modules

RUN npm install \-g pm2

COPY services/api/ecosystem.config.js ./

EXPOSE 4000

CMD \["pm2-runtime", "ecosystem.config.js"\]

## **19.3 PM2 Configuration**

module.exports \= { apps: \[{

  name: 'api', script: './dist/index.js',

  instances: 'max', exec\_mode: 'cluster',

  max\_memory\_restart: '512M',

  env: { NODE\_ENV: 'production' },

  exp\_backoff\_restart\_delay: 100,

  kill\_timeout: 5000, listen\_timeout: 10000, merge\_logs: true,

}\] };

## **19.4 Estimated Monthly Cost**

| Service | Plan | Cost | Notes |
| :---- | :---- | :---- | :---- |
| Railway | Pro | $20-50/mo | Express \+ Redis |
| Supabase | Pro | $25/mo | 8GB DB, 250GB storage |
| Cloudflare | Free | $0 | DNS, SSL, CDN. R2 $20 if needed. |
| Sentry | Team | $26/mo | 50K errors/month |
| AI APIs | Variable | $500-1,500/mo | Claude, OpenAI, Grok |
| TOTAL (MVP) | \- | $600-1,650/mo | Lean, managed services only |

# **20\. Environment Variables**

All sensitive configuration lives in the settings table (Section 7). These env vars bootstrap the app before the settings table is accessible. TypeORM uses DATABASE\_URL for connection.

| Variable | Example | Description |
| :---- | :---- | :---- |
| PORT | 4000 | HTTP server port |
| NODE\_ENV | production | development, staging, production |
| DATABASE\_URL | postgresql://... | Supabase PostgreSQL connection (TypeORM DataSource) |
| SUPABASE\_URL | https://xxx.supabase.co | Bootstrap Supabase URL (before settings load) |
| SUPABASE\_SERVICE\_ROLE\_KEY | eyJhbG... | Bootstrap service role key |
| REDIS\_URL | redis://... | Redis connection string |
| ENCRYPTION\_KEY | base64-32-bytes | AES-256-GCM key for encrypting settings and model API keys |
| SENTRY\_DSN | https://xxx@sentry.io/xxx | Error tracking DSN |
| ALLOWED\_ORIGINS | https://yourdomain.com,https://\*.vercel.app | Comma-separated CORS origins |

Once the app starts and connects to the database, all other config (Stripe keys, Paystack keys, feature flags, plan definitions, AI model keys) is read from the settings table via the SettingsService.

# **21\. Monitoring and Observability**

## **21.1 Error Tracking (Sentry)**

* Every unhandled exception and rejected promise captured with full request context (userId, projectId, modelId, requestId).

* Alerts: email \+ Slack for new error types, error rate spikes (\> 5%), P99 latency \> 30s on /generate.

* Performance monitoring: transaction traces for /generate pipeline showing time per stage.

## **21.2 Structured Logging (Pino \+ Axiom)**

* All logs: JSON via Pino. Fields: timestamp, level, requestId, userId, projectId, message, duration, error.

* Shipped to Axiom for search, aggregation, and dashboards.

* Key dashboards: requests/second, error rate by endpoint, generation latency (P50/P95/P99), WebSocket connections, credit consumption, model usage distribution.

## **21.3 Health Check**

GET /health \-\> { status: 'ok', uptime, memory, redis: 'connected', supabase: 'connected', activeSockets: number }

* Railway pings /health every 30 seconds. 3 consecutive failures trigger container restart.

* Betterstack (free tier) pings from 3 global regions every 60 seconds. Alerts via email \+ SMS.

# **22\. Performance Targets**

| Metric | Target | Measurement |
| :---- | :---- | :---- |
| API response (non-generate) | \< 200ms P95 | Express endpoints excluding /generate |
| AI generation start | \< 2 seconds | Prompt submit to first SSE event |
| AI generation complete | \< 60 seconds P95 | Full generation including AST \+ file write |
| Builder edit latency | \< 50ms | Property change to preview update (client-side) |
| AST sync (WebSocket) | \< 100ms | Client patch to broadcast to other clients |
| Preview hot-reload | \< 2000ms | Snack SDK file sync \+ Expo bundler rebuild |
| QR preview update | \< 3 seconds | Expo Go update via Snack session |
| Workspace page load | \< 3 seconds | Initial load with project data |
| Uptime | 99.5% | Monthly availability (MVP) |
| WebSocket connections | 1,000 concurrent | Per Railway instance. Horizontal via Redis adapter. |
| Database connections | 60 pooled | Via PgBouncer. Sufficient for 500+ concurrent users. |

*End of Backend Architecture Specification  |  Version 1.1  |  February 2026*
