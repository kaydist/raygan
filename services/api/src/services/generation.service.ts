import { logger } from "../config";
import { ProjectService } from "./project.service";
import { ConversationService } from "./conversation.service";
import { AIProviderService } from "./ai-provider.service";
import { FileStorageService } from "./file-storage.service";
import { getAIGateway, PromptBuilder, ResponseParser } from "./ai-gateway";
import type { CodeBlock } from "./ai-gateway/response-parser";
import { parseAIResponse } from "./ast-engine";
import type { ASTNode, ASTOperation } from "@staq/shared";
import type { Project } from "../db";

export type SSEEventType =
  | "text"
  | "code_block"
  | "ast_operation"
  | "ast_snapshot"
  | "file_update"
  | "usage"
  | "done"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

export interface TextEvent {
  type: "text";
  data: { content: string };
}

export interface CodeBlockEvent {
  type: "code_block";
  data: CodeBlock;
}

export interface ASTOperationEvent {
  type: "ast_operation";
  data: ASTOperation;
}

export interface ASTSnapshotEvent {
  type: "ast_snapshot";
  data: {
    ast: ASTNode;
    version: number;
  };
}

export interface FileUpdateEvent {
  type: "file_update";
  data: {
    path: string;
    content: string;
    operation: "create" | "update" | "delete";
  };
}

export interface UsageEvent {
  type: "usage";
  data: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    generation_time_ms: number;
    cost_usd?: number;
  };
}

export interface DoneEvent {
  type: "done";
  data: {
    conversation_id: string;
    finish_reason: string;
  };
}

export interface ErrorEvent {
  type: "error";
  data: { message: string; code?: string };
}

export interface GenerateOptions {
  projectId: string;
  prompt: string;
  userId: number;
  currentFile?: string;
  selectedCode?: string;
  maxTokens?: number;
  temperature?: number;
}

export class GenerationService {
  private projectService = new ProjectService();
  private conversationService = new ConversationService();
  private providerService = new AIProviderService();
  private fileStorageService = new FileStorageService();

