import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
}

function createRedisClient(): Redis {
  const isUpstash = env.REDIS_URL?.includes("upstash.io");

  const client = new Redis(env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        logger.error("Redis connection failed after 3 retries");
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    ...(isUpstash && {
      tls: { rejectUnauthorized: false },
      enableReadyCheck: false,
      lazyConnect: true,
    }),
  });

  client.on("connect", () => {
    logger.info("Redis client connected");
  });

  client.on("ready", () => {
    logger.info("Redis client ready");
  });

  client.on("error", (err) => {
    logger.error({ err }, "Redis client error");
  });

  client.on("close", () => {
    logger.info("Redis connection closed");
  });

  return client;
}

export async function initializeRedis(): Promise<boolean> {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not configured, caching disabled");
    return false;
  }

  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.ping();
    logger.info("Redis connection verified");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to connect to Redis");
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed gracefully");
  }
}

export { Redis };
