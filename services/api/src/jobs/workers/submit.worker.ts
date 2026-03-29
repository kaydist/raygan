import { Worker } from "bullmq";

import { logger } from "../../config";
import { createBullMQConnection } from "../queues";
import { processSubmitJob } from "../processors/store-submit.processor";
import { pollSubmitStatuses } from "../processors/submit-status-poller";
import type { StoreSubmitJobData } from "../types";

let submitWorker: Worker<StoreSubmitJobData> | null = null;
let submitPollWorker: Worker | null = null;

export function startSubmitWorker(): void {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn("Redis not available, submit worker not started");
    return;
  }

  submitWorker = new Worker<StoreSubmitJobData>("store-submit", processSubmitJob, {
    connection,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 60000,
    },
  });

  submitWorker.on("completed", (job) => {
    logger.info({ jobId: job.id, releaseId: job.data.release_id }, "Submit job completed");
  });

  submitWorker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, releaseId: job?.data.release_id, err: error },
      "Submit job failed",
    );
  });

  logger.info("Store submit worker started");
}

export function startSubmitPollWorker(): void {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn("Redis not available, submit poll worker not started");
    return;
  }

  submitPollWorker = new Worker("submit-status-poll", async () => {
    await pollSubmitStatuses();
  }, {
    connection,
    concurrency: 1,
  });

  submitPollWorker.on("failed", (_job, error) => {
    logger.error({ err: error }, "Submit status poll failed");
  });

  logger.info("Submit status poll worker started");
}

export async function closeSubmitWorker(): Promise<void> {
  if (submitWorker) {
    await submitWorker.close();
    submitWorker = null;
    logger.info("Submit worker closed");
  }
  if (submitPollWorker) {
    await submitPollWorker.close();
    submitPollWorker = null;
    logger.info("Submit poll worker closed");
  }
}
