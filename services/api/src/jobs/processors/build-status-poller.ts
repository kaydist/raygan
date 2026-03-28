import { In, Not, IsNull } from "typeorm";
import type { ProjectBuildConfig } from "@raygan/shared";

import { logger } from "../../config";
import { AppDataSource } from "../../db/data-source";
import { Build, Project } from "../../db/entities";
import type { BuildStatusType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { getBuildProvider } from "../../services/build-hub/build.service";
import { emitBuildStatus } from "../../socket/handlers/build-sync";
import { getSocketServer } from "../../socket";

const buildRepository = new BaseRepository(Build);

const ACTIVE_STATUSES: BuildStatusType[] = ["building", "provisioning"];
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function pollBuildStatuses(): Promise<void> {
  // Query directly to avoid BaseRepository spreading FindOperators
  const pollable = await AppDataSource.getRepository(Build).find({
    where: {
      status: In(ACTIVE_STATUSES),
      provider_build_id: Not(IsNull()),
      deleted_flag: false,
    },
  });

  if (pollable.length === 0) return;

  logger.info({ count: pollable.length }, "Polling EAS for active build statuses");

  for (const build of pollable) {
    try {
      // Get project-specific build config for the provider token
      const project = await AppDataSource.getRepository(Project).findOne({
        where: { id: build.project_id, deleted_flag: false },
      });
      const buildConfig = (project?.settings as { build_config?: ProjectBuildConfig } | undefined)?.build_config;
      const provider = getBuildProvider(buildConfig);
      const status = await provider.getBuildStatus(
        build.provider_build_id!,
        build.provider_project_id || undefined,
        project?.slug,
      );

      const normalizedStatus = status.status as BuildStatusType;

      // Check if build is stale (stuck for too long)
      const buildAge = Date.now() - new Date(build.started_at || build.created_on).getTime();
      const isStale = buildAge > STALE_THRESHOLD_MS && ACTIVE_STATUSES.includes(normalizedStatus);

      if (isStale) {
        logger.warn({ buildId: build.id, age: buildAge }, "Build appears stale, marking as failed");
        await updateBuild(build, "failed", {
          error_message: "Build timed out — no status update from EAS after 2 hours",
          completed_at: new Date(),
        });
        continue;
      }

      // Only update if status actually changed
      if (normalizedStatus === build.status) continue;

      const isTerminal = ["completed", "failed", "cancelled"].includes(normalizedStatus);

      await updateBuild(build, normalizedStatus, {
        ...(status.artifact_url && { artifact_url: status.artifact_url }),
        ...(status.logs_url && { logs_url: status.logs_url }),
        ...(status.error_message && { error_message: status.error_message }),
        ...(isTerminal && { completed_at: new Date() }),
      });

      logger.info(
        { buildId: build.id, from: build.status, to: normalizedStatus },
        "Build status updated via polling",
      );
    } catch (error) {
      logger.error(
        { err: error, buildId: build.id, providerBuildId: build.provider_build_id },
        "Failed to poll build status",
      );
    }
  }
}

async function updateBuild(
  build: Build,
  status: BuildStatusType,
  extra?: Partial<Build>,
): Promise<void> {
  await buildRepository.update(build.id, {
    status,
    ...extra,
  } as Partial<Build>);

  const io = getSocketServer();
  if (io) {
    emitBuildStatus(io, build.project_id.toString(), {
      project_id: build.project_id.toString(),
      build_uuid: build.uuid,
      status,
      artifact_url: (extra as Record<string, unknown>)?.artifact_url as string | undefined,
      error_message: (extra as Record<string, unknown>)?.error_message as string | undefined,
      provider_build_id: build.provider_build_id || undefined,
      logs_url: (extra as Record<string, unknown>)?.logs_url as string | undefined,
    });
  }
}
