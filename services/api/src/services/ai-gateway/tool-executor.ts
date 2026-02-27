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
    const files = await this.fileStorageService.findByProjectId(context.projectId);
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
    const files = await this.fileStorageService.findByProjectId(context.projectId);
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
