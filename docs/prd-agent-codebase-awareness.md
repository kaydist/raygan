# PRD: Agent Codebase Awareness

## Overview

**Problem:** AI agents generating code have limited awareness of the existing project, leading to incomplete transformations (e.g., "convert todo app to weather app" leaves old todo code behind).

**Solution:** Replace the current single-shot prompt approach with an **agentic tool-use architecture** where the AI explores the project on-demand, plans changes with user approval, and executes modifications through structured tool calls.

---

## Problem Statement

### Current Behavior
1. Only top 5 `.ts`/`.tsx` files sent to AI
2. File content truncated to 500 characters
3. No concept of file deletion
4. No understanding of file relationships/dependencies
5. AI makes isolated changes without full project awareness
6. Single-shot generation — no ability to self-correct or explore

### User Impact
- "Convert X to Y" leaves orphaned files
- New features duplicate existing patterns instead of reusing
- Inconsistent naming/styling across generated files
- User must manually clean up incomplete transformations
- AI cannot reason about files it hasn't seen

---

## Goals

| Goal | Metric |
|------|--------|
| On-demand project awareness | AI reads only what it needs, scales to any project size |
| Coherent transformations | Zero orphaned files after conversion |
| Dependency understanding | AI follows import chains via tool calls |
| Structured change operations | Typed CREATE/MODIFY/DELETE via tool calls (no regex parsing) |
| User approval for destructive changes | Change plan preview before execution |
| AST integration | All file operations emit `ast:patch` WebSocket events |

---

## User Stories

1. **As a user**, when I say "convert this todo app to a weather app", I expect ALL todo-related code to be removed and replaced with weather functionality.

2. **As a user**, when I add a new feature, the AI should reuse my existing patterns (tokens, API client, types) instead of creating duplicates.

3. **As a user**, I want to see what the AI plans to change BEFORE it makes changes to multiple files.

4. **As a user**, I want to see the AI's progress in real-time (which files it's reading, what it's planning) rather than waiting on a blank screen.

---

## Proposed Solution: Agentic Tool-Use Architecture

### Why Tool-Use Over Manifest-Stuffing

The previous approach tried to solve context awareness by brute-forcing all files into a single prompt. This fails because:
- Token limits are hit quickly (a 50-file Expo project can exceed 100K tokens)
- Most files are irrelevant to any given request
- No ability for the AI to self-correct or explore deeper
- Requires fragile regex parsing of markdown output

The agentic approach gives the AI **tools to explore and modify the project on-demand**, the same pattern used by Claude Code, Cursor, and Copilot Workspace.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Prompt                             │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              1. Agent Loop (Multi-Turn)                      │
│                                                              │
│   The AI receives the user prompt + project tool definitions │
│   and drives its own exploration/execution cycle.            │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  EXPLORE PHASE                                        │  │
│   │  • list_files → sees project structure                │  │
│   │  • read_file  → reads relevant files on-demand        │  │
│   │  • search_code → finds patterns, usages, imports      │  │
│   │  (AI decides what to read based on the request)       │  │
│   └──────────────────────┬───────────────────────────────┘  │
│                          ▼                                   │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  PLAN PHASE                                           │  │
│   │  • AI outputs a structured change plan via tool call  │  │
│   │  • Plan streamed to UI for user review                │  │
│   │  • User approves or rejects                           │  │
│   └──────────────────────┬───────────────────────────────┘  │
│                          ▼                                   │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  EXECUTE PHASE                                        │  │
│   │  • create_file → creates new files                    │  │
│   │  • modify_file → edits existing files                 │  │
│   │  • delete_file → removes files (soft-delete)          │  │
│   │  • Each tool call emits ast:patch via WebSocket       │  │
│   │  • All changes staged, then committed atomically      │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### What This Eliminates

| Old Approach (Removed) | Replacement |
|------------------------|-------------|
| Project manifest generator | AI calls `list_files` + `read_file` on-demand |
| Keyword-based intent detection | LLM natively understands intent from context |
| Token budget tiers (small/medium/large) | Tool-use is self-regulating — AI reads only what it needs |
| DELETE regex parsing | Structured `delete_file` tool calls |
| Custom markdown syntax | Native LLM tool-use / function calling |
| Response parser for deletions | Tool call results are typed JSON |

---

## Technical Design

### 1. Agent Tools

These are the tools exposed to the LLM via function calling:

