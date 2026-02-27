# Backend Performance Optimization PRD — Redis Caching & Query Reduction

**Status:** Draft
**Date:** 2026-02-27
**Priority:** High

---

## 1. Problem Statement

The Raygan API backend has **zero caching** on its hottest code paths. Every authenticated request makes an external Supabase HTTP call plus a database query with a JOIN — before any business logic runs. A single AI generation request performs **5–7 database reads** plus the Supabase call before streaming even begins.

The existing `CacheService` (Redis via ioredis) is well-built with graceful degradation, `getOrSet` patterns, and invalidation helpers — but only project files and settings use it today. AI model lookups, auth middleware, project access checks, and conversation history all bypass the cache entirely.

### Current DB Read Costs (Per Request)

| Endpoint | DB Reads | External Calls | Notes |
|----------|----------|----------------|-------|
| Any authenticated request | 1 | 1 Supabase `getUser` | Auth middleware, no caching |
| `POST /generate` (standard) | 5–7 | 1 Supabase | Project + access check + model resolution + conversation history |
| `POST /generate` (agent mode) | 5–7 + N tool calls | 1 Supabase | Same base + repeated file reads per tool call |
| `GET /models` | 1 | 0 | `getAllEnabledModels()` uncached |
| Bulk file persist (10 files) | ~30 | 0 | N+1 pattern in `bulkCreateOrUpdate` |
| `GET /settings?category=X` | 1 | 0 | `findByCategory` uncached |

---

## 2. Goals

1. **Reduce generation latency** — Cut pre-streaming DB reads from 5–7 down to 0–1 on warm cache
2. **Reduce per-request overhead** — Eliminate the Supabase + DB roundtrip from every authenticated request via auth caching
3. **Reduce write amplification** — Fix N+1 bulk file operations and eliminate redundant cache invalidations
4. **Use existing infrastructure** — Build on top of the existing `CacheService`, `CACHE_KEYS`, and `CACHE_TTL` patterns

### Non-Goals

- Introducing a new caching library or pattern (we already have a good one)
- Caching at the HTTP layer (CDN/reverse proxy)
- Database query optimization (indexes, query plans) — current indexes are well-designed
- Replacing Supabase Auth

---

## 3. Technical Audit Summary

### 3.1 Auth Middleware (`middleware/auth.ts`)

Every `authenticate()` call executes:
1. `supabase.auth.getUser(token)` — External HTTP to Supabase (~50–200ms)
2. `User.findOne({ where: { auth_user_id }, relations: ["current_organization"] })` — DB query with JOIN (~5–20ms)

**Neither is cached.** For a user making 50 requests in a session, that is 50 Supabase calls and 50 DB queries just for auth.

### 3.2 AI Model Lookups (`services/ai-provider.service.ts`)

The model resolution chain in `GenerationService.generate()` makes up to 3 sequential uncached DB queries:
1. `getModelByPrimaryId(modelId)` or `getModelById(modelId)` — 1 DB read with provider relation
2. Fallback: `getModelByPrimaryId(project.default_model_id)` — 1 DB read
3. Fallback: `getDefaultModel()` — 1 DB read

AI models change approximately once a month. The `CACHE_TTL.AI_MODELS = 3600` constant exists in `cache.ts` but is **never referenced** by any service.

### 3.3 Generation Pipeline Redundancies (`services/generation.service.ts`)

The `generate()` method has structural inefficiencies:
- **Line 138:** `findByUuid(projectId)` fetches the project — 1 DB read
- **Line 144:** `checkAccess(userId, project.id)` calls `findById(projectId)` internally (re-fetching the same project) + membership query — 2 more DB reads
- **Line 520:** `getConversationHistory()` fetches last 10 conversations (2 queries: items + count) — uncached
- **Line 539:** `getExistingFiles()` already cached via `FileStorageService` — good

**Total redundancy:** The project is fetched twice, and conversation history has no caching.

### 3.4 Project Access Checks (`services/project.service.ts`)

