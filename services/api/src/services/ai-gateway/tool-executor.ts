import { logger } from "../../config";
import { FileStorageService } from "../file-storage.service";
import { WRITE_TOOL_NAMES } from "./agent-tools";
import type { AgentToolCall, AgentToolResult, AgentSideEffect, AgentPlan, ProposedChange } from "@raygan/shared";

export interface ToolExecutorContext {
  projectId: number;
  userId: number;
  conversationId?: number;
  planApproved: boolean;
}

export class ToolExecutor {
  private fileStorageService = new FileStorageService();
  private projectFilesCache = new Map<number, Awaited<ReturnType<FileStorageService["findByProjectId"]>>>();

  private async getProjectFiles(projectId: number) {
    const cached = this.projectFilesCache.get(projectId);
    if (cached) return cached;
    const files = await this.fileStorageService.findByProjectId(projectId);
    this.projectFilesCache.set(projectId, files);
    return files;
  }

  async execute(
    toolCall: AgentToolCall,
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const { name, id, input } = toolCall;

    if (WRITE_TOOL_NAMES.has(name) && !context.planApproved) {
      return {
        tool_use_id: id,
        content: "Error: Plan must be proposed and approved before making file changes. Call propose_plan first.",
        is_error: true,
      };
    }

    try {
      switch (name) {
        case "list_files":
          return await this.listFiles(id, context);
        case "read_file":
          return await this.readFile(id, input as { path: string }, context);
        case "search_code":
          return await this.searchCode(id, input as { query: string }, context);
        case "propose_plan":
          return this.proposePlan(id, input as { summary: string; changes: ProposedChange[] });
        case "create_file":
          return await this.createFile(id, input as { path: string; content: string }, context);
        case "modify_file":
          return await this.modifyFile(id, input as { path: string; content: string }, context);
        case "delete_file":
          return await this.deleteFile(id, input as { path: string }, context);
        case "validate_project":
          return await this.validateProject(id, context);
        default:
          return {
            tool_use_id: id,
            content: `Unknown tool: ${name}`,
            is_error: true,
          };
      }
    } catch (error) {
      logger.error({ error, toolCall, context: { projectId: context.projectId } }, "Tool execution failed");
      return {
        tool_use_id: id,
        content: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        is_error: true,
      };
    }
  }

  private async listFiles(
    toolUseId: string,
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const files = await this.getProjectFiles(context.projectId);
    const listing = files.map((f) => ({
      path: f.path,
      language: f.language || "unknown",
      size_bytes: f.content ? Buffer.byteLength(f.content, "utf-8") : 0,
    }));

    return {
      tool_use_id: toolUseId,
      content: listing.length > 0
        ? JSON.stringify(listing, null, 2)
        : "No files found in the project.",
    };
  }

  private async readFile(
    toolUseId: string,
    input: { path: string },
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const file = await this.fileStorageService.findByPath(context.projectId, input.path);
    if (!file) {
      return {
        tool_use_id: toolUseId,
        content: `File not found: ${input.path}`,
        is_error: true,
      };
    }

    return {
      tool_use_id: toolUseId,
      content: file.content || "",
    };
  }

