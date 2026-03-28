# Build Hub — EAS Build Integration

## Overview

The Build Hub manages the full lifecycle of building React Native (Expo) apps via Expo Application Services (EAS). It handles project creation, build submission, status tracking, cancellation, and webhook processing.

All Expo interactions use the **EAS CLI** — no direct GraphQL or REST API calls. The CLI manages authentication, archive uploads, credential management, and the build pipeline.

## Architecture

```
services/api/src/
├── services/build-hub/
│   ├── build.service.ts          # BuildService — orchestrates builds, webhooks
│   ├── types.ts                  # BuildProvider interface + shared types
│   ├── adapters/
│   │   ├── base-adapter.ts       # BaseBuildAdapter — retry logic, logging
│   │   └── eas.adapter.ts        # EASAdapter — EAS CLI wrapper
│   └── index.ts
├── jobs/
│   ├── queues.ts                 # BullMQ queues (build + build-status-poll)
│   ├── workers/
│   │   └── build.worker.ts       # Workers for build + poll queues
│   └── processors/
│       ├── build.processor.ts    # Processes build jobs (create → trigger)
│       └── build-status-poller.ts# Polls EAS for active build statuses
├── controllers/
│   └── builds.controller.ts      # REST endpoints + webhook handler
├── routes/v1/
│   └── webhooks.routes.ts        # POST /webhooks/eas-build
└── db/entities/
    └── build.entity.ts           # Build entity (status, artifacts, etc.)
```

## Build Lifecycle Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER TRIGGERS BUILD                          │
│                   POST /api/v1/builds/trigger                       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BuildService.triggerBuild()                     │
│                                                                      │
│  1. Check concurrent build limit (max 2 per org)                     │
│  2. Create Build record in DB (status: "queued")                     │
│  3. Emit socket event: build queued                                  │
│  4. Add job to BullMQ "build" queue                                  │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    processBuildJob (BullMQ Worker)                    │
│                                                                      │
│  Status: "queued" → "provisioning"                                   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  STEP 1: Export Project Files                                │     │
│  │                                                              │     │
│  │  ExportService.getProjectFiles() →                           │     │
│  │    - Serialize AST to React Native source files              │     │
│  │    - Merge with stored project files                         │     │
│  │    - Strip missing asset refs from app.json                  │     │
│  │    - Write to /tmp/raygan-builds/<slug>-XXXXX/               │     │
│  └──────────────────────────────┬──────────────────────────────┘     │
│                                 │                                     │
│                                 ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  STEP 2: Create/Find EAS Project (if no provider_project_id) │     │
│  │                                                              │     │
│  │  EASAdapter.createProject() →                                │     │
│  │    1. Create temp dir with app.json + package.json           │     │
│  │    2. git init (EAS CLI requires VCS)                        │     │
│  │    3. Run: eas init --non-interactive --force                │     │
│  │       - Creates project on Expo if new                       │     │
│  │       - Links to existing project if found                   │     │
│  │    4. Read project ID from updated app.json                  │     │
│  │       (or parse UUID from CLI output as fallback)            │     │
│  │    5. Clean up temp dir                                      │     │
│  │    6. Save provider_project_id on Build record               │     │
│  └──────────────────────────────┬──────────────────────────────┘     │
│                                 │                                     │
│                                 ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  STEP 3: Trigger Build                                       │     │
│  │                                                              │     │
│  │  EASAdapter.triggerBuild() →                                 │     │
│  │    1. Ensure package.json exists (with Expo deps)            │     │
│  │    2. Inject EAS project ID into app.json                    │     │
│  │    3. Set android.package (com.raygan.<slug>)                │     │
│  │    4. Generate eas.json with build profile                   │     │
│  │       (image: "latest" for Java 17+ on EAS servers)          │     │
│  │    5. Run: eas build --platform android --profile preview    │     │
│  │            --non-interactive --no-wait --json                 │     │
│  │       (uses EAS_NO_VCS=1 since project dir has no git)       │     │
│  │    6. Parse build ID from JSON output                        │     │
│  │                                                              │     │
│  │  Status: "provisioning" → "building"                         │     │
│  │  Save: provider_build_id, logs_url, started_at               │     │
│  │  Emit socket event: building                                 │     │
│  └──────────────────────────────┬──────────────────────────────┘     │
│                                 │                                     │
│                                 ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  STEP 4: Clean up temp project directory                     │     │
│  │  Job completes — build runs on EAS servers                   │     │
│  └─────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐    ┌────────────────────────┐
│  WEBHOOK (primary) │    │  POLLING (fallback)     │
│                   │    │                        │
│  EAS sends POST   │    │  BullMQ repeatable job  │
│  to /webhooks/    │    │  runs every 30 seconds  │
│  eas-build        │    │                        │
│                   │    │  pollBuildStatuses():   │
│  1. Verify HMAC   │    │  1. Find all builds     │
│     signature     │    │     with status         │
│  2. Parse payload │    │     "building" or       │
│  3. Update build  │    │     "provisioning"      │
│     in DB         │    │  2. For each build:     │
│  4. Emit socket   │    │     - Get project slug  │
│     event         │    │     - Create temp EAS   │
│                   │    │       project dir       │
│  Requires:        │    │     - Run eas           │
│  - Public URL     │    │       build:view <id>   │
│  - EAS webhook    │    │       --json            │
│    configured     │    │     - Update DB + emit  │
│  - EAS_WEBHOOK_   │    │       socket on change  │
│    SECRET env     │    │  3. Mark stale builds   │
│                   │    │     as failed (>2hrs)   │
└───────┬───────────┘    └───────────┬────────────┘
        │                            │
        └──────────┬─────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      TERMINAL STATUS REACHED                         │
