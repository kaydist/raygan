import Anthropic from "@anthropic-ai/sdk";
import { RateLimitError, APIError } from "@anthropic-ai/sdk";
import { BaseAdapter } from "./base-adapter";
import type { GenerateRequest, GenerateResponse, StreamChunk, MessageContentBlock } from "../types";
import type { AIModel } from "../../../db";
import { logger } from "../../../config";

export class AnthropicAdapter extends BaseAdapter {
  readonly provider = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey: string, baseUrl?: string, timeoutMs?: number) {
    super({ api_key: apiKey, base_url: baseUrl, timeout_ms: timeoutMs });
    this.client = new Anthropic({
      apiKey,
      baseURL: baseUrl,
      timeout: timeoutMs || 120000,
    });
  }

  async generate(
    request: GenerateRequest,
    modelConfig?: AIModel,
  ): Promise<GenerateResponse> {
    this.logRequest(request);
    const startTime = Date.now();

    const maxTokens =
      request.max_tokens || modelConfig?.max_output_tokens || 4096;

    const response = await this.withRetry(async () => {
      return this.client.messages.create({
        model: request.model,
        max_tokens: maxTokens,
        temperature: request.temperature,
        system: request.system_prompt,
        messages: request.messages?.map((m) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === "string"
            ? m.content
            : mapContentBlocks(m.content as MessageContentBlock[]),
        })),
        stop_sequences: request.stop_sequences,
      });
    });

    const generationTime = Date.now() - startTime;
    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      ?.map((block) => block.text)
      .join("");

    const result: GenerateResponse = {
      id: response.id,
      provider: this.provider,
      model: response.model,
      content,
      finish_reason:
        response.stop_reason === "end_turn" ? "stop" : "max_tokens",
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
      generation_time_ms: generationTime,
    };

    this.logResponse(result);
    return result;
  }

  async *stream(
    request: GenerateRequest,
    modelConfig?: AIModel,
  ): AsyncIterable<StreamChunk> {
    this.logRequest(request);

    const maxTokens =
      request.max_tokens || modelConfig?.max_output_tokens || 4096;
    const maxRetries = this.config.max_retries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stream = this.client.messages.stream({
          model: request.model,
          max_tokens: maxTokens,
          temperature: request.temperature,
          system: request.system_prompt,
          messages: request.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: typeof m.content === "string"
              ? m.content
              : mapContentBlocks(m.content as MessageContentBlock[]),
          })),
          stop_sequences: request.stop_sequences,
        });

        if (request.signal) {
          const onAbort = () => stream.abort();
          request.signal.addEventListener("abort", onAbort, { once: true });
        }

        for await (const event of stream) {
          if (request.signal?.aborted) break;

          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if ("text" in delta) {
              yield { type: "text_delta", content: delta.text };
            }
          } else if (event.type === "message_delta") {
            if (event.usage) {
              yield {
                type: "usage",
                usage: {
                  input_tokens: 0,
                  output_tokens: event.usage.output_tokens,
                  total_tokens: event.usage.output_tokens,
                },
              };
            }
          } else if (event.type === "message_stop") {
            yield { type: "done", finish_reason: "stop" };
          }
        }

        if (request.signal?.aborted) return;

        const finalMessage = await stream.finalMessage();
        yield {
          type: "usage",
          usage: {
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens,
            total_tokens:
              finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          },
        };
        return;
      } catch (error) {
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        if (!isRetryable || isLastAttempt) {
          this.logError(error, "stream");
          yield {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
          return;
        }

        const delay = this.getRetryDelay(error, attempt);
        this.logError({ attempt, delay, error }, "stream retry");
        await this.sleep(delay);
      }
    }
  }

  async *streamWithTools(
    request: GenerateRequest,
    modelConfig?: AIModel,
  ): AsyncIterable<StreamChunk> {
    this.logRequest(request);

    const maxTokens =
      request.max_tokens || modelConfig?.max_output_tokens || 4096;
    const maxRetries = this.config.max_retries || 3;

    const anthropicTools: Anthropic.Messages.Tool[] = (request.tools || []).map(
      (t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema,
      }),
    );

    const anthropicMessages = request.messages.map((m) => {
      if (typeof m.content === "string") {
        return {
          role: m.role as "user" | "assistant",
          content: m.content,
        };
      }

      const blocks: Anthropic.Messages.ContentBlockParam[] = (
        m.content as MessageContentBlock[]
      ).map((block) => {
        if (block.type === "text") {
          return { type: "text" as const, text: block.text };
        }
        if (block.type === "image") {
          return {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: block.source.media_type,
              data: block.source.data,
            },
          };
        }
        if (block.type === "tool_use") {
          return {
            type: "tool_use" as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };
        }
        return {
          type: "tool_result" as const,
          tool_use_id: block.tool_use_id,
          content: block.content,
          is_error: block.is_error,
        };
      });

      return {
        role: m.role as "user" | "assistant",
        content: blocks,
      };
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stream = this.client.messages.stream({
          model: request.model,
          max_tokens: maxTokens,
          temperature: request.temperature,
          system: request.system_prompt,
          messages: anthropicMessages,
          tools: anthropicTools.length > 0 ? anthropicTools : undefined,
          stop_sequences: request.stop_sequences,
        });

        if (request.signal) {
          const onAbort = () => stream.abort();
          request.signal.addEventListener("abort", onAbort, { once: true });
        }

        let currentToolId = "";
        let currentToolName = "";
        let jsonAccumulator = "";

        for await (const event of stream) {
          if (request.signal?.aborted) break;

          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (block.type === "tool_use") {
              currentToolId = block.id;
              currentToolName = block.name;
              jsonAccumulator = "";
              yield {
                type: "tool_use_start",
                tool_use: { id: block.id, name: block.name, input: {} },
              };
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "input_json_delta") {
              jsonAccumulator += delta.partial_json;
              yield { type: "tool_use_delta", content: delta.partial_json };
            } else if ("text" in delta) {
              yield { type: "text_delta", content: (delta as { text: string }).text };
            }
          } else if (event.type === "content_block_stop") {
            if (currentToolId) {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = jsonAccumulator ? JSON.parse(jsonAccumulator) : {};
              } catch {
                parsedInput = {};
              }
              yield {
                type: "tool_use_end",
                tool_use: {
                  id: currentToolId,
                  name: currentToolName,
                  input: parsedInput,
                },
              };
              currentToolId = "";
              currentToolName = "";
              jsonAccumulator = "";
            }
          } else if (event.type === "message_delta") {
            const stopReason = event.delta?.stop_reason;
            if (event.usage) {
              yield {
                type: "usage",
                usage: {
                  input_tokens: 0,
                  output_tokens: event.usage.output_tokens,
                  total_tokens: event.usage.output_tokens,
                },
              };
            }
            if (stopReason === "tool_use") {
              yield { type: "done", finish_reason: "tool_use" };
            }
          } else if (event.type === "message_stop") {
            const finalMsg = await stream.finalMessage();
            if (finalMsg.stop_reason !== "tool_use") {
              yield { type: "done", finish_reason: "stop" };
            }
          }
        }

        if (request.signal?.aborted) return;

        const finalMessage = await stream.finalMessage();
        yield {
          type: "usage",
          usage: {
            input_tokens: finalMessage.usage.input_tokens,
            output_tokens: finalMessage.usage.output_tokens,
            total_tokens:
              finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          },
        };
        return;
      } catch (error) {
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        if (!isRetryable || isLastAttempt) {
          this.logError(error, "streamWithTools");
          yield {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          };
          return;
        }

        const delay = this.getRetryDelay(error, attempt);
        this.logError({ attempt, delay, error }, "streamWithTools retry");
        await this.sleep(delay);
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof APIError) {
      return error.status === 429 || error.status === 503 || error.status === 529;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("timeout") ||
        message.includes("overloaded") ||
        message.includes("503") ||
        message.includes("529") ||
        message.includes("network") ||
        message.includes("econnreset") ||
        message.includes("socket hang up")
      );
    }
    return false;
  }

  private getRetryDelay(error: unknown, attempt: number): number {
    if (error instanceof APIError && error.headers) {
      const retryAfter = error.headers.get?.("retry-after");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!isNaN(seconds) && seconds > 0) {
          logger.info({ retryAfterSeconds: seconds }, "Using retry-after header");
          return seconds * 1000;
        }
      }
    }
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }],
      });
      return true;
    } catch (error) {
      this.logError(error, "validateConnection");
      return false;
    }
  }
}

function mapContentBlocks(
  blocks: MessageContentBlock[],
): Anthropic.Messages.ContentBlockParam[] {
  return blocks.map((block) => {
    if (block.type === "text") {
      return { type: "text" as const, text: block.text };
    }
    if (block.type === "image") {
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: block.source.media_type,
          data: block.source.data,
        },
      };
    }
    if (block.type === "tool_use") {
      return {
        type: "tool_use" as const,
        id: block.id,
        name: block.name,
        input: block.input,
      };
    }
    return {
      type: "tool_result" as const,
      tool_use_id: (block as { tool_use_id: string }).tool_use_id,
      content: (block as { content: string }).content,
      is_error: (block as { is_error?: boolean }).is_error,
    };
  });
}
