import type { FindOptionsWhere, ObjectLiteral } from "typeorm";
import type { ProjectBuildConfig } from "@raygan/shared";

import { env, logger } from "../../config";
import { Build, Project } from "../../db/entities";
import type { BuildStatusType, BuildPlatformType, BuildProfileType, BuildDistributionType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { CacheService } from "../../lib";
import { getBuildQueue } from "../../jobs/queues";
import { getSocketServer } from "../../socket";
import { emitBuildStatus } from "../../socket/handlers/build-sync";
import type { BuildProvider } from "./types";
import { EASAdapter } from "./adapters";
import type { BuildJobData } from "../../jobs/types";

const MAX_CONCURRENT_BUILDS = 2;

export function getBuildProvider(projectBuildConfig?: ProjectBuildConfig): BuildProvider {
  const accessToken = projectBuildConfig?.expo_access_token || env.EXPO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("EXPO_ACCESS_TOKEN is required for build functionality. Configure it in project settings or server environment.");
  }

  const accountName = projectBuildConfig?.expo_account_name || env.EXPO_ACCOUNT_NAME;

  return new EASAdapter({
    access_token: accessToken,
    account_name: accountName,
    webhook_secret: env.EAS_WEBHOOK_SECRET,
  });
}

export class BuildService {
  private buildRepository: BaseRepository<Build & ObjectLiteral>;
  private projectRepository: BaseRepository<Project & ObjectLiteral>;

  constructor() {
    this.buildRepository = new BaseRepository(Build);
    this.projectRepository = new BaseRepository(Project);
  }

  private async getProjectBuildConfig(projectId: number): Promise<ProjectBuildConfig | undefined> {
    const project = await this.projectRepository.findById(projectId);
    const settings = project?.settings as { build_config?: ProjectBuildConfig } | undefined;
    return settings?.build_config;
  }

  async triggerBuild(
    projectId: number,
    organizationId: number,
    userId: number,
    platform: BuildPlatformType,
    profile: BuildProfileType = "preview",
    distribution: BuildDistributionType = "internal",
  ): Promise<Build> {
    const activeCount = await this.getActiveBuildCount(organizationId);
    if (activeCount >= MAX_CONCURRENT_BUILDS) {
      throw new BuildLimitExceededError(
        `Maximum of ${MAX_CONCURRENT_BUILDS} concurrent builds allowed. Currently ${activeCount} active.`,
      );
    }

    const build = await this.buildRepository.create(
      {
        project_id: projectId,
        organization_id: organizationId,
        platform,
        status: "queued" as BuildStatusType,
        profile,
        distribution,
        provider: "eas",
      } as Partial<Build>,
      userId,
    );

    const jobData: BuildJobData = {
      build_id: build.id,
      project_id: projectId,
      organization_id: organizationId,
      user_id: userId,
      platform,
      profile,
      distribution,
    };

    const queue = getBuildQueue();
    await queue.add(`build-${build.uuid}`, jobData, {
      jobId: build.uuid,
    });

    const io = getSocketServer();
    if (io) {
      emitBuildStatus(io, projectId.toString(), {
        project_id: projectId.toString(),
        build_uuid: build.uuid,
        status: "queued",
      });
    }

    logger.info(
      { buildId: build.id, projectId, platform, profile },
      "Build triggered and queued",
    );

    return build;
  }

  async listBuilds(
    projectId: number,
    page = 1,
    limit = 20,
  ): Promise<{ builds: Build[]; total: number }> {
    const skip = (page - 1) * limit;

    const [builds, total] = await Promise.all([
      this.buildRepository.findAll({
        where: { project_id: projectId } as FindOptionsWhere<Build & ObjectLiteral>,
        order: { created_on: "DESC" } as Record<string, "ASC" | "DESC">,
        skip,
        take: limit,
      }),
      this.buildRepository.count({
        where: { project_id: projectId } as FindOptionsWhere<Build & ObjectLiteral>,
      }),
    ]);

    return { builds, total };
  }

  async getBuild(buildUuid: string): Promise<Build | null> {
    return this.buildRepository.findByUuid(buildUuid);
  }

  async cancelBuild(buildUuid: string, userId: number): Promise<Build | null> {
    const build = await this.buildRepository.findByUuid(buildUuid);
    if (!build) return null;

    const activeStatuses: BuildStatusType[] = ["queued", "provisioning", "building"];
    if (!activeStatuses.includes(build.status)) {
      return build;
    }

    if (build.provider_build_id) {
      try {
        const buildConfig = await this.getProjectBuildConfig(build.project_id);
        const provider = getBuildProvider(buildConfig);
        await provider.cancelBuild(build.provider_build_id);
      } catch (err) {
        logger.error({ err, buildId: build.id }, "Failed to cancel build with provider");
      }
    }

    const updated = await this.buildRepository.update(
      build.id,
      {
        status: "cancelled" as BuildStatusType,
        completed_at: new Date(),
      } as Partial<Build>,
      userId,
    );

    if (updated) {
      const io = getSocketServer();
      if (io) {
        emitBuildStatus(io, build.project_id.toString(), {
          project_id: build.project_id.toString(),
          build_uuid: build.uuid,
          status: "cancelled",
        });
      }
    }

    return updated;
  }

  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const provider = getBuildProvider();

    if (!provider.verifyWebhook(signature, rawBody)) {
      throw new Error("Invalid webhook signature");
    }

    const payload = provider.parseWebhook(rawBody);

    const build = await this.buildRepository.findOne({
      where: {
        provider_build_id: payload.provider_build_id,
      } as FindOptionsWhere<Build & ObjectLiteral>,
    });

    if (!build) {
      logger.warn({ providerBuildId: payload.provider_build_id }, "Webhook for unknown build");
      return;
    }

    const status = payload.status as BuildStatusType;

    const updateData: Partial<Build> = {
      status,
    } as Partial<Build>;

    if (payload.artifact_url) {
      (updateData as Record<string, unknown>).artifact_url = payload.artifact_url;
    }
    if (payload.logs_url) {
      (updateData as Record<string, unknown>).logs_url = payload.logs_url;
    }
    if (payload.error_message) {
      (updateData as Record<string, unknown>).error_message = payload.error_message;
    }
    if (status === "completed" || status === "failed" || status === "cancelled") {
      (updateData as Record<string, unknown>).completed_at = payload.completed_at
        ? new Date(payload.completed_at)
        : new Date();
    }

    await this.buildRepository.update(build.id, updateData);

    const io = getSocketServer();
    if (io) {
      emitBuildStatus(io, build.project_id.toString(), {
        project_id: build.project_id.toString(),
        build_uuid: build.uuid,
        status,
        artifact_url: payload.artifact_url,
        error_message: payload.error_message,
        provider_build_id: payload.provider_build_id,
        logs_url: payload.logs_url,
      });
    }

    logger.info(
      { buildId: build.id, status, providerBuildId: payload.provider_build_id },
      "Build webhook processed",
    );
  }

  async getActiveBuildCount(organizationId: number): Promise<number> {
    const cacheKey = `builds:active:org:${organizationId}`;
    const cached = await CacheService.get<number>(cacheKey);
    if (cached !== null) return cached;

    const count = await this.buildRepository.count({
      where: [
        { organization_id: organizationId, status: "queued" as BuildStatusType },
        { organization_id: organizationId, status: "provisioning" as BuildStatusType },
        { organization_id: organizationId, status: "building" as BuildStatusType },
      ] as FindOptionsWhere<Build & ObjectLiteral>[],
    });

    await CacheService.set(cacheKey, count, 10);
    return count;
  }
}

export class BuildLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildLimitExceededError";
  }
}
