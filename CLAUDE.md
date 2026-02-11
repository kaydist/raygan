# CLAUDE.md - AI Agent Guide

## Implementation Plan

The detailed implementation plan and task breakdown is located in **`ImplementationPlan.md`**. Refer to that document for:
- Week-by-week development roadmap
- Feature priorities and dependencies
- Current sprint tasks and progress
- Technical implementation details

## Project Overview

This is **Staq** - an AI-powered, no-code mobile app builder that generates production-ready React Native (Expo) applications. The platform combines:

1. **Dual-Mode Interface**: Agent Mode (chat-based AI generation) + Builder Mode (Figma-like visual editor)
2. **Multi-Model AI Gateway**: Provider-agnostic LLM routing (Claude, GPT-5, Grok, Gemini, Mistral, DeepSeek)
3. **Backend Integration Hub**: Supabase, Firebase, Appwrite, custom API endpoints with OpenAPI import
4. **Code Workspace**: Monaco editor, file explorer, integrated terminal
5. **QR Code Preview**: Expo Go device preview + Sandpack browser preview
6. **Africa-First**: Paystack, Flutterwave, Mono, M-Pesa integrations

## Tech Stack

### Backend (`services/api/`)
| Technology | Purpose |
|------------|---------|
| Express.js 5.x | HTTP framework, REST API |
| TypeScript 5.7+ | Type safety (strict mode) |
| Node.js 22 LTS | Runtime |
| PostgreSQL 16 (Supabase) | Primary database with RLS |
| Redis 7 | Cache, BullMQ queues, rate limiting |
| Socket.io 4.x | Real-time AST sync, preview updates |
| BullMQ 5.x | Async job queue |
| TypeORM 0.3.x | ORM with migrations |
| Zod 3.x | Request validation |
| Pino 9.x | Structured logging |

### Frontend (`apps/web/`)
| Technology | Purpose |
|------------|---------|
| Next.js 15.x (App Router) | SSR, routing, middleware |
| React 19.x | UI library |
| TypeScript 5.7+ | Type safety |
| shadcn/ui | Component library (Radix + Tailwind) |
| Tailwind CSS 4.x | Utility-first styling |
| Zustand 5.x | Client state management |
| React Query 5.x | Server state, caching |
| Monaco Editor | Code editor panel |
| @dnd-kit 6.x | Drag-and-drop |
| Sandpack | Browser preview |
| Socket.io Client | Real-time sync |

### Shared (`packages/shared/`)
- TypeScript types shared between frontend and backend
- Zod validation schemas
- Constants and enums

## Monorepo Structure

```
project-root/
├── apps/
│   └── web/                    # Next.js frontend
├── packages/
│   ├── shared/                 # Shared types, schemas, constants
│   ├── ui/                     # Extracted shadcn/ui components (optional)
│   ├── eslint-config/          # Shared ESLint rules
│   └── tsconfig/               # Shared TS configs
├── services/
│   └── api/                    # Express.js backend
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md                   # This file
```

## Key Architectural Patterns

### 1. Barrel Export Convention (CRITICAL)
Every folder must have an `index.ts` barrel export. Import from folders, never individual files.

```typescript
// CORRECT
import { Button, Input } from '@/components/atoms';
import { api, socketClient } from '@/lib/api';

// INCORRECT - Never do this
import { Button } from '@/components/atoms/Button';
```

### 2. Component AST (Bidirectional Bridge)
The core technical moat is the shared Component AST that Agent Mode, Builder Mode, and Code Editor all read/write to:
- Every mutation emits a JSON Patch via WebSocket
- Version numbers prevent conflicts
- AST serializes to React Native source files

### 3. Atomic Design (Frontend Components)
```
components/
├── atoms/       # Pure presentational (Button, Input, Badge)
├── molecules/   # 2-4 atoms combined (SearchBar, ModelSelector)
├── organisms/   # Complex with business logic (ChatPanel, PropertyInspector)
└── templates/   # Layout structures only (WorkspaceTemplate)
```

