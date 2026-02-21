import { getRedisClient } from "../config";
import { logger } from "../config";

export const CACHE_TTL = {
  SETTINGS: 300,
  SETTINGS_PUBLIC: 600,
  PROJECT_FILES: 60,
  PROJECT_FILE_TREE: 120,
  AI_MODELS: 3600,
  USER_SESSION: 1800,
} as const;

export const CACHE_KEYS = {
  settings: {
    global: () => "settings:global",
    public: () => "settings:public",
    org: (orgId: number) => `settings:org:${orgId}`,
    bySlug: (slug: string, orgId?: number) =>
      orgId ? `settings:slug:${slug}:org:${orgId}` : `settings:slug:${slug}`,
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
  aiModels: {
    all: () => "ai:models",
    enabled: () => "ai:models:enabled",
    byProvider: (providerId: number) => `ai:models:provider:${providerId}`,
  },
} as const;

export class CacheService {
  private static isAvailable(): boolean {
    return getRedisClient() !== null;
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const redis = getRedisClient()!;
      const value = await redis.get(key);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (err) {
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
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }

      return true;
    } catch (err) {
      logger.error({ err, key }, "Cache set failed");
      return false;
    }
  }

  static async delete(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const redis = getRedisClient()!;
      await redis.del(key);
      return true;
    } catch (err) {
      logger.error({ err, key }, "Cache delete failed");
      return false;
    }
  }

  static async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const redis = getRedisClient()!;
      const keys = await redis.keys(pattern);

      if (keys.length === 0) return 0;

      const deleted = await redis.del(...keys);
      logger.debug({ pattern, deleted }, "Cache pattern delete");
      return deleted;
    } catch (err) {
      logger.error({ err, pattern }, "Cache pattern delete failed");
      return 0;
    }
  }

  static async invalidateSettings(orgId?: number): Promise<void> {
    await this.delete(CACHE_KEYS.settings.global());
    await this.delete(CACHE_KEYS.settings.public());

    if (orgId) {
      await this.delete(CACHE_KEYS.settings.org(orgId));
      await this.deletePattern(`settings:slug:*:org:${orgId}`);
    } else {
      await this.deletePattern("settings:slug:*");
    }

    logger.debug({ orgId }, "Settings cache invalidated");
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
    await this.deletePattern("ai:models:provider:*");

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
      const values = await redis.mget(...keys);

      return values.map((v) => {
        if (!v) return null;
        try {
          return JSON.parse(v) as T;
        } catch {
          return null;
        }
      });
    } catch (err) {
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

      await pipeline.exec();
      return true;
    } catch (err) {
      logger.error({ err }, "Cache mset failed");
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const redis = getRedisClient()!;
      const result = await redis.exists(key);
      return result === 1;
    } catch (err) {
      logger.error({ err, key }, "Cache exists check failed");
      return false;
    }
  }

  static async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) return -2;

    try {
      const redis = getRedisClient()!;
      return await redis.ttl(key);
    } catch (err) {
      logger.error({ err, key }, "Cache TTL check failed");
      return -2;
    }
  }
}
