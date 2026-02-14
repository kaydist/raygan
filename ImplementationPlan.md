# Cowork Prompt: Set Up GitHub Project Board with 3-Month Development Plan

## Context

I'm a solo developer building an AI-powered mobile app builder platform (competitor to Rork.com). I have two specification documents attached that describe the full architecture. I need you to set up a GitHub Project board with a complete 3-month development plan broken into daily tasks.

**Critical priority:** The AI generation pipeline and project CRUD come FIRST. I need to validate the core product loop — "user creates project → writes prompt → AI generates React Native code → user sees preview" — before investing in auth, billing, marketing, or polish. Everything else wraps around this core once it's proven.

## What To Do

### 1. Create the GitHub Repository

Create a new **private** GitHub repository called `appbuilder`. Initialize with a README.

### 2. Create Milestones

Create these milestones on the repository:

| Milestone | Due Date | Description |
|-----------|----------|-------------|
| M1: Core Loop Validated | Mar 2, 2026 | Monorepo + Express + AI Gateway (Claude) + project CRUD + SSE streaming + basic chat UI + Expo Snack preview. The core product works end-to-end without auth or billing. |
| M2: AST Engine + Builder | Mar 16, 2026 | Component AST engine, Builder Mode v1 (tree, property inspector, canvas), bidirectional AST ↔ Code sync |
| M3: Multi-Model + Real-Time | Mar 30, 2026 | OpenAI/xAI/Google adapters, model selector, Socket.io real-time sync, Code Editor (Monaco) |
| M4: Auth + User System | Apr 13, 2026 | Supabase Auth, JWT middleware, login/register, protected routes, user profiles, plan system |
| M5: Billing + Backend Hub | Apr 27, 2026 | Stripe billing, credit system, plan enforcement, Supabase backend adapter, backend-aware generation |
| M6: Deploy + DevOps | May 11, 2026 | CI/CD, Docker, Railway deploy, staging/prod environments, monitoring (Sentry + Axiom), EAS build trigger |
| M7: Marketing + Launch | May 25, 2026 | Landing page, pricing page, onboarding, security hardening, performance optimization, soft launch |
| M8: Buffer + Polish | Jun 8, 2026 | Bug fixes, UX polish, documentation, launch preparation |

### 3. Create Labels

Create these labels for categorizing issues:

