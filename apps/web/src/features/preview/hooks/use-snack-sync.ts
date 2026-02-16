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
  const { projectId, enabled = true, debounceMs = 500, webPreviewURL } = options;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>("");
  const prevEnabledRef = useRef<boolean>(false);
  const prevWebPreviewURLRef = useRef<string | null>(null);

  const files = useProjectStore((state) => state.files);

  const performSync = useCallback(() => {
    console.log("[STAQ-DEBUG] performSync called:", {
      enabled,
      filesCount: files?.size ?? 0,
      webPreviewURL: webPreviewURL ?? "null",
    });

    if (!enabled || !files || files.size === 0) {
      console.log("[STAQ-DEBUG] performSync skipped - not enabled or no files");
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
      console.log("[STAQ-DEBUG] performSync skipped - no changes (hash match)");
      return;
    }
    lastSyncRef.current = contentHash;

    const snackFiles = transformFileTreeToSnack(fileTree);
    console.log("[STAQ-DEBUG] Syncing files to Snack:", {
      inputPaths: Object.keys(fileTree),
      outputPaths: Object.keys(snackFiles),
      snackFilesPreview: Object.keys(snackFiles).slice(0, 5),
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
  }, [enabled, files, updateFiles, updateDependencies, webPreviewURL]);

  const syncFiles = useCallback(() => {
    lastSyncRef.current = "";
    performSync();
  }, [performSync]);

  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSync();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [files, enabled, debounceMs, performSync]);

  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    const prevURL = prevWebPreviewURLRef.current;

    prevEnabledRef.current = enabled;
    prevWebPreviewURLRef.current = webPreviewURL ?? null;

    if (enabled && !wasEnabled) {
      console.log("[STAQ-DEBUG] Sync enabled, triggering initial sync");
      performSync();
    }

    if (webPreviewURL && !prevURL && enabled) {
      console.log("[STAQ-DEBUG] WebPreviewURL became available, triggering sync");
      lastSyncRef.current = "";
      performSync();
    }
  }, [projectId, enabled, webPreviewURL, performSync]);

  return { syncFiles };
}