```typescript
// Read-only tools (Explore Phase)
interface ListFilesTool {
  name: "list_files";
  parameters: {
    path?: string;        // subdirectory to list (default: project root)
    recursive?: boolean;  // include nested directories (default: true)
  };
  returns: {
    files: Array<{
      path: string;
      size: number;
      type: "file" | "directory";
      extension: string;
    }>;
    total_files: number;
  };
}

interface ReadFileTool {
  name: "read_file";
  parameters: {
    path: string;
  };
  returns: {
    path: string;
    content: string;
    lines: number;
  };
}

interface SearchCodeTool {
  name: "search_code";
  parameters: {
    query: string;          // text or regex pattern
    file_pattern?: string;  // glob filter (e.g., "*.tsx")
  };
  returns: {
    matches: Array<{
      path: string;
      line: number;
      content: string;
    }>;
  };
}

// Planning tool (Plan Phase)
interface ProposePlanTool {
  name: "propose_plan";
  parameters: {
    summary: string;
    operations: Array<{
      action: "CREATE" | "MODIFY" | "DELETE" | "KEEP";
      path: string;
      reason: string;
      description?: string;  // what will change (for MODIFY)
    }>;
  };
  returns: {
    approved: boolean;
  };
}

// Write tools (Execute Phase — only available after plan approval)
interface CreateFileTool {
  name: "create_file";
  parameters: {
    path: string;
    content: string;
  };
  returns: { success: boolean };
}

interface ModifyFileTool {
  name: "modify_file";
  parameters: {
    path: string;
    content: string;  // full file content after modification
  };
  returns: { success: boolean };
}

interface DeleteFileTool {
  name: "delete_file";
  parameters: {
    path: string;
    reason: string;
  };
  returns: { success: boolean };
}
```

### 2. Agent Loop (Backend)

The core multi-turn loop that drives the AI agent:

```typescript
async function agentLoop(
  projectId: string,
  userPrompt: string,
  conversationHistory: Message[],
  onEvent: (event: AgentEvent) => void
): Promise<AgentResult> {
  const messages: Message[] = [
    { role: "system", content: buildSystemPrompt(projectId) },
    ...conversationHistory,
    { role: "user", content: userPrompt },
  ];

  const maxTurns = 20;
  let planApproved = false;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await aiAdapter.generate(messages, {
      tools: planApproved ? ALL_TOOLS : READ_ONLY_TOOLS.concat(PLAN_TOOL),
    });

    // AI finished — stream final message to user
    if (response.stop_reason === "end_turn") {
      onEvent({ type: "complete", message: response.content });
      return { success: true, messages };
    }

    // AI wants to use tools
    if (response.stop_reason === "tool_use") {
      const toolResults: ToolResult[] = [];

      for (const call of response.tool_calls) {
        onEvent({ type: "tool_call", tool: call.name, params: call.parameters });

        if (call.name === "propose_plan") {
          // Stream plan to UI, wait for user approval
          onEvent({ type: "plan_proposed", plan: call.parameters });
          const approved = await waitForUserApproval(projectId);
          planApproved = approved;
          toolResults.push({ id: call.id, result: { approved } });
        } else {
          const result = await executeProjectTool(projectId, call);
          toolResults.push({ id: call.id, result });
        }
      }

      messages.push({ role: "assistant", content: response });
      messages.push({ role: "user", content: toolResults });
    }
  }

  return { success: false, error: "max_turns_exceeded" };
}
```

### 3. Tool Execution & AST Integration

Each write tool emits AST patches to keep all modes in sync:

```typescript
async function executeProjectTool(
  projectId: string,
  call: ToolCall
): Promise<ToolResult> {
  switch (call.name) {
    case "list_files":
      return fileStorageService.listFiles(projectId, call.parameters);

    case "read_file":
      return fileStorageService.readFile(projectId, call.parameters.path);

    case "search_code":
      return fileStorageService.searchCode(projectId, call.parameters);

    case "create_file": {
      const result = await fileStorageService.createFile(
        projectId,
        call.parameters.path,
        call.parameters.content
      );
      // Emit AST patch for real-time sync
      socketService.emitToProject(projectId, "ast:patch", {
        type: "file_created",
        path: call.parameters.path,
        version: result.version,
      });
      return result;
    }

    case "modify_file": {
      const result = await fileStorageService.updateFile(
        projectId,
        call.parameters.path,
        call.parameters.content
      );
      socketService.emitToProject(projectId, "ast:patch", {
        type: "file_modified",
        path: call.parameters.path,
        version: result.version,
      });
      return result;
    }

    case "delete_file": {
      // Soft-delete: mark deleted_flag, preserve for recovery
      const result = await fileStorageService.softDeleteFile(
        projectId,
        call.parameters.path,
        call.parameters.reason
      );
      socketService.emitToProject(projectId, "ast:patch", {
        type: "file_deleted",
        path: call.parameters.path,
        version: result.version,
      });
      return result;
    }
  }
}
```

