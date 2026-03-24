import { logger } from "../../config";
import { getAIGateway } from "./gateway";
import { AGENT_TOOLS } from "./agent-tools";
import { ToolExecutor, type ToolExecutorContext } from "./tool-executor";
import { getPlanApprovalGate } from "./plan-approval-gate";
import type { SSEEvent } from "../generation.service";
import type { Message, MessageContentBlock, StreamChunk, TokenUsage } from "./types";
import type { AgentToolCall, AgentPlan } from "@raygan/shared";

const MAX_TURNS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_TOKEN_LIMIT_PER_MINUTE = 25_000;

class TokenRateTracker {
  private entries: Array<{ tokens: number; timestamp: number }> = [];
  private limitPerMinute: number;

  constructor(limitPerMinute = DEFAULT_TOKEN_LIMIT_PER_MINUTE) {
    this.limitPerMinute = limitPerMinute;
  }

  record(tokens: number): void {
    this.entries.push({ tokens, timestamp: Date.now() });
  }

  private pruneOld(): void {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    this.entries = this.entries.filter((e) => e.timestamp > cutoff);
  }

  getTokensInWindow(): number {
    this.pruneOld();
    return this.entries.reduce((sum, e) => sum + e.tokens, 0);
  }

  async waitIfNeeded(estimatedNextTokens: number, signal?: AbortSignal): Promise<void> {
    this.pruneOld();
    const currentUsage = this.getTokensInWindow();
    const projected = currentUsage + estimatedNextTokens;

    if (projected < this.limitPerMinute) return;

    if (this.entries.length === 0) return;

    const oldestInWindow = this.entries[0]!.timestamp;
    const waitMs = Math.min(oldestInWindow + RATE_LIMIT_WINDOW_MS - Date.now() + 500, RATE_LIMIT_WINDOW_MS);

    if (waitMs > 0) {
      logger.info(
        { currentUsage, projected, limit: this.limitPerMinute, waitMs },
        "Rate limit pacing: waiting before next agent turn",
      );
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), waitMs);
        if (signal) {
          const onAbort = () => { clearTimeout(timer); resolve(); };
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
      this.pruneOld();
    }
  }
}

export interface AgentLoopImage {
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
}

export interface AgentLoopOptions {
  projectId: number;
  userId: number;
  conversationId?: number;
  modelId: string;
  providerSlug: string;
  systemPrompt: string;
  userPrompt: string;
  conversationHistory: Message[];
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
  images?: AgentLoopImage[];
}

