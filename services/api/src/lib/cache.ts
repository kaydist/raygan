import { getRedisClient } from "../config";
import { logger } from "../config";

export const CACHE_TTL = {
  SETTINGS: 300,
  SETTINGS_PUBLIC: 600,
  SETTINGS_CATEGORY: 300,
  PROJECT_FILES: 60,
  PROJECT_FILE_TREE: 120,
  PROJECT_ACCESS: 300,
  AI_MODELS: 3600,
  USER_SESSION: 1800,
  AUTH_USER: 300,
  DB_USER: 600,
  CONVERSATION_HISTORY: 30,
} as const;

export const CACHE_KEYS = {
  auth: {
    supabaseUser: (tokenHash: string) => `auth:supabase:${tokenHash}`,
    dbUser: (authUserId: string) => `auth:dbuser:${authUserId}`,
  },
  settings: {
    global: () => "settings:global",
    public: () => "settings:public",
    org: (orgId: number) => `settings:org:${orgId}`,
    bySlug: (slug: string, orgId?: number) =>
      orgId ? `settings:slug:${slug}:org:${orgId}` : `settings:slug:${slug}`,
    byCategory: (category: string, orgId?: number) =>
      orgId ? `settings:cat:${category}:org:${orgId}` : `settings:cat:${category}`,
  },
  project: {
    byUuid: (uuid: string) => `project:uuid:${uuid}`,
    access: (userId: number, projectId: number) => `project:${projectId}:access:${userId}`,
  },
  projectFiles: {
    all: (projectId: number) => `project:${projectId}:files`,
    single: (projectId: number, fileId: number) =>
      `project:${projectId}:file:${fileId}`,
    byPath: (projectId: number, path: string) =>
      `project:${projectId}:file:path:${path}`,
    tree: (projectId: number) => `project:${projectId}:tree`,
    snack: (projectId: number) => `project:${projectId}:snack`,
  },
  conversation: {
    history: (projectId: number) => `conversation:history:${projectId}`,
  },
  aiModels: {
    all: () => "ai:models",
    enabled: () => "ai:models:enabled",
    byProvider: (providerId: number) => `ai:models:provider:${providerId}`,
    byModelId: (modelId: string) => `ai:models:mid:${modelId}`,
    byPrimaryId: (id: number) => `ai:models:pid:${id}`,
    default: () => "ai:models:default",
  },
} as const;

const OPERATION_TIMEOUT_MS = 2000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 30000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  if (consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false;
  if (Date.now() >= circuitOpenUntil) {
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    logger.warn("Cache circuit breaker opened, skipping Redis for 30s");
  }
}

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), OPERATION_TIMEOUT_MS)),
  ]);
}

