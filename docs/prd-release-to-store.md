# PRD: Release to Store

## Overview

**Problem:** Users can build APK/AAB binaries via EAS Build, but must manually download the artifact and upload it to Google Play Console or App Store Connect. This breaks the end-to-end "prompt to production" flow.

**Solution:** Extend the existing build pipeline so users can submit completed builds directly to Google Play (Phase 1) and Apple App Store (Phase 2) — all from within Raygan. Integrate tightly with the current Build Modal UX so releasing feels like a natural next step after building.

---

## Problem Statement

### Current Behavior
1. User generates a React Native (Expo) app via Agent Mode
2. User builds an APK/AAB via the Build Modal
3. Build completes with a downloadable artifact
4. **No path to store submission** — user must manually upload to Google Play Console, configure store listing, and manage releases outside Raygan

### User Impact
- Technical barrier: most no-code users have never used Google Play Console
- Broken last mile: "build an app with AI" stops at a binary, not a published app
- Users leave the platform to complete the final step
- Store listing metadata (title, description, screenshots) must be re-entered manually

---

## Goals

| Goal | Metric |
|------|--------|
| One-click store submission | User submits build to store without leaving Raygan |
| Integrated flow | Release is a natural continuation of the build flow, not a separate feature |
| Auto-release option | Production builds can auto-submit to store on completion |
| Credential security | Store credentials encrypted at rest (AES-256-GCM), never cached, never exposed via API |
| Extensible project settings | Credentials stored in generic `project_settings` table reusable for future integrations |

---

## User Stories

1. **As a user**, after my production build completes, I see a "Release to Store" button on the build card that starts the submission flow.

2. **As a user**, I can upload my Google Play service account JSON once, and it's securely stored for all future releases of that project.

3. **As a user**, I can fill in my store listing (title, description, category, privacy policy) within Raygan and reuse it across releases.

4. **As a user**, I can choose which release track to target (internal testing, alpha, beta, production).

5. **As a user**, when building with the "Production" profile, I can toggle "Auto-release to store" so the submission happens automatically when the build completes.

6. **As a user**, I see real-time release status updates (pending, submitting, submitted, in review, live) without refreshing.

7. **As a user**, I can view my release history alongside my build history.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Submission tool | `eas submit` CLI | Reuses existing `EASAdapter` pattern. Handles Google Play API complexity. Same CLI wrapper as builds. |
| Credential storage | `project_settings` table | Generic key-value table with encryption support. Reusable for future integrations (Firebase, Apple, etc.). Follows existing `settings` entity pattern. |
| Credential ownership | User-provided | Users upload their own Google Play service account. Raygan never owns store accounts. |
| Store listings | Dedicated `store_listings` table | Structured fields (title 50 chars, description 4000 chars) need DB-level validation. Not a key-value fit. |
| Release tracking | Dedicated `store_releases` table | Transactional records with status machine, timestamps, build FK. Not a key-value fit. |
| Job processing | BullMQ async queue | Submissions take 2-10 min (artifact upload). Matches existing build job pattern. |
| Auto-release | Build entity fields | `auto_release` boolean + `release_track` on Build entity. Build service triggers release on completion. |

---

## Architecture

### System Flow

```
┌─────────────────┐                         ┌──────────────────────┐
│   Build Modal    │   Build completes       │   Build Service      │
│ (BuildStatusCard)│ ◀─────────────────────── │   handleWebhook()    │
└────────┬────────┘                         └──────────┬───────────┘
         │                                             │
         │ User clicks                                 │ If auto_release=true
         │ "Release to Store"                          │ + credentials exist
         │                                             │ + listing exists
         ▼                                             ▼
┌─────────────────┐    POST /store/releases  ┌──────────────────────┐
│ Release Wizard   │ ──────────────────────▶ │  Release Controller   │
│ (5 steps)        │                         └──────────┬───────────┘
└────────┬────────┘                                     │
         │                                              │ Creates StoreRelease
         │                                              │ Enqueues BullMQ job
         │                                              ▼
         │                                    ┌──────────────────────┐
         │                                    │  Submit Processor     │
         │                                    │  (BullMQ Worker)      │
         │                                    │                       │
         │                                    │  1. Decrypt credential│
         │                                    │  2. Write temp file   │
         │                                    │  3. eas submit        │
         │                                    │  4. Cleanup temp      │
         │                                    └──────────┬───────────┘
         │                                               │
         │              Socket.io                        │
         │           release:status                      │
         │ ◀─────────────────────────────────────────────┘
         ▼
┌─────────────────┐
│ Release Status   │  pending → submitting → submitted → in_review → live
│ Badge            │
└─────────────────┘
```

### Entry Points

1. **Post-build action**: `BuildStatusCard` shows "Release to Store" on completed production builds
2. **Auto-release**: Toggle in `StepBuildConfig` when Production profile selected. Build service auto-queues submission on completion.
3. **Standalone**: "Release to Store" button in `DeployActions` panel

### Release Wizard Steps

