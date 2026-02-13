import type {
  AIAdapter,
  AIProvider,
  AdapterConfig,
  GenerateRequest,
  GenerateResponse,
  StreamChunk,
  CostEstimate,
  ModelInfo,
} from "../types";
import { logger } from "../../../config";

export abstract class BaseAdapter implements AIAdapter {
  abstract readonly provider: AIProvider;
  protected config: AdapterConfig;
  protected models: ModelInfo[] = [];

  constructor(config: AdapterConfig) {
    this.config = {
      timeout_ms: 120000,
      max_retries: 3,
      ...config,
    };
  }

  abstract generate(request: GenerateRequest): Promise<GenerateResponse>;

  abstract stream(request: GenerateRequest): AsyncIterable<StreamChunk>;

  abstract validateConnection(): Promise<boolean>;

  estimateCost(request: GenerateRequest): CostEstimate {
    const model = this.models.find((m) => m.id === request.model);
    if (!model) {
      return {
        provider: this.provider,
        model: request.model,
        estimated_input_tokens: 0,
        estimated_output_tokens: 0,
        estimated_cost_usd: 0,
      };
    }

    const inputTokens = this.estimateTokenCount(request.messages.map((m) => m.content).join(" "));
    const outputTokens = request.max_tokens || model.max_output_tokens;

    const inputCost = (inputTokens / 1000) * model.input_cost_per_1k;
    const outputCost = (outputTokens / 1000) * model.output_cost_per_1k;

    return {
      provider: this.provider,
      model: request.model,
      estimated_input_tokens: inputTokens,
      estimated_output_tokens: outputTokens,
      estimated_cost_usd: inputCost + outputCost,
    };
  }

  getAvailableModels(): ModelInfo[] {
    return this.models;
  }

  protected estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  protected logRequest(request: GenerateRequest): void {
    logger.debug(
      { provider: this.provider, model: request.model, messageCount: request.messages.length },
      "AI request started"
    );
  }

  protected logResponse(response: GenerateResponse): void {
    logger.debug(
      {
        provider: this.provider,
        model: response.model,
        tokens: response.usage,
        time_ms: response.generation_time_ms,
      },
      "AI request completed"
    );
  }

  protected logError(error: unknown, context?: string): void {
    logger.error({ provider: this.provider, error, context }, "AI adapter error");
  }

  protected async withRetry<T>(operation: () => Promise<T>, retries = this.config.max_retries || 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn({ provider: this.provider, attempt, delay }, "Retrying AI request");
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