`checkAccess(userId, projectId)` at line 118:
- Re-fetches the project by internal ID (even when the caller already has it)
- Queries `OrganizationMember` table for membership — uncached
- Called by generation, file operations, conversation operations

### 3.5 Bulk File Operations (`services/file-storage.service.ts`)

`bulkCreateOrUpdate()` at line 205 loops through files calling `createOrUpdate()` individually:
- Each iteration: `findByPath` (1 read) + `create` or `update` (1–3 reads/writes)
- Each `create`/`update` triggers individual cache invalidation
- Final line also calls `invalidateProjectFiles` — redundant with per-file invalidations
- **10 files = ~30 DB operations + 11 cache invalidations**

### 3.6 Agent Tool Execution (`services/ai-gateway/tool-executor.ts`)

Within a single agent turn:
- `listFiles()` (line 67) calls `findByProjectId()` — full file list
- `searchCode()` (line 107) calls `findByProjectId()` again — same data
- Both go through Redis cache (60s TTL), but it's still 2 unnecessary network round-trips

### 3.7 Uncached Settings (`services/settings.service.ts`)

`getByCategory()` has no caching despite other settings methods (`getBySlug`, `getPublicSettings`) being cached at 300–600s TTL.

---

## 4. Implementation Plan

### Phase 1: Auth Middleware Caching

**Files:**
- `services/api/src/lib/cache.ts`
- `services/api/src/middleware/auth.ts`
- `services/api/src/services/user.service.ts`

**Changes:**

1. Add to `CACHE_TTL`:
   - `AUTH_USER: 300` — Supabase token validation (5 min)
   - `DB_USER: 600` — DB user + current_organization (10 min)

2. Add to `CACHE_KEYS`:
   - `auth.supabaseUser(tokenHash: string)` → `auth:supabase:{tokenHash}`
   - `auth.dbUser(authUserId: string)` → `auth:dbuser:{authUserId}`

3. Add `invalidateAuthUser(authUserId: string)` helper to `CacheService`

4. In `authenticate()` and `optionalAuth()`:
   - Hash bearer token (SHA-256, first 16 chars) as cache key
   - Check Redis for cached Supabase user identity before calling `supabase.auth.getUser()`
   - On cache miss: call Supabase, cache result `{ id, email }` for 300s
   - Check Redis for cached DB user before calling `User.findOne()`
   - On cache miss: query DB, cache result for 600s

5. In `UserService` — invalidate `auth:dbuser:{authUserId}` after:
   - `update()` — profile changes
   - Organization switching — current_organization changes
   - `delete()` — account deactivation

**Invalidation strategy:** Token cache (5 min) self-expires. DB user cache invalidated on profile/org mutations. Worst-case stale window: 5 minutes for revoked tokens, 10 minutes for profile changes.

**Expected impact:** Eliminates 1 external HTTP call + 1 DB query from every authenticated request.

---

### Phase 2: AI Model Caching

**Files:**
- `services/api/src/lib/cache.ts`
- `services/api/src/services/ai-provider.service.ts`

**Changes:**

1. Add to `CACHE_KEYS.aiModels`:
   - `byModelId(modelId: string)` → `ai:models:mid:{modelId}`
   - `byPrimaryId(id: number)` → `ai:models:pid:{id}`
   - `default()` → `ai:models:default`

2. Wrap all read methods with `CacheService.getOrSet(..., CACHE_TTL.AI_MODELS)`:
   - `getModelById()` — 3600s cache
   - `getModelByPrimaryId()` — 3600s cache
   - `getDefaultModel()` — 3600s cache
   - `getAllEnabledModels()` — 3600s cache

3. Update `CacheService.invalidateAIModels()` to clear new key patterns (`ai:models:mid:*`, `ai:models:pid:*`, `ai:models:default`)

**Invalidation strategy:** Called from any admin endpoint that modifies AI models/providers. Self-expires after 1 hour.

**Expected impact:** Eliminates 1–3 DB reads per generation. Model queries happen once per hour.

