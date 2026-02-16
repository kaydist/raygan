"use client";

import { useMemo } from "react";

import type { UseSnackOptions, UseSnackSyncOptions, Platform } from "../types";
import { useSnack } from "./use-snack";
import { useSnackSync } from "./use-snack-sync";

interface UseSnackPreviewOptions extends UseSnackOptions {
  projectId: string;
  syncEnabled?: boolean;
  debounceMs?: number;
}

interface UseSnackPreviewReturn {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  webPreviewURL: string | null;
  qrCodeURL: string | null;
  errors: Array<{ message: string }>;
  syncFiles: () => void;
  getEmbedURL: (platform: Platform) => string | null;
}

export function useSnackPreview(
  options: UseSnackPreviewOptions
): UseSnackPreviewReturn {
  const {
    projectId,
    syncEnabled = true,
    debounceMs = 500,
    ...snackOptions
  } = options;

  const {
    state,
    updateFiles,
    updateDependencies,
    getQRCodeURL,
    getWebPreviewURL,
    errors,
  } = useSnack(snackOptions);

  const syncOptions: UseSnackSyncOptions = useMemo(() => {
    const enabled = syncEnabled && state.isConnected;
    console.log("[STAQ-DEBUG] Sync options updated:", {
      projectId,
      syncEnabled,
      isConnected: state.isConnected,
      webPreviewURL: state.webPreviewURL,
      enabled,
    });
    return {
      projectId,
      enabled,
      debounceMs,
      webPreviewURL: state.webPreviewURL,
    };
  }, [projectId, syncEnabled, state.isConnected, state.webPreviewURL, debounceMs]);

  const { syncFiles } = useSnackSync(updateFiles, updateDependencies, syncOptions);

  const getEmbedURL = (platform: Platform): string | null => {
    const baseURL = getWebPreviewURL();
    if (!baseURL) return null;

    const url = new URL(baseURL);
    url.searchParams.set("platform", platform);
    return url.toString();
  };

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    webPreviewURL: state.webPreviewURL,
    qrCodeURL: getQRCodeURL(),
    errors,
    syncFiles,
    getEmbedURL,
  };
}
