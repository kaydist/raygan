import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import type { Job } from "bullmq";

import { logger } from "../../config";
import { Build, StoreRelease, Project } from "../../db/entities";
import type { ReleaseStatusType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { ProjectSettingsService, getSubmitProvider } from "../../services/store-release";
import { ExportService } from "../../services";
import { emitReleaseStatus } from "../../socket/handlers/release-sync";
import { getSocketServer } from "../../socket";
import type { StoreSubmitJobData } from "../types";

const releaseRepository = new BaseRepository(StoreRelease);
const buildRepository = new BaseRepository(Build);
const projectSettingsService = new ProjectSettingsService();
const exportService = new ExportService();

async function updateReleaseStatus(
  release: StoreRelease,
  status: ReleaseStatusType,
  extra?: Partial<StoreRelease>,
): Promise<StoreRelease> {
  const updated = await releaseRepository.update(release.id, {
    status,
    ...extra,
  } as Partial<StoreRelease>);

  if (!updated) throw new Error(`Failed to update release ${release.id}`);

  const io = getSocketServer();
  if (io) {
    emitReleaseStatus(io, release.project_id.toString(), {
      project_id: release.project_id.toString(),
      release_uuid: release.uuid,
      status,
      error_message: (extra as Record<string, unknown>)?.error_message as string | undefined,
      provider_submission_id: (extra as Record<string, unknown>)?.provider_submission_id as string | undefined,
    });
  }

  return updated;
}

export async function processSubmitJob(job: Job<StoreSubmitJobData>): Promise<void> {
  const { release_id, project_id, build_id, store, track } = job.data;

  logger.info({ releaseId: release_id, projectId: project_id }, "Processing store submit job");

  const release = await releaseRepository.findById(release_id);
  if (!release) {
    throw new Error(`Release ${release_id} not found`);
  }

  const build = await buildRepository.findById(build_id);
  if (!build) {
    throw new Error(`Build ${build_id} not found`);
  }

  const project = await new BaseRepository(Project).findById(project_id);
  if (!project) {
    throw new Error(`Project ${project_id} not found`);
  }

  let credentialTmpPath: string | null = null;
  let projectDir: string | null = null;

  try {
    await updateReleaseStatus(release, "submitting");

    // Decrypt credential and write to temp file
    const credentialSlug = store === "google_play"
      ? "google_play_service_account"
      : "apple_asc_api_key";

    const credential = await projectSettingsService.getDecryptedValue<string>(
      project_id,
      "store_credentials",
      credentialSlug,
    );

    if (!credential) {
      throw new Error(`Store credential "${credentialSlug}" not found for project ${project_id}`);
    }

    const tmpBase = path.join("/tmp", "raygan-submit");
    await fs.mkdir(tmpBase, { recursive: true });

    const credentialDir = await fs.mkdtemp(path.join(tmpBase, "cred-"));
    credentialTmpPath = path.join(credentialDir, `${crypto.randomBytes(16).toString("hex")}.json`);
    const credentialContent = typeof credential === "string" ? credential : JSON.stringify(credential);
    await fs.writeFile(credentialTmpPath, credentialContent, { mode: 0o600 });

    // Export project files to temp directory
    const files = await exportService.getProjectFiles(project_id);
    projectDir = await fs.mkdtemp(path.join(tmpBase, `${project.slug}-`));

    for (const [filePath, content] of files) {
      const fullPath = path.join(projectDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }

    if (!build.provider_project_id) {
      throw new Error(`Build ${build_id} has no EAS project ID — was the build created via EAS?`);
    }

    // Submit via EAS
    const provider = getSubmitProvider();
    const result = await provider.submitToStore({
      provider_project_id: build.provider_project_id,
      platform: build.platform === "android" ? "android" : "ios",
      store,
      track,
      build_id: build.provider_build_id || undefined,
      credential_file_path: credentialTmpPath,
      project_dir: projectDir,
    });

    await updateReleaseStatus(release, "submitted", {
      provider_submission_id: result.provider_submission_id,
      submitted_at: new Date(),
    } as Partial<StoreRelease>);

    logger.info(
      {
        releaseId: release_id,
        submissionId: result.provider_submission_id,
        store,
        track,
      },
      "Store submission completed — status updates via polling",
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown submission error";
    logger.error({ err: error, releaseId: release_id }, "Store submit job failed");

    await updateReleaseStatus(release, "failed", {
      error_message: errorMessage,
    } as Partial<StoreRelease>);

    throw error;
  } finally {
    if (credentialTmpPath) {
      const credentialDir = path.dirname(credentialTmpPath);
      await fs.rm(credentialDir, { recursive: true, force: true }).catch((err) => {
        logger.warn({ err, path: credentialDir }, "Failed to clean up credential temp directory");
      });
    }
    if (projectDir) {
      await fs.rm(projectDir, { recursive: true, force: true }).catch((err) => {
        logger.warn({ err, projectDir }, "Failed to clean up temp submit directory");
      });
    }
  }
}
