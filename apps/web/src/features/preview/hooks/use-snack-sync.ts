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
  options: UseSnackSyncOptions,
): UseSnackSyncReturn {
  const {
    projectId,
    enabled = true,
    debounceMs = 500,
    webPreviewURL,
  } = options;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>("");
  const prevEnabledRef = useRef<boolean>(false);
  const prevWebPreviewURLRef = useRef<string | null>(null);

  const files = useProjectStore((state) => state.files);
  const filesVersion = useProjectStore((state) => state.filesVersion);

  const performSync = useCallback(() => {
    if (!enabled || !files || files.size === 0) {
      return;
    }

    const fileTree: Record<string, string> = {};
    const paths: string[] = [];
    files.forEach((entry, path) => {
      if (entry.content) {
        fileTree[path] = entry.content;
        paths.push(path);
      }
    });

    paths.sort();
    const contentHash = JSON.stringify({
      version: filesVersion,
      count: files.size,
      paths,
    });
    if (contentHash === lastSyncRef.current) {
      return;
    }
    lastSyncRef.current = contentHash;

    const snackFiles = transformFileTreeToSnack(fileTree);
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
  }, [enabled, files, filesVersion, updateFiles, updateDependencies, webPreviewURL]);

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
      lastSyncRef.current = "";
      performSync();
    }

    if (webPreviewURL && !prevURL && enabled) {
      lastSyncRef.current = "";
      performSync();
    }
  }, [projectId, enabled, webPreviewURL, performSync]);

  useEffect(() => {
    lastSyncRef.current = "";
  }, [projectId]);

  return { syncFiles };
}