export class CacheService {
  private static isAvailable(): boolean {
    if (isCircuitOpen()) return false;
    return getRedisClient() !== null;
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const redis = getRedisClient()!;
      const value = await withTimeout(redis.get(key), null as string | null);

      if (!value) return null;

      recordSuccess();
      return JSON.parse(value) as T;
    } catch (err) {
      recordFailure();
      logger.error({ err, key }, "Cache get failed");
      return null;
    }
  }

  static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const redis = getRedisClient()!;
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await withTimeout(redis.setex(key, ttlSeconds, serialized), null);
      } else {
        await withTimeout(redis.set(key, serialized), null);
      }

      recordSuccess();
      return true;
    } catch (err) {
      recordFailure();
      logger.error({ err, key }, "Cache set failed");
      return false;
    }
  }

  static async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const redis = getRedisClient()!;
      await withTimeout(redis.del(key), null);
      recordSuccess();
      return true;
    } catch (err) {
      recordFailure();
      logger.error({ err, key }, "Cache delete failed");
      return false;
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const redis = getRedisClient()!;
      const keys = await withTimeout(redis.keys(pattern), [] as string[]);

      if (keys.length === 0) return 0;

      const deleted = await withTimeout(redis.del(...keys), 0);
      recordSuccess();
      logger.debug({ pattern, deleted }, "Cache pattern delete");
      return deleted ?? 0;
    } catch (err) {
      recordFailure();
      logger.error({ err, pattern }, "Cache pattern delete failed");
      return 0;
    }
  }

  static async invalidateSettings(orgId?: number): Promise<void> {
    await this.delete(CACHE_KEYS.settings.global());
    await this.delete(CACHE_KEYS.settings.public());
    await this.deletePattern("settings:cat:*");

    if (orgId) {
      await this.delete(CACHE_KEYS.settings.org(orgId));
      await this.deletePattern(`settings:slug:*:org:${orgId}`);
    } else {
      await this.deletePattern("settings:slug:*");
    }

    logger.debug({ orgId }, "Settings cache invalidated");
  }

  static async invalidateAuthUser(authUserId: string): Promise<void> {
    await this.delete(CACHE_KEYS.auth.dbUser(authUserId));
    logger.debug({ authUserId }, "Auth user cache invalidated");
  }

  static async invalidateProjectAccess(projectId: number): Promise<void> {
    await this.deletePattern(`project:${projectId}:access:*`);
    logger.debug({ projectId }, "Project access cache invalidated");
  }

  static async invalidateUserProjectAccess(userId: number): Promise<void> {
    await this.deletePattern(`project:*:access:${userId}`);
    logger.debug({ userId }, "User project access cache invalidated");
  }

  static async invalidateConversationHistory(projectId: number): Promise<void> {
    await this.delete(CACHE_KEYS.conversation.history(projectId));
    logger.debug({ projectId }, "Conversation history cache invalidated");
  }

  static async invalidateProject(uuid: string): Promise<void> {
    await this.delete(CACHE_KEYS.project.byUuid(uuid));
    logger.debug({ uuid }, "Project cache invalidated");
  }

  static async invalidateProjectFiles(projectId: number): Promise<void> {
    await this.delete(CACHE_KEYS.projectFiles.all(projectId));
    await this.delete(CACHE_KEYS.projectFiles.tree(projectId));
    await this.delete(CACHE_KEYS.projectFiles.snack(projectId));
    await this.deletePattern(`project:${projectId}:file:*`);

    logger.debug({ projectId }, "Project files cache invalidated");
  }

  static async invalidateProjectFile(
    projectId: number,
    fileId: number,
    path?: string
  ): Promise<void> {
    await this.delete(CACHE_KEYS.projectFiles.single(projectId, fileId));
    if (path) {
      await this.delete(CACHE_KEYS.projectFiles.byPath(projectId, path));
    }
    await this.delete(CACHE_KEYS.projectFiles.tree(projectId));
    await this.delete(CACHE_KEYS.projectFiles.snack(projectId));

    logger.debug({ projectId, fileId }, "Project file cache invalidated");
  }

  static async invalidateAIModels(): Promise<void> {
    await this.delete(CACHE_KEYS.aiModels.all());
    await this.delete(CACHE_KEYS.aiModels.enabled());
    await this.delete(CACHE_KEYS.aiModels.default());
    await this.deletePattern("ai:models:provider:*");
    await this.deletePattern("ai:models:mid:*");
    await this.deletePattern("ai:models:pid:*");

    logger.debug("AI models cache invalidated");
  }

  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isAvailable() || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const redis = getRedisClient()!;
      const values = await withTimeout(redis.mget(...keys), [] as (string | null)[]);

      recordSuccess();
      return values.map((v) => {
        if (!v) return null;
        try {
          return JSON.parse(v) as T;
        } catch {
          return null;
        }
      });
    } catch (err) {
      recordFailure();
      logger.error({ err }, "Cache mget failed");
      return keys.map(() => null);
    }
  }

  static async mset(
    entries: Array<{ key: string; value: unknown; ttl?: number }>
  ): Promise<boolean> {
    if (!this.isAvailable() || entries.length === 0) return false;

    try {
      const redis = getRedisClient()!;
      const pipeline = redis.pipeline();

      for (const { key, value, ttl } of entries) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await withTimeout(pipeline.exec(), null);
      recordSuccess();
      return true;
    } catch (err) {
      recordFailure();
      logger.error({ err }, "Cache mset failed");
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const redis = getRedisClient()!;
      const result = await withTimeout(redis.exists(key), 0);
      recordSuccess();
      return result === 1;
    } catch (err) {
      recordFailure();
      logger.error({ err, key }, "Cache exists check failed");
      return false;
    }
  }

  static async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -2;

    try {
      const redis = getRedisClient()!;
      const result = await withTimeout(redis.ttl(key), -2);
      recordSuccess();
      return result;
    } catch (err) {
      recordFailure();
      logger.error({ err, key }, "Cache TTL check failed");
      return -2;
    }
  }
}
