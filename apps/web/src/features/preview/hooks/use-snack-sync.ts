"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SnackFiles } from "snack-sdk";

import { useProjectStore } from "@/stores";
import type { UseSnackSyncOptions, SnackDependencies } from "../types";
import {
  transformFileTreeToSnack,
  extractDependenciesFromCode,
} from "../utils";

interface UseSnackSyncReturn {
  syncFiles: () => void;
}

export function useSnackSync(
  updateFiles: (files: SnackFiles) => void,
  updateDependencies: (deps: SnackDependencies) => void,
  options: UseSnackSyncOptions
): UseSnackSyncReturn {
  const { projectId, enabled = true, debounceMs = 500 } = options;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>("");

  const files = useProjectStore((state) => state.files);

  const syncFiles = useCallback(() => {
    console.log("[STAQ-DEBUG] syncFiles called:", {
      enabled,
      filesCount: files?.size ?? 0,
    });

    if (!enabled || !files || files.size === 0) {
      console.log("[STAQ-DEBUG] syncFiles skipped - not enabled or no files");
      return;
    }

    const fileTree: Record<string, string> = {};
    files.forEach((entry, path) => {
      if (entry.content) {
        fileTree[path] = entry.content;
      }
    });

    const contentHash = JSON.stringify(fileTree);
    if (contentHash === lastSyncRef.current) {
      console.log("[STAQ-DEBUG] syncFiles skipped - no changes");
      return;
    }
    lastSyncRef.current = contentHash;

    const snackFiles = transformFileTreeToSnack(fileTree);
    console.log("[STAQ-DEBUG] Syncing files to Snack:", {
      inputPaths: Object.keys(fileTree),
      outputPaths: Object.keys(snackFiles),
    });
    updateFiles(snackFiles);

    const allDependencies: Record<string, string> = {};
    for (const content of Object.values(fileTree)) {
      const deps = extractDependenciesFromCode(content);
      Object.assign(allDependencies, deps);
    }

    const snackDeps: SnackDependencies = {};
    for (const [name, version] of Object.entries(allDependencies)) {
      snackDeps[name] = { version };
    }
    updateDependencies(snackDeps);
  }, [enabled, files, updateFiles, updateDependencies]);

  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      syncFiles();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [files, enabled, debounceMs, syncFiles]);

  useEffect(() => {
    if (enabled) {
      syncFiles();
    }
  }, [projectId, enabled, syncFiles]);

  return { syncFiles };
}
