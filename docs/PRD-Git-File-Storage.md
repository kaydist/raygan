# PRD: Content-Addressed Blob Storage + Snapshot Versioning

**Author:** Engineering
**Date:** 2026-03-29
**Status:** Draft
**Priority:** High

---

## 1. Problem Statement

Raygan currently stores all project file content directly in PostgreSQL (`project_files` table, `content` TEXT column). This introduces:

- **Database bloat** — file content inflates DB size, increasing backup time and storage cost
- **Write latency** — every file save requires a full SQL INSERT/UPDATE (~10-30ms per file, ~200-600ms for bulk AI generation writes)
- **No version history** — no way to see what changed between AI generations or manual edits
- **No diffing** — users cannot see what the AI modified in their project
- **Scaling ceiling** — PostgreSQL is not designed for blob/file storage at scale
- **No GitHub integration path** — exporting to GitHub requires building a separate sync layer

### Why Not Git-on-Disk?

An earlier proposal used local filesystem + git repos per project. This was rejected because:

- **Creates stateful servers** — local disk storage blocks horizontal scaling. Any scale-out requires sticky sessions, NFS (which negates the performance gains), or server affinity via consistent hashing.
- **Backup complexity** — tarball backups after every commit creates enormous S3 write volume at scale (1,000 concurrent users = 1,000 tar+upload ops/minute).
- **isomorphic-git performance** — pure JS git is 10-20x slower than native git for commit/log/diff operations.
- **No competitor uses this pattern** — Replit, CodeSandbox, StackBlitz, and Expo Snack all use object storage or database as source of truth with ephemeral local disk as cache.
- **Git is overkill** — the only features needed are diff and restore, which don't require a full DAG.

## 2. Proposed Solution

Replace the PostgreSQL-based file storage with a **content-addressed blob storage + snapshot versioning** approach:

- All file content stored in **S3/R2**, keyed by SHA-256 hash (automatic deduplication)
- A **`project_snapshots`** table tracks versions — each save point creates a snapshot with a `file_manifest` JSONB
- **Redis** caches hot file content and snapshot manifests
- Servers remain **completely stateless** — any server handles any project
- File metadata stays in PostgreSQL (via snapshot manifests — no content)
- Binary assets (images) are just blobs in S3 like any other file

### Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   API Server      │────▶│  S3 / R2         │
│   (Monaco)   │     │   (stateless)     │     │  (blob store)    │
└──────────────┘     │                   │     │  key = sha256    │
                     │  FileStorageService│     │  val = content   │
                     │  SnapshotService   │     └──────────────────┘
                     │  BlobStorageService │
                     └───────┬───────────┘
                             │
                     ┌───────▼───────────┐     ┌──────────────────┐
                     │  PostgreSQL       │     │  Redis           │
                     │  project_snapshots│     │  (hot cache)     │
                     │  projects (summary)│    │  blob:{hash}     │
                     └───────────────────┘     │  manifest:{id}   │
                                               └──────────────────┘
```

## 3. Goals

| Goal | Metric |
|------|--------|
| Faster bulk writes | AI gen (20 files): <100ms parallel S3 PUTs + <10ms DB insert |
| Fast reads (hot) | <1ms from Redis cache |
| Fast reads (cold) | 5-20ms from S3 |
| Version history | Every AI generation / manual save creates a snapshot |
| AI diff visibility | Users can see exactly what the AI changed |
| Durability | S3 IS the source of truth (99.999% durability), no backup lag |
| Horizontal scaling | Stateless servers, any server handles any project |
| No frontend changes | Same API response shape, frontend is unaware of storage backend |
| Deduplication | Automatic — same content = same hash = stored once |

## 4. Non-Goals

- Real-time collaborative editing (Month 4)
- Client-side file operations (browser)
- Git branching UI for users
- GitHub two-way sync (separate feature)
- Git LFS — not needed, all files go to S3

## 5. Detailed Design

### 5.1 Content-Addressed Blob Storage

Every unique file content is stored once in S3/R2, keyed by its SHA-256 hash. The `content_hash` column already exists and is computed in the current `FileStorageService`.

**S3 key layout:**
```
s3://raygan-blobs/
└── blobs/
    └── ab/
        └── cd/
            └── abcdef1234567890...  (full sha256 hash)
