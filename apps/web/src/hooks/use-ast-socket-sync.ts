"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useASTStore } from "@/stores";
import {
  socketClient,
  type ASTPatchedEvent,
  type ASTSnapshotEvent,
} from "@/lib/api/socket-client";
import { getAuthToken } from "@/lib/utils";
import type { ASTOperation, ASTNode } from "@staq/shared";

interface UseASTSocketSyncOptions {
  projectId?: string;
  enabled?: boolean;
  autoSync?: boolean;
}

interface UseASTSocketSyncReturn {
  sendOperations: (operations: ASTOperation[]) => Promise<boolean>;
  syncAST: () => Promise<boolean>;
  isConnected: boolean;
  isSyncing: boolean;
}

export function useASTSocketSync(options: UseASTSocketSyncOptions = {}): UseASTSocketSyncReturn {
  const { projectId, enabled = true, autoSync = true } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const isRemoteUpdateRef = useRef(false);
  const lastSyncedVersionRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastASTRef = useRef<ASTNode | null>(null);

  const applyOperations = useASTStore((s) => s.applyOperations);
  const setAST = useASTStore((s) => s.setAST);
  const markSynced = useASTStore((s) => s.markSynced);
  const setError = useASTStore((s) => s.setError);

  const syncAST = useCallback(async (): Promise<boolean> => {
    if (!projectId || !enabled) return false;

    const { ast, version } = useASTStore.getState();
    if (!ast) return false;

    console.log("[ASTSocketSync] Syncing AST, version:", version);
    setIsSyncing(true);
    try {
      const response = await socketClient.sendASTSync(projectId, ast, version);
      console.log("[ASTSocketSync] Sync response:", response);

      if (response.success) {
        lastSyncedVersionRef.current = response.version || version + 1;
        lastASTRef.current = ast;
        markSynced();
        return true;
      }

      setError(response.error || "Failed to sync AST");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, enabled, markSynced, setError]);

  const sendOperations = useCallback(
    async (operations: ASTOperation[]): Promise<boolean> => {
      if (!projectId || !enabled) return false;

      const version = useASTStore.getState().version;
      const response = await socketClient.sendASTPatch(projectId, operations, version);

      if (response.success) {
        lastSyncedVersionRef.current = response.version || version + 1;
        markSynced();
        return true;
      }

      setError(response.error || "Failed to send patch");
      return false;
    },
    [projectId, enabled, markSynced, setError]
  );

  useEffect(() => {
    if (!enabled || !projectId) {
      console.log("[ASTSocketSync] Disabled or no projectId", { enabled, projectId });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn("[ASTSocketSync] No auth token found");
      return;
    }

    console.log("[ASTSocketSync] Connecting with projectId:", projectId);
    socketClient.connect(token);

    socketClient.joinProject(projectId).then((response) => {
      console.log("[ASTSocketSync] Join project response:", response);
      if (response.success && response.ast) {
        isRemoteUpdateRef.current = true;
        setAST(response.ast);
        lastSyncedVersionRef.current = response.version || 1;
        lastASTRef.current = response.ast;
        isRemoteUpdateRef.current = false;
      }
    });

    return () => {
      console.log("[ASTSocketSync] Leaving project:", projectId);
      socketClient.leaveProject(projectId);
    };
  }, [projectId, enabled, setAST]);

  useEffect(() => {
    if (!enabled || !projectId) return;

    const handleASTPatched = (data: ASTPatchedEvent) => {
      if (data.clientId === socketClient.getClientId()) {
        return;
      }

      if (data.projectId !== projectId) {
        return;
      }

      isRemoteUpdateRef.current = true;
      try {
        applyOperations(data.operations);
        lastSyncedVersionRef.current = data.version;
      } finally {
        isRemoteUpdateRef.current = false;
      }
    };

    const handleASTSnapshot = (data: ASTSnapshotEvent) => {
      if (data.clientId === socketClient.getClientId()) {
        return;
      }

      if (data.projectId !== projectId) {
        return;
      }

      isRemoteUpdateRef.current = true;
      try {
        setAST(data.ast);
        lastSyncedVersionRef.current = data.version;
        lastASTRef.current = data.ast;
      } finally {
        isRemoteUpdateRef.current = false;
      }
    };

    const handleASTError = (data: { projectId: string; message: string; code: string }) => {
      if (data.projectId !== projectId) return;
      setError(`AST Error (${data.code}): ${data.message}`);
    };

    const cleanupPatched = socketClient.onASTPatched(handleASTPatched);
    const cleanupSnapshot = socketClient.onASTSnapshot(handleASTSnapshot);
    const cleanupError = socketClient.onASTError(handleASTError);

    return () => {
      cleanupPatched();
      cleanupSnapshot();
      cleanupError();
    };
  }, [projectId, enabled, applyOperations, setAST, setError]);

  useEffect(() => {
    if (!enabled || !projectId || !autoSync) return;

    const unsubscribe = useASTStore.subscribe((state, prevState) => {
      if (isRemoteUpdateRef.current) {
        return;
      }

      if (state.ast === prevState.ast) {
        return;
      }

      if (state.ast === lastASTRef.current) {
        return;
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncAST();
      }, 300);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [projectId, enabled, autoSync, syncAST]);

  return {
    sendOperations,
    syncAST,
    isConnected: socketClient.isConnected(),
    isSyncing,
  };
}
