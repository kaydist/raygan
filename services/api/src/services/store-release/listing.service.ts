import type { FindOptionsWhere, ObjectLiteral } from "typeorm";

import { logger } from "../../config";
import { StoreListing } from "../../db/entities";
import type { StoreListingStoreType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";

export interface UpsertStoreListingInput {
  project_id: number;
  organization_id: number;
  store: StoreListingStoreType;
  title: string;
  short_description?: string;
  full_description?: string;
  category?: string;
  privacy_policy_url?: string;
  support_email?: string;
  screenshots?: string[];
  feature_graphic_url?: string;
}

export class StoreListingService {
  private repository: BaseRepository<StoreListing & ObjectLiteral>;

  constructor() {
    this.repository = new BaseRepository(StoreListing);
  }

  async getByProjectAndStore(
    projectId: number,
    store: StoreListingStoreType,
  ): Promise<StoreListing | null> {
    return this.repository.findOne({
      where: {
        project_id: projectId,
        store,
        deleted_flag: false,
      } as FindOptionsWhere<StoreListing & ObjectLiteral>,
    });
  }

  async upsert(
    input: UpsertStoreListingInput,
    userId?: number,
  ): Promise<StoreListing> {
    const existing = await this.repository.findOne({
      where: {
        project_id: input.project_id,
        store: input.store,
        deleted_flag: false,
      } as FindOptionsWhere<StoreListing & ObjectLiteral>,
    });

    if (existing) {
      const updated = await this.repository.update(
        existing.id,
        {
          title: input.title,
          short_description: input.short_description ?? existing.short_description,
          full_description: input.full_description ?? existing.full_description,
          category: input.category ?? existing.category,
          privacy_policy_url: input.privacy_policy_url ?? existing.privacy_policy_url,
          support_email: input.support_email ?? existing.support_email,
          screenshots: input.screenshots ?? existing.screenshots,
          feature_graphic_url: input.feature_graphic_url ?? existing.feature_graphic_url,
        } as Partial<StoreListing>,
        userId,
      );

      logger.info(
        { projectId: input.project_id, store: input.store },
        "Store listing updated",
      );

      return updated!;
    }

    const created = await this.repository.create(
      {
        project_id: input.project_id,
        organization_id: input.organization_id,
        store: input.store,
        title: input.title,
        short_description: input.short_description || null,
        full_description: input.full_description || null,
        category: input.category || null,
        privacy_policy_url: input.privacy_policy_url || null,
        support_email: input.support_email || null,
        screenshots: input.screenshots || [],
        feature_graphic_url: input.feature_graphic_url || null,
      } as Partial<StoreListing>,
      userId,
    );

    logger.info(
      { projectId: input.project_id, store: input.store },
      "Store listing created",
    );

    return created;
  }

  async delete(
    projectId: number,
    store: StoreListingStoreType,
    userId?: number,
  ): Promise<boolean> {
    const listing = await this.repository.findOne({
      where: {
        project_id: projectId,
        store,
        deleted_flag: false,
      } as FindOptionsWhere<StoreListing & ObjectLiteral>,
    });

    if (!listing) return false;

    return this.repository.softDelete(listing.id, userId);
  }
}