---

### Phase 3: Generation Pipeline Fixes

**Files:**
- `services/api/src/services/project.service.ts`
- `services/api/src/services/generation.service.ts`
- `services/api/src/services/conversation.service.ts`
- `services/api/src/lib/cache.ts`

**Changes:**

1. Add to `CACHE_TTL`:
   - `PROJECT_ACCESS: 300` — org membership checks (5 min)
   - `CONVERSATION_HISTORY: 30` — recent conversations (30s, short due to frequent mutations)

2. Add to `CACHE_KEYS`:
   - `project.byUuid(uuid: string)` → `project:uuid:{uuid}`
   - `project.access(userId: number, projectId: number)` → `project:{projectId}:access:{userId}`
   - `conversation.history(projectId: number)` → `conversation:history:{projectId}`

3. **New method in `ProjectService`:** `checkAccessWithProject(userId, project)` — accepts an already-fetched project, eliminating the redundant `findById` call inside `checkAccess`

4. **Cache `findByUuid()`** — wrap with `CacheService.getOrSet` at 60s TTL. Invalidate on project update/delete.

5. **Cache membership query** in `checkAccessWithProject()` — cache role string at 300s TTL

6. **Cache conversation history** — wrap `getConversationHistory()` in `GenerationService` with `CacheService.getOrSet` at 30s TTL

7. **Update `GenerationService.generate()`:**
   - Line 144: use `checkAccessWithProject(userId, project)` instead of `checkAccess(userId, project.id)`
   - Invalidate conversation cache after `markCompleted`

8. **Update `ConversationService`** — invalidate conversation history cache in `create()` and `createAssistantMessage()`

**Invalidation strategy:**
- Project UUID cache: invalidated on any project mutation
- Access cache: invalidated on membership changes (deletePattern `project:*:access:{userId}`)
- Conversation cache: invalidated on conversation create/complete, self-expires 30s

**Expected impact:** Eliminates 3–5 DB reads per generation. Hot path goes from 5–7 reads to 0–1.

---

### Phase 4: Structural Optimizations

**Files:**
- `services/api/src/services/file-storage.service.ts`
- `services/api/src/services/settings.service.ts`
- `services/api/src/services/ai-gateway/tool-executor.ts`
- `services/api/src/lib/cache.ts`

#### 4A. Batch File Operations

Rewrite `bulkCreateOrUpdate()` in `FileStorageService`:
- Fetch all existing files once via `findByProjectId()` (cached)
- Build a `Map<path, ProjectFile>` lookup
- Skip unchanged files via content hash comparison (no DB write at all)
- Remove per-file cache invalidation from the inner loop
- Single `invalidateProjectFiles()` call at the end

**Before:** 10 files → ~30 DB ops + 11 cache invalidations
**After:** 10 files → 1 cached read + ≤10 writes + 1 cache invalidation

#### 4B. Cache Settings by Category

Add `CACHE_KEYS.settings.byCategory(category, orgId?)` and wrap `getByCategory()` with `CacheService.getOrSet` at 300s TTL. Update `invalidateSettings()` to clear `settings:cat:*` pattern.

#### 4C. In-Memory Tool Executor Deduplication

Add a `Map<number, ProjectFile[]>` to `ToolExecutor` class as a per-request file cache:
- `listFiles()` and `searchCode()` use a shared `getProjectFiles()` helper
- The Map is scoped to the ToolExecutor instance lifetime (one per agent loop run)
- Eliminates redundant Redis round-trips within the same agent turn

---

## 5. Cache TTL Reference