│                                                                      │
│  "completed" → artifact_url saved (APK/AAB download link)           │
│  "failed"    → error_message saved                                   │
│  "cancelled" → completed_at saved                                    │
│                                                                      │
│  Socket event emitted → frontend updates in real-time                │
└──────────────────────────────────────────────────────────────────────┘
```

## EAS CLI Commands Used

| Operation       | Command                                                  | VCS Mode        | Context Dir        |
|-----------------|----------------------------------------------------------|-----------------|--------------------|
| Create project  | `eas init --non-interactive --force`                     | Git repo (init) | Temp dir (cleaned) |
| Trigger build   | `eas build --platform <p> --profile <p> --no-wait --json`| `EAS_NO_VCS=1`  | Project export dir |
| Check status    | `eas build:view <build-id> --json`                       | Git repo (init) | Cached project dir |
| Cancel build    | `eas build:cancel <build-id> --non-interactive`          | Git repo (init) | Cached project dir |

## Project Context Directories

The EAS CLI requires a project directory with `app.json`, `package.json`, and (for some commands) a git repo. The adapter manages three types:

1. **Init temp dir** (`/tmp/eas-init-<slug>-<timestamp>/`) — Used by `createProject`. Contains `app.json` with slug, `package.json`, and git init. Cleaned up after use.

2. **Build project dir** (`/tmp/raygan-builds/<slug>-XXXXX/`) — Used by `triggerBuild`. Contains the full exported project files. Uses `EAS_NO_VCS=1`. Cleaned up after build submission.

3. **Cached project context** (`/tmp/eas-project-ctx/<eas-project-id>/`) — Used by `getBuildStatus` and `cancelBuild`. Minimal dir with `app.json` (slug + project ID), `package.json`, and git init. Persists across polls. Invalidated if slug changes.

## Environment Variables

| Variable              | Required | Description                                     |
|-----------------------|----------|-------------------------------------------------|
| `EXPO_ACCESS_TOKEN`   | Yes      | Expo personal or robot token (needs project:create) |
| `EXPO_ACCOUNT_NAME`   | Yes      | Expo account name (e.g. "kaydist")              |
| `EAS_WEBHOOK_SECRET`  | No       | HMAC secret for webhook signature verification  |

## Status Mapping

| EAS Status       | Raygan Status |
|------------------|---------------|
| `NEW`            | `queued`      |
| `IN_QUEUE`       | `queued`      |
| `IN_PROGRESS`    | `building`    |
| `FINISHED`       | `completed`   |
| `ERRORED`        | `failed`      |
| `CANCELED`       | `cancelled`   |
| `PENDING_CANCEL` | `cancelled`   |

## Status Update Mechanisms

### 1. Webhook (Primary)

When configured, EAS sends a POST to `/api/v1/webhooks/eas-build` on build completion. The webhook handler:
- Verifies the HMAC-SHA256 signature using `EAS_WEBHOOK_SECRET`
- Parses the payload to extract build status, artifacts, and errors
- Updates the build record in the database
- Emits a Socket.io event for real-time frontend updates

**Setup:** Configure the webhook URL in Expo dashboard → Project Settings → Webhooks.

### 2. Polling (Fallback)

A BullMQ repeatable job runs every 30 seconds:
- Queries all builds with status `building` or `provisioning` that have a `provider_build_id`
- For each build, runs `eas build:view <id> --json` to get the current status
- Updates the database and emits socket events when status changes
- Marks builds as failed if stuck for more than 2 hours (stale build detection)

This ensures builds are tracked even without webhook configuration (e.g., local development).

## Build Profiles & eas.json

The adapter generates `eas.json` with the following profiles:

- **development** — `developmentClient: true`, APK, internal distribution
- **preview** — APK, internal distribution (default for testing)
- **production** — AAB for store / APK for internal

All profiles use `image: "latest"` to ensure Java 17+ is available on EAS build servers.

## Error Handling

- **Retry logic** — All adapter methods use exponential backoff (up to 3 retries)
- **Stale builds** — Builds stuck in `building`/`provisioning` for >2 hours are auto-failed
- **Missing assets** — `ExportService` strips icon/splash references from `app.json` when asset files don't exist
- **android.package** — Auto-generated as `com.raygan.<slug>` if not set in app config
