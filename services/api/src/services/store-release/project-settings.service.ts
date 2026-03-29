import type { FindOptionsWhere, ObjectLiteral } from "typeorm";

import { logger } from "../../config";
import { ProjectSetting } from "../../db/entities";
import type { ProjectSettingValueType, ProjectSettingVisibility } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { encryptKey, decryptKey } from "../../helpers/encryption";

export interface ProjectSettingResponse {
  uuid: string;
  project_id: number;
  category: string;
  slug: string;
  value: unknown;
  value_type: ProjectSettingValueType;
  is_encrypted: boolean;
  is_valid: boolean | null;
  last_verified_at: Date | null;
  visibility: ProjectSettingVisibility;
  description: string | null;
}

export interface UpsertProjectSettingInput {
  project_id: number;
  organization_id: number;
  category: string;
  slug: string;
  value: unknown;
  value_type?: ProjectSettingValueType;
  is_encrypted?: boolean;
  visibility?: ProjectSettingVisibility;
  description?: string;
}

export class ProjectSettingsService {
  private repository: BaseRepository<ProjectSetting & ObjectLiteral>;

  constructor() {
    this.repository = new BaseRepository(ProjectSetting);
  }

  async getBySlug(
    projectId: number,
    category: string,
    slug: string,
  ): Promise<ProjectSettingResponse | null> {
    const setting = await this.repository.findOne({
      where: {
        project_id: projectId,
        category,
        slug,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
    });

    if (!setting) return null;

    return this.toResponse(setting, false);
  }

  async getDecryptedValue<T = unknown>(
    projectId: number,
    category: string,
    slug: string,
  ): Promise<T | null> {
    const setting = await this.repository.findOne({
      where: {
        project_id: projectId,
        category,
        slug,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
    });

    if (!setting) return null;

    const value = setting.is_encrypted
      ? decryptKey(setting.value)
      : setting.value;

    return this.parseValue(value, setting.value_type) as T;
  }

  async getByCategory(
    projectId: number,
    category: string,
  ): Promise<ProjectSettingResponse[]> {
    const settings = await this.repository.findAll({
      where: {
        project_id: projectId,
        category,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
      order: { slug: "ASC" } as Record<string, "ASC" | "DESC">,
    });

    return settings.map((s) => this.toResponse(s, false));
  }

  async upsert(
    input: UpsertProjectSettingInput,
    userId?: number,
  ): Promise<ProjectSetting> {
    const existing = await this.repository.findOne({
      where: {
        project_id: input.project_id,
        category: input.category,
        slug: input.slug,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
    });

    const valueType = input.value_type || this.inferValueType(input.value);
    const serialized = this.serializeValue(input.value, valueType);
    const shouldEncrypt = input.is_encrypted ?? false;
    const storedValue = shouldEncrypt ? encryptKey(serialized) : serialized;

    if (existing) {
      const updated = await this.repository.update(
        existing.id,
        {
          value: storedValue,
          value_type: valueType,
          is_encrypted: shouldEncrypt,
          is_valid: null,
          last_verified_at: null,
          visibility: input.visibility || existing.visibility,
          description: input.description ?? existing.description,
        } as Partial<ProjectSetting>,
        userId,
      );

      logger.info(
        { projectId: input.project_id, category: input.category, slug: input.slug },
        "Project setting updated",
      );

      return updated!;
    }

    const created = await this.repository.create(
      {
        project_id: input.project_id,
        organization_id: input.organization_id,
        category: input.category,
        slug: input.slug,
        value: storedValue,
        value_type: valueType,
        is_encrypted: shouldEncrypt,
        visibility: input.visibility || "private",
        description: input.description,
      } as Partial<ProjectSetting>,
      userId,
    );

    logger.info(
      { projectId: input.project_id, category: input.category, slug: input.slug },
      "Project setting created",
    );

    return created;
  }

  async delete(
    projectId: number,
    category: string,
    slug: string,
    userId?: number,
  ): Promise<boolean> {
    const setting = await this.repository.findOne({
      where: {
        project_id: projectId,
        category,
        slug,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
    });

    if (!setting) return false;

    const result = await this.repository.softDelete(setting.id, userId);

    if (result) {
      logger.info(
        { projectId, category, slug },
        "Project setting deleted",
      );
    }

    return result;
  }

  async markValid(
    projectId: number,
    category: string,
    slug: string,
    isValid: boolean,
    userId?: number,
  ): Promise<ProjectSetting | null> {
    const setting = await this.repository.findOne({
      where: {
        project_id: projectId,
        category,
        slug,
        deleted_flag: false,
      } as FindOptionsWhere<ProjectSetting & ObjectLiteral>,
    });

    if (!setting) return null;

    return this.repository.update(
      setting.id,
      {
        is_valid: isValid,
        last_verified_at: new Date(),
      } as Partial<ProjectSetting>,
      userId,
    );
  }

  private toResponse(setting: ProjectSetting, decrypt: boolean): ProjectSettingResponse {
    let value: unknown;
    if (setting.is_encrypted) {
      value = decrypt ? this.parseValue(decryptKey(setting.value), setting.value_type) : "[encrypted]";
    } else {
      value = this.parseValue(setting.value, setting.value_type);
    }

    return {
      uuid: setting.uuid,
      project_id: setting.project_id,
      category: setting.category,
      slug: setting.slug,
      value,
      value_type: setting.value_type,
      is_encrypted: setting.is_encrypted,
      is_valid: setting.is_valid,
      last_verified_at: setting.last_verified_at,
      visibility: setting.visibility,
      description: setting.description,
    };
  }

  private parseValue(value: string, type: ProjectSettingValueType): unknown {
    switch (type) {
      case "number":
        return Number(value);
      case "boolean":
        return value === "true" || value === "1";
      case "json":
        try {
          return JSON.parse(value);
        } catch {
          logger.warn({ value: value.substring(0, 50) }, "Failed to parse JSON project setting");
          return null;
        }
      default:
        return value;
    }
  }

  private serializeValue(value: unknown, type: ProjectSettingValueType): string {
    switch (type) {
      case "json":
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }

  private inferValueType(value: unknown): ProjectSettingValueType {
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "object" && value !== null) return "json";
    return "string";
  }
}
