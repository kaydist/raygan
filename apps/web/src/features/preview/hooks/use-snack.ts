"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Snack, SnackFiles } from "snack-sdk";

import type {
  SnackState,
  SnackError,
  SnackDependencies,
  UseSnackOptions,
  UseSnackReturn,
  ConsoleLog,
  ConnectedDevice,
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
  connectedDevices: [],
  deviceCount: 0,
  logs: [],
};

const MAX_LOGS = 100;

function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useSnack(options: UseSnackOptions = {}): UseSnackReturn {
  const { name, description, sdkVersion, autoConnect = true, webPreviewRef } = options;

  const [state, setState] = useState<SnackState>(initialState);
  const [errors, setErrors] = useState<SnackError[]>([]);
  const snackRef = useRef<Snack | null>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const setupListeners = useCallback((snack: Snack) => {
    const handleStateChange = () => {
      const snackState = snack.getState();
      const webPreviewURL = getSnackWebPreviewURL(snack);

      const connectedDevices: ConnectedDevice[] = [];
      let deviceCount = 0;

      if (snackState.transports) {
        const transports = snackState.transports as Record<string, { status?: string; connectedClients?: number }>;

        Object.entries(transports).forEach(([key, transport]) => {
          if (transport && typeof transport === "object") {
            const clientCount = transport.connectedClients || 0;
            deviceCount += clientCount;

            if (clientCount > 0 && key !== "webplayer") {
              connectedDevices.push({
                id: key,
                name: key === "pubsub" ? "Expo Go" : key,
                platform: "ios",
                status: transport.status === "connected" ? "connected" : "connecting",
              });
            }
          }
        });
      }

      setState((prev) => ({
        ...prev,
        url: snackState.url || null,
        webPreviewURL,
        channel: snackState.channel || null,
        connectedDevices,
        deviceCount,
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

    const handleLog = (log: { type?: string; message?: string; payload?: unknown[] }) => {
      const newLog: ConsoleLog = {
        id: generateLogId(),
        type: (log.type as ConsoleLog["type"]) || "log",
        message: log.message || String(log),
        timestamp: Date.now(),
        payload: log.payload,
      };

      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, newLog].slice(-MAX_LOGS),
      }));
    };

    const cleanup = snack.addStateListener(handleStateChange);

    const logCleanup = (snack as unknown as { addLogListener?: (handler: typeof handleLog) => () => void })
      .addLogListener?.(handleLog);

    handleStateChange();

    return () => {
      cleanup();
      if (logCleanup) logCleanup();
    };
  }, []);

  const connect = useCallback(async () => {
    if (snackRef.current) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await snackRef.current.getStateAsync();
        const webPreviewURL = snackRef.current
          ? getSnackWebPreviewURL(snackRef.current)
          : null;
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          url: snackRef.current?.getState().url || null,
          webPreviewURL,
        }));
      } catch (err) {
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
      snackRef.current.updateFiles(files);
    }
  }, []);

  const updateDependencies = useCallback((deps: SnackDependencies) => {
    if (snackRef.current) {
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

  const clearLogs = useCallback(() => {
    setState((prev) => ({ ...prev, logs: [] }));
  }, []);

  const getSnackURL = useCallback((): string | null => {
    if (snackRef.current) {
      const snackState = snackRef.current.getState();
      return snackState.url || null;
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
    getSnackURL,
    errors,
    connect,
    disconnect,
    clearLogs,
  };
}
