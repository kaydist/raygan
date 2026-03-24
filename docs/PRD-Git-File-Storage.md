# PRD: Git-Based File Storage System

**Author:** Engineering
**Date:** 2026-03-09
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

## 2. Proposed Solution

Replace the PostgreSQL-based file storage with a **local filesystem + git** approach:

- Each project is a **bare git repository** on the server's local disk
- File reads/writes use `fs.readFile` / `fs.writeFile` (sub-millisecond)
- Every save point (AI generation, explicit save) creates a **git commit** for version history
- Periodic **S3/R2 backups** of the `.git` folder for durability
- File metadata stays in PostgreSQL (path, language, size — no content)

### Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   API Server      │────▶│  Local Disk      │
│   (Monaco)   │     │                   │     │  /data/projects/  │
└──────────────┘     │  GitStorageService │     │  {uuid}/         │
                     │                   │     │  ├── .git/        │
                     │                   │     │  ├── src/         │
                     │                   │     │  ├── package.json │
                     └───────┬───────────┘     └──────────────────┘
                             │
                     ┌───────▼───────────┐     ┌──────────────────┐
                     │  PostgreSQL       │     │  S3 / R2         │
                     │  (metadata only)  │     │  (periodic       │
                     │  path, lang, size │     │   backup)        │
                     └───────────────────┘     └──────────────────┘
```

## 3. Goals

| Goal | Metric |
|------|--------|
| Faster file operations | Read <1ms, write <2ms, bulk write (20 files) <10ms |
| Version history | Every AI generation creates a snapshot (git commit) |
| AI diff visibility | Users can see exactly what the AI changed |
| Durability | No data loss on server failure (S3 backup within 5 min) |
| No frontend changes | Same API response shape, frontend is unaware of storage backend |
| GitHub-ready | Git repo can be pushed to GitHub with minimal additional work |

## 4. Non-Goals

- Real-time collaborative editing (Month 4)
- Client-side git operations (browser)
- Git branching UI for users
- GitHub two-way sync (separate feature)
- Binary asset optimization (Git LFS — future consideration)

## 5. Detailed Design

### 5.1 Storage Layout

```
/data/projects/
└── {project_uuid}/
    ├── .git/                  # bare git history
    ├── src/
    │   ├── App.tsx
    │   ├── app/
    │   │   └── index.tsx
    │   └── components/
    │       └── Button.tsx
    ├── assets/
    │   └── icon.png
    ├── app.json
    └── package.json
```

### 5.2 GitStorageService Interface

The new service maintains the same public API as the current `FileStorageService` so controllers require minimal changes.

```typescript
export class GitStorageService {
  // Project lifecycle
  initRepo(projectUuid: string): Promise<void>
  deleteRepo(projectUuid: string): Promise<void>

  // File CRUD (same interface as current FileStorageService)
  findByProjectId(projectUuid: string): Promise<FileEntry[]>
  findByPath(projectUuid: string, path: string): Promise<FileEntry | null>
  createOrUpdate(input: CreateFileInput): Promise<FileEntry>
  update(projectUuid: string, path: string, content: string): Promise<FileEntry>
  delete(projectUuid: string, path: string): Promise<boolean>
  bulkCreateOrUpdate(projectUuid: string, files: FileInput[]): Promise<FileEntry[]>

  // Tree & Snack format
  getFileTree(projectUuid: string): Promise<FileTreeNode[]>
  getSnackFiles(projectUuid: string): Promise<SnackFiles>

  // Git-specific (new capabilities)
  commit(projectUuid: string, message: string, author: string): Promise<string>
  getHistory(projectUuid: string, path?: string, limit?: number): Promise<CommitEntry[]>
  getDiff(projectUuid: string, commitA: string, commitB: string): Promise<FileDiff[]>
  getFileAtCommit(projectUuid: string, path: string, commitHash: string): Promise<string>

  // Export
  archiveZip(projectUuid: string): Promise<ReadableStream>
}
```

### 5.3 Commit Strategy

Not every file write creates a git commit. Commits are created at meaningful save points:

| Event | Creates commit? | Commit message |
|-------|----------------|----------------|
| AI generation completes | Yes | `ai: {prompt summary}` |
| User clicks Save / Ctrl+S | Yes | `save: manual save` |
| Auto-save (30s debounce after last edit) | Yes | `autosave` |
| Individual keystroke in Monaco | No | — |
| Project creation from template | Yes | `init: project created from {template}` |
| Bulk file import | Yes | `import: {n} files added` |

Between commits, files are written to disk immediately (for reads) but uncommitted (dirty working tree).

### 5.4 S3 Backup Strategy

A background job backs up project repos to S3/R2 for durability:

| Trigger | Action |
|---------|--------|
| After every git commit | Queue backup job |
| Every 5 minutes | Flush any unbacked projects |
| On project close (user disconnects) | Immediate backup |

Backup format: `tar.gz` of the `.git` directory.

```
s3://raygan-backups/
└── repos/
    └── {project_uuid}/
        ├── latest.tar.gz          # most recent backup
        └── history/
            └── 2026-03-09T12:00.tar.gz  # periodic snapshots
