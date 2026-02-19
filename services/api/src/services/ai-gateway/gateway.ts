import { logger } from "../../config";
import { AIProviderService } from "../ai-provider.service";
import { AnthropicAdapter, OpenAIAdapter, XAIAdapter, GoogleAdapter } from "./adapters";
import type { BaseAdapter } from "./adapters";
import type { GenerateRequest, GenerateResponse, StreamChunk, CostEstimate } from "./types";
import type { AIModel, AIProvider } from "../../db";
import { decryptKey } from "@/helpers";
import { getCostEstimator } from "./cost-estimator";

interface FallbackResult {
  response: GenerateResponse;
  usedFallback: boolean;
  originalModel: string;
  actualModel: string;
  attempts: number;
}

export class AIGateway {
  private adapters: Map<string, BaseAdapter> = new Map();
  private providerService: AIProviderService;
  private initialized = false;

  constructor() {
    this.providerService = new AIProviderService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const providers = await this.providerService.findAll();

    for (const provider of providers) {
      if (!provider.api_key_encrypted) {
        logger.error(
          { provider: provider.slug },
          "Provider has no API key configured",
        );
        continue;
      }

      try {
        const adapter = this.createAdapter(provider);
        if (adapter) {
          this.adapters.set(provider.slug, adapter);
          logger.info({ provider: provider.slug }, "AI adapter initialized");
        }
      } catch (error) {
        logger.error(
          { provider: provider.slug, error },
          "Failed to initialize adapter",
        );
      }
    }

    this.initialized = true;
  }

