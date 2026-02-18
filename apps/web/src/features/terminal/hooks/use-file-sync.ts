"use client";

import { useEffect, useRef, useCallback } from "react";

import { useProjectStore } from "@/stores";
import { getWebContainerInstance } from "./use-web-container";

interface FileSyncOptions {
  debounceMs?: number;
}

export function useFileSync(options: FileSyncOptions = {}) {
  const { debounceMs = 300 } = options;
  const files = useProjectStore((s) => s.files);
  const previousFilesRef = useRef<Map<string, { content?: string }>>(new Map());
  const pendingSyncsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const syncFileToWebContainer = useCallback(
    async (path: string, content: string) => {
      const instance = getWebContainerInstance();
      if (!instance) return;

      try {
        const parts = path.split("/");
        if (parts.length > 1) {
          const dirPath = parts.slice(0, -1).join("/");
          await instance.fs.mkdir(dirPath, { recursive: true });
        }
        await instance.fs.writeFile(path, content);
      } catch (err) {
        console.error(`Failed to sync file ${path} to WebContainer:`, err);
      }
    },
    []
  );

  const deleteFileFromWebContainer = useCallback(async (path: string) => {
    const instance = getWebContainerInstance();
    if (!instance) return;

    try {
      await instance.fs.rm(path);
    } catch (err) {
      console.error(`Failed to delete file ${path} from WebContainer:`, err);
    }
  }, []);

  useEffect(() => {
    const currentFiles = new Map(
      Array.from(files.entries()).map(([path, file]) => [
        path,
        { content: file.content },
      ])
    );

    for (const [path, file] of files.entries()) {
      if (file.type !== "file" || !file.content) continue;

      const prevFile = previousFilesRef.current.get(path);
      const hasChanged = !prevFile || prevFile.content !== file.content;

      if (hasChanged) {
        const existingTimeout = pendingSyncsRef.current.get(path);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        const timeout = setTimeout(() => {
          syncFileToWebContainer(path, file.content!);
          pendingSyncsRef.current.delete(path);
        }, debounceMs);

        pendingSyncsRef.current.set(path, timeout);
      }
    }

    for (const path of previousFilesRef.current.keys()) {
      if (!files.has(path)) {
        deleteFileFromWebContainer(path);
      }
    }

    previousFilesRef.current = currentFiles;

    return () => {
      for (const timeout of pendingSyncsRef.current.values()) {
        clearTimeout(timeout);
      }
      pendingSyncsRef.current.clear();
    };
  }, [files, debounceMs, syncFileToWebContainer, deleteFileFromWebContainer]);

  const forceSync = useCallback(async () => {
    const instance = getWebContainerInstance();
    if (!instance) return;

    for (const timeout of pendingSyncsRef.current.values()) {
      clearTimeout(timeout);
    }
    pendingSyncsRef.current.clear();

    for (const [path, file] of files.entries()) {
      if (file.type === "file" && file.content) {
        await syncFileToWebContainer(path, file.content);
      }
    }
  }, [files, syncFileToWebContainer]);

  return { forceSync };
}
