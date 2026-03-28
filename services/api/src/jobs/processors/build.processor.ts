import fs from "fs/promises";
import path from "path";

import type { Job } from "bullmq";
import type { ProjectBuildConfig, ProjectAppConfig } from "@raygan/shared";

import { logger } from "../../config";
import { Build } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { ProjectService, ExportService } from "../../services";
import { getBuildProvider } from "../../services/build-hub/build.service";
import { emitBuildStatus } from "../../socket/handlers/build-sync";
import { getSocketServer } from "../../socket";
import type { BuildJobData } from "../types";
import type { BuildStatusType } from "../../db/entities";

const buildRepository = new BaseRepository(Build);
const projectService = new ProjectService();
const exportService = new ExportService();

async function updateBuildStatus(
  build: Build,
  status: BuildStatusType,
  extra?: Partial<Build>,
): Promise<Build> {
  const updated = await buildRepository.update(build.id, {
    status,
    ...extra,
  } as Partial<Build>);

  if (!updated) throw new Error(`Failed to update build ${build.id}`);

  const io = getSocketServer();
  if (io) {
    emitBuildStatus(io, build.project_id.toString(), {
      project_id: build.project_id.toString(),
      build_uuid: build.uuid,
      status,
      artifact_url: (extra as Record<string, unknown>)?.artifact_url as string | undefined,
      error_message: (extra as Record<string, unknown>)?.error_message as string | undefined,
      provider_build_id: (extra as Record<string, unknown>)?.provider_build_id as string | undefined,
      logs_url: (extra as Record<string, unknown>)?.logs_url as string | undefined,
    });
  }

  return updated;
}

async function writeProjectToDir(
  projectId: number,
  projectSlug: string,
): Promise<string> {
  const files = await exportService.getProjectFiles(projectId);

  const tmpBase = path.join("/tmp", "raygan-builds");
  await fs.mkdir(tmpBase, { recursive: true });
  const projectDir = await fs.mkdtemp(path.join(tmpBase, `${projectSlug}-`));

  for (const [filePath, content] of files) {
    const fullPath = path.join(projectDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  return projectDir;
}

export async function processBuildJob(job: Job<BuildJobData>): Promise<void> {
  const { build_id, project_id, platform, profile, distribution } = job.data;

  logger.info({ buildId: build_id, projectId: project_id }, "Processing build job");

  const build = await buildRepository.findById(build_id);
  if (!build) {
    throw new Error(`Build ${build_id} not found`);
  }

  const project = await projectService.findById(project_id);
  if (!project) {
    throw new Error(`Project ${project_id} not found`);
  }

  const settings = project.settings as {
    app_config?: ProjectAppConfig;
    build_config?: ProjectBuildConfig;
  } | undefined;
  const appConfig = settings?.app_config;
  const buildConfig = settings?.build_config;

  const provider = getBuildProvider(buildConfig);
  let projectDir: string | null = null;

  try {
    await updateBuildStatus(build, "provisioning");

    projectDir = await writeProjectToDir(project.id, project.slug);
    logger.info({ projectDir, buildId: build_id }, "Project files written to temp directory");

    let providerProjectId = build.provider_project_id;
    if (!providerProjectId) {
      const projectResult = await provider.createProject({
        name: project.name,
        slug: project.slug,
        account_name: buildConfig?.expo_account_name,
      });
      providerProjectId = projectResult.provider_project_id;
      await buildRepository.update(build.id, {
        provider_project_id: providerProjectId,
      } as Partial<Build>);
    }

    const sdkVersion = project.framework_version || "52.0.0";
    const appVersion = appConfig?.version || "1.0.0";

    const buildResult = await provider.triggerBuild({
      provider_project_id: providerProjectId,
      platform,
      profile,
      distribution,
      sdk_version: sdkVersion,
      app_version: appVersion,
      project_dir: projectDir,
    });

    await updateBuildStatus(build, "building", {
      provider_build_id: buildResult.provider_build_id,
      logs_url: buildResult.logs_url || null,
      sdk_version: sdkVersion,
      app_version: appVersion,
      started_at: new Date(),
    } as Partial<Build>);

    logger.info(
      { buildId: build_id, providerBuildId: buildResult.provider_build_id },
      "Build submitted to provider — status updates via EAS webhook",
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown build error";
    logger.error({ err: error, buildId: build_id }, "Build job failed");

    await updateBuildStatus(build, "failed", {
      error_message: errorMessage,
      completed_at: new Date(),
    } as Partial<Build>);

    throw error;
  } finally {
    if (projectDir) {
      await fs.rm(projectDir, { recursive: true, force: true }).catch((err) => {
        logger.warn({ err, projectDir }, "Failed to clean up temp build directory");
      });
    }
  }
}
