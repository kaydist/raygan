import { IsNull } from "typeorm";
import { AppDataSource, Setting, type SettingCategory, type SettingVisibility, type SettingValueType } from "../db";
import { BaseRepository } from "../db/repositories";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";
import { logger } from "../config";

export interface SettingResponse {
  slug: string;
  value: unknown;
  category: SettingCategory;
  visibility: SettingVisibility;
  description: string | null;
}

export interface CreateSettingInput {
  slug: string;
  value: unknown;
  value_type?: SettingValueType;
  category?: SettingCategory;
  visibility?: SettingVisibility;
  description?: string;
  organization_id?: number;
}

export interface UpdateSettingInput {
  value?: unknown;
  value_type?: SettingValueType;
  category?: SettingCategory;
  visibility?: SettingVisibility;
  description?: string;
}

export interface PublicSettings {
  plans: unknown[];
  enabledModels: unknown[];
  enabledBackends: unknown[];
  featureFlags: Record<string, boolean>;
  maxProjectsPerPlan: Record<string, number>;
  maintenanceMode: boolean;
  snack_web_player_url?: string;
  [key: string]: unknown;
}

class SettingsRepository extends BaseRepository<Setting> {
  constructor() {
    super(Setting);
  }

  async findBySlug(slug: string, organizationId?: number): Promise<Setting | null> {
    return this.repository.findOne({
      where: {
        slug,
        organization_id: organizationId ?? IsNull(),
        deleted_flag: false,
      },
    });
  }

  async findGlobalSettings(): Promise<Setting[]> {
    return this.repository.find({
      where: {
        organization_id: IsNull(),
        deleted_flag: false,
      },
      order: { category: "ASC", slug: "ASC" },
    });
  }

  async findPublicSettings(): Promise<Setting[]> {
    return this.repository.find({
      where: {
        organization_id: IsNull(),
        visibility: "public",
        deleted_flag: false,
      },
      order: { category: "ASC", slug: "ASC" },
    });
  }

  async findOrgSettings(organizationId: number): Promise<Setting[]> {
    return this.repository.find({
      where: {
        organization_id: organizationId,
        deleted_flag: false,
      },
      order: { category: "ASC", slug: "ASC" },
    });
  }

  async findByCategory(category: SettingCategory, organizationId?: number): Promise<Setting[]> {
    return this.repository.find({
      where: {
        category,
        organization_id: organizationId ?? IsNull(),
        deleted_flag: false,
      },
      order: { slug: "ASC" },
    });
  }
}

export class SettingsService {
  private repository: SettingsRepository;

  constructor() {
    this.repository = new SettingsRepository();
  }

  private parseValue(value: string, type: SettingValueType): unknown {
    switch (type) {
      case "number":
        return Number(value);
      case "boolean":
        return value === "true" || value === "1";
      case "json":
        try {
          return JSON.parse(value);
        } catch {
          logger.warn({ value }, "Failed to parse JSON setting value");
          return null;
        }
      default:
        return value;
    }
  }