| Step | Component | Description |
|------|-----------|-------------|
| 1 | `step-select-build` | Pick a completed production build (skipped if pre-selected from BuildStatusCard) |
| 2 | `step-store-credentials` | Upload Google Play service account JSON. Shows "Configured" if already set. One-time per project. |
| 3 | `step-store-listing` | App metadata: title, descriptions, category, privacy policy URL. Pre-fills from project name. |
| 4 | `step-select-track` | Track selection: internal (recommended first), alpha, beta, production |
| 5 | `step-release-review` | Summary + "Submit to Store" button |

---

## Data Model

### `project_settings` Table (New)

Generic encrypted key-value store for per-project configuration. Mirrors platform `settings` table pattern but scoped to projects.

```
project_settings
├── id (PK, auto-increment)
├── uuid (unique)
├── project_id (FK → projects, NOT NULL)
├── organization_id (FK → organizations, NOT NULL)
├── category (varchar 50) — e.g. store_credentials, eas, signing, build, integrations, general
├── slug (varchar 100) — e.g. google_play_service_account, eas_project_config
├── value (text) — plain or encrypted
├── value_type (enum: string, number, boolean, json)
├── is_encrypted (boolean, default false)
├── is_valid (boolean, nullable) — for credentials that support verification
├── last_verified_at (timestamptz, nullable)
├── visibility (enum: private, internal — never public)
├── description (text, nullable)
├── meta (jsonb)
├── audit columns (created_on/by, updated_on/by, deleted_flag/on/by)
└── UNIQUE(project_id, category, slug)
```

### `store_listings` Table (New)

Structured store metadata per project per store.

```
store_listings
├── id (PK, auto-increment)
├── uuid (unique)
├── project_id (FK → projects)
├── store (varchar 20) — google_play, apple_app_store
├── title (varchar 50)
├── short_description (varchar 80)
├── full_description (text)
├── category (varchar 100)
├── privacy_policy_url (text, nullable)
├── support_email (varchar 255, nullable)
├── screenshots (jsonb, default [])
├── feature_graphic_url (text, nullable)
├── meta (jsonb)
├── audit columns
└── UNIQUE(project_id, store)
```

### `store_releases` Table (New)

Tracks each submission to a store.

```
store_releases
├── id (PK, auto-increment)
├── uuid (unique)
├── project_id (FK → projects)
├── organization_id (FK → organizations)
├── build_id (FK → builds)
├── store (varchar 20)
├── track (varchar 30) — internal, alpha, beta, production
├── status (varchar 30) — pending, submitting, submitted, in_review, approved, rejected, live, failed
├── provider_submission_id (varchar 255, nullable)
├── artifact_url (text, nullable)
├── error_message (text, nullable)
├── submitted_at (timestamptz, nullable)
├── review_completed_at (timestamptz, nullable)
├── auto_triggered (boolean, default false)
├── meta (jsonb)
├── audit columns
└── INDEX(project_id, status)
└── INDEX(organization_id, status)
```

### Build Entity Modifications

Add to existing `builds` table:
- `auto_release` (boolean, default false) — trigger store submission on completion
- `release_track` (varchar 30, nullable) — preferred track for auto-release

---

## API Endpoints

### Project Settings (Credentials)
```
PUT    /api/v1/projects/:projectId/settings/:category/:slug    — upsert setting
GET    /api/v1/projects/:projectId/settings/:category/:slug    — get (decrypted if authorized)
GET    /api/v1/projects/:projectId/settings/:category           — list by category
DELETE /api/v1/projects/:projectId/settings/:category/:slug    — soft delete
POST   /api/v1/projects/:projectId/settings/:category/:slug/verify — verify credential
```

### Store Listings
```
PUT    /api/v1/projects/:projectId/store/listing/:store    — upsert
GET    /api/v1/projects/:projectId/store/listing/:store    — get
```

### Store Releases
```
POST   /api/v1/projects/:projectId/store/releases               — submit to store
GET    /api/v1/projects/:projectId/store/releases               — list
GET    /api/v1/projects/:projectId/store/releases/:releaseId    — get
DELETE /api/v1/projects/:projectId/store/releases/:releaseId    — cancel
```

### Webhooks
```
POST   /api/v1/webhooks/eas-submit    — EAS submit status callback
```

---

## Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `release:status` | Server → Client | `{ project_id, release_uuid, status, error_message?, provider_submission_id? }` |
| `release:auto-triggered` | Server → Client | `{ project_id, build_uuid, release_uuid }` |

---

## Security

- Store credentials encrypted with AES-256-GCM using existing `encryptKey`/`decryptKey` helpers
- Decrypted credentials written to temp file only during submission, deleted in `finally` block
- `project_settings` with `is_encrypted=true` never returned decrypted via GET (returns `"[encrypted]"` placeholder)
- No Redis caching for encrypted project settings
- `visibility: "internal"` settings never returned to frontend

---

## Phase 2: Apple App Store (Future)

- Add `apple_app_store` store type
- Credential: `{ key_id, issuer_id, p8_key }` stored in `project_settings` as `store_credentials/apple_asc_api_key`
- `eas submit --platform ios` handles App Store Connect API
- Store listings gain Apple-specific fields (subtitle, keywords, promotional text)
- iOS builds enabled in build system
