import { logger } from "../config";
import { ProjectService } from "./project.service";
import { ConversationService } from "./conversation.service";
import { AIProviderService } from "./ai-provider.service";
import { FileStorageService } from "./file-storage.service";
import { getAIGateway, PromptBuilder, ResponseParser } from "./ai-gateway";
import { runAgentLoop } from "./ai-gateway/agent-loop";
import type { CodeBlock } from "./ai-gateway/response-parser";
import { parseAIResponse } from "./ast-engine";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";
import type { ASTNode, ASTOperation } from "@raygan/shared";
import type { Project, AIModel } from "../db";
import type { Message as GatewayMessage, MessageContentBlock } from "./ai-gateway/types";

export type SSEEventType =
  | "text"
  | "code_block"
  | "ast_operation"
  | "ast_snapshot"
  | "file_update"
  | "usage"
  | "done"
  | "error"
  | "tool_call"
  | "tool_result"
  | "plan_proposed"
  | "plan_approved"
  | "plan_rejected"
  | "file_created"
  | "file_modified"
  | "file_deleted";

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

export interface ImageInput {
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
}

export interface GenerateOptions {
  projectId: string;
  prompt: string;
  userId: number;
  modelId?: string;
  currentFile?: string;
  selectedCode?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  images?: ImageInput[];
}

export class GenerationService {
  private projectService = new ProjectService();
  private conversationService = new ConversationService();
  private providerService = new AIProviderService();
  private fileStorageService = new FileStorageService();