### 4. Feature Modules (Frontend)
```
features/
├── agent/       # Chat interface, AI generation
├── builder/     # Visual editor, property panel
├── code-editor/ # Monaco wrapper
├── preview/     # Sandpack + QR code
├── terminal/    # xterm.js (Month 2)
├── project/     # Project management
└── billing/     # Billing UI
```

### 5. Database Conventions (Backend)
All entities extend `BaseEntity` with standard audit columns:
- `id` (uuid PK)
- `meta` (jsonb)
- `created_on`, `created_by`
- `updated_on`, `updated_by`
- `deleted_flag`, `deleted_on`, `deleted_by` (soft delete)

Scoped repositories auto-filter `deleted_flag = false`.

### 6. AI Adapter Pattern
Each LLM provider has an adapter implementing `BaseAIAdapter`:
```typescript
abstract class BaseAIAdapter {
  abstract generateCode(req: GenerateRequest): Promise<GenerateResponse>;
  abstract streamCode(req: GenerateRequest): AsyncIterable<StreamChunk>;
  abstract validateConnection(): Promise<boolean>;
  abstract estimateCost(req: GenerateRequest): Promise<CostEstimate>;
}
```

### 7. Backend Adapter Pattern
Each backend provider has an adapter implementing `BaseBackendAdapter`:
```typescript
abstract class BaseBackendAdapter {
  abstract connect(config: ConnectionConfig): Promise<ConnectionResult>;
  abstract discoverSchema(): Promise<BackendSchema>;
  abstract generateClient(schema: BackendSchema): Promise<GeneratedClientFiles>;
}
```

## Backend Directory Structure

```
services/api/src/
├── index.ts                # Server entry
├── app.ts                  # Express app factory
├── config/                 # env, redis, supabase, sentry, logger
├── constants/              # error-codes, socket-events, plans, limits
├── routes/v1/              # Route handlers
├── middleware/             # auth, rate-limit, validate, credits, plan-gate
├── services/
│   ├── ai-gateway/         # Multi-model AI routing
│   │   └── adapters/       # anthropic, openai, xai, google, etc.
│   ├── backend-hub/        # Backend integration
│   │   └── adapters/       # supabase, firebase, custom-api
│   └── ast-engine/         # AST CRUD, serialization, parsing
├── socket/                 # Socket.io handlers
├── jobs/                   # BullMQ processors
├── db/
│   ├── entities/           # TypeORM entities
│   ├── repositories/       # Custom repositories
│   ├── migrations/
│   └── subscribers/
├── helpers/
└── types/
```