### 4. Atomic Change Transaction

All write operations within a single agent run are staged and committed atomically:

```typescript
interface ChangeTransaction {
  project_id: string;
  agent_run_id: string;
  operations: Array<{
    action: "CREATE" | "MODIFY" | "DELETE";
    path: string;
    content?: string;
    previous_content?: string;  // for rollback
    reason: string;
  }>;
  status: "pending" | "committed" | "rolled_back";
  created_on: Date;
}
```

- All write tool calls accumulate in a transaction
- On agent completion, the transaction commits (all changes applied)
- On failure at any step, the transaction rolls back (all changes reverted)
- Transactions are persisted for undo/rollback support

### 5. System Prompt Structure

```
## System Prompt for Agent Mode

1. Platform Context (existing)
   - Expo managed workflow constraint
   - React Native / TypeScript conventions

2. Agent Capabilities (NEW)
   - Available tools and when to use them
   - Must call list_files before making changes
   - Must call propose_plan before any destructive changes
   - Must read a file before modifying it

3. Behavioral Rules (NEW)
   - Explore first, then plan, then execute
   - Reuse existing patterns found in the project
   - Never create duplicate utilities
   - Preserve shared/common files unless explicitly asked
   - Update root wiring (App.tsx, navigation, barrel exports)

4. Code Quality Rules (existing)
   - Naming conventions, file structure
   - Expo SDK compatibility

5. Output Format (SIMPLIFIED)
   - All code changes via tool calls (no markdown parsing)
   - Explanations in natural language between tool calls
```

---

## SSE Event Stream

Agent events are streamed to the frontend via SSE for real-time UI updates:

```typescript
type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; tool: string; params: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: Record<string, unknown> }
  | { type: "plan_proposed"; plan: ChangePlan }
  | { type: "plan_approved" }
  | { type: "plan_rejected" }
  | { type: "file_created"; path: string }
  | { type: "file_modified"; path: string }
  | { type: "file_deleted"; path: string }
  | { type: "complete"; message: string }
  | { type: "error"; error: string };
```

---

## UI Integration

### Chat Panel — Real-Time Agent Activity

As the agent works, the chat panel streams activity:

```
User: Convert this todo app to a weather app

Agent: I'll explore your project first to understand the current structure.

  📂 Reading project files...
  📄 Reading App.tsx
  📄 Reading screens/TodoScreen.tsx
  📄 Reading hooks/useTodos.ts
  📄 Reading components/TodoItem.tsx
  📄 Reading utils/api.ts

I've reviewed your project. Here's my plan:

┌─────────────────────────────────────────┐
│  Proposed Changes                       │
├─────────────────────────────────────────┤
│  ✚ CREATE  screens/WeatherScreen.tsx    │
│  ✚ CREATE  hooks/useWeather.ts          │
│  ✚ CREATE  components/WeatherCard.tsx   │
│  ✎ MODIFY  App.tsx                      │
│  ✕ DELETE  screens/TodoScreen.tsx       │
│  ✕ DELETE  hooks/useTodos.ts            │
│  ✕ DELETE  components/TodoItem.tsx      │
│  ─ KEEP    utils/api.ts                 │
├─────────────────────────────────────────┤
│  [Cancel]              [Apply Changes]  │
└─────────────────────────────────────────┘
```

### File Explorer — Live Updates

As the agent creates/modifies/deletes files, the file explorer updates in real-time via `ast:patch` WebSocket events. Deleted files are visually dimmed with a recovery option.

### Code Editor — Diff View

When the agent modifies a file, the code editor shows a diff view highlighting what changed.

---

## Implementation Phases

### Phase 1: Core Agent Loop (MVP)
- [ ] Define tool schemas (`list_files`, `read_file`, `search_code`, `create_file`, `modify_file`, `delete_file`, `propose_plan`)
- [ ] Implement agent loop with multi-turn tool execution
- [ ] Implement tool execution handlers in file storage service
- [ ] Soft-delete support for `delete_file`
- [ ] SSE event streaming for agent activity
- [ ] Change plan UI with approve/reject in chat panel
- [ ] AST patch emission for all write operations
- [ ] System prompt with agent behavioral rules
- [ ] Guard: write tools only available after plan approval