  async *generate(options: GenerateOptions): AsyncGenerator<SSEEvent> {
    const { projectId, prompt, userId, modelId, currentFile, selectedCode, maxTokens, temperature, images } = options;

    const startTime = Date.now();
    let userConversation;
    let assistantConversation;
    let fullContent = "";
    const filesToPersist: Array<{ path: string; content: string; type: "create" | "update" }> = [];

    try {
      const hasImages = images && images.length > 0;
      const safePrompt = prompt || "";
      if (safePrompt.trim().length === 0 && !hasImages) {
        yield { type: "error", data: { message: "Prompt cannot be empty", code: "INVALID_PROMPT" } };
        return;
      }

      if (safePrompt.length > 50000) {
        yield { type: "error", data: { message: "Prompt too long (max 50000 characters)", code: "PROMPT_TOO_LONG" } };
        return;
      }

      const project = await this.projectService.findByUuid(projectId);
      if (!project) {
        yield { type: "error", data: { message: "Project not found", code: "PROJECT_NOT_FOUND" } };
        return;
      }

      const access = await this.projectService.checkAccessWithProject(userId, project);
      if (!access) {
        yield { type: "error", data: { message: "Access denied", code: "FORBIDDEN" } };
        return;
      }

      const conversationContent = safePrompt.trim() || (hasImages ? "[Image attached]" : "");
      userConversation = await this.conversationService.create(
        { project_id: project.id, content: conversationContent, role: "user" },
        userId
      );

      let modelConfig = null;
      if (modelId) {
        const parsedModelId = Number(modelId);
        if (!isNaN(parsedModelId)) {
          modelConfig = await this.providerService.getModelByPrimaryId(parsedModelId);
        } else {
          modelConfig = await this.providerService.getModelById(modelId);
        }
      }
      if (!modelConfig && project.default_model_id) {
        modelConfig = await this.providerService.getModelByPrimaryId(project.default_model_id);
      }
      if (!modelConfig) {
        modelConfig = await this.providerService.getDefaultModel();
      }

      if (!modelConfig) {
        yield { type: "error", data: { message: "No model available", code: "NO_MODEL" } };
        return;
      }

      if (modelConfig.supports_tools) {
        yield* this.generateAgentMode(
          project, prompt, userId, modelConfig, userConversation, options,
        );
        return;
      }

      const { system, messages: builtMessages } = await this.buildPrompt(project, prompt, currentFile, selectedCode);
      const messages: GatewayMessage[] = hasImages
        ? this.injectImagesIntoMessages(builtMessages, images!)
        : builtMessages.map((m) => ({ role: m.role, content: m.content }));

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
        signal: options.signal,
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for await (const chunk of stream) {
        if (options.signal?.aborted) break;

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
          const errorMessage = chunk.error || "Generation failed";
          try {
            logger.info({ projectId, errorMessage }, "Creating error assistant conversation");
            const errAssistant = await this.conversationService.createAssistantMessage(
              { project_id: project.id, content: fullContent, model_id: modelConfig.id },
              userId,
            );
            logger.info({ assistantId: errAssistant.id, uuid: errAssistant.uuid }, "Error assistant created, marking as error");
            await this.conversationService.markError(errAssistant.id, userId);
            await this.conversationService.markError(userConversation.id, userId);
            await CacheService.invalidateConversationHistory(project.id);
            logger.info({ projectId }, "Error conversation persisted successfully");
          } catch (persistError) {
            logger.error({ persistError, projectId }, "Failed to persist error conversation in stream");
          }
          yield { type: "error", data: { message: errorMessage } };
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
      await CacheService.invalidateConversationHistory(project.id);

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
        try {
          const project = await this.projectService.findByUuid(projectId);
          if (project && !assistantConversation) {
            const errAssistant = await this.conversationService.createAssistantMessage(
              { project_id: project.id, content: fullContent },
              userId,
            );
            await this.conversationService.markError(errAssistant.id, userId);
          }
          await this.conversationService.markError(userConversation.id, userId);
          if (project) await CacheService.invalidateConversationHistory(project.id);
        } catch (persistError) {
          logger.error({ persistError, projectId }, "Failed to persist error conversation");
        }
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

  private async *generateAgentMode(
    project: Project,
    prompt: string,
    userId: number,
    modelConfig: AIModel,
    userConversation: { id: number; uuid: string },
    options: GenerateOptions,
  ): AsyncGenerator<SSEEvent> {
    const startTime = Date.now();
    let fullTextContent = "";

    try {
      const fileTree = project.file_tree && typeof project.file_tree === "object" && !Array.isArray(project.file_tree)
        ? (project.file_tree as Record<string, unknown>)
        : {};

      const builder = new PromptBuilder()
        .setAgentMode(true)
        .setProject(project)
        .setFileTree(fileTree);

      if (project.backend_provider) {
        builder.setBackendSchema({ provider: project.backend_provider });
      }

      const conversationHistory = await this.getConversationHistory(project.id);
      if (conversationHistory.length > 0) {
        builder.setConversationHistory(conversationHistory);
      }

      const { system, messages: promptMessages } = builder.build(prompt);

      const agentMessages = promptMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const loop = runAgentLoop({
        projectId: project.id,
        userId,
        conversationId: userConversation.id,
        modelId: modelConfig.model_id,
        providerSlug: modelConfig.provider.slug,
        systemPrompt: system,
        userPrompt: prompt,
        conversationHistory: agentMessages.slice(0, -1),
        maxTokens: options.maxTokens || modelConfig.max_output_tokens || 4096,
        temperature: options.temperature ?? 0.7,
        signal: options.signal,
        images: options.images,
      });

      for await (const event of loop) {
        if (options.signal?.aborted) break;

        if (event.type === "text") {
          fullTextContent += (event.data as { content: string }).content;
        }

        if (event.type === "error") {
          try {
            logger.info({ projectId: project.uuid }, "Agent mode: persisting error conversation before yield");
            const errAssistant = await this.conversationService.createAssistantMessage(
              { project_id: project.id, content: fullTextContent, model_id: modelConfig.id },
              userId,
            );
            await this.conversationService.markError(errAssistant.id, userId);
            await this.conversationService.markError(userConversation.id, userId);
            await CacheService.invalidateConversationHistory(project.id);
            logger.info({ projectId: project.uuid }, "Agent mode: error conversation persisted");
          } catch (persistError) {
            logger.error({ persistError, projectId: project.uuid }, "Agent mode: failed to persist error conversation");
          }
          yield event;
          return;
        }

        yield event;
      }

      const generationTimeMs = Date.now() - startTime;

      const assistantConversation = await this.conversationService.createAssistantMessage(
        {
          project_id: project.id,
          content: fullTextContent,
          model_id: modelConfig.id,
          tokens_in: 0,
          tokens_out: 0,
          generation_time_ms: generationTimeMs,
          cost_usd: 0,
        },
        userId,
      );

      await this.conversationService.markCompleted(userConversation.id, userId);
      await CacheService.invalidateConversationHistory(project.id);

      yield {
        type: "done",
        data: {
          conversation_id: assistantConversation.uuid,
          finish_reason: "stop",
        },
      };
    } catch (error) {
      logger.error({ error, projectId: project.uuid, userId }, "Agent mode generation failed");
      try {
        const errAssistant = await this.conversationService.createAssistantMessage(
          { project_id: project.id, content: fullTextContent, model_id: modelConfig.id },
          userId,
        );
        await this.conversationService.markError(errAssistant.id, userId);
        await this.conversationService.markError(userConversation.id, userId);
        await CacheService.invalidateConversationHistory(project.id);
      } catch (persistError) {
        logger.error({ persistError, projectId: project.uuid }, "Failed to persist error conversation");
      }
      yield {
        type: "error",
        data: {
          message: error instanceof Error ? error.message : "Agent mode generation failed",
          code: "AGENT_ERROR",
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
      return await CacheService.getOrSet(
        CACHE_KEYS.conversation.history(projectId),
        async () => {
          const { items } = await this.conversationService.findAllByProjectId(projectId, {
            status: "completed",
            limit: 10,
          });

          const filtered = items
            .filter((msg) => (msg.role === "user" || msg.role === "assistant") && msg.content?.trim());

          const deduped: typeof filtered = [];
          for (const msg of filtered) {
            if (deduped.length > 0 && deduped[deduped.length - 1]!.role === msg.role) {
              continue;
            }
            deduped.push(msg);
          }

          return deduped.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));
        },
        CACHE_TTL.CONVERSATION_HISTORY
      );
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

  private injectImagesIntoMessages(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    images: ImageInput[],
  ): GatewayMessage[] {
    return messages.map((m, i) => {
      const isLastUserMessage = i === messages.length - 1 && m.role === "user";
      if (isLastUserMessage && images.length > 0) {
        const blocks: MessageContentBlock[] = images.map((img) => ({
          type: "image" as const,
          source: { type: "base64" as const, media_type: img.media_type, data: img.data },
        }));
        const text = m.content.trim() || "Analyze this image and generate the corresponding React Native (Expo) code.";
        blocks.push({ type: "text" as const, text });
        return { role: m.role, content: blocks };
      }
      return { role: m.role, content: m.content };
    });
  }
}
