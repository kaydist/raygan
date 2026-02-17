"use client";

import { useEffect, useCallback } from "react";

import { useProjectFiles } from "@/lib/api";
import { useProjectStore, type FileEntry } from "@/stores";

interface UseProjectFilesSyncOptions {
  projectId: string;
  enabled?: boolean;
}

export function useProjectFilesSync({ projectId, enabled = true }: UseProjectFilesSyncOptions) {
  const { data: files, isLoading, error, refetch } = useProjectFiles(projectId);
  const setFiles = useProjectStore((state) => state.setFiles);
  const setFileTree = useProjectStore((state) => state.setFileTree);

  useEffect(() => {
    if (!enabled || !files || files.length === 0) {
      return;
    }

    const filesMap = new Map<string, FileEntry>();

    for (const file of files) {
      const entry: FileEntry = {
        path: file.path,
        name: file.name,
        type: file.type === "directory" ? "folder" : "file",
        content: file.content ?? undefined,
        language: file.language ?? undefined,
        modified: false,
      };
      filesMap.set(file.path, entry);
    }

    setFiles(filesMap);
  }, [files, enabled, setFiles, setFileTree]);

  const refreshFiles = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    isLoading,
    error,
    fileCount: files?.length ?? 0,
    refreshFiles,
  };
}
