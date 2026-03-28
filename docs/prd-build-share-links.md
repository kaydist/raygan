# PRD: Shareable Build Download Links

## Problem Statement

When a user successfully builds their app on Raygan, they currently have no way to share the build artifact (APK) with external stakeholders (testers, clients, collaborators) who don't have a Raygan account. Users need a simple, secure way to generate time-limited download links that expire automatically and can be revoked at any time.

## Goals

1. Allow authenticated project members to generate shareable download links for completed builds
2. Enable anyone with a valid link to download the build artifact without authentication
3. Enforce automatic expiration after a user-selected time period
4. Support manual revocation of links before they expire
5. Track download activity per link

## Non-Goals

- Password-protected links (future enhancement)
- Download limits per link (future enhancement)
- Frontend UI implementation (separate task)
- Email/notification when link is accessed (future enhancement)

---

## User Stories

| # | As a... | I want to... | So that... |
|---|---------|-------------|------------|
| 1 | Project member | Generate a shareable link for a completed build | I can share it with testers who don't have a Raygan account |
| 2 | Project member | Choose how long the link stays active (1h, 24h, 7d, 30d) | The link expires automatically and doesn't remain accessible indefinitely |
| 3 | Project member | Add an optional label to a share link | I can track which link was shared with whom |
| 4 | Project member | See all active share links for a build | I know what's currently shared and with whom |
| 5 | Project member | Revoke a share link immediately | I can cut off access if needed |
| 6 | External user | Download a build by clicking a link | I can install/test the app without creating an account |
| 7 | External user | See a clear message when a link is expired or revoked | I understand why the download isn't available |

---

## Functional Requirements

### FR-1: Create Share Link

- **Endpoint**: `POST /api/v1/projects/:projectId/builds/:buildId/share-links`
- **Auth**: Required (project member)
- **Request body**:
  ```json
  {
    "expiration": "24h",
    "label": "For QA team"
  }
  ```
- **Expiration options**: `1h` | `24h` | `7d` | `30d`
- **Constraints**:
  - Build must have status `completed`
  - Build must have a non-null `artifact_url`
  - User must have access to the project
- **Response**: 201 with share link details including the generated `share_url`

### FR-2: List Share Links

- **Endpoint**: `GET /api/v1/projects/:projectId/builds/:buildId/share-links`
- **Auth**: Required (project member)
- **Response**: Array of active (non-revoked) share links, each with computed `is_expired` field and `download_count`

### FR-3: Revoke Share Link

- **Endpoint**: `DELETE /api/v1/projects/:projectId/builds/:buildId/share-links/:shareLinkId`
- **Auth**: Required (project member)
- **Behavior**: Soft-deletes the link; takes effect immediately
- **Response**: 200 with `{ revoked: true }`

### FR-4: Public Download

- **Endpoint**: `GET /api/v1/builds/download/:token`
- **Auth**: None (public)
- **Behavior**:
  1. Look up the share link by token (excluding revoked links)
  2. Check if `expires_at > now()`
  3. Verify the associated build still has an `artifact_url`
  4. If valid: 302 redirect to the artifact URL
  5. If invalid: 404 with descriptive error message
- **Side effect**: Increment `download_count` and update `last_downloaded_at` (non-blocking)

---

## Data Model

### `build_share_links` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | serial | PK | Internal ID |
| `uuid` | uuid | UNIQUE, NOT NULL | External identifier |
| `build_id` | integer | FK -> builds(id), NOT NULL | Associated build |
| `organization_id` | integer | FK -> organizations(id), NOT NULL | Owning organization |
| `token` | varchar(64) | UNIQUE, NOT NULL | Cryptographic random token |
| `expires_at` | timestamptz | NOT NULL | When the link becomes invalid |
| `label` | varchar(255) | nullable | Optional description |
| `download_count` | integer | NOT NULL, default 0 | Number of downloads |
| `last_downloaded_at` | timestamptz | nullable | Most recent download time |
| `meta` | jsonb | NOT NULL, default '{}' | Flexible metadata |
| `created_on` | timestamptz | NOT NULL | Creation timestamp |
| `created_by` | integer | nullable | User who created the link |
| `updated_on` | timestamptz | NOT NULL | Last update timestamp |
| `updated_by` | integer | nullable | Last updater |
| `deleted_flag` | boolean | NOT NULL, default false | Soft-delete (revocation) |
| `deleted_on` | timestamptz | nullable | Revocation timestamp |
| `deleted_by` | integer | nullable | User who revoked |

