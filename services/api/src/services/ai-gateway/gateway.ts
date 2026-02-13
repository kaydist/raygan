import { logger } from "../../config";
import { AIProviderService } from "../ai-provider.service";
import { AnthropicAdapter } from "./adapters";
import type { BaseAdapter } from "./adapters";
import type { GenerateRequest, GenerateResponse, StreamChunk } from "./types";
import type { AIModel, AIProvider } from "../../db";
import { decryptKey } from "@/helpers";

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
      throw new Error(`API Encryption key not configured for ${provider.name}`);
    }
    const apiKey = decryptKey(provider.api_key_encrypted) || "";

    switch (provider.slug) {
      case "anthropic":
        return new AnthropicAdapter(
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

    yield* adapter.stream(request, model);
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

  registerAdapter(slug: string, apiKey: string): void {
    switch (slug) {
      case "anthropic":
        this.adapters.set(slug, new AnthropicAdapter(apiKey));
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
