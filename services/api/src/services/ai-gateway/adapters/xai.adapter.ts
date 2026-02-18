import OpenAI from "openai";
import { BaseAdapter } from "./base-adapter";
import type { GenerateRequest, GenerateResponse, StreamChunk } from "../types";
import type { AIModel } from "../../../db";

const XAI_BASE_URL = "https://api.x.ai/v1";

export class XAIAdapter extends BaseAdapter {
  readonly provider = "xai" as const;
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string, timeoutMs?: number) {
    super({ api_key: apiKey, base_url: baseUrl, timeout_ms: timeoutMs });
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || XAI_BASE_URL,
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

    const messages = this.buildMessages(request);

    const response = await this.withRetry(async () => {
      return this.client.chat.completions.create({
        model: request.model,
        max_tokens: maxTokens,
        temperature: request.temperature,
        messages,
        stop: request.stop_sequences,
      });
    });

    const generationTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || "";
    const finishReason = this.normalizeFinishReason(
      response.choices[0]?.finish_reason,
    );

    const result: GenerateResponse = {
      id: response.id,
      provider: this.provider,
      model: response.model,
      content,
      finish_reason: finishReason,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
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
    const messages = this.buildMessages(request);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stream = await this.client.chat.completions.create({
          model: request.model,
          max_tokens: maxTokens,
          temperature: request.temperature,
          messages,
          stop: request.stop_sequences,
          stream: true,
          stream_options: { include_usage: true },
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          const finishReason = chunk.choices[0]?.finish_reason;

          if (delta?.content) {
            yield { type: "text_delta", content: delta.content };
          }

          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || 0;
            outputTokens = chunk.usage.completion_tokens || 0;
          }

          if (finishReason) {
            yield {
              type: "usage",
              usage: {
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                total_tokens: inputTokens + outputTokens,
              },
            };
            yield {
              type: "done",
              finish_reason: this.normalizeFinishReason(finishReason),
            };
          }
        }
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

  private buildMessages(
    request: GenerateRequest,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.system_prompt) {
      messages.push({
        role: "system",
        content: request.system_prompt,
      });
    }

    for (const msg of request.messages) {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    return messages;
  }

  private normalizeFinishReason(
    reason: string | null | undefined,
  ): "stop" | "max_tokens" | "error" {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "max_tokens";
      case "content_filter":
        return "error";
      default:
        return "stop";
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      return (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
      );
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("timeout") ||
        message.includes("network") ||
        message.includes("econnreset") ||
        message.includes("socket hang up")
      );
    }
    return false;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: "grok-2",
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
