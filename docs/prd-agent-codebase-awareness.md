# PRD: Agent Codebase Awareness

## Overview

**Problem:** AI agents generating code have limited awareness of the existing project, leading to incomplete transformations (e.g., "convert todo app to weather app" leaves old todo code behind).

**Solution:** Implement full project context with change planning, enabling coherent cross-file transformations.

---

## Problem Statement

### Current Behavior
1. Only top 5 `.ts`/`.tsx` files sent to AI
2. File content truncated to 500 characters
3. No concept of file deletion
4. No understanding of file relationships/dependencies
5. AI makes isolated changes without full project awareness

### User Impact
- "Convert X to Y" leaves orphaned files
- New features duplicate existing patterns instead of reusing
- Inconsistent naming/styling across generated files
- User must manually clean up incomplete transformations

---

## Goals

| Goal | Metric |
|------|--------|
| Full project awareness | AI sees 100% of project files |
| Coherent transformations | Zero orphaned files after conversion |
| Dependency understanding | AI follows import chains |
| Change planning | Explicit CREATE/MODIFY/DELETE operations |

---

## User Stories

1. **As a user**, when I say "convert this todo app to a weather app", I expect ALL todo-related code to be removed and replaced with weather functionality.

2. **As a user**, when I add a new feature, the AI should reuse my existing patterns (tokens, API client, types) instead of creating duplicates.

3. **As a user**, I want to see what the AI plans to change BEFORE it makes changes to multiple files.

---

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Prompt                             │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Intent Detection                             │
│   • Is this a transformation? (convert, rebuild, replace)    │
│   • Is this additive? (add, create, implement)               │
│   • Is this a modification? (fix, update, change)            │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Project Manifest Generation                  │
│   • Inventory ALL files with metadata                        │
│   • Extract exports, imports, dependencies                   │
│   • Categorize: screens, components, hooks, utils, types     │
│   • Build dependency graph                                   │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Context Assembly                             │
│   • Full file contents (for small projects <50 files)        │
│   • Summarized manifest + relevant files (for large)         │
│   • Include dependency chain for mentioned components        │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Change Planning (for transformations)        │
│   AI outputs structured plan:                                │
│   • CREATE: new files needed                                 │
│   • MODIFY: existing files to update                         │
│   • DELETE: files to remove                                  │
│   • KEEP: files unchanged                                    │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Execution                                    │
│   • Generate code for CREATE/MODIFY                          │
│   • Mark files for DELETE                                    │
│   • Apply all changes atomically                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Design

### 1. Project Manifest

```typescript
interface ProjectManifest {
  totalFiles: number;
  categories: {
    screens: FileEntry[];
    components: FileEntry[];
    hooks: FileEntry[];
    utils: FileEntry[];
    types: FileEntry[];
    config: FileEntry[];
  };
  dependencyGraph: Map<string, string[]>; // file -> imports
}

interface FileEntry {
  path: string;
  purpose: string;        // AI-friendly description
  exports: string[];      // exported symbols
  imports: string[];      // dependencies
  lines: number;
  contentHash: string;    // for change detection
}
```

### 2. Intent Detection

```typescript
type IntentType = "transform" | "add" | "modify" | "delete" | "query";

interface DetectedIntent {
  type: IntentType;
  confidence: number;
  targetFiles?: string[];      // mentioned files
  targetConcepts?: string[];   // "todo", "auth", "weather"
}

// Keywords for transformation detection
const TRANSFORM_KEYWORDS = [
  "convert", "transform", "change to", "make it a",
  "turn into", "rebuild as", "switch to", "replace with",
  "start fresh", "start over", "completely different"
];
```

### 3. Context Size Strategy

| Project Size | Strategy |
|--------------|----------|
| Small (<20 files, <50KB) | Send ALL file contents |
| Medium (20-50 files) | Full manifest + full content of relevant files |
| Large (50+ files) | Manifest summaries + relevant file contents + on-demand retrieval |

### 4. Change Plan Output Format

```typescript
interface ChangePlan {
  summary: string;
  operations: ChangeOperation[];
}

interface ChangeOperation {
  action: "CREATE" | "MODIFY" | "DELETE" | "KEEP";
  path: string;
  reason: string;
  newContent?: string;  // for CREATE/MODIFY
}
```

### 5. Prompt Structure Update