  async *generate(options: GenerateOptions): AsyncGenerator<SSEEvent> {
    const { projectId, prompt, userId, currentFile, selectedCode, maxTokens, temperature } = options;

    const startTime = Date.now();
    let userConversation;
    let assistantConversation;
    let fullContent = "";
    const filesToPersist: Array<{ path: string; content: string; type: "create" | "update" }> = [];

    try {
      if (!prompt || prompt.trim().length === 0) {
        yield { type: "error", data: { message: "Prompt cannot be empty", code: "INVALID_PROMPT" } };
        return;
      }

      if (prompt.length > 50000) {
        yield { type: "error", data: { message: "Prompt too long (max 50000 characters)", code: "PROMPT_TOO_LONG" } };
        return;
      }

      const project = await this.projectService.findByUuid(projectId);
      if (!project) {
        yield { type: "error", data: { message: "Project not found", code: "PROJECT_NOT_FOUND" } };
        return;
      }

      const access = await this.projectService.checkAccess(userId, project.id);
      if (!access) {
        yield { type: "error", data: { message: "Access denied", code: "FORBIDDEN" } };
        return;
      }

      userConversation = await this.conversationService.create(
        { project_id: project.id, content: prompt, role: "user" },
        userId
      );

      const modelConfig = project.default_model_id
        ? await this.providerService.getModelByPrimaryId(project.default_model_id)
        : await this.providerService.getDefaultModel();

      if (!modelConfig) {
        yield { type: "error", data: { message: "No model available", code: "NO_MODEL" } };
        return;
      }

      const { system, messages } = await this.buildPrompt(project, prompt, currentFile, selectedCode);

      const gateway = getAIGateway();
      const parser = new ResponseParser();

      const stream = gateway.stream({
        provider: modelConfig.provider.slug as "anthropic",
        model: modelConfig.model_id,
        messages,
        system_prompt: system,
        max_tokens: maxTokens || modelConfig.max_output_tokens,
        temperature: temperature ?? 0.7,
        metadata: { user_id: userId, project_id: projectId },
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for await (const chunk of stream) {
        if (chunk.type === "text_delta" && chunk.content) {
          fullContent += chunk.content;

          yield { type: "text", data: { content: chunk.content } };

          const { newBlocks } = parser.appendChunk(chunk.content);
          for (const block of newBlocks) {
            yield { type: "code_block", data: block };
          }
        }

        if (chunk.type === "usage" && chunk.usage) {
          totalInputTokens = chunk.usage.input_tokens;
          totalOutputTokens = chunk.usage.output_tokens;
        }

        if (chunk.type === "error") {
          yield { type: "error", data: { message: chunk.error || "Generation failed" } };
          await this.conversationService.markError(userConversation.id, userId);
          return;
        }
      }

      const generationTimeMs = Date.now() - startTime;
      const costUsd = this.calculateCost(modelConfig, totalInputTokens, totalOutputTokens);

      // Parse the full content to extract code blocks and AST operations
      const parsed = parser.parse(fullContent);

      if (parsed.warnings && parsed.warnings.length > 0) {
        logger.warn({
          warnings: parsed.warnings,
          projectId: project.id,
        }, "Response parser warnings");
      }

      // Also parse with AST engine for proper AST operations
      const astParsed = parseAIResponse(fullContent);

      if (astParsed.errors.length > 0) {
        logger.warn({
          errors: astParsed.errors,
          projectId: project.id,
        }, "AST parser errors");
      }

      logger.info({
        codeBlocksFound: parsed.codeBlocks.length,
        astOperationsFound: astParsed.operations.length,
        parsedNodesCount: astParsed.parsedNodes.length,
        filenames: parsed.codeBlocks.map(b => b.filename),
        warningCount: (parsed.warnings?.length || 0) + astParsed.warnings.length,
      }, "Final parse complete");

      if (parsed.codeBlocks.length === 0 && fullContent.length > 0) {
        logger.warn({
          contentLength: fullContent.length,
          contentPreview: fullContent.substring(0, 500),
        }, "AI response contained no valid code blocks");
      }

      // Collect files to persist from code blocks
      for (const block of parsed.codeBlocks) {
        if (block.filename && block.content) {
          const hasImports = block.content.includes("import ");
          const hasExport = block.content.includes("export ");
          const isFullFile = hasImports || (hasExport && block.content.length > 100);

          filesToPersist.push({
            path: block.filename,
            content: block.content,
            type: isFullFile ? "create" : "update",
          });
        }
      }

      // Create assistant conversation first to get the conversation ID for file tracking
      assistantConversation = await this.conversationService.createAssistantMessage(
        {
          project_id: project.id,
          content: fullContent,
          model_id: modelConfig.id,
          tokens_in: totalInputTokens,
          tokens_out: totalOutputTokens,
          generation_time_ms: generationTimeMs,
          cost_usd: costUsd,
          ast_diff: astParsed.operations.length > 0 ? { operations: astParsed.operations } : undefined,
        },
        userId
      );

      // Persist files to database
      if (filesToPersist.length > 0) {
        try {
          await this.fileStorageService.bulkCreateOrUpdate(
            project.id,
            filesToPersist.map(f => ({ path: f.path, content: f.content })),
            userId,
            assistantConversation.id
          );
          logger.info({
            projectId: project.id,
            fileCount: filesToPersist.length,
            paths: filesToPersist.map(f => f.path),
          }, "Files persisted to database");
        } catch (fileError) {
          logger.error({ fileError, projectId: project.id }, "Failed to persist files to database");
        }
      }

      // Emit file update events
      for (const file of filesToPersist) {
        yield {
          type: "file_update",
          data: {
            path: file.path,
            content: file.content,
            operation: file.type,
          },
        };
      }

      // Emit proper AST operations from AST engine parser
      for (const operation of astParsed.operations) {
        logger.info({
          type: operation.type,
          operationType: operation.type,
        }, "Emitting ast_operation");
        yield { type: "ast_operation", data: operation };
      }

      await this.conversationService.markCompleted(userConversation.id, userId);

      yield {
        type: "usage",
        data: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalInputTokens + totalOutputTokens,
          generation_time_ms: generationTimeMs,
          cost_usd: costUsd,
        },
      };

      yield {
        type: "done",
        data: {
          conversation_id: assistantConversation.uuid,
          finish_reason: "stop",
        },
      };
    } catch (error) {
      logger.error({ error, projectId, userId }, "Generation failed");

      if (userConversation) {
        await this.conversationService.markError(userConversation.id, userId);
      }

      yield {
        type: "error",
        data: {
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      };
    }
  }

  private async buildPrompt(
    project: Project,
    userMessage: string,
    currentFile?: string,
    selectedCode?: string
  ): Promise<{ system: string; messages: Array<{ role: "user" | "assistant"; content: string }> }> {
    const fileTree = project.file_tree && typeof project.file_tree === "object" && !Array.isArray(project.file_tree)
      ? (project.file_tree as Record<string, unknown>)
      : {};

    const builder = new PromptBuilder()
      .setProject(project)
      .setFileTree(fileTree);

    if (currentFile) {
      builder.setCurrentFile(currentFile);
    }

    if (selectedCode) {
      builder.setSelectedCode(selectedCode);
    }

    if (project.backend_provider) {
      builder.setBackendSchema({
        provider: project.backend_provider,
      });
    }

    const conversationHistory = await this.getConversationHistory(project.id);
    if (conversationHistory.length > 0) {
      builder.setConversationHistory(conversationHistory);
    }

    const existingFiles = await this.getExistingFiles(project.id);
    if (existingFiles.size > 0) {
      builder.setExistingFiles(existingFiles);
    }

    return builder.build(userMessage);
  }

  private async getConversationHistory(
    projectId: number
  ): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
    try {
      const { items } = await this.conversationService.findAllByProjectId(projectId, {
        status: "completed",
        limit: 10,
      });

      return items
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));
    } catch (error) {
      logger.warn({ error, projectId }, "Failed to fetch conversation history");
      return [];
    }
  }

  private async getExistingFiles(projectId: number): Promise<Map<string, string>> {
    try {
      const files = await this.fileStorageService.findByProjectId(projectId);
      const fileMap = new Map<string, string>();

      const importantFiles = files
        .filter((f) => f.path.endsWith(".tsx") || f.path.endsWith(".ts"))
        .slice(0, 5);

      for (const file of importantFiles) {
        if (file.content) {
          fileMap.set(file.path, file.content);
        }
      }

      return fileMap;
    } catch (error) {
      logger.warn({ error, projectId }, "Failed to fetch existing files");
      return new Map();
    }
  }

  private calculateCost(
    model: { input_cost_per_1k?: number | null; output_cost_per_1k?: number | null },
    inputTokens: number,
    outputTokens: number
  ): number {
    const inputCost = ((model.input_cost_per_1k || 0) / 1_000) * inputTokens;
    const outputCost = ((model.output_cost_per_1k || 0) / 1_000) * outputTokens;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
  }
}
