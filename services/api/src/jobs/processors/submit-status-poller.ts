import { In } from "typeorm";

import { logger } from "../../config";
import { AppDataSource } from "../../db/data-source";
import { StoreRelease } from "../../db/entities";
import type { ReleaseStatusType } from "../../db/entities";
import { BaseRepository } from "../../db/repositories";
import { getSubmitProvider } from "../../services/store-release";
import { emitReleaseStatus } from "../../socket/handlers/release-sync";
import { getSocketServer } from "../../socket";

const releaseRepository = new BaseRepository(StoreRelease);

const ACTIVE_STATUSES: ReleaseStatusType[] = ["submitting", "submitted", "in_review"];
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function pollSubmitStatuses(): Promise<void> {
  const pollable = await AppDataSource.getRepository(StoreRelease).find({
    where: {
      status: In(ACTIVE_STATUSES),
      deleted_flag: false,
    },
  });

  if (pollable.length === 0) return;

  logger.info({ count: pollable.length }, "Polling for active submission statuses");

  const provider = getSubmitProvider();

  for (const release of pollable) {
    try {
      if (!release.provider_submission_id) continue;

      // Check for stale submissions
      const releaseAge = Date.now() - new Date(release.submitted_at || release.created_on).getTime();
      if (releaseAge > STALE_THRESHOLD_MS) {
        logger.warn({ releaseId: release.id, age: releaseAge }, "Submission appears stale, marking as failed");
        await updateRelease(release, "failed", {
          error_message: "Submission timed out — no status update after 4 hours",
        });
        continue;
      }

      const status = await provider.getSubmitStatus(
        release.provider_submission_id,
        "",
      );

      const normalizedStatus = mapSubmitStatus(status.status);

      if (normalizedStatus === release.status) continue;

      const isTerminal = ["live", "failed", "approved", "rejected"].includes(normalizedStatus);

      await updateRelease(release, normalizedStatus, {
        ...(status.error_message && { error_message: status.error_message }),
        ...(isTerminal && { review_completed_at: new Date() }),
      });

      logger.info(
        { releaseId: release.id, from: release.status, to: normalizedStatus },
        "Submission status updated via polling",
      );
    } catch (error) {
      logger.error(
        { err: error, releaseId: release.id, submissionId: release.provider_submission_id },
        "Failed to poll submission status",
      );
    }
  }
}

function mapSubmitStatus(status: string): ReleaseStatusType {
  const map: Record<string, ReleaseStatusType> = {
    pending: "pending",
    submitting: "submitting",
    submitted: "submitted",
    in_review: "in_review",
    approved: "approved",
    rejected: "rejected",
    live: "live",
    failed: "failed",
  };

  return map[status] || "submitted";
}

async function updateRelease(
  release: StoreRelease,
  status: ReleaseStatusType,
  extra?: Partial<StoreRelease>,
): Promise<void> {
  await releaseRepository.update(release.id, {
    status,
    ...extra,
  } as Partial<StoreRelease>);

  const io = getSocketServer();
  if (io) {
    emitReleaseStatus(io, release.project_id.toString(), {
      project_id: release.project_id.toString(),
      release_uuid: release.uuid,
      status,
      error_message: (extra as Record<string, unknown>)?.error_message as string | undefined,
      provider_submission_id: release.provider_submission_id || undefined,
    });
  }
}
