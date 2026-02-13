import { AIProvider, AIModel } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";

export class AIProviderService {
  private providers = new BaseRepository(AIProvider);
  private models = new BaseRepository(AIModel);

  async findAll() {
    return this.providers.findAll({
      where: { is_enabled: true },
      order: { priority: "ASC" },
    });
  }

  async findBySlug(slug: string) {
    return this.providers.findOne({
      where: { slug: slug as AIProvider["slug"] },
    });
  }

  async findBySlugWithModels(slug: string) {
    return this.providers.findOne({
      where: { slug: slug as AIProvider["slug"] },
      relations: ["models"],
    });
  }

  async getModels(providerId: number) {
    return this.models.findAll({
      where: { provider_id: providerId, is_enabled: true },
      order: { priority: "ASC" },
    });
  }

  async getModelById(modelId: string) {
    return this.models.findOne({
      where: { model_id: modelId },
      relations: ["provider"],
    });
  }

  async getDefaultModel() {
    return this.models.findOne({
      where: { is_default: true, is_enabled: true },
      relations: ["provider"],
    });
  }

  async getAllEnabledModels() {
    return this.models.findAll({
      where: { is_enabled: true },
      relations: ["provider"],
      order: { priority: "ASC" },
    });
  }
}