  private createAdapter(provider: AIProvider): BaseAdapter | null {
    if (!provider.api_key_encrypted) {
      throw new Error(`Provider not properly configured: ${provider.name}`);
    }
    const apiKey = decryptKey(provider.api_key_encrypted) || "";

    switch (provider.slug) {
      case "anthropic":
        return new AnthropicAdapter(
          apiKey,
          provider.base_url || undefined,
          provider.timeout_ms,
        );
      case "openai":
        return new OpenAIAdapter(
          apiKey,
          provider.base_url || undefined,
          provider.timeout_ms,
        );
      case "xai":
        return new XAIAdapter(
          apiKey,
          provider.base_url || undefined,
          provider.timeout_ms,
        );
      case "google":
        return new GoogleAdapter(
          apiKey,
          provider.base_url || undefined,
          provider.timeout_ms,
        );
      default:
        logger.warn({ provider: provider.slug }, "Unknown provider, skipping");
        return null;
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    await this.ensureInitialized();

    const model = await this.providerService.getModelById(request.model);
    if (!model) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const adapter = this.adapters.get(model.provider.slug);
    if (!adapter) {
      throw new Error(`Provider not configured: ${model.provider.slug}`);
    }

    return adapter.generate(request, model);
  }

  async generateWithFallback(
    request: GenerateRequest,
    maxAttempts = 3,
  ): Promise<FallbackResult> {
    await this.ensureInitialized();

    const originalModel = request.model;
    let attempts = 0;
    const triedModels: string[] = [];

    const primaryModel = await this.providerService.getModelById(request.model);
    if (!primaryModel) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const modelsToTry: AIModel[] = [primaryModel];
    const fallbackModels = await this.providerService.getFallbackModels(
      request.model,
      maxAttempts - 1,
    );
    modelsToTry.push(...fallbackModels);

    for (const model of modelsToTry.slice(0, maxAttempts)) {
      attempts++;
      triedModels.push(model.model_id);

      const adapter = this.adapters.get(model.provider.slug);
      if (!adapter) {
        logger.warn(
          { model: model.model_id, provider: model.provider.slug },
          "Provider not configured, trying fallback",
        );
        continue;
      }

      try {
        const modifiedRequest = { ...request, model: model.model_id };
        const response = await adapter.generate(modifiedRequest, model);

        return {
          response,
          usedFallback: model.model_id !== originalModel,
          originalModel,
          actualModel: model.model_id,
          attempts,
        };
      } catch (error) {
        logger.warn(
          { model: model.model_id, error, attempts },
          "Model generation failed, trying fallback",
        );

        if (attempts >= maxAttempts) {
          throw new Error(
            `All ${attempts} model attempts failed. Tried: ${triedModels.join(", ")}. Last error: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    }

    throw new Error(`No available models to try. Attempted: ${triedModels.join(", ")}`);
  }

  async *streamWithFallback(
    request: GenerateRequest,
    maxAttempts = 3,
  ): AsyncIterable<StreamChunk & { fallback_info?: { original_model: string; actual_model: string } }> {
    await this.ensureInitialized();

    const originalModel = request.model;
    let attempts = 0;
    const triedModels: string[] = [];

    const primaryModel = await this.providerService.getModelById(request.model);
    if (!primaryModel) {
      yield { type: "error", error: `Model not found: ${request.model}` };
      return;
    }

    const modelsToTry: AIModel[] = [primaryModel];
    const fallbackModels = await this.providerService.getFallbackModels(
      request.model,
      maxAttempts - 1,
    );
    modelsToTry.push(...fallbackModels);

    for (const model of modelsToTry.slice(0, maxAttempts)) {
      attempts++;
      triedModels.push(model.model_id);

      const adapter = this.adapters.get(model.provider.slug);
      if (!adapter) {
        logger.warn(
          { model: model.model_id, provider: model.provider.slug },
          "Provider not configured, trying fallback",
        );
        continue;
      }

      try {
        const modifiedRequest = { ...request, model: model.model_id };
        let hasYielded = false;

        for await (const chunk of adapter.stream(modifiedRequest, model)) {
          if (!hasYielded && model.model_id !== originalModel) {
            yield {
              ...chunk,
              fallback_info: {
                original_model: originalModel,
                actual_model: model.model_id,
              },
            };
          } else {
            yield chunk;
          }
          hasYielded = true;

          if (chunk.type === "error") {
            throw new Error(chunk.error || "Stream error");
          }
        }
        return;
      } catch (error) {
        logger.warn(
          { model: model.model_id, error, attempts },
          "Model streaming failed, trying fallback",
        );

        if (attempts >= maxAttempts) {
          yield {
            type: "error",
            error: `All ${attempts} model attempts failed. Tried: ${triedModels.join(", ")}`,
          };
          return;
        }
      }
    }

    yield {
      type: "error",
      error: `No available models to try. Attempted: ${triedModels.join(", ")}`,
    };
  }

  estimateCost(request: GenerateRequest, model: AIModel): CostEstimate {
    const estimator = getCostEstimator();
    return estimator.estimateCost(request, model);
  }

  async estimateCostByModelId(
    request: GenerateRequest,
    modelId?: string,
  ): Promise<CostEstimate | null> {
    const model = await this.providerService.getModelById(
      modelId || request.model,
    );
    if (!model) return null;
    return this.estimateCost(request, model);
  }

  async *stream(request: GenerateRequest): AsyncIterable<StreamChunk> {
    await this.ensureInitialized();

    const model = await this.providerService.getModelById(request.model);
    if (!model) {
      yield { type: "error", error: `Model not found: ${request.model}` };
      return;
    }

    const adapter = this.adapters.get(model.provider.slug);
    if (!adapter) {
      yield {
        type: "error",
        error: `Provider not configured: ${model.provider.slug}`,
      };
      return;
    }

    yield* adapter.stream(request,  model);
  }

  async getAvailableModels(): Promise<AIModel[]> {
    return this.providerService.getAllEnabledModels();
  }

  async getDefaultModel(): Promise<AIModel | null> {
    return this.providerService.getDefaultModel();
  }

  async validateProvider(slug: string): Promise<boolean> {
    await this.ensureInitialized();

    const adapter = this.adapters.get(slug);
    if (!adapter) return false;

    return adapter.validateConnection();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  registerAdapter(slug: string, apiKey: string, baseUrl?: string): void {
    switch (slug) {
      case "anthropic":
        this.adapters.set(slug, new AnthropicAdapter(apiKey, baseUrl));
        break;
      case "openai":
        this.adapters.set(slug, new OpenAIAdapter(apiKey, baseUrl));
        break;
      case "xai":
        this.adapters.set(slug, new XAIAdapter(apiKey, baseUrl));
        break;
      case "google":
        this.adapters.set(slug, new GoogleAdapter(apiKey, baseUrl));
        break;
      default:
        throw new Error(`Unknown provider: ${slug}`);
    }
  }
}

let gatewayInstance: AIGateway | null = null;

export function getAIGateway(): AIGateway {
  if (!gatewayInstance) {
    gatewayInstance = new AIGateway();
  }
  return gatewayInstance;
}