  private async searchCode(
    toolUseId: string,
    input: { query: string },
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const files = await this.getProjectFiles(context.projectId);
    const matches: string[] = [];
    const queryLower = input.query.toLowerCase();

    for (const file of files) {
      if (!file.content) continue;
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.toLowerCase().includes(queryLower)) {
          matches.push(`${file.path}:${i + 1}: ${lines[i]!.trim()}`);
        }
      }
      if (matches.length > 50) break;
    }

    return {
      tool_use_id: toolUseId,
      content: matches.length > 0
        ? matches.join("\n")
        : `No matches found for "${input.query}"`,
    };
  }

  private proposePlan(
    toolUseId: string,
    input: { summary: string; changes: ProposedChange[] },
  ): AgentToolResult {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plan: AgentPlan = {
      plan_id: planId,
      summary: input.summary,
      changes: input.changes,
    };

    return {
      tool_use_id: toolUseId,
      content: `Plan proposed: ${input.summary}. Waiting for user approval...`,
      side_effects: [{ type: "plan_proposed", plan }],
    };
  }

  private async createFile(
    toolUseId: string,
    input: { path: string; content: string },
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const language = this.detectLanguage(input.path);
    await this.fileStorageService.createOrUpdate(
      {
        project_id: context.projectId,
        path: input.path,
        content: input.content,
        language,
        conversation_id: context.conversationId,
      },
      context.userId,
    );
    this.projectFilesCache.delete(context.projectId);

    const sideEffect: AgentSideEffect = {
      type: "file_created",
      path: input.path,
      content: input.content,
    };

    return {
      tool_use_id: toolUseId,
      content: `File created: ${input.path}`,
      side_effects: [sideEffect],
    };
  }

  private async modifyFile(
    toolUseId: string,
    input: { path: string; content: string },
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const language = this.detectLanguage(input.path);
    await this.fileStorageService.createOrUpdate(
      {
        project_id: context.projectId,
        path: input.path,
        content: input.content,
        language,
        conversation_id: context.conversationId,
      },
      context.userId,
    );
    this.projectFilesCache.delete(context.projectId);

    const sideEffect: AgentSideEffect = {
      type: "file_modified",
      path: input.path,
      content: input.content,
    };

    return {
      tool_use_id: toolUseId,
      content: `File modified: ${input.path}`,
      side_effects: [sideEffect],
    };
  }

  private async deleteFile(
    toolUseId: string,
    input: { path: string },
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const deleted = await this.fileStorageService.deleteByPath(
      context.projectId,
      input.path,
      context.userId,
    );
    this.projectFilesCache.delete(context.projectId);

    if (!deleted) {
      return {
        tool_use_id: toolUseId,
        content: `File not found: ${input.path}`,
        is_error: true,
      };
    }

    const sideEffect: AgentSideEffect = {
      type: "file_deleted",
      path: input.path,
    };

    return {
      tool_use_id: toolUseId,
      content: `File deleted: ${input.path}`,
      side_effects: [sideEffect],
    };
  }

  private async validateProject(
    toolUseId: string,
    context: ToolExecutorContext,
  ): Promise<AgentToolResult> {
    const files = await this.fileStorageService.findByProjectId(context.projectId);
    const errors: string[] = [];

    const filePaths = new Set(files.map((f) => f.path));
    const filesByName = new Map<string, string[]>();

    for (const file of files) {
      const name = file.path.split("/").pop() || file.path;
      const existing = filesByName.get(name) || [];
      existing.push(file.path);
      filesByName.set(name, existing);
    }

    for (const [name, paths] of filesByName) {
      if (paths.length > 1) {
        errors.push(`DUPLICATE: "${name}" exists at multiple paths: ${paths.join(", ")}`);
      }
    }

    const codeFiles = files.filter(
      (f) => f.content && /\.(ts|tsx|js|jsx)$/.test(f.path)
    );

    for (const file of codeFiles) {
      if (!file.content) continue;

      const importRegex = /(?:import\s+.*?from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(file.content)) !== null) {
        const importPath = match[1]!;

        if (
          !importPath.startsWith(".") &&
          !importPath.startsWith("/") &&
          !importPath.startsWith("@/") &&
          !importPath.startsWith("src/")
        ) {
          continue;
        }

        if (importPath.startsWith("@/") || importPath.startsWith("src/")) {
          errors.push(
            `BAD_IMPORT: "${file.path}" uses alias import "${importPath}" — must use relative imports (./  ../) for Snack compatibility`
          );
          continue;
        }

        const fileDir = file.path.includes("/")
          ? file.path.substring(0, file.path.lastIndexOf("/"))
          : "";

        let resolved: string;
        if (importPath.startsWith("./")) {
          resolved = fileDir ? `${fileDir}/${importPath.slice(2)}` : importPath.slice(2);
        } else if (importPath.startsWith("../")) {
          const parts = fileDir.split("/");
          let remainder = importPath;
          while (remainder.startsWith("../")) {
            parts.pop();
            remainder = remainder.slice(3);
          }
          resolved = parts.length > 0 ? `${parts.join("/")}/${remainder}` : remainder;
        } else {
          continue;
        }

        resolved = resolved.replace(/\.(ts|tsx|js|jsx)$/, "");

        const extensions = [".ts", ".tsx", ".js", ".jsx"];
        const found =
          filePaths.has(resolved) ||
          extensions.some((ext) => filePaths.has(`${resolved}${ext}`)) ||
          extensions.some((ext) => filePaths.has(`${resolved}/index${ext}`));

        if (!found) {
          errors.push(
            `MISSING_IMPORT: "${file.path}" imports "${importPath}" but no matching file found`
          );
        }
      }

      const hasJSX = /<[A-Z]/.test(file.content);
      if (hasJSX && file.path.endsWith(".ts") && !file.path.endsWith(".d.ts")) {
        errors.push(
          `WRONG_EXTENSION: "${file.path}" contains JSX but uses .ts — should be .tsx`
        );
      }

      if (file.path.endsWith(".tsx") || file.path.endsWith(".ts")) {
        if (/:\s*any\b/.test(file.content)) {
          const lineNum = file.content.substring(0, file.content.search(/:\s*any\b/)).split("\n").length;
          errors.push(
            `TYPE_WARNING: "${file.path}:${lineNum}" uses "any" type — use a specific type or "unknown"`
          );
        }
      }
    }

    const hasAppEntry = filePaths.has("App.tsx") || filePaths.has("App.js");
    const hasRouterLayout = filePaths.has("app/_layout.tsx") || filePaths.has("app/_layout.js");
    const hasRouterIndex = filePaths.has("app/index.tsx") || filePaths.has("app/index.js");

    if (!hasAppEntry && !hasRouterLayout && !hasRouterIndex) {
      errors.push(
        "MISSING_ENTRY: No App.tsx or app/_layout.tsx found — the app has no entry point and will crash"
      );
    }

    if (errors.length === 0) {
      return {
        tool_use_id: toolUseId,
        content: "Validation passed. No issues found.",
      };
    }

    return {
      tool_use_id: toolUseId,
      content: `Validation found ${errors.length} issue(s):\n\n${errors.join("\n")}\n\nFix these issues before finishing.`,
      is_error: true,
    };
  }

  private detectLanguage(path: string): string {
    const ext = path.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescriptreact",
      js: "javascript",
      jsx: "javascriptreact",
      json: "json",
      css: "css",
      md: "markdown",
    };
    return langMap[ext || ""] || "plaintext";
  }
}