```
## System Prompt Layers

1. Platform Context (existing)
2. Project Manifest (NEW)
   - Complete file inventory with purposes
   - Dependency relationships
3. Full File Contents (UPDATED)
   - ALL files, not just top 5
   - No truncation for small projects
4. Code Quality Rules (existing)
5. Change Planning Instructions (NEW)
   - For transformations: require explicit plan
   - DELETE syntax: ```delete filename="path"```
6. Output Format (UPDATED)
   - Support DELETE operations
7. Few-Shot Examples (UPDATED)
   - Add transformation example
```

---

## Response Parser Updates

### New DELETE Syntax

```markdown
```delete filename="screens/TodoScreen.tsx"
Reason: Removing todo functionality as part of weather app conversion
```
```

### Parser Changes

```typescript
interface ParsedResponse {
  files: GeneratedFile[];
  deletions: FileDeletion[];   // NEW
  message: string;
}

interface FileDeletion {
  path: string;
  reason: string;
}

// Regex for delete blocks
const DELETE_REGEX = /```delete\s+filename="([^"]+)"([^`]*?)```/g;
```

---

## UI Considerations

### Change Plan Preview (Optional - Phase 2)

Before applying a transformation, show user:

```
┌─────────────────────────────────────────┐
│  Proposed Changes                       │
├─────────────────────────────────────────┤
│  ✚ CREATE  screens/WeatherScreen.tsx    │
│  ✚ CREATE  hooks/useWeather.ts          │
│  ✎ MODIFY  App.tsx                      │
│  ✎ MODIFY  utils/tokens.ts              │
│  ✕ DELETE  screens/TodoScreen.tsx       │
│  ✕ DELETE  hooks/useTodos.ts            │
│  ✕ DELETE  components/TodoItem.tsx      │
│  ─ KEEP    utils/api.ts                 │
├─────────────────────────────────────────┤
│  [Cancel]              [Apply Changes]  │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Full Context (MVP)
- [ ] Project manifest generator
- [ ] Send ALL files to AI (no truncation)
- [ ] Intent detection for transformations
- [ ] Change planning instructions in prompt
- [ ] DELETE operation parsing
- [ ] Apply deletions in file storage service

### Phase 2: Smart Context (Optimization)
- [ ] Token budget management
- [ ] Dependency graph for selective inclusion
- [ ] File summarization for large projects
- [ ] Caching of manifest/embeddings

### Phase 3: User Control (UX)
- [ ] Change plan preview UI
- [ ] User approval before destructive changes
- [ ] Undo/rollback support
- [ ] Diff view for modifications

---

## Files to Modify

| File | Changes |
|------|---------|
| `services/api/src/services/ai-gateway/prompt-builder.ts` | Add manifest, full files, change planning |
| `services/api/src/services/ai-gateway/response-parser.ts` | Parse DELETE blocks |
| `services/api/src/services/generation.service.ts` | Handle deletions, build manifest |
| `services/api/src/services/file-storage.service.ts` | Support file deletion |
| `services/api/src/services/ai-gateway/project-manifest.ts` | NEW: Manifest builder |
| `services/api/src/services/ai-gateway/intent-detector.ts` | NEW: Intent detection |

---

## Success Criteria

1. **Transformation Test:** "Convert todo app to weather app" results in:
   - All todo files deleted
   - Weather files created
   - Shared utilities preserved
   - No orphaned imports

2. **Additive Test:** "Add user authentication" results in:
   - Reuses existing tokens, API patterns
   - No duplicate utilities created
   - Proper integration with existing navigation

3. **Performance:** Context assembly < 500ms for projects under 50 files

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Token limit exceeded | Implement token budgeting, prioritize relevant files |
| Accidental deletion | Require confirmation for DELETE, implement soft-delete |
| Slow generation | Cache manifests, incremental updates |
| AI hallucinating files | Validate paths against actual project files |

---

## Open Questions

1. Should we show change plan preview before applying? (Recommended: Yes for transformations)
2. Should deletions be soft-delete with recovery option? (Recommended: Yes)
3. How to handle very large projects (100+ files)? (Embedding-based retrieval?)
4. Should we support "undo last generation"? (Nice to have)

---

## References

- Claude Code: Agentic tool-use with on-demand file reading
- Cursor: RAG with codebase embeddings
- GitHub Copilot: Jaccard similarity + open tabs context