```

Restore flow: download `latest.tar.gz` → extract to `/data/projects/{uuid}/.git/` → `git checkout`.

### 5.5 Technology

| Component | Choice | Reason |
|-----------|--------|--------|
| Git library | `isomorphic-git` (MIT, free) | Pure JS, no native deps, Node.js compatible |
| Filesystem | Node.js `fs/promises` | Native, zero latency |
| Backup target | Cloudflare R2 | S3-compatible, zero egress fees |
| Backup client | `@aws-sdk/client-s3` | Standard S3 SDK |
| Background jobs | BullMQ (existing) | Already in the stack |

### 5.6 Database Changes

**`project_files` table — dropped entirely.**

The filesystem + git is the single source of truth. No metadata table, no dual-write, no sync issues.

Everything the metadata table provided is now derived from the filesystem:

| Previously in DB | Now derived from |
|-----------------|------------------|
| `path`, `name` | Filesystem path (`fs.readdir` recursive) |
| `file_type` | File extension detection |
| `language` | File extension mapping |
| `mime_type` | File extension mapping |
| `size_bytes` | `fs.stat()` |
| `content_hash` | Computed on read if needed |
| `is_directory` | `fs.stat().isDirectory()` |
| `version` | Git commit count for file (`git log --follow`) |
| `content` | `fs.readFile()` |
| `conversation_id` | Git commit metadata (stored in commit message or trailer) |
| `parent_id` | Directory structure on disk |

**Migration:** A new migration drops the `project_files` table after all projects have been migrated to disk.

**Trade-off accepted:** No SQL queries like "find all TypeScript files across all projects." This is acceptable because:
- Files are always accessed in the context of a single project
- Within a project, `fs.readdir` + extension filtering is faster than a DB query
- Cross-project file search is not a product feature

### 5.7 Migration Plan

Phased rollout, no big bang:

**Phase 1: New projects (Week 1)**
- New `GitStorageService` replaces `FileStorageService`
- New projects use git storage on disk
- Existing projects continue to work via DB (dual-read fallback)

**Phase 2: Migration worker (Week 2)**
- Background job reads existing project files from DB
- Writes to local disk + creates initial git commit
- Verifies file integrity via `content_hash`
- Marks project as migrated

**Phase 3: Drop table (Week 3)**
- After all projects migrated and verified
- Migration to drop `project_files` table entirely
- Remove `FileStorageService`, `ProjectFile` entity, and related migration
- Remove `project_files` cache keys from Redis
- Clean up controller to only use `GitStorageService`

### 5.8 API Changes

**No endpoint changes.** Same routes, same request/response shapes. The controller switches which service it calls based on the storage backend.

Frontend is completely unaware of the change.

**New endpoints** (additive):

```
GET  /api/v1/projects/:projectId/history                    # commit log
GET  /api/v1/projects/:projectId/history/:commitHash        # files at commit
GET  /api/v1/projects/:projectId/diff?from=abc&to=def       # diff between commits
```

## 6. Performance Comparison

| Operation | PostgreSQL (current) | Filesystem + git |
|-----------|---------------------|------------------|
| Read single file | 5-15ms | <1ms |
| Write single file | 10-30ms | 1-2ms |
| List all files | 20-50ms | 2-5ms |
| Bulk write 20 files (AI gen) | 200-600ms | 5-10ms + 20-50ms commit |
| Get file tree | 30-60ms | 3-5ms |
| Export ZIP | 100-300ms | 10-30ms |

## 7. Durability & Failure Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| User goes offline | None — data is on server | User reconnects, resumes |
| User clears browser | None — nothing stored client-side | Re-fetch from API |
| Server restarts | None — disk persists | Auto-recovery |
| Server disk failure | Potential loss of uncommitted edits | Restore from S3 backup (up to 5 min behind) |
| S3 outage | No new backups | Retry queue, local data unaffected |

## 8. Snapshot / Version History

Users get unlimited history depth. Storage is efficient because git stores deltas:

| Full snapshots (S3 approach) | Git deltas |
|------------------------------|------------|
| 5MB per snapshot | ~50KB per commit (only changed lines) |
| 100 snapshots = 500MB | 100 commits = ~5MB |
| Expensive at scale | Negligible cost |

Users can:
- View list of all past AI generations and manual saves
- See exactly what files the AI changed (diff view)
- Restore any file to a previous version
- Restore entire project to a previous state

## 9. Scaling Considerations

**Single server (MVP — sufficient to ~10,000 projects):**
- Local SSD, ~50GB for 10K active projects
- S3 backup for durability

**Multi-server (future):**
- Persistent volumes (EBS/NFS) mounted per server
- Project-to-server affinity via consistent hashing
- Or: shared NFS mount across servers

**Cold storage (future):**
- Inactive projects (no edits in 30 days) archived to S3
- Restored to disk on next access (~2-3s cold start)

## 10. Dependencies

| Dependency | Version | License | Size |
|------------|---------|---------|------|
| `isomorphic-git` | ^1.x | MIT | ~500KB |
| `@aws-sdk/client-s3` | ^3.x | Apache-2.0 | Existing in stack or ~2MB |

No native dependencies. No Docker changes. No infrastructure changes for Phase 1.

## 11. Success Criteria

- [ ] File read/write operations are 5-10x faster than current DB approach
- [ ] Every AI generation creates a versioned snapshot
- [ ] Users can view diffs between AI generations
- [ ] No data loss on server restart
- [ ] S3 backup restores project within 5 minutes of disk failure
- [ ] Zero frontend changes required
- [ ] Existing projects migrated without data loss

## 12. Open Questions

1. **Max project size limit?** — Should we cap file count or total size per project?
2. **Git garbage collection** — Run `git gc` on schedule or on commit threshold?
3. **Binary assets** — Store in git or separate to S3 with pointer files (Git LFS pattern)?
4. **Multi-region** — If servers span regions, how to handle repo locality?