export async function* runAgentLoop(
  options: AgentLoopOptions,
): AsyncGenerator<SSEEvent> {
  const {
    projectId,
    userId,
    conversationId,
    modelId,
    providerSlug,
    systemPrompt,
    userPrompt,
    conversationHistory,
    maxTokens,
    temperature,
    signal,
    images,
  } = options;

  const gateway = getAIGateway();
  const toolExecutor = new ToolExecutor();
  const approvalGate = getPlanApprovalGate();
  const rateTracker = new TokenRateTracker();

  const userMessage: Message = (() => {
    if (images && images.length > 0) {
      const blocks: MessageContentBlock[] = images.map((img) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: img.media_type, data: img.data },
      }));
      const text = userPrompt.trim() || "Analyze this image and generate the corresponding React Native (Expo) code.";
      blocks.push({ type: "text" as const, text });
      return { role: "user" as const, content: blocks };
    }
    return { role: "user" as const, content: userPrompt };
  })();

  const messages: Message[] = [
    ...conversationHistory,
    userMessage,
  ];

  const executorContext: ToolExecutorContext = {
    projectId,
    userId,
    conversationId,
    planApproved: false,
  };

  const accumulatedUsage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  let activePlanId: string | null = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (signal?.aborted) break;

    logger.info({ turn, messageCount: messages.length }, "Agent loop turn");

    const textParts: string[] = [];
    const toolUseCalls: AgentToolCall[] = [];

    const estimatedInputTokens = estimateMessageTokens(messages, systemPrompt);
    await rateTracker.waitIfNeeded(estimatedInputTokens, signal);

    const stream = gateway.streamWithTools({
      provider: providerSlug as "anthropic",
      model: modelId,
      messages,
      system_prompt: systemPrompt,
      max_tokens: maxTokens,
      temperature,
      tools: AGENT_TOOLS,
      signal,
    });

    let finishReason: string | undefined;

    for await (const chunk of stream as AsyncIterable<StreamChunk>) {
      if (signal?.aborted) break;

      if (chunk.type === "text_delta" && chunk.content) {
        textParts.push(chunk.content);
        yield { type: "text", data: { content: chunk.content } };
      }

      if (chunk.type === "tool_use_end" && chunk.tool_use) {
        toolUseCalls.push({
          id: chunk.tool_use.id,
          name: chunk.tool_use.name as AgentToolCall["name"],
          input: chunk.tool_use.input,
        });
      }

      if (chunk.type === "usage" && chunk.usage) {
        accumulatedUsage.input_tokens += chunk.usage.input_tokens;
        accumulatedUsage.output_tokens += chunk.usage.output_tokens;
        accumulatedUsage.total_tokens += chunk.usage.total_tokens;
        if (chunk.usage.input_tokens > 0) {
          rateTracker.record(chunk.usage.input_tokens);
        }
      }

      if (chunk.type === "done") {
        finishReason = chunk.finish_reason;
      }

      if (chunk.type === "error") {
        yield { type: "error", data: { message: chunk.error || "AI stream error" } };
        return;
      }
    }

    if (signal?.aborted) break;

    if (finishReason !== "tool_use" || toolUseCalls.length === 0) {
      break;
    }

    const assistantContentBlocks: MessageContentBlock[] = [];
    if (textParts.length > 0) {
      assistantContentBlocks.push({ type: "text", text: textParts.join("") });
    }
    for (const tc of toolUseCalls) {
      assistantContentBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }
    messages.push({ role: "assistant", content: assistantContentBlocks });

    const toolResultBlocks: MessageContentBlock[] = [];

    for (const toolCall of toolUseCalls) {
      if (signal?.aborted) break;

      yield {
        type: "tool_call",
        data: { id: toolCall.id, name: toolCall.name, input: toolCall.input },
      };

      const result = await toolExecutor.execute(toolCall, executorContext);

      if (result.side_effects) {
        for (const effect of result.side_effects) {
          if (effect.type === "plan_proposed") {
            const plan = effect.plan as AgentPlan;
            activePlanId = plan.plan_id;

            yield {
              type: "plan_proposed",
              data: plan,
            };

            const decision = await approvalGate.waitForApproval(plan.plan_id);
            if (decision === "approved") {
              executorContext.planApproved = true;
              result.content = "Plan approved by user. Proceed with executing the file changes now.";
              yield { type: "plan_approved", data: { plan_id: plan.plan_id } };
            } else {
              yield { type: "plan_rejected", data: { plan_id: plan.plan_id } };
              result.content = "Plan rejected by user. Do not proceed with file changes. Ask the user what they would like instead.";
              result.is_error = true;
            }
            activePlanId = null;
          }

          if (effect.type === "file_created") {
            yield {
              type: "file_update",
              data: { path: effect.path, content: effect.content, operation: "create" },
            };
            yield { type: "file_created", data: { path: effect.path } };
          }
          if (effect.type === "file_modified") {
            yield {
              type: "file_update",
              data: { path: effect.path, content: effect.content, operation: "update" },
            };
            yield { type: "file_modified", data: { path: effect.path } };
          }
          if (effect.type === "file_deleted") {
            yield {
              type: "file_update",
              data: { path: effect.path, content: "", operation: "delete" },
            };
            yield { type: "file_deleted", data: { path: effect.path } };
          }
        }
      }

      yield {
        type: "tool_result",
        data: {
          tool_use_id: result.tool_use_id,
          content: result.content,
          is_error: result.is_error,
        },
      };

      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: result.tool_use_id,
        content: result.content,
        is_error: result.is_error,
      });
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  if (activePlanId) {
    approvalGate.cancel(activePlanId);
  }

  yield {
    type: "usage",
    data: {
      input_tokens: accumulatedUsage.input_tokens,
      output_tokens: accumulatedUsage.output_tokens,
      total_tokens: accumulatedUsage.total_tokens,
      generation_time_ms: 0,
    },
  };
}

function estimateMessageTokens(messages: Message[], systemPrompt: string): number {
  let charCount = systemPrompt.length;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      charCount += msg.content.length;
    } else {
      for (const block of msg.content) {
        if (block.type === "text") charCount += block.text.length;
        else if (block.type === "tool_result") charCount += block.content.length;
        else if (block.type === "tool_use") charCount += JSON.stringify(block.input).length;
        else if (block.type === "image") charCount += 6400;
      }
    }
  }
  return Math.ceil(charCount / 4);
}
