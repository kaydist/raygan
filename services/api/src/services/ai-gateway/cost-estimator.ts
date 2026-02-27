import { encoding_for_model, type TiktokenModel } from "tiktoken";
import type { GenerateRequest, CostEstimate, TokenUsage } from "./types";
import type { AIModel } from "../../db";

const MODEL_ENCODING_MAP: Record<string, TiktokenModel> = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-4": "gpt-4",
  "gpt-3.5-turbo": "gpt-3.5-turbo",
  "o1": "o1-preview",
  "o1-mini": "o1-mini",
  "claude-3-5-sonnet-20241022": "gpt-4o",
  "claude-3-5-haiku-20241022": "gpt-4o",
  "claude-3-opus-20240229": "gpt-4o",
  "claude-sonnet-4-20250514": "gpt-4o",
  "claude-opus-4-20250514": "gpt-4o",
  "grok-2": "gpt-4o",
  "grok-2-mini": "gpt-4o",
  "grok-beta": "gpt-4o",
  "gemini-2.0-flash": "gpt-4o",
  "gemini-1.5-pro": "gpt-4o",
  "gemini-1.5-flash": "gpt-4o",
  "gemini-1.5-flash-8b": "gpt-4o",
  "gemini-1.0-pro": "gpt-4o",
};

const DEFAULT_ENCODING: TiktokenModel = "gpt-4o";

export class CostEstimator {
  private encoderCache: Map<TiktokenModel, ReturnType<typeof encoding_for_model>> = new Map();

  private getEncoder(model: string): ReturnType<typeof encoding_for_model> {
    const tiktokenModel = MODEL_ENCODING_MAP[model] || DEFAULT_ENCODING;

    if (!this.encoderCache.has(tiktokenModel)) {
      this.encoderCache.set(tiktokenModel, encoding_for_model(tiktokenModel));
    }

    return this.encoderCache.get(tiktokenModel)!;
  }

  countTokens(text: string, model: string): number {
    try {
      const encoder = this.getEncoder(model);
      return encoder.encode(text).length;
    } catch {
      return Math.ceil(text.length / 4);
    }
  }

  estimateRequestTokens(request: GenerateRequest): number {
    let totalTokens = 0;
    const model = request.model;

    if (request.system_prompt) {
      totalTokens += this.countTokens(request.system_prompt, model);
      totalTokens += 4;
    }

    for (const message of request.messages) {
      const text = typeof message.content === "string"
        ? message.content
        : message.content
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join("");
      totalTokens += this.countTokens(text, model);
      totalTokens += 4;
    }

    totalTokens += 2;

    return totalTokens;
  }

  estimateCost(
    request: GenerateRequest,
    modelConfig: AIModel,
    estimatedOutputTokens?: number,
  ): CostEstimate {
    const inputTokens = this.estimateRequestTokens(request);
    const outputTokens = estimatedOutputTokens || request.max_tokens || modelConfig.max_output_tokens || 4096;

    const inputCost = (inputTokens / 1000) * Number(modelConfig.input_cost_per_1k);
    const outputCost = (outputTokens / 1000) * Number(modelConfig.output_cost_per_1k);

    return {
      provider: modelConfig.provider?.slug as CostEstimate["provider"],
      model: modelConfig.model_id,
      estimated_input_tokens: inputTokens,
      estimated_output_tokens: outputTokens,
      estimated_cost_usd: inputCost + outputCost,
    };
  }

  calculateActualCost(usage: TokenUsage, modelConfig: AIModel): number {
    const inputCost = (usage.input_tokens / 1000) * Number(modelConfig.input_cost_per_1k);
    const outputCost = (usage.output_tokens / 1000) * Number(modelConfig.output_cost_per_1k);
    return inputCost + outputCost;
  }

  cleanup(): void {
    for (const encoder of this.encoderCache.values()) {
      encoder.free();
    }
    this.encoderCache.clear();
  }
}

let estimatorInstance: CostEstimator | null = null;

export function getCostEstimator(): CostEstimator {
  if (!estimatorInstance) {
    estimatorInstance = new CostEstimator();
  }
  return estimatorInstance;
}
