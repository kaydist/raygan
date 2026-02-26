# PRD: Build & Publish to App Stores

## Overview

**Problem:** Users can generate full Expo React Native apps via AI prompts, but have no way to compile or publish them without manually downloading a ZIP, installing EAS CLI locally, and running builds themselves. This breaks the "prompt to production" promise.

**Solution:** Integrate Expo Application Services (EAS Build + EAS Submit) directly into the platform so users can compile APK/IPA binaries and submit them to the Apple App Store and Google Play Store — all from within Raygan.

---

## Problem Statement

### Current Behavior
1. User generates a React Native (Expo) app via Agent Mode
2. User can preview via Expo Snack (browser + device QR)
3. User can export project as ZIP
4. **No path to a compiled binary or store listing** — user must set up local dev tools, install EAS CLI, configure signing credentials, and run builds manually

### User Impact
- Technical barrier: most no-code users cannot set up Xcode, Android Studio, or EAS CLI
- Broken value proposition: "build an app with AI" stops at code generation, not a real app
- Users leave the platform to complete the last mile (build + publish)
- Competitive disadvantage vs platforms that offer one-click deploy

---

## Goals

| Goal | Metric |
|------|--------|
| One-click build | User triggers build from UI, receives APK/IPA without leaving Raygan |
| Store submission | User submits built app to App Store / Google Play from within Raygan |
| Real-time feedback | Build status updates in < 5 seconds via WebSocket |
| Credential flexibility | Supports both Raygan-managed and user-provided signing credentials |
| Plan enforcement | Build/publish gated to Pro+ ($45/mo), free users see upgrade prompt |

---

## User Stories

1. **As a Pro user**, when I click "Build APK/IPA" in the Deploy menu, I can select Android or iOS, choose a build profile (preview/production), and trigger a cloud build that produces a downloadable binary.

2. **As a Pro user**, after my build succeeds, I can click "Submit to Store" to push the binary to the Apple App Store or Google Play Store directly.

3. **As a Free/Starter user**, when I try to build, I see a clear upgrade prompt explaining that builds require Pro+ plan.

4. **As a Team user**, I can upload my own Apple Developer and Google Play signing credentials so apps are published under my own developer account.

5. **As a user**, I can see my build history with status, platform, duration, and download links for each build.

