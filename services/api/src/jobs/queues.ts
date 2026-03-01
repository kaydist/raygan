import { Queue } from "bullmq";
import Redis from "ioredis";

import { env, logger } from "../config";

let buildQueue: Queue | null = null;

export function createBullMQConnection(): Redis | undefined {
  if (!env.REDIS_URL) return undefined;

  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(env.REDIS_URL.includes("upstash.io") && {
      tls: { rejectUnauthorized: false },
      lazyConnect: true,
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

export async function closeQueues(): Promise<void> {
  if (buildQueue) {
    await buildQueue.close();
    buildQueue = null;
    logger.info("Build queue closed");
  }
}
