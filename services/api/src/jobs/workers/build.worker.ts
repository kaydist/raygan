import { Worker } from "bullmq";

import { logger } from "../../config";
import { createBullMQConnection } from "../queues";
import { processBuildJob } from "../processors/build.processor";
import type { BuildJobData } from "../types";

let buildWorker: Worker<BuildJobData> | null = null;

export function startBuildWorker(): void {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn("Redis not available, build worker not started");
    return;
  }

  buildWorker = new Worker<BuildJobData>("build", processBuildJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000,
    },
  });

  buildWorker.on("completed", (job) => {
    logger.info({ jobId: job.id, buildId: job.data.build_id }, "Build job completed");
  });

  buildWorker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, buildId: job?.data.build_id, err: error },
      "Build job failed",
    );
  });

  logger.info("Build worker started");
}

export async function closeBuildWorker(): Promise<void> {
  if (buildWorker) {
    await buildWorker.close();
    buildWorker = null;
    logger.info("Build worker closed");
  }
}
