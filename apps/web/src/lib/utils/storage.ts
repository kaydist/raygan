interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed: StorageItem<T> = JSON.parse(item);

      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (typeof window === "undefined") return;

    try {
      const item: StorageItem<T> = {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch {
      // Storage full or other error
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },
};