## Frontend Directory Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Landing, pricing, docs (SSR)
│   ├── (auth)/             # Login, register
│   ├── (dashboard)/        # Project list, settings, billing
│   └── (workspace)/        # Main workspace [projectId]
├── components/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── features/
├── stores/                 # Zustand stores
│   ├── ast-store.ts
│   ├── ui-store.ts
│   ├── auth-store.ts
│   ├── project-store.ts
│   └── settings-store.ts
├── hooks/
├── lib/
│   ├── constants/          # routes, query-keys, socket-events, theme
│   ├── api/                # api-client, socket-client, sse-client
│   ├── helpers/            # ast, credit, file, project helpers
│   ├── formatters/         # date, number, code, string formatters
│   └── utils/              # logger, cn, debounce, storage, error
└── types/
```

## Zustand Stores

| Store | Purpose |
|-------|---------|
| `ast-store` | Component AST, CRUD ops, undo/redo, JSON Patch sync |
| `ui-store` | Panel state, active mode, canvas zoom, file tabs |
| `auth-store` | User, plan, credits |
| `project-store` | Project, files, file tree, backend schema |
| `settings-store` | Runtime config from backend settings table |

## API Response Envelope

All API responses use this format:
```typescript
{ data: T | null, error: { code, message, details } | null, meta?: { total, page, limit } }
```

## Socket.io Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `ast:patch` | Client → Server | Send local AST changes |
| `ast:patched` | Server → Client | Broadcast AST changes |
| `ast:snapshot` | Server → Client | Full AST on connect/conflict |
| `generate:stream` | Server → Client | AI generation text chunks |
| `preview:reload` | Server → Client | Trigger preview refresh |

## Environment Variables

### Backend (services/api/)
- `PORT` - Server port (default 4000)
- `DATABASE_URL` - PostgreSQL connection
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Bootstrap Supabase
- `REDIS_URL` - Redis connection
- `ENCRYPTION_KEY` - AES-256-GCM for secrets

### Frontend (apps/web/)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking

All other config (Supabase keys, Stripe keys, feature flags) is fetched from backend `GET /api/v1/settings`.

## Coding Standards

### TypeScript Only
- **All files must be TypeScript** - Never use `.js` files, always use `.ts` or `.tsx`
- Config files should use `.ts` extension (e.g., `eslint.config.ts`, `tailwind.config.ts`)
- Strict mode enabled
- No `any` types
- Explicit return types on functions
- Use `type` for object shapes, `interface` for extendable contracts

### Naming Conventions
- **API response keys**: `snake_case` (e.g., `user_id`, `created_at`)
- **Classes/Functions**: `PascalCase` (e.g., `UserService`, `CreateProject`)
- **Methods**: `camelCase` (e.g., `getUserById`, `createProject`)
- **Components**: `PascalCase.tsx`
- **Hooks**: `useCamelCase.ts`
- **Utilities/helpers**: `kebab-case.ts`
- **Constants**: `kebab-case.ts`
- **Types**: `kebab-case.types.ts`
- **Stores**: `kebab-case-store.ts`
- **Database columns**: `snake_case` (e.g., `created_on`, `deleted_flag`)

### Import Order
1. React/Next.js imports
2. Third-party libraries
3. Shared packages (`@packages/shared`)
4. Stores (`@/stores`)
5. Components (`@/components`)
6. Lib (`@/lib`)
7. Feature-local imports
8. Type-only imports

## Key Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start all services
pnpm dev --filter=web # Frontend only
pnpm dev --filter=api # Backend only

# Build
pnpm build

# Lint
pnpm lint

# Type check
pnpm typecheck

# Database migrations
pnpm --filter=api migration:run
pnpm --filter=api migration:generate
```

## Critical Implementation Notes

1. **Credits System**: One prompt = 1 credit. Tracked in `subscription_usage` table. Builder edits are free.

2. **Plan Gating**: Features gated via `plan-gate` middleware and `requirePlan()`.

3. **Admin Separation**: Admins stored in separate `admins` table, not `users`.

4. **Encryption**: API keys and secrets encrypted with AES-256-GCM at rest.

5. **Soft Delete**: All entities use `deleted_flag`, never physical delete.

6. **Settings Table**: All runtime config stored in `settings` table, fetched by frontend on init.

7. **Preview Modes**:
   - Browser: Sandpack (React Native Web)
   - Device: Expo Go via QR code

## User Plans

| Plan | Credits/mo | Code Editor | Terminal | GitHub | Custom API |
|------|------------|-------------|----------|--------|------------|
| Free | 15-20 | Viewer | No | No | No |
| Starter | 100 | Full | No | Yes | No |
| Pro | 300 | Full | No | Yes | Yes |
| Team | 700 | Full | Yes | Yes | Yes |

## Month-by-Month Roadmap

### Month 1 (MVP)
- Agent Mode (chat-to-app)
- Builder Mode v1 (inspector, property editor, tree)
- Code Workspace (file explorer, Monaco)
- QR Preview + Browser Preview
- Multi-Model AI Gateway (Claude, GPT-5, Grok)
- Supabase + Firebase adapters
- Stripe billing

### Month 2
- Builder Mode v2 (drag-drop, component palette)
- Terminal v1
- More backend adapters (Appwrite, Nhost, PocketBase)
- Paystack/Flutterwave

### Month 3
- Builder Mode v3 (freeform canvas)
- Figma Import
- Self-hosted model support
- African fintech adapters (Mono, M-Pesa)

### Month 4+
- AI design suggestions
- Collaborative editing
- White-label mode