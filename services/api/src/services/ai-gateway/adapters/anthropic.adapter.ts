import Anthropic from "@anthropic-ai/sdk";
import { BaseAdapter } from "./base-adapter";
import type { GenerateRequest, GenerateResponse, StreamChunk } from "../types";
import type { AIModel } from "../../../db";

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
          content: m.content,
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
            content: m.content,
          })),
          stop_sequences: request.stop_sequences,
        });

        for await (const event of stream) {
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

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logError({ attempt, delay, error }, "stream retry");
        await this.sleep(delay);
      }
    }
  }

  private isRetryableError(error: unknown): boolean {
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
