"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { socketClient, type ASTPatchedEvent, type JoinResponse } from "@/lib/api/socket-client";
import { getAuthToken } from "@/lib/utils";
import type { ASTOperation } from "@staq/shared";

interface UseSocketOptions {
  projectId?: string;
  onASTPatched?: (data: ASTPatchedEvent) => void;
  onUserJoined?: (data: { user: { id: number; email: string }; connectedUsers: number }) => void;
  onUserLeft?: (data: { userId: number; connectedUsers: number }) => void;
  onGenerateStart?: () => void;
  onGenerateComplete?: (filesUpdated: string[]) => void;
  onPreviewReload?: (changedFiles: string[]) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { projectId, onASTPatched, onUserJoined, onUserLeft, onGenerateStart, onGenerateComplete, onPreviewReload } = options;
  const [isConnected, setIsConnected] = useState(false);
  const joinedRef = useRef(false);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socket = socketClient.connect(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!projectId || !token || joinedRef.current) return;

    const joinProject = async () => {
      const response = await socketClient.joinProject(projectId);
      if (response.success) {
        joinedRef.current = true;
      }
    };

    if (socketClient.isConnected()) {
      joinProject();
    } else {
      const socket = socketClient.getSocket();
      const handleConnect = () => joinProject();
      socket?.on("connect", handleConnect);
      cleanupRef.current.push(() => socket?.off("connect", handleConnect));
    }

    return () => {
      if (joinedRef.current && projectId) {
        socketClient.leaveProject(projectId);
        joinedRef.current = false;
      }
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const cleanups: (() => void)[] = [];

    if (onASTPatched) {
      cleanups.push(socketClient.onASTPatched((data) => {
        if (data.clientId !== socketClient.getClientId()) {
          onASTPatched(data);
        }
      }));
    }

    if (onUserJoined) {
      cleanups.push(socketClient.onUserJoined((data) => {
        onUserJoined({ user: data.user, connectedUsers: data.connectedUsers });
      }));
    }

    if (onUserLeft) {
      cleanups.push(socketClient.onUserLeft((data) => {
        onUserLeft({ userId: data.userId, connectedUsers: data.connectedUsers });
      }));
    }

    if (onGenerateStart) {
      cleanups.push(socketClient.onGenerateStart(() => {
        onGenerateStart();
      }));
    }

    if (onGenerateComplete) {
      cleanups.push(socketClient.onGenerateComplete((data) => {
        onGenerateComplete(data.filesUpdated);
      }));
    }

    if (onPreviewReload) {
      cleanups.push(socketClient.onPreviewReload((data) => {
        onPreviewReload(data.changedFiles);
      }));
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [projectId, onASTPatched, onUserJoined, onUserLeft, onGenerateStart, onGenerateComplete, onPreviewReload]);

  const sendASTPatch = useCallback(
    async (operations: ASTOperation[], version: number): Promise<boolean> => {
      if (!projectId) return false;
      const response = await socketClient.sendASTPatch(projectId, operations, version);
      return response.success;
    },
    [projectId]
  );

  const joinProject = useCallback(
    async (id: string): Promise<JoinResponse> => {
      return socketClient.joinProject(id);
    },
    []
  );

  const leaveProject = useCallback(
    (id?: string) => {
      socketClient.leaveProject(id);
      if (id === projectId) {
        joinedRef.current = false;
      }
    },
    [projectId]
  );

  return {
    isConnected,
    sendASTPatch,
    joinProject,
    leaveProject,
    clientId: socketClient.getClientId(),
  };
}
