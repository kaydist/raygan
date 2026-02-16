"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Snack, SnackFiles } from "snack-sdk";

import type {
  SnackState,
  SnackError,
  SnackDependencies,
  UseSnackOptions,
  UseSnackReturn,
} from "../types";
import {
  createSnackSession,
  getSnackWebPreviewURL,
  getSnackQRCodeURL,
  formatSnackError,
} from "../utils";

const initialState: SnackState = {
  isConnected: false,
  isLoading: false,
  error: null,
  url: null,
  webPreviewURL: null,
  channel: null,
};

export function useSnack(options: UseSnackOptions = {}): UseSnackReturn {
  const { name, description, sdkVersion, autoConnect = true, webPreviewRef } = options;

  const [state, setState] = useState<SnackState>(initialState);
  const [errors, setErrors] = useState<SnackError[]>([]);
  const snackRef = useRef<Snack | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const setupListeners = useCallback((snack: Snack) => {
    const handleStateChange = () => {
      const snackState = snack.getState();

      setState((prev) => ({
        ...prev,
        url: snackState.url || null,
        webPreviewURL: getSnackWebPreviewURL(snack),
        channel: snackState.channel || null,
      }));

      const webplayerTransport = snackState.transports?.webplayer;
      if (webplayerTransport && "error" in webplayerTransport && webplayerTransport.error) {
        setErrors((prev) => [
          ...prev,
          {
            message: String(webplayerTransport.error) || "Unknown error",
          },
        ]);
      }
    };

    const cleanup = snack.addStateListener(handleStateChange);
    return cleanup;
  }, []);

  const connect = useCallback(async () => {
    if (snackRef.current) {
      console.log("[STAQ-DEBUG] Snack connecting...");
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await snackRef.current.getStateAsync();
        const webPreviewURL = snackRef.current
          ? getSnackWebPreviewURL(snackRef.current)
          : null;
        console.log("[STAQ-DEBUG] Snack connected:", {
          url: snackRef.current?.getState().url,
          webPreviewURL,
        });
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          url: snackRef.current?.getState().url || null,
          webPreviewURL,
        }));
      } catch (err) {
        console.error("[STAQ-DEBUG] Snack connection error:", err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: formatSnackError(err),
        }));
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (listenerCleanupRef.current) {
      listenerCleanupRef.current();
      listenerCleanupRef.current = null;
    }
    setState(initialState);
    setErrors([]);
  }, []);

  const updateFiles = useCallback((files: SnackFiles) => {
    if (snackRef.current) {
      console.log("[STAQ-DEBUG] Updating Snack files:", {
        filePaths: Object.keys(files),
        fileCount: Object.keys(files).length,
      });
      snackRef.current.updateFiles(files);
    } else {
      console.warn("[STAQ-DEBUG] Cannot update files - snack not initialized");
    }
  }, []);

  const updateDependencies = useCallback((deps: SnackDependencies) => {
    if (snackRef.current) {
      console.log("[STAQ-DEBUG] Updating Snack dependencies:", {
        deps: Object.keys(deps),
      });
      snackRef.current.updateDependencies(deps);
    }
  }, []);

  const getQRCodeURL = useCallback((): string | null => {
    if (snackRef.current) {
      return getSnackQRCodeURL(snackRef.current);
    }
    return null;
  }, []);

  const getWebPreviewURL = useCallback((): string | null => {
    if (snackRef.current) {
      return getSnackWebPreviewURL(snackRef.current);
    }
    return null;
  }, []);

  useEffect(() => {
    const snack = createSnackSession({
      name,
      description,
      sdkVersion,
      webPreviewRef,
    });

    snackRef.current = snack;
    listenerCleanupRef.current = setupListeners(snack);

    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [name, description, sdkVersion, autoConnect, setupListeners, connect, disconnect, webPreviewRef]);

  return {
    state,
    updateFiles,
    updateDependencies,
    getQRCodeURL,
    getWebPreviewURL,
    errors,
    connect,
    disconnect,
  };
}