### Phase 2: Reliability & Rollback
- [ ] Atomic change transactions (stage → commit / rollback)
- [ ] Transaction persistence for undo support
- [ ] "Undo last generation" button in UI
- [ ] Diff view for modifications in code editor
- [ ] Guard against hallucinated file paths (validate against actual project)
- [ ] Max token budget per agent run (circuit breaker)

### Phase 3: Performance & Scale
- [ ] Parallel tool call execution (independent reads)
- [ ] File content caching within agent session
- [ ] Incremental `list_files` (send diff from last call)
- [ ] Streaming file writes (write as generated, don't buffer full content)
- [ ] Conversation history summarization for long sessions

---

## Files to Create / Modify

| File | Changes |
|------|---------|
| `services/api/src/services/ai-gateway/agent-loop.ts` | **NEW**: Core multi-turn agent loop |
| `services/api/src/services/ai-gateway/agent-tools.ts` | **NEW**: Tool definitions and schemas |
| `services/api/src/services/ai-gateway/tool-executor.ts` | **NEW**: Tool execution dispatcher |
| `services/api/src/services/ai-gateway/prompt-builder.ts` | Update system prompt with agent instructions |
| `services/api/src/services/file-storage.service.ts` | Add `softDeleteFile`, `searchCode`, `listFiles` methods |
| `services/api/src/routes/v1/generate.ts` | Update to use agent loop, stream SSE events |
| `services/api/src/db/entities/change-transaction.entity.ts` | **NEW**: Transaction entity (Phase 2) |
| `apps/web/src/features/agent/hooks/use-generate.ts` | Handle new SSE event types |
| `apps/web/src/features/agent/components/chat-panel.tsx` | Render agent activity, tool calls, plan preview |
| `apps/web/src/features/agent/components/change-plan.tsx` | **NEW**: Change plan approval UI component |

---

## Success Criteria

1. **Transformation Test:** "Convert todo app to weather app" results in:
   - AI explores project via `list_files` + `read_file` (no blind changes)
   - Change plan shown to user before execution
   - All todo files soft-deleted
   - Weather files created
   - Shared utilities preserved
   - App.tsx navigation updated
   - No orphaned imports

2. **Additive Test:** "Add user authentication" results in:
   - AI reads existing code to find patterns
   - Reuses existing tokens, API client patterns
   - No duplicate utilities created
   - Proper integration with existing navigation

3. **Scale Test:** Works correctly on projects with 100+ files without hitting token limits

4. **Performance:**
   - Agent explore phase < 3s for projects under 50 files
   - Plan presented to user within 5s of prompt
   - Full execution < 30s for typical transformations

5. **Reliability:**
   - Failed execution rolls back all changes (Phase 2)
   - No hallucinated file paths (validated against project)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Latency from multi-turn | Stream each step to UI so user sees progress; parallelize independent tool calls |
| Agent stuck in loop | Max turn limit (20); circuit breaker on total tokens consumed |
| Accidental deletion | Soft-delete only; plan approval required before any writes; transaction rollback |
| AI hallucinating file paths | Validate all paths against actual project files before execution |
| Token cost from multi-turn | Cache file contents within session; read-only tools are cheap (input tokens only) |
| AI skipping explore phase | System prompt enforces: must `list_files` before writes; guard blocks write tools until plan approved |

---

## Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Show change plan preview before applying? | **Yes, always for multi-file changes** | Moved to Phase 1 — critical for user trust |
| Soft-delete or hard-delete? | **Soft-delete with recovery** | Aligns with existing `deleted_flag` pattern on all entities |
| How to handle large projects (100+ files)? | **Tool-use is self-regulating** | AI reads only what it needs; no need for tiered strategies |
| Support "undo last generation"? | **Yes, via change transactions** | Phase 2 — transactions enable this naturally |
| Intent detection approach? | **None — removed** | LLM natively understands intent; keyword matching is fragile and unnecessary |

---

## References

- **Claude Code**: Agentic tool-use with on-demand file reading — direct inspiration for this architecture
- **Cursor**: Multi-turn agent with tool calls for codebase exploration
- **Copilot Workspace**: Plan → Execute model with user approval gates
- **Anthropic Tool Use Docs**: Structured tool calling with parallel execution support