6. **As a user**, I receive real-time build status updates (queued → building → finished/errored) without refreshing the page.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build infrastructure | EAS Cloud (Expo's service) | No need to maintain macOS CI runners for iOS builds. Pay-per-build. EAS handles signing, provisioning, and compilation |
| Credential model | Raygan-managed (default) + user-provided (optional) | Low friction for quick builds via Raygan's account; full control for teams with their own developer accounts |
| Plan gating | Pro+ only | Builds have real cost (EAS charges per build). Free/Starter get ZIP export |
| API approach | EAS REST API (not CLI) | Programmatic control from Express backend, no shell exec dependency |
| Status updates | EAS Webhooks + Socket.io | Real-time push to frontend; polling fallback for missed webhooks |
| Job processing | BullMQ async queue | Builds take 5-30 min; can't block HTTP request |

---

## Architecture

### System Flow

```
┌──────────────┐     POST /builds      ┌──────────────────┐
│   Frontend   │ ──────────────────────▶│   Build Controller│
│  (Build Modal│                        │   + Plan Gate     │
│   Component) │                        └────────┬─────────┘
└──────┬───────┘                                 │
       │                                         │ Creates Build record
       │                                         │ Enqueues BullMQ job
       │                                         ▼
       │                                ┌──────────────────┐
       │                                │   BullMQ Worker   │
       │                                │                   │
       │                                │ 1. ExportService  │
       │                                │    .generateFiles │
       │                                │ 2. Inject build   │
       │                                │    config         │
       │                                │ 3. Create archive │
       │                                │ 4. Upload to EAS  │
       │                                │ 5. Trigger build  │
       │                                └────────┬─────────┘
       │                                         │
       │                                         ▼
       │                                ┌──────────────────┐
       │                                │   EAS Cloud       │
       │                                │   (Expo servers)  │
       │                                │                   │
       │                                │  Compiles app     │
       │                                │  5-30 minutes     │
       │                                └────────┬─────────┘
       │                                         │
       │    Socket.io "build:status"             │ Webhook POST
       │◀────────────────────────────┐           │ /webhooks/eas-build
       │                             │           ▼
       │                    ┌────────┴──────────────────┐
       │                    │   Webhook Handler          │
       │                    │                            │
       │                    │ 1. Verify HMAC signature   │
       │                    │ 2. Update Build record     │
       │                    │ 3. Emit Socket.io event    │
       │                    └───────────────────────────┘
```

### EAS Project Mapping

Raygan owns a single Expo organization account with a robot token. Each Raygan project lazily maps to an EAS project:

```
Raygan Project "My Todo App" (slug: my-todo-app)
    ↓ first build
EAS Project @raygan/my-todo-app (eas_project_id: abc-123)
    ↓ mapping stored in
project.settings.eas = {
  eas_project_id: "abc-123",
  eas_project_slug: "my-todo-app",
  android_package: "com.raygan.mytodoapp",
  ios_bundle_identifier: "com.raygan.mytodoapp",
  app_version: "1.0.0",
  build_number: 1,
  credential_source: "raygan"
}
```

Users on Team plan can optionally link their own Expo account by providing their own robot token.

### Key Reuse

The existing `ExportService.generateProjectFiles()` already produces a complete `Map<string, string>` of all Expo project files (AST serialization + stored files). The build pipeline wraps this output in a tarball and uploads it to EAS — no duplication of file generation logic.

---

## Technical Design

### 1. Database Schema

#### `builds` table

Extends `BaseEntity` (id, uuid, meta, created_on, created_by, updated_on, updated_by, deleted_flag, deleted_on, deleted_by).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| project_id | integer | FK → projects.id, NOT NULL | Parent project |
| platform | varchar(10) | NOT NULL | `"android"` or `"ios"` |
| status | varchar(20) | NOT NULL, DEFAULT `"queued"` | `"queued"` \| `"in_progress"` \| `"finished"` \| `"errored"` \| `"cancelled"` |
| profile | varchar(20) | NOT NULL, DEFAULT `"preview"` | `"development"` \| `"preview"` \| `"production"` |
| eas_build_id | varchar(255) | UNIQUE, nullable | EAS-assigned build UUID |
| eas_project_id | varchar(255) | nullable | EAS project UUID |
| artifact_url | text | nullable | Download URL for APK/IPA |
| logs_url | text | nullable | EAS build logs URL |
| app_version | varchar(20) | nullable | Semantic version (e.g. `"1.0.0"`) |
| build_number | varchar(20) | nullable | Auto-incrementing build counter |
| duration_seconds | integer | nullable | Build duration |
| error_message | text | nullable | Error details on failure |
| started_at | timestamptz | nullable | When EAS started building |
| completed_at | timestamptz | nullable | When EAS finished |
| triggered_by | integer | FK → users.id, NOT NULL | User who triggered the build |

**Indexes:** `project_id`, `eas_build_id` (unique), `status`, `(project_id, status)`

#### `store_submissions` table (Phase 2)

| Column | Type | Description |
|--------|------|-------------|
| build_id | integer FK | Which build artifact to submit |
| project_id | integer FK | Parent project |
| store | varchar(10) | `"apple"` or `"google"` |
| status | varchar(20) | `"queued"` \| `"in_progress"` \| `"submitted"` \| `"errored"` |
| eas_submission_id | varchar(255) | EAS submission UUID |
| error_message | text | Error details |
| store_config | jsonb | Store-specific config (track, apple_id, etc.) |
| triggered_by | integer FK | User ID |

#### `store_credentials` table (Phase 2)

| Column | Type | Description |
|--------|------|-------------|
| organization_id | integer FK | Credentials scoped to organization |
| credential_type | varchar(50) | `"apple_api_key"` \| `"google_service_account"` \| `"expo_token"` |
| name | varchar(255) | User-facing label |
| encrypted_value | text | AES-256-GCM encrypted via existing `encryptKey()` helper |
| credential_meta | jsonb | Key ID, issuer ID for Apple; project ID for Google |
| is_active | boolean | Soft-enable/disable |

---

### 2. API Contracts

#### Trigger Build

```
POST /api/v1/projects/:projectId/builds
Auth: Required (JWT)
Plan: Pro+ (enforced via requirePlan middleware)
```

**Request Body:**
```typescript
{
  platform: "android" | "ios";
  profile?: "development" | "preview" | "production";  // default: "preview"
  app_version?: string;          // default: from project settings or "1.0.0"
  build_number?: string;         // default: auto-increment
  android_package?: string;      // default: com.raygan.<slug>
  ios_bundle_identifier?: string; // default: com.raygan.<slug>
}
```

**Response (201):**
```typescript
{
  data: {
    uuid: string;
    platform: "android" | "ios";
    status: "queued";
    profile: string;
    app_version: string;
    build_number: string;
    created_on: string;
  },
  error: null
}
```

**Error Responses:**
- `403` — Plan insufficient (Free/Starter)
- `409` — Concurrent build limit reached (Pro=1, Team=3)
- `404` — Project not found
- `422` — Validation error (invalid platform, version format, etc.)

#### List Builds

```
GET /api/v1/projects/:projectId/builds
Auth: Required
Plan: Pro+
```

**Response:**
```typescript
{
  data: Build[],
  error: null,
  meta: { total: number, page: number, limit: number }
}
```

#### Get Build Detail

```
GET /api/v1/projects/:projectId/builds/:buildId
Auth: Required
Plan: Pro+
```

#### Cancel Build

```
DELETE /api/v1/projects/:projectId/builds/:buildId
Auth: Required
Plan: Pro+
```

Only cancellable when status is `"queued"` or `"in_progress"`.

#### EAS Webhook

```
POST /api/v1/webhooks/eas-build
Auth: HMAC-SHA256 signature in `expo-signature` header
```

**Payload** (from EAS):
```typescript
{
  id: string;             // EAS build UUID
  platform: "ANDROID" | "IOS";
  status: "FINISHED" | "ERRORED" | "CANCELED";
  artifacts?: {
    buildUrl?: string;    // APK/IPA download URL
    logsUrl?: string;
  };
  error?: { message: string };
  createdAt: string;
  completedAt?: string;
}
```

#### Submit to Store (Phase 2)

```
POST /api/v1/projects/:projectId/builds/:buildId/submit
Auth: Required
Plan: Pro+
```

**Request Body:**
```typescript
{
  store: "apple" | "google";
  store_config: {
    // Apple: { apple_id?: string }
    // Google: { track: "internal" | "alpha" | "beta" | "production" }
  };
  credential_id?: number;  // optional: use specific user credential
}
```

---

### 3. Backend Services

#### EAS Client (`services/api/src/services/eas/eas-client.ts`)

Low-level HTTP wrapper for Expo/EAS REST API:

| Method | Purpose |
|--------|---------|
| `createProject(accountName, slug)` | Create EAS project under Raygan's account |
| `getProject(projectId)` | Fetch EAS project details |
| `uploadArchive(projectId, buffer)` | Upload tarball to EAS storage |
| `triggerBuild(projectId, options)` | Start EAS build |
| `getBuild(buildId)` | Get build status (polling fallback) |
| `cancelBuild(buildId)` | Cancel queued/in-progress build |
| `submitToStore(options)` | Trigger EAS Submit (Phase 2) |

Authentication via `EXPO_ACCESS_TOKEN` (robot token) or user-provided token from `store_credentials`.

#### Build Service (`services/api/src/services/build.service.ts`)

Orchestration layer:

| Method | Purpose |
|--------|---------|
| `triggerBuild(options)` | Validate access, check plan + concurrent limit, create Build record, enqueue BullMQ job |
| `processJob(buildId)` | Export files → inject config → create archive → upload → trigger EAS build → update record |
| `handleWebhook(payload)` | Verify HMAC → update Build → emit Socket.io `build:status` |
| `getOrCreateEASProject(project)` | Lazy-create EAS project, store mapping in `project.settings.eas` |
| `findByProjectId(projectId)` | List builds with pagination |
| `cancelBuild(buildId, userId)` | Cancel via EAS API + update record |

#### Credential Service (`services/api/src/services/credential.service.ts`) (Phase 2)

| Method | Purpose |
|--------|---------|
| `create(orgId, data, userId)` | Encrypt value with `encryptKey()`, store |
| `findByOrganization(orgId)` | Return credentials with value **redacted** |
| `getDecrypted(credentialId, orgId)` | Verify org ownership, return plaintext |
| `delete(credentialId, orgId, userId)` | Soft delete |

---

### 4. BullMQ Job Infrastructure

**Queue:** `build` queue in `services/api/src/jobs/queues.ts`
- No retries (builds are expensive and non-idempotent)
- Concurrency: 2 workers
- Rate limit: 5 builds/minute (to respect EAS API limits)
- Job data: `{ build_id: number }`

**Worker:** `services/api/src/jobs/processors/build.processor.ts`
- Calls `buildService.processJob(job.data.build_id)`
- On failure: updates Build record with error_message

**Submission Queue (Phase 2):** Separate `submission` queue + worker.

---

### 5. Plan Gating

**New middleware:** `services/api/src/middleware/plan-gate.ts`

```typescript
requirePlan("pro", "team")
```

Checks the authenticated user's organization plan tier. Returns `403` with structured error:
```json
{
  "data": null,
  "error": {
    "code": "PLAN_REQUIRED",
    "message": "This feature requires a Pro plan or higher",
    "details": { "required_plan": "pro", "current_plan": "free" }
  }
}
```

**Concurrent build limits:**

| Plan | Concurrent Builds |
|------|-------------------|
| Pro | 1 |
| Team | 3 |

Enforced in `BuildService.triggerBuild()` by counting builds with `status IN ('queued', 'in_progress')`.

---

### 6. Real-Time Updates

**Socket.io Event:** `build:status`

Direction: Server → Client (project room)

```typescript
{
  build_uuid: string;
  status: "queued" | "in_progress" | "finished" | "errored" | "cancelled";
  artifact_url?: string;
  logs_url?: string;
  error_message?: string;
  duration_seconds?: number;
  completed_at?: string;
}
```

Emitted from `BuildService.handleWebhook()` after updating the Build record.

Frontend `useBuildStatus` hook listens on the project room and updates React Query cache.

---

### 7. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_ACCESS_TOKEN` | Yes (for builds) | — | Raygan's Expo robot token |
| `EXPO_ACCOUNT_NAME` | No | `"raygan"` | Expo account name for project creation |
| `EAS_WEBHOOK_SECRET` | Yes (for builds) | — | HMAC secret for webhook signature verification |

---

## Frontend Design

### Build Modal

Triggered from the "Deploy" dropdown → "Build APK/IPA" menu item.

```
┌─────────────────────────────────────────────┐
│  Build Your App                         [X] │
├─────────────────────────────────────────────┤
│                                             │
│  Platform                                   │
│  ┌───────────────┐  ┌───────────────┐       │
│  │  🤖 Android   │  │  🍎 iOS       │       │
│  │   (APK)       │  │   (IPA)       │       │
│  └───────────────┘  └───────────────┘       │
│                                             │
│  Build Profile                              │
│  ┌─────────────────────────────────────┐    │
│  │ Preview (recommended)          ▼    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  App Version        Build Number            │
│  ┌──────────────┐   ┌──────────────┐        │
│  │ 1.0.0        │   │ 1 (auto)     │        │
│  └──────────────┘   └──────────────┘        │
│                                             │
│  Package Name                               │
│  ┌─────────────────────────────────────┐    │
│  │ com.raygan.mytodoapp                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│           [Cancel]     [Start Build]        │
│                                             │
├─────────────────────────────────────────────┤
│  Recent Builds                              │
│                                             │
│  🤖 Android  preview  ✅ Finished   12m     │
│     v1.0.0 #1        [Download APK]        │
│                                             │
│  🍎 iOS     preview   🔄 Building   3m     │
│     v1.0.0 #1                               │
│                                             │
│  🤖 Android  preview  ❌ Errored    —      │
│     v1.0.0 #2        [View Logs]           │
└─────────────────────────────────────────────┘
```

For Free/Starter users, the modal shows an upgrade prompt instead of the build form.

### Workspace Toolbar Integration

Add to existing Deploy dropdown:

```
Deploy ▾
├── 🔨 Build APK/IPA    ← NEW (opens Build Modal)
├── 📦 Export ZIP        ← existing
└── 🐙 GitHub            ← coming soon
```

### Feature Module Structure

```
apps/web/src/features/deploy/
├── components/
│   ├── build-modal.tsx          — Dialog to configure + trigger builds
│   ├── build-status-card.tsx    — Individual build with status, actions
│   ├── build-history.tsx        — Scrollable list of builds
│   ├── platform-selector.tsx    — Android/iOS toggle component
│   ├── submit-modal.tsx         — Store submission dialog (Phase 2)
│   ├── credential-manager.tsx   — Credential CRUD (Phase 3)
│   ├── credential-form.tsx      — Upload credentials (Phase 3)
│   └── index.ts
├── hooks/
│   ├── use-build.ts             — React Query mutation: trigger/cancel
│   ├── use-build-status.ts      — Socket.io listener for real-time status
│   ├── use-builds.ts            — React Query query: list builds
│   └── index.ts
├── types/
│   └── index.ts
├── utils/
│   └── index.ts
└── index.ts
```

---

## Implementation Phases

### Phase 1: EAS Build (MVP)

**Scope:** User can trigger Android/iOS builds and download APK/IPA artifacts.

**Files to create:**
1. `services/api/src/db/entities/build.entity.ts`
2. `services/api/src/db/migrations/1708500000000-CreateBuildsTable.ts`
3. `services/api/src/services/eas/eas-client.ts`
4. `services/api/src/services/eas/index.ts`
5. `services/api/src/services/build.service.ts`
6. `services/api/src/middleware/plan-gate.ts`
7. `services/api/src/controllers/builds.controller.ts`
8. `services/api/src/routes/v1/builds.routes.ts`
9. `services/api/src/routes/v1/webhooks.routes.ts`
10. `services/api/src/jobs/queues.ts`
11. `services/api/src/jobs/processors/build.processor.ts`
12. `apps/web/src/features/deploy/` (full module)

**Files to modify:**
1. `services/api/src/config/env.ts` — add EXPO_* env vars
2. `services/api/src/db/entities/index.ts` — export Build entity
3. `services/api/src/db/data-source.ts` — register Build entity
4. `services/api/src/services/index.ts` — export BuildService
5. `services/api/src/controllers/index.ts` — export build controller
6. `services/api/src/routes/v1/index.ts` — mount builds + webhooks routes
7. `services/api/src/jobs/index.ts` — export queues + workers
8. `apps/web/src/components/organisms/workspace/workspace-toolbar.tsx` — add Build menu item
9. `apps/web/src/stores/ui-store.ts` — add buildProject modal
10. `packages/shared/src/types/` — add Build API types
11. `packages/shared/src/constants/` — add build socket events

**Implementation order:**
1. Env + config → 2. Entity + migration → 3. Plan gate middleware → 4. EAS Client → 5. BullMQ setup → 6. Build Service → 7. Controller + Routes → 8. Webhook route → 9. Shared types → 10. Frontend module → 11. Toolbar integration

### Phase 2: Store Submission

**Scope:** After a successful build, user submits to Apple App Store or Google Play.

- `StoreSubmission` entity + migration
- `StoreCredential` entity + migration
- `StoreSubmissionService` + `CredentialService`
- Submission API routes + controller
- BullMQ submission queue + worker
- Submit Modal frontend component

### Phase 3: Credential Management UI

**Scope:** Full CRUD for signing credentials in organization settings.

- Credential API routes (list, create, delete)
- Credential Manager page in dashboard settings
- Credential Form with file upload (Apple .p8, Google SA JSON)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| EAS API rate limits | Builds rejected | BullMQ rate limiter (5/min), concurrent limits per plan |
| EAS webhook delivery failure | Stuck builds | Polling fallback: periodic job checks builds stuck > 30 min |
| iOS signing complexity | Failed iOS builds | Start with Android-only, add iOS after Raygan's Apple Developer account is set up |
| Archive format mismatch | EAS rejects upload | Validate app.json + eas.json structure before upload |
| EAS project creation race | Duplicate EAS projects | Redis lock (`SETNX`) in `getOrCreateEASProject()` |
| Build costs at scale | Unexpected expenses | Strict plan gating, concurrent limits, usage tracking in `builds` table |
| Credential security | Leaked signing keys | AES-256-GCM encryption at rest, values never returned to frontend, audit trail via `created_by` |

---

## Success Criteria

1. **Build success rate:** > 90% of triggered builds complete successfully (exclude user errors like invalid package names)
2. **Time to artifact:** Build queued → artifact available < 20 min for Android, < 30 min for iOS
3. **Real-time updates:** Build status change reflected in UI within 5 seconds of webhook
4. **Plan enforcement:** 100% of build attempts by Free/Starter users blocked with upgrade prompt
5. **Zero credential leaks:** Encrypted values never appear in logs, API responses, or frontend state

---

## Open Questions

1. Should we start with Android-only (simpler, no Apple Developer account needed) or both platforms from day one?
2. What's the pricing model for builds? Included in Pro/Team subscription or charged per-build on top?
3. Should we offer a "test build" option on Starter plan (e.g., 1 Android preview build/month)?
4. How should we handle Expo SDK version mismatches between the project template and EAS build?
5. Should build artifacts be stored in our own S3/R2 bucket or rely on EAS's artifact URLs (which expire)?

---

## References

- [EAS Build API Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [EAS Webhooks](https://docs.expo.dev/eas/webhooks/)
- [Expo Robot Tokens](https://docs.expo.dev/accounts/programmatic-access/)
- Existing codebase: `ExportService`, `BaseEntity`, `encryptKey()`, BullMQ infrastructure
