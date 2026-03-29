import { Queue } from "bullmq";
import Redis from "ioredis";

import { env, logger } from "../config";

let buildQueue: Queue | null = null;
let buildPollQueue: Queue | null = null;
let submitQueue: Queue | null = null;
let submitPollQueue: Queue | null = null;

export function createBullMQConnection(): Redis | undefined {
  if (!env.REDIS_URL) return undefined;

  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
    ...(env.REDIS_URL.includes("upstash.io") && {
      tls: { rejectUnauthorized: false },
    }),
  });
}

export function getBuildQueue(): Queue {
  if (buildQueue) return buildQueue;

  const connection = createBullMQConnection();
  if (!connection) {
    throw new Error("Redis is not available, cannot create build queue");
  }

  buildQueue = new Queue("build", {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  logger.info("Build queue initialized");
  return buildQueue;
}

export function getBuildPollQueue(): Queue {
  if (buildPollQueue) return buildPollQueue;

  const connection = createBullMQConnection();
  if (!connection) {
    throw new Error("Redis is not available, cannot create build poll queue");
  }

  buildPollQueue = new Queue("build-status-poll", {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  });

  // Add repeatable job — polls every 30 seconds
  buildPollQueue.upsertJobScheduler(
    "poll-active-builds",
    { every: 30_000 },
    { name: "poll-active-builds" },
  );

  logger.info("Build status poll queue initialized (every 30s)");
  return buildPollQueue;
}

export function getSubmitQueue(): Queue {
  if (submitQueue) return submitQueue;

  const connection = createBullMQConnection();
  if (!connection) {
    throw new Error("Redis is not available, cannot create submit queue");
  }

  submitQueue = new Queue("store-submit", {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  logger.info("Store submit queue initialized");
  return submitQueue;
}

export function getSubmitPollQueue(): Queue {
  if (submitPollQueue) return submitPollQueue;

  const connection = createBullMQConnection();
  if (!connection) {
    throw new Error("Redis is not available, cannot create submit poll queue");
  }

  submitPollQueue = new Queue("submit-status-poll", {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  });

  submitPollQueue.upsertJobScheduler(
    "poll-active-submissions",
    { every: 60_000 },
    { name: "poll-active-submissions" },
  );

  logger.info("Submit status poll queue initialized (every 60s)");
  return submitPollQueue;
}

export async function closeQueues(): Promise<void> {
  if (buildQueue) {
    await buildQueue.close();
    buildQueue = null;
    logger.info("Build queue closed");
  }
  if (buildPollQueue) {
    await buildPollQueue.close();
    buildPollQueue = null;
    logger.info("Build poll queue closed");
  }
  if (submitQueue) {
    await submitQueue.close();
    submitQueue = null;
    logger.info("Submit queue closed");
  }
  if (submitPollQueue) {
    await submitPollQueue.close();
    submitPollQueue = null;
    logger.info("Submit poll queue closed");
  }
}