  private serializeValue(value: unknown, type: SettingValueType): string {
    switch (type) {
      case "json":
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  private toResponse(setting: Setting): SettingResponse {
    return {
      slug: setting.slug,
      value: this.parseValue(setting.value, setting.value_type),
      category: setting.category,
      visibility: setting.visibility,
      description: setting.description,
    };
  }

  async getPublicSettings(): Promise<PublicSettings> {
    const cached = await CacheService.get<PublicSettings>(CACHE_KEYS.settings.public());
    if (cached) {
      logger.debug("Public settings served from cache");
      return cached;
    }

    const settings = await this.repository.findPublicSettings();
    const result = this.buildPublicSettings(settings);

    await CacheService.set(
      CACHE_KEYS.settings.public(),
      result,
      CACHE_TTL.SETTINGS_PUBLIC
    );

    return result;
  }

  private buildPublicSettings(settings: Setting[]): PublicSettings {
    const result: PublicSettings = {
      plans: [],
      enabledModels: [],
      enabledBackends: [],
      featureFlags: {},
      maxProjectsPerPlan: {},
      maintenanceMode: false,
    };

    for (const setting of settings) {
      const value = this.parseValue(setting.value, setting.value_type);

      switch (setting.slug) {
        case "plans":
          result.plans = value as unknown[];
          break;
        case "enabled_models":
          result.enabledModels = value as unknown[];
          break;
        case "enabled_backends":
          result.enabledBackends = value as unknown[];
          break;
        case "feature_flags":
          result.featureFlags = value as Record<string, boolean>;
          break;
        case "max_projects_per_plan":
          result.maxProjectsPerPlan = value as Record<string, number>;
          break;
        case "maintenance_mode":
          result.maintenanceMode = value as boolean;
          break;
        default:
          result[setting.slug] = value;
      }
    }

    return result;
  }

  async getAllGlobalSettings(): Promise<SettingResponse[]> {
    const cached = await CacheService.get<SettingResponse[]>(CACHE_KEYS.settings.global());
    if (cached) {
      logger.debug("Global settings served from cache");
      return cached;
    }

    const settings = await this.repository.findGlobalSettings();
    const result = settings.map((s) => this.toResponse(s));

    await CacheService.set(
      CACHE_KEYS.settings.global(),
      result,
      CACHE_TTL.SETTINGS
    );

    return result;
  }

  async getOrgSettings(organizationId: number): Promise<SettingResponse[]> {
    const cacheKey = CACHE_KEYS.settings.org(organizationId);
    const cached = await CacheService.get<SettingResponse[]>(cacheKey);
    if (cached) {
      logger.debug({ organizationId }, "Org settings served from cache");
      return cached;
    }

    const settings = await this.repository.findOrgSettings(organizationId);
    const result = settings.map((s) => this.toResponse(s));

    await CacheService.set(cacheKey, result, CACHE_TTL.SETTINGS);

    return result;
  }

  async getBySlug(slug: string, organizationId?: number): Promise<SettingResponse | null> {
    const cacheKey = CACHE_KEYS.settings.bySlug(slug, organizationId);
    const cached = await CacheService.get<SettingResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const setting = await this.repository.findBySlug(slug, organizationId);
    if (!setting) return null;

    const result = this.toResponse(setting);
    await CacheService.set(cacheKey, result, CACHE_TTL.SETTINGS);

    return result;
  }

  async getValue<T = unknown>(slug: string, organizationId?: number): Promise<T | null> {
    const setting = await this.getBySlug(slug, organizationId);
    if (!setting) return null;
    return setting.value as T;
  }

  async getByCategory(
    category: SettingCategory,
    organizationId?: number
  ): Promise<SettingResponse[]> {
    const cacheKey = CACHE_KEYS.settings.byCategory(category, organizationId);
    return CacheService.getOrSet(
      cacheKey,
      async () => {
        const settings = await this.repository.findByCategory(category, organizationId);
        return settings.map((s) => this.toResponse(s));
      },
      CACHE_TTL.SETTINGS_CATEGORY
    );
  }

  async create(input: CreateSettingInput, userId?: number): Promise<Setting> {
    const valueType = input.value_type || this.inferValueType(input.value);
    const serializedValue = this.serializeValue(input.value, valueType);

    const setting = await this.repository.create(
      {
        slug: input.slug,
        value: serializedValue,
        value_type: valueType,
        category: input.category || "general",
        visibility: input.visibility || "private",
        description: input.description,
        organization_id: input.organization_id ?? null,
      },
      userId
    );

    await CacheService.invalidateSettings(input.organization_id);

    logger.info({ slug: input.slug, organizationId: input.organization_id }, "Setting created");

    return setting;
  }

  async update(
    slug: string,
    input: UpdateSettingInput,
    organizationId?: number,
    userId?: number
  ): Promise<Setting | null> {
    const setting = await this.repository.findBySlug(slug, organizationId);
    if (!setting) return null;

    const updateData: Partial<Setting> = {};

    if (input.value !== undefined) {
      const valueType = input.value_type || setting.value_type;
      updateData.value = this.serializeValue(input.value, valueType);
      if (input.value_type) {
        updateData.value_type = input.value_type;
      }
    }

    if (input.category) updateData.category = input.category;
    if (input.visibility) updateData.visibility = input.visibility;
    if (input.description !== undefined) updateData.description = input.description;

    const updated = await this.repository.update(setting.id, updateData, userId);

    await CacheService.invalidateSettings(organizationId);

    logger.info({ slug, organizationId }, "Setting updated");

    return updated;
  }

  async delete(slug: string, organizationId?: number, userId?: number): Promise<boolean> {
    const setting = await this.repository.findBySlug(slug, organizationId);
    if (!setting) return false;

    const result = await this.repository.softDelete(setting.id, userId);

    if (result) {
      await CacheService.invalidateSettings(organizationId);
      logger.info({ slug, organizationId }, "Setting deleted");
    }

    return result;
  }

  async upsert(input: CreateSettingInput, userId?: number): Promise<Setting> {
    const existing = await this.repository.findBySlug(input.slug, input.organization_id);

    if (existing) {
      const updated = await this.update(
        input.slug,
        {
          value: input.value,
          value_type: input.value_type,
          category: input.category,
          visibility: input.visibility,
          description: input.description,
        },
        input.organization_id,
        userId
      );
      return updated!;
    }

    return this.create(input, userId);
  }

  async bulkUpsert(inputs: CreateSettingInput[], userId?: number): Promise<Setting[]> {
    const results: Setting[] = [];

    await AppDataSource.transaction(async () => {
      for (const input of inputs) {
        const setting = await this.upsert(input, userId);
        results.push(setting);
      }
    });

    const orgIds = [...new Set(inputs.map((i) => i.organization_id).filter(Boolean))];
    for (const orgId of orgIds) {
      await CacheService.invalidateSettings(orgId);
    }
    await CacheService.invalidateSettings();

    return results;
  }

  private inferValueType(value: unknown): SettingValueType {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "object" && value !== null) return "json";
    return "string";
  }
}