**Indexes**:
- UNIQUE on `token` (partial: `WHERE deleted_flag = false`) - fast public lookup
- Composite on `(build_id, deleted_flag)` - list links per build

**Foreign Keys**:
- `build_id` -> `builds(id)` ON DELETE CASCADE
- `organization_id` -> `organizations(id)` ON DELETE CASCADE

---

## API Response Formats

### Share Link Response

```json
{
  "data": {
    "uuid": "abc-123",
    "build_uuid": "def-456",
    "token": "a1b2c3d4...64chars",
    "share_url": "https://api.raygan.app/api/v1/builds/download/a1b2c3d4...64chars",
    "expires_at": "2026-03-29T12:00:00Z",
    "label": "For QA team",
    "download_count": 5,
    "last_downloaded_at": "2026-03-28T15:30:00Z",
    "created_on": "2026-03-28T12:00:00Z",
    "is_expired": false
  },
  "error": null
}
```

### Expired/Invalid Download Response

```json
{
  "data": null,
  "error": {
    "code": "SHARE_LINK_INVALID",
    "message": "This download link is invalid, expired, or has been revoked."
  }
}
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token guessing | 256 bits of entropy (`crypto.randomBytes(32)`) makes brute-force infeasible |
| Artifact URL exposure | 302 redirect instead of returning URL in JSON body |
| Revocation delay | Instant - soft-delete is checked on every request via BaseRepository |
| Stale artifact URL | Verified at download time; returns error if artifact no longer exists |
| Access control | Only project members can create/list/revoke links |
| Link enumeration | Tokens are random, not sequential; no listing endpoint is public |

---

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `services/api/src/db/entities/build-share-link.entity.ts` | TypeORM entity |
| `services/api/src/db/migrations/<ts>-CreateBuildShareLinksTable.ts` | Database migration |
| `services/api/src/services/build-hub/build-share-link.service.ts` | Business logic |
| `services/api/src/controllers/build-share-links.controller.ts` | Request handlers |
| `services/api/src/routes/v1/build-share-links.routes.ts` | Route definitions |

### Modified Files (barrel exports)

| File | Change |
|------|--------|
| `services/api/src/db/entities/index.ts` | Export `BuildShareLink` |
| `services/api/src/services/build-hub/index.ts` | Export `BuildShareLinkService` |
| `services/api/src/controllers/index.ts` | Export share link controller functions |
| `services/api/src/routes/v1/index.ts` | Register `buildShareLinksRoutes` |
| `packages/shared/src/types/build.types.ts` | Add share link types |

### Patterns to Follow

- Entity extends `BaseEntity` (same as `build.entity.ts`)
- Service uses `BaseRepository` with `ObjectLiteral` intersection (same as `BuildService`)
- Controller uses module-level service instantiation + `AuthenticatedRequest` cast (same as `builds.controller.ts`)
- Routes use `Router()` + `authenticate` middleware (same as `builds.routes.ts`)
- Revocation via `BaseRepository.softDelete()` (existing pattern)
- Atomic download count: `UPDATE SET download_count = download_count + 1` (raw SQL)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Build artifact URL becomes null after link creation | Download returns 404 with "artifact no longer available" |
| Multiple share links for the same build | Allowed - each has its own token, expiration, and tracking |
| Link created, then user loses project access | Link remains valid until expiration/revocation |
| Token collision (astronomically unlikely) | UNIQUE constraint catches it; service retries with new token |
| Build soft-deleted after link creation | Consider revoking links in follow-up enhancement |

---

## Verification Checklist

- [ ] Migration runs successfully (`pnpm --filter=api migration:run`)
- [ ] Create link returns 201 with token and share_url for completed build
- [ ] Create link returns 400 for non-completed build
- [ ] Create link returns 403 without project access
- [ ] List links returns array with computed `is_expired` field
- [ ] Revoke link returns 200, subsequent download returns 404
- [ ] Public download returns 302 redirect for valid token
- [ ] Public download returns 404 for expired token
- [ ] Public download returns 404 for revoked token
- [ ] Public download returns 404 for non-existent token
- [ ] Download count increments on each successful download

---

## Future Enhancements

- Password-protected links
- Maximum download count limit per link
- Email notification when link is accessed
- Custom expiration duration (not just preset options)
- Bulk link generation for multiple builds
- Analytics dashboard for share link activity
- Frontend UI for managing share links
