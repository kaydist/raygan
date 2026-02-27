import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentResult,
  GoogleGenerativeAIError,
} from "@google/generative-ai";
import { BaseAdapter } from "./base-adapter";
import type { GenerateRequest, GenerateResponse, StreamChunk } from "../types";
import type { AIModel } from "../../../db";

export class GoogleAdapter extends BaseAdapter {
  readonly provider = "google" as const;
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, _baseUrl?: string, _timeoutMs?: number) {
    super({ api_key: apiKey, base_url: _baseUrl, timeout_ms: _timeoutMs });
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(
    request: GenerateRequest,
    modelConfig?: AIModel,
  ): Promise<GenerateResponse> {
    this.logRequest(request);
    const startTime = Date.now();

    const maxTokens =
      request.max_tokens || modelConfig?.max_output_tokens || 4096;

    const model = this.client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: request.temperature,
        stopSequences: request.stop_sequences,
      },
      systemInstruction: request.system_prompt,
    });

    const contents = this.buildContents(request);

    const response = await this.withRetry(async () => {
      return model.generateContent({ contents });
    });

    const generationTime = Date.now() - startTime;
    const result = this.parseResponse(response, request.model, generationTime);

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

    const model = this.client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: request.temperature,
        stopSequences: request.stop_sequences,
      },
      systemInstruction: request.system_prompt,
    });

    const contents = this.buildContents(request);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await model.generateContentStream({ contents });

        let totalText = "";
        for await (const chunk of response.stream) {
          const text = chunk.text();
          if (text) {
            totalText += text;
            yield { type: "text_delta", content: text };
          }
        }

        const finalResponse = await response.response;
        const usageMetadata = finalResponse.usageMetadata;

        yield {
          type: "usage",
          usage: {
            input_tokens: usageMetadata?.promptTokenCount || 0,
            output_tokens: usageMetadata?.candidatesTokenCount || 0,
            total_tokens: usageMetadata?.totalTokenCount || 0,
          },
        };

        const finishReason = this.normalizeFinishReason(
          finalResponse.candidates?.[0]?.finishReason,
        );
        yield { type: "done", finish_reason: finishReason };
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

  private buildContents(request: GenerateRequest): Content[] {
    const contents: Content[] = [];

    for (const msg of request.messages) {
      const text = typeof msg.content === "string"
        ? msg.content
        : msg.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("");
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      });
    }

    return contents;
  }

  private parseResponse(
    response: GenerateContentResult,
    requestModel: string,
    generationTime: number,
  ): GenerateResponse {
    const candidate = response.response.candidates?.[0];
    const content =
      candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
    const usageMetadata = response.response.usageMetadata;

    return {
      id: `gemini-${Date.now()}`,
      provider: this.provider,
      model: requestModel,
      content,
      finish_reason: this.normalizeFinishReason(candidate?.finishReason),
      usage: {
        input_tokens: usageMetadata?.promptTokenCount || 0,
        output_tokens: usageMetadata?.candidatesTokenCount || 0,
        total_tokens: usageMetadata?.totalTokenCount || 0,
      },
      generation_time_ms: generationTime,
    };
  }

  private normalizeFinishReason(
    reason: string | undefined,
  ): "stop" | "max_tokens" | "error" {
    switch (reason) {
      case "STOP":
        return "stop";
      case "MAX_TOKENS":
        return "max_tokens";
      case "SAFETY":
      case "RECITATION":
      case "OTHER":
        return "error";
      default:
        return "stop";
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof GoogleGenerativeAIError) {
      const message = error.message.toLowerCase();
      return (
        message.includes("rate limit") ||
        message.includes("quota") ||
        message.includes("503") ||
        message.includes("500") ||
        message.includes("overloaded")
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
      const model = this.client.getGenerativeModel({ model: "gemini-1.5-flash" });
      await model.generateContent("Hi");
      return true;
    } catch (error) {
      this.logError(error, "validateConnection");
      return false;
    }
  }
}
