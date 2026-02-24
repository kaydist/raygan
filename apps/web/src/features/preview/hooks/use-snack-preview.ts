"use client";

import { useMemo } from "react";

import type { UseSnackOptions, UseSnackSyncOptions, Platform, ConsoleLog, ConnectedDevice } from "../types";
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
  snackURL: string | null;
  errors: Array<{ message: string }>;
  logs: ConsoleLog[];
  connectedDevices: ConnectedDevice[];
  deviceCount: number;
  syncFiles: () => void;
  clearLogs: () => void;
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
    getSnackURL,
    errors,
    clearLogs,
  } = useSnack(snackOptions);

  const syncOptions: UseSnackSyncOptions = useMemo(() => {
    const enabled = syncEnabled && state.isConnected;
    return {
      projectId,
      enabled,
      debounceMs,
      webPreviewURL: state.webPreviewURL,
    };
  }, [projectId, syncEnabled, state.isConnected, state.webPreviewURL, debounceMs]);

  const { syncFiles } = useSnackSync(updateFiles, updateDependencies, syncOptions);

  const getEmbedURL = (platform: Platform): string | null => {
    const isLocalhost = typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isLocalhost) {
      const baseURL = getWebPreviewURL();
      if (!baseURL) return null;
      const url = new URL(baseURL);
      url.searchParams.set("platform", platform);
      return url.toString();
    }

    const channel = state.channel;
    if (channel) {
      const platformParam = platform === "web" ? "web" : platform === "android" ? "android" : "ios";
      return `https://snack.expo.dev/embedded?channel=${channel}&platform=${platformParam}&preview=true&theme=dark&hideQueryParams=true`;
    }

    return null;
  };

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    webPreviewURL: state.webPreviewURL,
    qrCodeURL: getQRCodeURL(),
    snackURL: getSnackURL(),
    errors,
    logs: state.logs,
    connectedDevices: state.connectedDevices,
    deviceCount: state.deviceCount,
    syncFiles,
    clearLogs,
    getEmbedURL,
  };
}
