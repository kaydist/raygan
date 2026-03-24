import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redisClient: Redis | null = null;
let redisDisabled = false;
let errorLogged = false;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL || redisDisabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
}

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL!, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn("Redis unavailable after 3 retries, disabling cache");
        redisDisabled = true;
        redisClient = null;
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    ...(env.REDIS_URL?.includes("upstash.io") && {
      tls: { rejectUnauthorized: false },
      enableReadyCheck: false,
    }),
  });

  client.on("connect", () => {
    logger.info("Redis client connected");
    errorLogged = false;
  });

  client.on("ready", () => {
    logger.info("Redis client ready");
    redisDisabled = false;
  });

  client.on("error", (err) => {
    if (!errorLogged) {
      logger.error({ err }, "Redis client error");
      errorLogged = true;
    }
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

    await client.connect();
    await client.ping();
    logger.info("Redis connection verified");
    return true;
  } catch (err) {
    logger.warn("Redis unavailable, continuing without cache");
    redisDisabled = true;
    redisClient = null;
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