```

Two-level prefix (`hash[0:2]/hash[2:4]/`) ensures good listing performance and avoids S3 partition hotspots.

**Properties:**
- Content-addressed = immutable = cache-friendly (no invalidation needed)
- Automatic deduplication (same file in multiple projects = stored once)
- Race-safe (two servers uploading same blob simultaneously is idempotent)

### 5.2 Project Snapshots

Each version of a project's file state is a snapshot row. The `file_manifest` JSONB contains the complete file tree with content hashes pointing to S3 blobs.

```typescript
interface FileManifestEntry {
  hash: string;           // SHA-256 → S3 blob key
  size_bytes: number;
  language: string | null;
  mime_type: string | null;
  file_type: "code" | "asset" | "config";
  name: string;           // filename (last segment of path)
}

// Key = file path, Value = manifest entry
type FileManifest = Record<string, FileManifestEntry>;
```

**Example manifest** (~2-5KB for a typical 15-30 file project):
```json
{
  "src/App.tsx": {
    "hash": "a1b2c3d4...",
    "size_bytes": 1234,
    "language": "typescript",
    "mime_type": null,
    "file_type": "code",
    "name": "App.tsx"
  },
  "assets/icon.png": {
    "hash": "e5f6g7h8...",
    "size_bytes": 45678,
    "language": null,
    "mime_type": "image/png",
    "file_type": "asset",
    "name": "icon.png"
  }
}
```

### 5.3 Snapshot Creation Strategy

Not every file write creates a snapshot. Snapshots are created at meaningful save points:

| Event | Creates snapshot? | Message |
|-------|------------------|---------|
| AI generation completes | Yes | `ai: {prompt summary}` |
| User clicks Save / Ctrl+S | Yes | `save: manual save` |
| Auto-save (30s debounce after last edit) | Yes | `autosave` |
| Individual keystroke in Monaco | No | — |
| Project creation from template | Yes | `init: project created from {template}` |
| Bulk file import | Yes | `import: {n} files added` |
| Restore to previous version | Yes | `restore: restored from version {n}` |

Between snapshots, file writes go directly to S3 (content is durable immediately). The latest snapshot manifest is updated atomically when a snapshot is created.

### 5.4 Read Path

1. Get latest snapshot manifest from Redis cache (`project:{id}:manifest`)
2. Cache miss → query `project_snapshots` for latest version → warm Redis
3. For file content: check Redis (`blob:{hash}`) → S3 fallback → warm Redis on miss
4. Skip Redis for blobs >256KB (binary assets) — stream from S3 directly

### 5.5 Write Path

1. Hash all new/changed file content (SHA-256)
2. Upload new blobs to S3 in parallel via `putBlobIfAbsent` (HeadObject check → PutObject if new)
3. Build new manifest: start from previous manifest, overlay new files, remove deleted paths
4. In a single PostgreSQL transaction:
   - INSERT new `project_snapshots` row
   - UPDATE `projects` summary columns (file_count, total_size_bytes, snapshot_count, latest_snapshot_id)
5. Invalidate Redis cache (manifest, tree, snack keys — NOT blob keys since they're immutable)

### 5.6 Diff

Comparing two versions requires no blob fetches for the summary:

1. Fetch both snapshot manifests
2. **Added** = paths in `to` but not `from`
3. **Deleted** = paths in `from` but not `to`
4. **Modified** = paths in both where `hash` differs
5. For text diffs of modified files: fetch both blob versions from S3, compute diff

### 5.7 Restore

1. Fetch target version's snapshot manifest
2. Copy manifest into a new snapshot row (message: "restore: restored from version {n}")
3. Zero blob copies needed — content-addressed storage means old blobs still exist in S3
4. Update project summary columns

### 5.8 Technology

| Component | Choice | Reason |
|-----------|--------|--------|
| Blob storage | Cloudflare R2 | S3-compatible, zero egress fees, 99.999% durability |
| S3 client | `@aws-sdk/client-s3` | Standard S3 SDK, works with R2 |
| Hot cache | Redis (existing) | Already in stack, sub-millisecond reads |
| Version tracking | PostgreSQL `project_snapshots` table | Transactional, queryable, consistent |
| Background jobs | BullMQ (existing) | Already in stack, for data migration |
| Future GitHub export | `isomorphic-git` (existing) | Generate git repos on-the-fly from snapshot history |

### 5.9 Database Changes

#### New Table: `project_snapshots`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | SERIAL | NO | Auto | Primary key |
| `uuid` | UUID | NO | gen_random_uuid() | External identifier |
| `project_id` | INTEGER | NO | — | FK to projects (CASCADE) |
| `version` | INTEGER | NO | — | Sequential per project, unique with project_id |
| `file_manifest` | JSONB | NO | {} | `Record<path, FileManifestEntry>` |
| `message` | VARCHAR(500) | YES | NULL | Snapshot description |
| `author_id` | INTEGER | YES | NULL | FK to users (SET NULL) |
| `conversation_id` | INTEGER | YES | NULL | FK to conversations (SET NULL) |
| `file_count` | INTEGER | NO | 0 | Derived from manifest |
| `total_size_bytes` | INTEGER | NO | 0 | Sum of all file sizes |
| `meta` | JSONB | NO | {} | Flexible metadata |
| `created_on` | TIMESTAMPTZ | NO | NOW() | |
| `created_by` | INTEGER | YES | NULL | |
| `updated_on` | TIMESTAMPTZ | NO | NOW() | |
| `updated_by` | INTEGER | YES | NULL | |
| `deleted_flag` | BOOLEAN | NO | FALSE | |
| `deleted_on` | TIMESTAMPTZ | YES | NULL | |
| `deleted_by` | INTEGER | YES | NULL | |

**Indexes:**
```sql
UNIQUE INDEX ON project_snapshots (project_id, version);
INDEX ON project_snapshots (project_id, version DESC) WHERE deleted_flag = false;
```

#### New Columns on `projects`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `file_count` | INTEGER | 0 | Dashboard display, quota checks |
| `total_size_bytes` | INTEGER | 0 | Quota enforcement, dashboard |
| `snapshot_count` | INTEGER | 0 | Version history indicator |
| `latest_snapshot_id` | INTEGER (FK) | NULL | Quick lookup of current state |

#### `project_files` Table — Phased Removal

**Phase 1:** Keep table as UUID-to-path index (routes use `fileId` param which is a UUID). `content` column becomes unused but not yet dropped.

**Phase 2:** Migration job populates S3 blobs + snapshot rows from existing DB content. `project.meta.blob_migrated` flag controls read path.

**Phase 3:** After all projects migrated, drop `content` column. Keep table for UUID lookups.

**Phase 4 (future):** Generate deterministic UUIDs from `(project_id, path)` via UUID v5. Drop `project_files` table entirely.

### 5.10 Services Architecture

```
┌────────────────────────┐
│   FileStorageService   │  ← Same public interface (controllers unchanged)
│   (rewritten internals)│
├────────────────────────┤
│   SnapshotService      │  ← Snapshot CRUD, diff, restore
├────────────────────────┤
│   BlobStorageService   │  ← S3 blob read/write + Redis cache
└────────────────────────┘
```

**BlobStorageService** — low-level, no DB dependency:
- `putBlobIfAbsent(content: string | Buffer)` → `{ hash, size_bytes, was_new }`
- `getBlob(hash: string)` → `string | null`
- `getBlobBuffer(hash: string)` → `Buffer | null`
- `putBlobs(items[])` → parallel upload
- `getBlobs(hashes[])` → parallel fetch

**SnapshotService** — orchestration layer:
- `createSnapshot(input)` → uploads blobs, creates snapshot row, updates project
- `getLatest(projectId)` → latest snapshot (cached)
- `getByVersion(projectId, version)` → specific version
- `listSnapshots(projectId, limit, offset)` → paginated
- `diff(projectId, fromVersion, toVersion)` → added/modified/deleted paths + optional text diffs
- `restore(projectId, targetVersion, userId)` → creates new snapshot from old manifest
- `getSnapshotFiles(projectId, version?)` → resolves all blob content
- `getFileContent(projectId, path)` → resolves single file

**FileStorageService** (rewritten) — same public interface, new internals:
- All existing methods preserved: `findByProjectId`, `findByPath`, `findByUuid`, `createOrUpdate`, `update`, `delete`, `deleteByPath`, `bulkCreateOrUpdate`, `getFileTree`, `getSnackFiles`, `getFilesForFrontend`
- Dual-read: checks `project.meta.blob_migrated` to route to S3 or DB
- All existing helpers preserved: `hashContent`, `inferLanguage`, `isAssetFile`, `buildFileTree`, `normalizePathForSnack`

### 5.11 API Changes

**No endpoint changes.** Same routes, same request/response shapes for existing file endpoints. Frontend is completely unaware of the change.

**New endpoints** (additive):

```
GET  /api/v1/projects/:projectId/snapshots                → list (paginated)
GET  /api/v1/projects/:projectId/snapshots/latest          → latest snapshot metadata
GET  /api/v1/projects/:projectId/snapshots/:version        → snapshot by version
GET  /api/v1/projects/:projectId/snapshots/:version/files  → all files at a version
GET  /api/v1/projects/:projectId/snapshots/diff?from=X&to=Y → diff between versions
POST /api/v1/projects/:projectId/snapshots/restore         → { version: number }
```

### 5.12 Migration Plan

Phased rollout, no big bang:

**Phase 1: New infrastructure (Week 1)**
- S3 client, BlobStorageService, SnapshotService created
- `project_snapshots` table created
- Project summary columns added
- All new code deployed but not yet active

**Phase 2: Dual-read FileStorageService (Week 1-2)**
- FileStorageService rewritten with dual-read logic
- New projects automatically use S3 + snapshots (`meta.blob_migrated = true`)
- Existing projects continue to use DB (`meta.blob_migrated = false`)

**Phase 3: Migration worker (Week 2)**
- Background job reads existing project files from DB
- Uploads content to S3 as blobs
- Creates initial snapshot (version 1) per project
- Verifies integrity via `content_hash`
- Sets `meta.blob_migrated = true`

**Phase 4: Cleanup (Week 3)**
- After all projects migrated and verified
- Remove dual-read logic from FileStorageService
- Drop `content` column from `project_files`
- Remove old DB-based code paths

### 5.13 Redis Cache Strategy

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `blob:{hash}` | 300s | File content (immutable, never needs invalidation) |
| `project:{id}:manifest` | 120s | Latest snapshot manifest |
| `project:{id}:snapshot:latest` | 120s | Latest snapshot metadata |
| `project:{id}:tree` | 120s | Computed file tree |
| `project:{id}:snack` | 60s | Snack-formatted files |

Invalidation on snapshot creation: delete `manifest`, `snapshot:latest`, `tree`, `snack` keys. Blob keys are never invalidated (immutable content).

### 5.14 Concurrency Control

- **Version numbering**: `SELECT MAX(version) FROM project_snapshots WHERE project_id = ? FOR UPDATE` within a transaction. This serializes version assignment per project.
- **Blob uploads**: Fully concurrent. Two servers uploading the same content produce the same hash and the same S3 key — the write is idempotent.
- **Snapshot creation**: The transaction lock on version numbering serializes snapshot creation per project. Blob uploads happen before the transaction, so they don't hold the lock.

## 6. Performance Comparison

| Operation | PostgreSQL (current) | Content-Addressed S3 + Redis |
|-----------|---------------------|------------------------------|
| Read single file (hot) | 5-15ms | <1ms (Redis) |
| Read single file (cold) | 5-15ms | 5-20ms (S3) |
| Write single file | 10-30ms | 10-30ms (S3 PUT) |
| Bulk write 20 files (AI gen) | 200-600ms | <100ms (parallel S3 PUTs) + <10ms (DB) |
| List all files (metadata) | 20-50ms | 1-5ms (Redis-cached manifest) |
| Get file tree | 30-60ms | 1-5ms (Redis-cached manifest) |
| Export ZIP | 100-300ms | 50-100ms (parallel S3 GETs) |
| Version diff | N/A | 10-50ms (fetch 2 manifests + changed blobs) |
| Horizontal scale | Native | Native |

Note: Individual S3 write latency (~10-30ms) is comparable to PostgreSQL, but the key win is **parallelism**. 20 files upload to S3 in parallel (<100ms total), whereas PostgreSQL batch writes are sequential due to transaction locking (200-600ms).

## 7. Durability & Failure Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| Server restarts | None — servers are stateless | Another server picks up requests |
| Server crashes mid-write | Orphan blobs in S3 (harmless) | Snapshot wasn't created, user retries |
| Redis failure | Slower reads (direct S3 fallback) | Circuit breaker skips Redis for 30s |
| S3 outage | Writes fail, cached reads still work | Wait for S3 recovery (99.999% uptime) |
| Disk failure | No impact — no local disk dependency | N/A |

## 8. Snapshot / Version History

Users get unlimited history depth. Storage is efficient because of content-addressed deduplication:

| Full snapshots approach | Content-addressed blobs |
|------------------------|------------------------|
| 5MB per snapshot (full copy) | ~50KB per snapshot (only new/changed blobs) |
| 100 snapshots = 500MB | 100 snapshots = ~5MB of unique content |
| Expensive at scale | Negligible cost |

Users can:
- View list of all past AI generations and manual saves
- See exactly what files the AI changed (diff view)
- Restore any file to a previous version
- Restore entire project to a previous state

## 9. Scaling Considerations

**Horizontal scaling (immediate):**
- Servers are stateless — add more behind a load balancer
- S3/R2 handles unlimited concurrent reads/writes
- PostgreSQL handles snapshot metadata (small rows, low write volume)
- Redis caches hot content across all servers

**10K projects:**
- ~50GB in S3 (with deduplication, likely much less)
- ~10K snapshot rows in PostgreSQL (trivial)
- No infrastructure changes needed

**100K projects:**
- PostgreSQL read replicas for snapshot queries
- Redis cluster for cache capacity
- S3/R2 handles this natively

**1M projects:**
- Shard `project_snapshots` table by project_id range
- Multiple Redis clusters
- S3/R2 still handles this natively (designed for this scale)

**Cold storage (future):**
- Blobs with no references in any recent snapshot can be garbage collected
- Old snapshots can be archived (keep manifest, mark blobs as cold)
- No special handling needed — S3/R2 storage classes handle tiering

## 10. Dependencies

| Dependency | Version | License | Size |
|------------|---------|---------|------|
| `@aws-sdk/client-s3` | ^3.x | Apache-2.0 | ~2MB |
| `isomorphic-git` | ^1.x | MIT | ~500KB (existing, for future GitHub export) |

No native dependencies. No Docker changes. No infrastructure changes for Phase 1.

## 11. Success Criteria

- [ ] File read operations serve from Redis cache in <1ms (hot path)
- [ ] Bulk AI generation writes complete in <100ms (parallel S3 PUTs)
- [ ] Every AI generation creates a versioned snapshot
- [ ] Users can view diffs between snapshots
- [ ] Users can restore to any previous snapshot
- [ ] No data loss on server restart or crash (S3 source of truth)
- [ ] Zero frontend changes required
- [ ] Existing projects migrated without data loss
- [ ] Servers remain stateless — horizontal scaling works out of the box

## 12. Open Questions

1. **Max project size limit?** — Should we cap file count or total size per project?
2. **Blob garbage collection** — How to clean up orphaned blobs that no snapshot references? Schedule? Reference counting?
3. **Snapshot retention** — Keep all snapshots forever, or prune after N versions?
4. **Large binary assets** — At what size should we skip Redis caching? Current threshold: 256KB.