| Cache Target | TTL | Key Pattern | Invalidation |
|-------------|-----|-------------|--------------|
| Supabase token identity | 300s | `auth:supabase:{tokenHash}` | Self-expiry |
| DB user + current org | 600s | `auth:dbuser:{authUserId}` | On profile/org mutation |
| AI models (all lookups) | 3600s | `ai:models:mid:*`, `ai:models:pid:*`, `ai:models:default` | On model admin changes |
| Project by UUID | 60s | `project:uuid:{uuid}` | On project mutation |
| Project access (membership) | 300s | `project:{id}:access:{userId}` | On membership change |
| Conversation history | 30s | `conversation:history:{projectId}` | On conversation create/complete |
| Settings by category | 300s | `settings:cat:{category}[:org:{orgId}]` | Via existing `invalidateSettings()` |

---

## 6. Expected Results

### Per-Request Improvement

| Scenario | DB Reads Before | DB Reads After | External Calls Before | External Calls After |
|----------|----------------|----------------|----------------------|---------------------|
| Any authenticated request | 1 | 0 | 1 Supabase | 0 |
| Generation (standard) | 5–7 | 0–1 | 1 Supabase | 0 |
| Generation (agent mode) | 5–7 + N | 0–1 + 0 | 1 Supabase | 0 |
| List models | 1 | 0 | 0 | 0 |
| Bulk file persist (10 files) | ~30 | ~10 | 0 | 0 |
| Settings by category | 1 | 0 | 0 | 0 |

### Latency Savings Estimate

- Auth middleware: **~50–200ms saved** per request (Supabase HTTP eliminated)
- Model resolution: **~15–60ms saved** per generation (1–3 DB queries eliminated)
- Generation pre-streaming: **~30–100ms saved** (project re-fetch + access check + conversation history eliminated)
- Bulk files: **~50–150ms saved** per generation with file output (N+1 eliminated)

---

## 7. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale auth after token revocation | Medium | 300s TTL limits window. Reduce to 60s if stricter security needed. |
| Stale membership after user removed from org | Low | 300s TTL + invalidation on membership change |
| TypeORM entity serialization issues | Low | Already proven safe — `FileStorageService` caches entities today |
| Redis unavailability | None | `CacheService` already gracefully degrades to direct DB queries |
| Cache key collisions | None | All keys namespaced (`auth:`, `project:`, `ai:models:`, etc.) |

---

## 8. Files Changed (Complete List)

| File | Phase | Change Type |
|------|-------|-------------|
| `services/api/src/lib/cache.ts` | 1, 2, 3, 4 | Add CACHE_KEYS, CACHE_TTL, invalidation helpers |
| `services/api/src/middleware/auth.ts` | 1 | Cache Supabase + DB user lookups |
| `services/api/src/services/user.service.ts` | 1 | Add cache invalidation on mutations |
| `services/api/src/services/ai-provider.service.ts` | 2 | Wrap all reads with getOrSet |
| `services/api/src/services/project.service.ts` | 3 | Add checkAccessWithProject, cache findByUuid + access |
| `services/api/src/services/generation.service.ts` | 3 | Use new access check, cache conversation history |
| `services/api/src/services/conversation.service.ts` | 3 | Add cache invalidation on create |
| `services/api/src/services/file-storage.service.ts` | 4 | Rewrite bulkCreateOrUpdate |
| `services/api/src/services/settings.service.ts` | 4 | Cache getByCategory |
| `services/api/src/services/ai-gateway/tool-executor.ts` | 4 | Add per-request file list Map |

---

## 9. Verification Plan

1. **Auth caching:** Make 10 rapid API calls with the same token → confirm Redis hits via debug logs, verify Supabase is called only once
2. **Model caching:** Call `/generate` twice → second call should show 0 model DB queries in TypeORM logs
3. **Generation pipeline:** Enable `logging: true` in TypeORM config, run a generation → count DB queries, expect 0–1 reads on warm cache
4. **Bulk files:** Generate code producing 5+ files → confirm single `findByProjectId` cache hit, no per-file invalidation log spam
5. **Settings:** Call settings-by-category endpoint twice → confirm cache hit on second request
6. **Invalidation correctness:**
   - Update user profile → next request should re-fetch from DB
   - Switch organization → next request should reflect new org
   - Modify AI model via admin → model cache should clear
   - Add/remove org member → project access cache should clear