**Phase labels:**
- `phase:validation` (color: #D93F0B) — Core loop proof
- `phase:core` (color: #0E8A16) — Platform features
- `phase:integration` (color: #E4820E) — Auth, billing, backend hub
- `phase:launch` (color: #7B61FF) — Deploy, marketing, polish

**Type labels:**
- `type:feature` (color: #A2EEEF)
- `type:infra` (color: #D4C5F9)
- `type:bug` (color: #D93F0B)
- `type:chore` (color: #EDEDED)
- `type:docs` (color: #0075CA)

**Area labels:**
- `area:frontend` (color: #FBCA04)
- `area:backend` (color: #B60205)
- `area:shared` (color: #5319E7)
- `area:ai-gateway` (color: #006B75)
- `area:ast-engine` (color: #1D1D1D)
- `area:billing` (color: #0E8A16)
- `area:infra` (color: #BFD4F2)

**Priority labels:**
- `priority:critical` (color: #B60205) — Blocks validation
- `priority:high` (color: #D93F0B)
- `priority:medium` (color: #FBCA04)
- `priority:low` (color: #0E8A16)

**Size labels (estimated hours):**
- `size:small` (1-2h) (color: #C5DEF5)
- `size:medium` (3-4h) (color: #BFD4F2)
- `size:large` (6-8h) (color: #0075CA)

### 4. Create GitHub Issues — Day-by-Day Tasks

Create **one issue per day** for 90 days (Feb 10 – May 11, 2026). Each issue follows this template:

**Issue title format:** `[Day XX] Brief description of main deliverable`

**Issue body format:**
```markdown
## Day XX — [Date] ([Weekday])
**Sprint:** [Sprint number] | **Phase:** [Phase name] | **Focus:** [Focus area]
**Estimated hours:** [3-4h weekday / 6-8h weekend]

### Tasks
- [ ] Task 1 with specific deliverable
- [ ] Task 2 with specific deliverable
- [ ] Task 3 with specific deliverable
- [ ] Write tests for above

### Key Files
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2

### Dependencies
Blocked by: #[issue number] (if any)

### Notes
Any technical notes relevant to implementation.
```

Assign each issue to the appropriate **milestone** and add relevant **labels**.

### 5. Create a GitHub Project Board

Create a GitHub Project (V2) called **"MVP Development — 3 Month Plan"** with these views:

**View 1: "Board"** (Kanban)
- Columns: Backlog → This Sprint → In Progress → Review → Done

**View 2: "Timeline"** (Roadmap/Timeline)
- Group by milestone

**View 3: "Sprint View"** (Table)
- Group by sprint (custom field)
- Columns: Title, Status, Priority, Size, Area, Due Date

**Custom fields on the project:**
- `Sprint` (Single select): Sprint 1, Sprint 2, Sprint 3, Sprint 4, Sprint 5, Sprint 6, Sprint 7
- `Phase` (Single select): Validation, Core, Integration, Launch
- `Day Number` (Number): 1-90
- `Estimated Hours` (Number)

Add all issues to the project with custom fields populated.

---

## Daily Plan Content

Read the attached spec documents for full technical details — file paths, interfaces, database schemas, and API contracts are all specified there. Below is the day-by-day plan.

### Planning Constraints
- Solo developer. Weekday capacity: 3-4h. Weekend capacity: 6-8h.
- Total weekly: ~27-32h (5 × 3.5h + 2 × 7h).
- Each day produces a tangible deliverable.
- 2 buffer days per sprint for debugging/catch-up.
- Tests written alongside code.

---

### MONTH 1: VALIDATION — PROVE THE CORE LOOP

**Sprint 1 (Week 1-2: Feb 10 – Feb 23) — "Can AI generate a React Native app from a prompt?"**

**Day 1 (Feb 10, Tue)** — Monorepo + Express Skeleton
- Initialize Turborepo with pnpm workspaces
- Create `apps/web`, `services/api`, `packages/shared` structure
- Express 5 + TypeScript: health check endpoint, basic middleware (cors, helmet, pino-http, express.json)
- Verify: `pnpm dev` starts both frontend and backend
- Labels: `phase:validation`, `type:infra`, `area:backend`, `area:shared`, `priority:critical`, `size:medium`
- Files: `turbo.json`, `pnpm-workspace.yaml`, `services/api/src/index.ts`, `services/api/src/config/`

**Day 2 (Feb 11, Wed)** — Shared Types + Supabase Database
- Set up `packages/shared` with core types: Project, Conversation, ASTNode, AIModel
- Create Supabase project, write migrations for `projects` and `conversations` tables
- Run migrations via Supabase CLI
- Labels: `phase:validation`, `type:infra`, `area:shared`, `area:backend`, `priority:critical`, `size:medium`
- Files: `packages/shared/src/types/`, `services/api/src/db/migrations/`

**Day 3 (Feb 12, Thu)** — Project CRUD API
- Implement project routes: POST /api/v1/projects, GET /projects, GET /projects/:id, PATCH, DELETE
- Zod validation schemas for project create/update
- No auth middleware yet — all routes open for dev speed
- Verify: curl/Postman can create and list projects
- Labels: `phase:validation`, `type:feature`, `area:backend`, `priority:critical`, `size:medium`
- Files: `services/api/src/routes/v1/projects.routes.ts`, `services/api/src/middleware/validate.ts`

**Day 4 (Feb 13, Fri)** — AI Gateway: Architecture + Claude Adapter
- Create adapter interface, base adapter class, gateway router with registry
- Implement Anthropic adapter with @anthropic-ai/sdk
- SSE streaming support from Claude API
- Verify: calling the adapter directly returns streamed code
- Labels: `phase:validation`, `type:feature`, `area:ai-gateway`, `priority:critical`, `size:medium`
- Files: `services/api/src/services/ai-gateway/gateway.ts`, `adapters/anthropic.ts`, `adapters/base-adapter.ts`

**Day 5 (Feb 14, Sat)** — Prompt Builder + Response Parser
- Build 5-layer prompt builder (spec Section 7.4): platform context, project context, code quality rules, output format, backend awareness
- Build response parser: extract code blocks, AST operations, conversational text from LLM stream
- Write few-shot examples for the system prompt
- Verify: prompt builder produces well-structured system prompt, parser extracts structured output
- Labels: `phase:validation`, `type:feature`, `area:ai-gateway`, `priority:critical`, `size:large`
- Files: `services/api/src/services/ai-gateway/prompt-builder.ts`, `response-parser.ts`

**Day 6 (Feb 15, Sun)** — Generate Endpoint with SSE
- Implement POST /api/v1/generate route with SSE streaming
- Wire up: receive prompt → build context → call Claude adapter → stream response → emit SSE events (text, ast_operation, file_update, done, error)
- Store conversation messages in PostgreSQL
- Verify: curl POST to /generate streams back SSE events with generated code
- Labels: `phase:validation`, `type:feature`, `area:ai-gateway`, `area:backend`, `priority:critical`, `size:large`
- Files: `services/api/src/routes/v1/generate.routes.ts`

**Day 7 (Feb 16, Mon)** — Next.js Shell + Basic Dashboard
- Initialize Next.js 15 with App Router, Tailwind CSS 4, shadcn/ui
- Route groups: `(marketing)`, `(auth)`, `(dashboard)`, `(workspace)`
- Basic dashboard page: list projects, create project button (no auth — hardcoded user for now)
- Verify: can see project list in browser, create new project
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `priority:critical`, `size:medium`
- Files: `apps/web/src/app/(dashboard)/page.tsx`, Tailwind + shadcn config

**Day 8 (Feb 17, Tue)** — Zustand Stores + API Client
- Create Zustand stores: project-store, ui-store (no auth-store yet)
- Build typed API client (fetch wrapper with error handling)
- Wire dashboard to load projects from API
- Verify: dashboard fetches and displays projects from backend
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `priority:critical`, `size:medium`
- Files: `apps/web/src/stores/`, `apps/web/src/lib/api-client.ts`

**Day 9 (Feb 18, Wed)** — Workspace Layout Shell
- Build 4-panel resizable layout with react-resizable-panels (spec Section 3.4)
- Left: chat panel placeholder, Center: code/builder toggle, Right: preview placeholder
- Navigate to workspace on project click from dashboard
- Verify: workspace renders with resizable panels
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `priority:critical`, `size:medium`
- Files: `apps/web/src/app/(workspace)/[projectId]/page.tsx`, layout components

**Day 10 (Feb 19, Thu)** — Agent Mode Chat Panel
- Build ChatPanel: message list, prompt input textarea, send button
- Connect to POST /generate with SSE via EventSource or fetch stream
- Display streaming AI response in real-time (character by character)
- Loading state, error state, message history
- Verify: type prompt → see AI response stream into chat
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `area:ai-gateway`, `priority:critical`, `size:medium`
- Files: `apps/web/src/features/agent/ChatPanel.tsx`, `MessageList.tsx`, `PromptInput.tsx`

**Day 11 (Feb 20, Fri)** — Expo Snack Preview Integration
- Install snack-sdk 4.x
- Create useSnack hook (Snack session lifecycle: create, connect, dispose)
- Create useSnackSync hook (push AST-serialized files to Snack via updateFiles())
- Build SnackPreview component (Snack web player in device frame mockup)
- Build QRCodeDisplay component (QR code from Snack session URL for Expo Go)
- Build DeviceSelector component (iOS / Android / Web platform picker)
- Verify: AI generates code → Snack preview renders in browser AND QR code available for Expo Go
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `priority:critical`, `size:medium`
- Files: `apps/web/src/features/preview/components/SnackPreview.tsx`, `hooks/useSnack.ts`, `hooks/useSnackSync.ts`, `utils/snack-session.ts`, `utils/file-transformer.ts`

**Day 12 (Feb 21, Sat)** — End-to-End Integration
- Full flow: create project → open workspace → type prompt → AI generates → Snack preview renders in browser AND QR code available for Expo Go
- Fix all integration bugs between frontend SSE handling and backend streaming
- File storage: save generated files to project_files table
- Load project files on workspace mount, display in preview
- Verify: the complete loop works — this is the validation moment
- Labels: `phase:validation`, `type:feature`, `area:frontend`, `area:backend`, `priority:critical`, `size:large`

**Day 13 (Feb 22, Sun)** — Polish the Core Loop
- Improve prompt builder with better few-shot examples for React Native + Expo
- Handle edge cases: empty projects, failed generation, malformed AI output
- Add conversation history context (send last N messages with each prompt)
- Retry logic on AI failures
- Verify: reliable generation across different types of prompts
- Labels: `phase:validation`, `type:feature`, `area:ai-gateway`, `priority:critical`, `size:large`

**Day 14 (Feb 23, Mon)** — Sprint 1 Buffer
- Fix accumulated bugs
- Refactor messy integration code
- Record demo video of the core loop working
- **MILESTONE: M1 Core Loop Validated** ✅
- **Decision gate: Does the AI generation quality justify building a product around this?**

---

**Sprint 2 (Week 3-4: Feb 24 – Mar 9) — "Make it real: AST + Builder + Code Editor"**

**Day 15 (Feb 24, Tue)** — Database: Remaining Tables
- Migrations for: users, ai_models, project_files (if not done), billing_events, settings
- Row-Level Security policies (spec Section 5.2)
- Indexes (spec Section 5.3)
- Seed ai_models with Claude config
- Labels: `phase:core`, `type:infra`, `area:backend`, `priority:high`, `size:medium`

**Day 16 (Feb 25, Wed)** — Settings Service + Redis
- Set up Redis (local Docker + Upstash config)
- Implement settings table service with Redis caching (spec Section 7 of backend)
- Project file caching in Redis (hot storage pattern, spec Section 13.2)
- Labels: `phase:core`, `type:infra`, `area:backend`, `priority:high`, `size:medium`
- Files: `services/api/src/services/settings.service.ts`, `services/api/src/config/redis.ts`

**Day 17 (Feb 26, Thu)** — AST Engine: Core Types + CRUD
- Implement ASTNode TypeScript types from spec (Section 6.1)
- AST CRUD operations: create, update, delete, move, duplicate
- JSON Patch diff generation (RFC 6902)
- Labels: `phase:core`, `type:feature`, `area:ast-engine`, `priority:critical`, `size:medium`
- Files: `services/api/src/services/ast-engine/ast.ts`, `differ.ts`

**Day 18 (Feb 27, Fri)** — AST Engine: Serializer
- AST → React Native source code serializer (spec Section 6.3)
- Screen nodes → `src/screens/[Name].tsx`, Navigator → navigation config
- StyleSheet.create() generation, auto-managed imports
- Labels: `phase:core`, `type:feature`, `area:ast-engine`, `priority:critical`, `size:medium`
- Files: `services/api/src/services/ast-engine/serializer.ts`

**Day 19 (Feb 28, Sat)** — AST Engine: Parser + Validator
- Source code → AST parser (reverse of serializer)
- AST integrity validator (orphan check, circular ref detection)
- Wire AI response parser to output proper ASTOperation objects
- Labels: `phase:core`, `type:feature`, `area:ast-engine`, `priority:critical`, `size:large`
- Files: `services/api/src/services/ast-engine/parser.ts`, `validator.ts`

**Day 20 (Mar 1, Sun)** — AST Zustand Store + AI→AST Integration
- Create ast-store with immer middleware on frontend
- Wire generate endpoint: AI response → AST engine applies ops → serialize → update files
- AST store updates from generation results
- Verify: AI prompt → AST created server-side → frontend store reflects changes
- Labels: `phase:core`, `type:feature`, `area:ast-engine`, `area:frontend`, `priority:critical`, `size:large`
- Files: `apps/web/src/stores/ast-store.ts`

**Day 21 (Mar 2, Mon)** — Builder Mode: Component Tree
- Build ComponentTree organism (recursive tree view from AST)
- Click to select node, highlight selection
- Drag-and-drop reorder with @dnd-kit (ast:move)
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/features/builder/ComponentTree.tsx`

**Day 22 (Mar 3, Tue)** — Builder Mode: Property Inspector
- Build PropertyInspector: display selected node's props and styles
- Inline editing of string, number, color, boolean properties
- On edit → ast:update → preview refreshes immediately
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/features/builder/PropertyInspector.tsx`

**Day 23 (Mar 4, Wed)** — Builder Mode: Component Palette + Canvas
- Draggable component palette (View, Text, Image, Button, Input, ScrollView, etc.)
- Drag from palette → drop into component tree → creates new AST node (free, no credit)
- Basic canvas overlay: click component in preview → selects in tree
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/features/builder/ComponentPalette.tsx`, `CanvasOverlay.tsx`

**Day 24 (Mar 5, Thu)** — Code Editor: Monaco Setup
- Install @monaco-editor/react, configure in Code Editor panel
- File tabs with active indicator, dirty state
- Load file content from project-store
- Click file in FileExplorer → opens in Monaco tab
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/features/code-editor/CodeEditorPanel.tsx`

**Day 25 (Mar 6, Fri)** — Code Editor ↔ AST Bidirectional Sync
- On code save → parse to AST → diff → apply patches → update preview
- On AST change (from Builder/Agent) → update Monaco content
- Plan enforcement stub: read-only for free tier
- Labels: `phase:core`, `type:feature`, `area:frontend`, `area:ast-engine`, `priority:high`, `size:medium`

**Day 26 (Mar 7, Sat)** — Bidirectional Sync: Full Testing
- Test all sync paths: Agent→Builder→Preview, Builder→Code→Preview, Code→Builder→Preview
- Fix race conditions, stale state, conflicting updates
- Performance profiling (target: < 50ms for Builder edits)
- Labels: `phase:core`, `type:chore`, `area:frontend`, `priority:high`, `size:large`

**Day 27 (Mar 8, Sun)** — Project Templates + File Management
- Create base Expo project template (spec Section 13.1)
- Template initialization on project creation
- File CRUD API routes (spec Section 11.3)
- FileExplorer with recursive tree display
- Labels: `phase:core`, `type:feature`, `area:backend`, `area:frontend`, `priority:high`, `size:large`

**Day 28 (Mar 9, Mon)** — Sprint 2 Buffer
- Bug fixes across AST engine, Builder, Code Editor
- Write tests for AST CRUD operations
- **MILESTONE: M2 AST Engine + Builder Complete** ✅

---

**Sprint 3 (Week 5-6: Mar 10 – Mar 23) — "Multi-model AI + real-time sync"**

**Day 29 (Mar 10, Tue)** — AI Gateway: OpenAI Adapter
- Implement OpenAI adapter (GPT-4o / GPT-5)
- Streaming support, response normalization to unified format
- Labels: `phase:core`, `type:feature`, `area:ai-gateway`, `priority:high`, `size:medium`
- Files: `services/api/src/services/ai-gateway/adapters/openai.ts`

**Day 30 (Mar 11, Wed)** — AI Gateway: xAI + Google Adapters
- Implement xAI/Grok adapter
- Implement Google/Gemini adapter
- Labels: `phase:core`, `type:feature`, `area:ai-gateway`, `priority:high`, `size:medium`
- Files: `adapters/xai.ts`, `adapters/google.ts`

**Day 31 (Mar 12, Thu)** — AI Gateway: Fallback + Cost Tracking
- Fallback chain: if primary model fails, try next by priority
- Cost estimator (pre-flight token count)
- Token usage + cost logged per conversation message
- Model selector UI component (dropdown with model info, tags)
- Labels: `phase:core`, `type:feature`, `area:ai-gateway`, `area:frontend`, `priority:high`, `size:medium`
- Files: gateway updates + `apps/web/src/components/molecules/ModelSelector.tsx`

**Day 32 (Mar 13, Fri)** — Admin: Model Registry
- Admin routes for CRUD on ai_models table
- Seed all models: Claude, GPT-4o, Grok, Gemini, Mistral, DeepSeek
- API key encryption (AES-256-GCM, spec Section 18 of backend)
- Labels: `phase:core`, `type:feature`, `area:backend`, `priority:medium`, `size:medium`
- Files: `services/api/src/routes/v1/admin.routes.ts`, encryption service

**Day 33 (Mar 14, Sat)** — Socket.io: Server + AST Sync
- Set up Socket.io server (no JWT auth yet — add later)
- Room management (one room per project)
- ast:patch (client→server), ast:patched (server→clients), ast:snapshot on connect
- Labels: `phase:core`, `type:feature`, `area:backend`, `priority:high`, `size:large`
- Files: `services/api/src/socket/index.ts`, `handlers/ast-sync.ts`

**Day 34 (Mar 15, Sun)** — Socket.io: Frontend Client + Multi-Tab
- Create socket client with auto-reconnect
- Wire ast-store to emit patches via socket on local changes
- Listen for remote patches, apply to local store
- Test multi-tab: edit in one tab → other tab updates
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:high`, `size:large`
- Files: `apps/web/src/lib/socket-client.ts`

**Day 35 (Mar 16, Mon)** — Socket.io: Generation Events
- generate:start, generate:stream, generate:complete, generate:error events
- preview:reload on file changes via socket
- Show generation progress indicator in chat
- Labels: `phase:core`, `type:feature`, `area:backend`, `area:frontend`, `priority:high`, `size:medium`

**Day 36 (Mar 17, Tue)** — BullMQ: Queue Setup
- Set up BullMQ queues: generation, deploy, export, cleanup (spec Section 13 of backend)
- Move AI generation to a BullMQ job (offload from request handler)
- Job progress → socket events
- Labels: `phase:core`, `type:infra`, `area:backend`, `priority:medium`, `size:medium`
- Files: `services/api/src/jobs/queue.ts`, `processors/generate.processor.ts`

**Day 37 (Mar 18, Wed)** — Generate Pipeline: Full 7-Stage
- Wire complete pipeline (spec Section 12.2): Validate → Context → Route → Stream → AST → Serialize → Finalize
- Conversation history loaded and sent with each prompt
- Conversation list in chat panel (load on workspace mount)
- Labels: `phase:core`, `type:feature`, `area:ai-gateway`, `area:backend`, `priority:high`, `size:medium`

**Day 38 (Mar 19, Thu)** — Preview Polish
- Device frame mockup (iPhone 15, Pixel 8 dimensions)
- Platform selector (iOS / Android / Web) in preview panel
- Snack bundler error overlay with file/line info
- NativeFeatureWarning badge for dev-build-only features
- Snack session pause/resume lifecycle (30 min inactivity timeout)
- AST→Snack file sync latency measurement and optimization (target: < 2s)
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:medium`, `size:medium`

**Day 39 (Mar 20, Fri)** — Preview: Advanced Features
- Expo Go connection status indicator (connected/disconnected/loading)
- Multiple device connection support via Snack session
- Console log forwarding from Snack to browser DevTools panel
- Deep link testing integration with Expo Go
- Labels: `phase:core`, `type:feature`, `area:frontend`, `priority:low`, `size:small`
- Files: `apps/web/src/features/preview/components/ConnectionStatus.tsx`, `hooks/useSnackLogs.ts`

**Day 40 (Mar 21, Sat)** — Integration Testing + Performance
- Full end-to-end test with all AI models
- Test: Agent→AST→Builder→Code→Preview sync with each model
- Performance profiling: API P95, AST sync latency, preview reload
- Fix all critical bugs
- Labels: `phase:core`, `type:chore`, `priority:high`, `size:large`

**Day 41 (Mar 22, Sun)** — Sprint 3 Buffer
- Bug fixes, refactoring
- Write tests for socket events and AI adapters

**Day 42 (Mar 23, Mon)** — Sprint 3 Wrap
- **MILESTONE: M3 Multi-Model + Real-Time Complete** ✅

---

### MONTH 2: INTEGRATION — AUTH, BILLING, BACKEND HUB

**Sprint 4 (Week 7-8: Mar 24 – Apr 6) — "Auth + user system"**

**Day 43 (Mar 24, Tue)** — Supabase Auth: Client Setup
- Install @supabase/ssr for Next.js
- Create browser client and server client
- Next.js middleware for token refresh (spec Section 10.1)
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/lib/supabase/`, `apps/web/src/middleware.ts`

**Day 44 (Mar 25, Wed)** — Supabase Auth: Express JWT Middleware
- JWT verification middleware (verify Supabase JWT, extract user_id, plan, email)
- Apply auth middleware to all existing routes (projects, generate, files)
- User creation trigger: auth.users insert → public.users record
- Labels: `phase:integration`, `type:feature`, `area:backend`, `priority:high`, `size:medium`
- Files: `services/api/src/middleware/auth.ts`

**Day 45 (Mar 26, Thu)** — Auth Pages: Login + Register
- Login page (email/password + Google OAuth + GitHub OAuth)
- Register page, forgot password page
- Wire to Supabase Auth
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/app/(auth)/`

**Day 46 (Mar 27, Fri)** — Auth: Zustand Store + Protected Routes
- Create auth-store with Supabase session listener
- Auth guard for protected routes (dashboard, workspace)
- Test full flow: register → login → dashboard → workspace → logout
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`
- Files: `apps/web/src/stores/auth-store.ts`

**Day 47 (Mar 28, Sat)** — Auth: Socket.io + Rate Limiting
- Socket.io JWT auth on handshake
- Redis-backed rate limiting: 100 req/min general, 20 req/min /generate, 5 req/min /auth
- CORS configuration for Vercel domains
- Labels: `phase:integration`, `type:feature`, `area:backend`, `priority:high`, `size:large`
- Files: `services/api/src/middleware/rate-limit.ts`

**Day 48 (Mar 29, Sun)** — User Profile + Dashboard Polish
- User profile page (display name, avatar, email)
- Dashboard: project cards with last modified, archive, search/filter
- Loading skeletons, empty states
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `priority:medium`, `size:large`

**Day 49 (Mar 30, Mon)** — Error Handling + Validation Hardening
- Global error handler with Sentry stub
- Zod validation on ALL routes (audit and add missing)
- Consistent error envelope: { data, error, meta }
- Labels: `phase:integration`, `type:chore`, `area:backend`, `priority:high`, `size:medium`

**Day 50 (Mar 31, Tue)** — Credit System: Backend
- Atomic credit reservation SQL (spec Section 15 of backend)
- Credits middleware: check → reserve → refund on failure
- billing_events logging
- Labels: `phase:integration`, `type:feature`, `area:billing`, `priority:high`, `size:medium`
- Files: `services/api/src/middleware/credits.ts`, `services/api/src/services/billing-engine.ts`

**Day 51 (Apr 1, Wed)** — Stripe: Products + Subscription API
- Stripe products/prices: Free, Starter ($15), Pro ($45), Team ($99)
- Billing routes: POST /subscribe, POST /cancel, POST /change-plan, GET /billing
- Labels: `phase:integration`, `type:feature`, `area:billing`, `priority:high`, `size:medium`
- Files: `services/api/src/routes/v1/billing.routes.ts`

**Day 52 (Apr 2, Thu)** — Stripe: Webhook Handler
- POST /billing/webhook with signature verification
- Handle: subscription.created/updated/deleted, invoice.paid/payment_failed
- Update user plan + credits
- Labels: `phase:integration`, `type:feature`, `area:billing`, `priority:high`, `size:medium`

**Day 53 (Apr 3, Fri)** — Billing: Frontend
- Pricing page with plan comparison
- Billing dashboard: plan, credits, usage history
- Upgrade/downgrade via Stripe Checkout
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `area:billing`, `priority:high`, `size:medium`

**Day 54 (Apr 4, Sat)** — Plan Enforcement
- Enforce limits per authorization matrix (spec Section 10.2)
- CreditBadge in workspace, upgrade prompts on limits
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `area:backend`, `priority:high`, `size:large`

**Day 55 (Apr 5, Sun)** — Sprint 4 Buffer
- Bug fixes across auth + billing, Stripe webhook testing

**Day 56 (Apr 6, Mon)** — Sprint 4 Wrap
- **MILESTONE: M4 Auth + User System Complete** ✅

---

**Sprint 5 (Week 9-10: Apr 7 – Apr 20) — "Backend Hub + hardening"**

**Day 57 (Apr 7, Tue)** — Backend Hub: Architecture + Supabase Adapter
- Adapter interface, hub router, connection config encryption
- Supabase adapter: connect, discoverSchema, testConnection
- Labels: `phase:integration`, `type:feature`, `area:backend`, `priority:high`, `size:medium`
- Files: `services/api/src/services/backend-hub/`

**Day 58 (Apr 8, Wed)** — Backend Hub: API Routes + Frontend
- Routes: POST /connect, GET /schema, POST /test, DELETE /disconnect
- Backend settings UI, display discovered schema
- Labels: `phase:integration`, `type:feature`, `area:backend`, `area:frontend`, `priority:high`, `size:medium`

**Day 59 (Apr 9, Thu)** — Backend-Aware AI Generation
- Prompt builder Layer 5: inject backend schema
- Test: connect Supabase → prompt → AI generates correct query code
- Labels: `phase:integration`, `type:feature`, `area:ai-gateway`, `priority:high`, `size:medium`

**Day 60 (Apr 10, Fri)** — Project Settings Page
- Settings: name, description, framework version, default model, backend connection
- Labels: `phase:integration`, `type:feature`, `area:frontend`, `priority:medium`, `size:medium`

**Day 61 (Apr 11, Sat)** — Security Hardening
- AES-256-GCM encryption for all API keys and backend configs
- Helmet, CORS tightening, input validation audit
- Labels: `phase:integration`, `type:chore`, `area:backend`, `priority:high`, `size:large`

**Day 62 (Apr 12, Sun)** — Paystack Integration
- Paystack adapter for African payments
- Payment method selection based on user location
- Labels: `phase:integration`, `type:feature`, `area:billing`, `priority:medium`, `size:medium`

**Day 63 (Apr 13, Mon)** — Sprint 5 Buffer
- **MILESTONE: M5 Billing + Backend Hub Complete** ✅

---

### MONTH 3: LAUNCH PREPARATION

**Sprint 6 (Week 11-12: Apr 14 – Apr 27) — "Ship it"**

**Day 64 (Apr 14, Tue)** — CI/CD: GitHub Actions
- Type check, lint, test on PR. Auto-deploy frontend to Vercel.
- Labels: `phase:launch`, `type:infra`, `area:infra`, `priority:high`, `size:medium`
- Files: `.github/workflows/ci.yml`

**Day 65 (Apr 15, Wed)** — Docker + Railway Deploy
- Multi-stage Dockerfile, PM2 config, Railway service setup
- Deploy workflow: Docker build → Railway rolling deploy
- Labels: `phase:launch`, `type:infra`, `area:infra`, `priority:high`, `size:medium`
- Files: `Dockerfile`, `ecosystem.config.js`, `.github/workflows/deploy.yml`

**Day 66 (Apr 16, Thu)** — Staging Environment
- Full staging deploy (Vercel + Railway + Supabase staging)
- End-to-end verification
- Labels: `phase:launch`, `type:infra`, `priority:high`, `size:medium`

**Day 67 (Apr 17, Fri)** — Monitoring: Sentry + Axiom + Betterstack
- Sentry SDK (frontend source maps + backend), Axiom logs, Betterstack uptime
- Alerts for error spikes
- Labels: `phase:launch`, `type:infra`, `priority:high`, `size:medium`

**Day 68 (Apr 18, Sat)** — BullMQ: Deploy + Export Jobs
- Deploy processor (EAS build trigger), GitHub export, scheduled cleanup
- Deploy route + UI
- Labels: `phase:launch`, `type:feature`, `area:backend`, `priority:medium`, `size:large`

**Day 69 (Apr 19, Sun)** — Landing Page
- Hero, features, how-it-works, CTA. SSR, responsive.
- Labels: `phase:launch`, `type:feature`, `area:frontend`, `priority:high`, `size:large`

**Day 70 (Apr 20, Mon)** — Pricing Page + Docs + SEO
- Pricing with plan comparison, docs stub, meta tags, sitemap
- Labels: `phase:launch`, `type:feature`, `area:frontend`, `priority:high`, `size:medium`

**Day 71 (Apr 21, Tue)** — Onboarding Flow
- First-time wizard, template selection, guided first prompt
- Labels: `phase:launch`, `type:feature`, `area:frontend`, `priority:medium`, `size:medium`

**Day 72 (Apr 22, Wed)** — UI Polish Pass 1
- Loading/error/empty states, toast notifications, consistent styling
- Labels: `phase:launch`, `type:chore`, `area:frontend`, `priority:medium`, `size:large`

**Day 73 (Apr 23, Thu)** — UI Polish Pass 2
- Accessibility audit, responsive audit, keyboard shortcuts
- Labels: `phase:launch`, `type:chore`, `area:frontend`, `priority:medium`, `size:medium`

**Day 74 (Apr 24, Fri)** — Performance Optimization
- Lighthouse 90+, bundle splitting, lazy load Monaco/Snack SDK (~45KB gzipped), API P95 < 200ms
- Labels: `phase:launch`, `type:chore`, `priority:medium`, `size:medium`

**Day 75 (Apr 25, Sat)** — Security Final Pass
- OWASP checklist, rate limit verification, RLS audit, pen test basics
- Labels: `phase:launch`, `type:chore`, `area:backend`, `priority:high`, `size:large`

**Day 76 (Apr 26, Sun)** — Documentation
- README, API docs (Postman/OpenAPI), env var docs, ADRs
- Labels: `phase:launch`, `type:docs`, `priority:medium`, `size:large`

**Day 77 (Apr 27, Mon)** — Sprint 6 Wrap
- **MILESTONE: M7 Marketing + Launch Complete** ✅

---

**Sprint 7 (Week 13-14: Apr 28 – May 11) — "Harden + launch"**

**Day 78 (Apr 28, Tue)** — Production Deployment
- Deploy to prod (Vercel + Railway + Supabase prod), Cloudflare DNS/SSL, Stripe live mode

**Day 79 (Apr 29, Wed)** — Production Verification
- Full E2E in prod, monitor Sentry/Axiom/Betterstack, fix prod-only issues

**Day 80 (Apr 30, Thu)** — Beta Setup
- Feature flag for beta access, invite code system, feedback mechanism

**Day 81-84 (May 1-4)** — Beta Bug Fixes (1 issue per day)
- Day 81: Bug fixes from early beta feedback
- Day 82: Bug fixes continued
- Day 83: Performance tuning from real usage
- Day 84: UX improvements from feedback

**Day 85-88 (May 5-8)** — Polish (1 issue per day)
- Day 85: AI prompt quality tuning based on real prompts
- Day 86: Edge case handling across all flows
- Day 87: Mobile web responsive polish
- Day 88: Final UX pass

**Day 89 (May 9, Sat)** — Launch Checklist
- Analytics (Vercel Analytics or Plausible), legal (ToS, privacy policy), social media assets

**Day 90 (May 10, Sun)** — Soft Launch
- Open to first cohort of users
- **MILESTONE: M8 Soft Launch** ✅

---

## Notes for Cowork

- All file paths reference the monorepo structure in the attached specs
- Frontend spec has: component hierarchy, Zustand stores, workspace layout, atomic design structure
- Backend spec has: Express structure, database schema (7 tables), AI gateway adapters (6 providers), API contracts, Socket.io events, BullMQ queues
- Reference specific spec sections in issue bodies for implementation details
- Mark milestone days (14, 28, 42, 56, 63, 77, 90) clearly in issue bodies
- Add all 90 issues to the GitHub Project with Sprint, Phase, Day Number, and Estimated Hours fields populated
- Set Sprint 1 issues to "This Sprint" column, rest to "Backlog"
