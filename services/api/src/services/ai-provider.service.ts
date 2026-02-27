import { AIProvider, AIModel } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import { Not } from "typeorm";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";

export class AIProviderService {
  private providers = new BaseRepository(AIProvider);
  private models = new BaseRepository(AIModel);

  async findAll() {
    return this.providers.findAll({
      where: { is_enabled: true, deleted_flag: false },
      order: { priority: "ASC" },
    });
  }

  async findBySlug(slug: string) {
    return this.providers.findOne({
      where: { slug: slug as AIProvider["slug"], deleted_flag: false },
    });
  }

  async findBySlugWithModels(slug: string) {
    return this.providers.findOne({
      where: { slug: slug as AIProvider["slug"], deleted_flag: false },
      relations: ["models"],
    });
  }

  async getModels(providerId: number) {
    return CacheService.getOrSet(
      CACHE_KEYS.aiModels.byProvider(providerId),
      () => this.models.findAll({
        where: { provider_id: providerId, is_enabled: true, deleted_flag: false },
        order: { priority: "ASC" },
      }),
      CACHE_TTL.AI_MODELS
    );
  }

  async getModelById(modelId: string): Promise<AIModel | null> {
    return CacheService.getOrSet(
      CACHE_KEYS.aiModels.byModelId(modelId),
      async () => {
        const model = await this.models.findOne({
          where: { model_id: modelId, deleted_flag: false },
          relations: ["provider"],
        });
        if (model && (!model.provider || !model.provider.is_enabled)) {
          return null;
        }
        return model;
      },
      CACHE_TTL.AI_MODELS
    );
  }

  async getModelByPrimaryId(id: number): Promise<AIModel | null> {
    return CacheService.getOrSet(
      CACHE_KEYS.aiModels.byPrimaryId(id),
      async () => {
        const model = await this.models.findOne({
          where: { id, deleted_flag: false },
          relations: ["provider"],
        });
        if (model && (!model.provider || !model.provider.is_enabled)) {
          return null;
        }
        return model;
      },
      CACHE_TTL.AI_MODELS
    );
  }

  async getDefaultModel(): Promise<AIModel | null> {
    return CacheService.getOrSet(
      CACHE_KEYS.aiModels.default(),
      async () => {
        const model = await this.models.findOne({
          where: { is_default: true, is_enabled: true, deleted_flag: false },
          relations: ["provider"],
        });
        if (model && (!model.provider || !model.provider.is_enabled)) {
          return null;
        }
        return model;
      },
      CACHE_TTL.AI_MODELS
    );
  }

  async getAllEnabledModels(): Promise<AIModel[]> {
    return CacheService.getOrSet(
      CACHE_KEYS.aiModels.enabled(),
      async () => {
        const models = await this.models.findAll({
          where: { is_enabled: true, deleted_flag: false },
          relations: ["provider"],
          order: { priority: "ASC" },
        });
        return models.filter((m) => m.provider?.is_enabled);
      },
      CACHE_TTL.AI_MODELS
    );
  }

  async getFallbackModels(
    excludeModelId: string,
    limit = 3,
  ): Promise<AIModel[]> {
    const models = await this.models.findAll({
      where: {
        is_enabled: true,
        model_id: Not(excludeModelId),
        deleted_flag: false,
      },
      relations: ["provider"],
      order: { priority: "ASC" },
    });
    return models.filter((m) => m.provider?.is_enabled).slice(0, limit);
  }

  async getModelsByCapability(capability: string): Promise<AIModel[]> {
    const allModels = await this.getAllEnabledModels();
    return allModels.filter((model) => {
      const caps = model.capabilities as Record<string, boolean>;
      return caps[capability] === true;
    });
  }
}
