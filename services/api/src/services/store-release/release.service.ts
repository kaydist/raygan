import type { FindOptionsWhere, ObjectLiteral } from "typeorm";

import { env, logger } from "../../config";
import { Build, StoreRelease } from "../../db/entities";
import type { ReleaseStatusType, ReleaseTrackType, ReleaseStoreType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { getSubmitQueue } from "../../jobs/queues";
import { getSocketServer } from "../../socket";
import { emitReleaseStatus } from "../../socket/handlers/release-sync";
import type { StoreSubmitJobData } from "../../jobs/types";
import { EASSubmitAdapter } from "./adapters";
import type { SubmitProvider, SubmitProviderConfig } from "./types";

export function getSubmitProvider(): SubmitProvider {
  const accessToken = env.EXPO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("EXPO_ACCESS_TOKEN is required for store submission");
  }

  const config: SubmitProviderConfig = {
    access_token: accessToken,
    account_name: env.EXPO_ACCOUNT_NAME,
  };

  return new EASSubmitAdapter(config);
}

export class ReleaseService {
  private releaseRepository: BaseRepository<StoreRelease & ObjectLiteral>;
  private buildRepository: BaseRepository<Build & ObjectLiteral>;

  constructor() {
    this.releaseRepository = new BaseRepository(StoreRelease);
    this.buildRepository = new BaseRepository(Build);
  }

  async createRelease(
    projectId: number,
    organizationId: number,
    buildUuid: string,
    store: ReleaseStoreType,
    track: ReleaseTrackType,
    userId: number,
    autoTriggered = false,
  ): Promise<StoreRelease> {
    const build = await this.buildRepository.findByUuid(buildUuid);
    if (!build) {
      throw new ReleaseValidationError("Build not found");
    }

    if (build.status !== "completed") {
      throw new ReleaseValidationError("Build must be completed before submitting to store");
    }

    if (!build.artifact_url) {
      throw new ReleaseValidationError("Build has no artifact URL — the build artifact may have expired");
    }

    if (build.project_id !== projectId) {
      throw new ReleaseValidationError("Build does not belong to this project");
    }

    const release = await this.releaseRepository.create(
      {
        project_id: projectId,
        organization_id: organizationId,
        build_id: build.id,
        store,
        track,
        status: "pending" as ReleaseStatusType,
        artifact_url: build.artifact_url,
        auto_triggered: autoTriggered,
      } as Partial<StoreRelease>,
      userId,
    );

    const jobData: StoreSubmitJobData = {
      release_id: release.id,
      project_id: projectId,
      organization_id: organizationId,
      build_id: build.id,
      user_id: userId,
      store,
      track,
    };

    const queue = getSubmitQueue();
    await queue.add(`submit-${release.uuid}`, jobData, {
      jobId: release.uuid,
    });

    const io = getSocketServer();
    if (io) {
      emitReleaseStatus(io, projectId.toString(), {
        project_id: projectId.toString(),
        release_uuid: release.uuid,
        status: "pending",
      });
    }

    logger.info(
      { releaseId: release.id, buildId: build.id, store, track, autoTriggered },
      "Store release created and queued",
    );

    return release;
  }

  async listReleases(
    projectId: number,
    page = 1,
    limit = 20,
  ): Promise<{ releases: StoreRelease[]; total: number }> {
    const skip = (page - 1) * limit;

    const [releases, total] = await Promise.all([
      this.releaseRepository.findAll({
        where: { project_id: projectId, deleted_flag: false } as FindOptionsWhere<StoreRelease & ObjectLiteral>,
        order: { created_on: "DESC" } as Record<string, "ASC" | "DESC">,
        skip,
        take: limit,
        relations: ["build"],
      }),
      this.releaseRepository.count({
        where: { project_id: projectId, deleted_flag: false } as FindOptionsWhere<StoreRelease & ObjectLiteral>,
      }),
    ]);

    return { releases, total };
  }

  async getRelease(releaseUuid: string): Promise<StoreRelease | null> {
    return this.releaseRepository.findOne({
      where: { uuid: releaseUuid, deleted_flag: false } as FindOptionsWhere<StoreRelease & ObjectLiteral>,
      relations: ["build"],
    });
  }

  async getReleaseByBuildId(buildId: number): Promise<StoreRelease | null> {
    return this.releaseRepository.findOne({
      where: { build_id: buildId, deleted_flag: false } as FindOptionsWhere<StoreRelease & ObjectLiteral>,
      order: { created_on: "DESC" } as Record<string, "ASC" | "DESC">,
    });
  }

  async cancelRelease(releaseUuid: string, userId: number): Promise<StoreRelease | null> {
    const release = await this.releaseRepository.findOne({
      where: { uuid: releaseUuid, deleted_flag: false } as FindOptionsWhere<StoreRelease & ObjectLiteral>,
    });

    if (!release) return null;

    const cancellableStatuses: ReleaseStatusType[] = ["pending", "submitting"];
    if (!cancellableStatuses.includes(release.status)) {
      return release;
    }

    const updated = await this.releaseRepository.update(
      release.id,
      {
        status: "failed" as ReleaseStatusType,
        error_message: "Cancelled by user",
      } as Partial<StoreRelease>,
      userId,
    );

    if (updated) {
      const io = getSocketServer();
      if (io) {
        emitReleaseStatus(io, release.project_id.toString(), {
          project_id: release.project_id.toString(),
          release_uuid: release.uuid,
          status: "failed",
          error_message: "Cancelled by user",
        });
      }
    }

    return updated;
  }

  async updateReleaseStatus(
    releaseId: number,
    status: ReleaseStatusType,
    extra?: {
      provider_submission_id?: string;
      error_message?: string;
      submitted_at?: Date;
      review_completed_at?: Date;
    },
  ): Promise<StoreRelease | null> {
    const updateData: Partial<StoreRelease> = {
      status,
      ...extra,
    } as Partial<StoreRelease>;

    const updated = await this.releaseRepository.update(releaseId, updateData);

    if (updated) {
      const io = getSocketServer();
      if (io) {
        emitReleaseStatus(io, updated.project_id.toString(), {
          project_id: updated.project_id.toString(),
          release_uuid: updated.uuid,
          status,
          error_message: extra?.error_message,
          provider_submission_id: extra?.provider_submission_id,
        });
      }
    }

    return updated;
  }
}

export class ReleaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseValidationError";
  }
}
