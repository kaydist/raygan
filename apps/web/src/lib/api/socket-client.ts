import { io, type Socket } from "socket.io-client";
import type { ASTNode, ASTOperation, BuildStatusEvent } from "@raygan/shared";
import { logger } from "../utils";

const getSocketUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || "";
  return url.replace(/^ws:/, "http:").replace(/^wss:/, "https:");
};

const WS_URL = getSocketUrl();

export interface ServerToClientEvents {
  "ast:patched": (data: ASTPatchedEvent) => void;
  "ast:snapshot": (data: ASTSnapshotEvent) => void;
  "ast:error": (data: ASTErrorEvent) => void;
  "generate:start": (data: GenerateStartEvent) => void;
  "generate:stream": (data: GenerateStreamEvent) => void;
  "generate:complete": (data: GenerateCompleteEvent) => void;
  "generate:error": (data: GenerateErrorEvent) => void;
  "preview:reload": (data: PreviewReloadEvent) => void;
  "user:joined": (data: UserJoinedEvent) => void;
  "user:left": (data: UserLeftEvent) => void;
  "build:status": (data: BuildStatusEvent) => void;
}

export interface ClientToServerEvents {
  "project:join": (projectId: string, callback: (response: JoinResponse) => void) => void;
  "project:leave": (projectId: string) => void;
  "ast:patch": (data: ASTPatchEvent, callback: (response: PatchResponse) => void) => void;
  "ast:sync": (data: ASTSyncEvent, callback: (response: SyncResponse) => void) => void;
}

export interface ASTSyncEvent {
  projectId: string;
  ast: ASTNode | null;
  version: number;
  clientId: string;
}

export interface SyncResponse {
  success: boolean;
  error?: string;
  version?: number;
}

export interface ASTPatchEvent {
  projectId: string;
  operations: ASTOperation[];
  version: number;
  clientId: string;
}

export interface ASTPatchedEvent {
  projectId: string;
  operations: ASTOperation[];
  version: number;
  userId: number;
  clientId: string;
}

export interface ASTSnapshotEvent {
  projectId: string;
  ast: ASTNode | null;
  version: number;
  clientId?: string;
}

export interface ASTErrorEvent {
  projectId: string;
  message: string;
  code: string;
}

export interface GenerateStartEvent {
  projectId: string;
  conversationId?: string;
  userId: number;
}

export interface GenerateStreamEvent {
  projectId: string;
  type: "text" | "code_block" | "ast_operation";
  content?: string;
  data?: unknown;
}

export interface GenerateCompleteEvent {
  projectId: string;
  conversationId: string;
  filesUpdated: string[];
}

export interface GenerateErrorEvent {
  projectId: string;
  message: string;
  code?: string;
}

export interface PreviewReloadEvent {
  projectId: string;
  changedFiles: string[];
}

export interface UserJoinedEvent {
  projectId: string;
  user: { id: number; email: string };
  connectedUsers: number;
}

export interface UserLeftEvent {
  projectId: string;
  userId: number;
  connectedUsers: number;
}

export interface JoinResponse {
  success: boolean;
  error?: string;
  ast?: ASTNode | null;
  version?: number;
  connectedUsers?: number;
}

export interface PatchResponse {
  success: boolean;
  error?: string;
  version?: number;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
let currentProjectId: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const clientId = typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36);

export const socketClient = {
  connect(token: string): TypedSocket {
    if (socket?.connected) {
      return socket;
    }

    socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    }) as TypedSocket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket?.id);
      logger.info("Socket connected");
      reconnectAttempts = 0;

      if (currentProjectId) {
        this.joinProject(currentProjectId);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      logger.info("Socket disconnected", { reason });
    });

    socket.on("connect_error", (error: Error) => {
      reconnectAttempts++;
      console.error("[Socket] Connection error:", error.message);
      logger.error("Socket connection error", { message: error.message, attempt: reconnectAttempts });

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("[Socket] Max reconnection attempts reached");
        logger.error("Max reconnection attempts reached");
      }
    });

    return socket;
  },

  disconnect(): void {
    if (socket) {
      if (currentProjectId) {
        socket.emit("project:leave", currentProjectId);
      }
      socket.disconnect();
      socket = null;
      currentProjectId = null;
    }
  },

  getSocket(): TypedSocket | null {
    return socket;
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },

  getClientId(): string {
    return clientId;
  },

  joinProject(projectId: string): Promise<JoinResponse> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      socket.emit("project:join", projectId, (response) => {
        if (response.success) {
          currentProjectId = projectId;
          logger.info("Joined project room", { projectId, connectedUsers: response.connectedUsers });
        } else {
          logger.error("Failed to join project room", { projectId, error: response.error });
        }
        resolve(response);
      });
    });
  },

  leaveProject(projectId?: string): void {
    const id = projectId || currentProjectId;
    if (socket?.connected && id) {
      socket.emit("project:leave", id);
      if (id === currentProjectId) {
        currentProjectId = null;
      }
      logger.info("Left project room", { projectId: id });
    }
  },

  sendASTPatch(projectId: string, operations: ASTOperation[], version: number): Promise<PatchResponse> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      socket.emit(
        "ast:patch",
        { projectId, operations, version, clientId },
        (response) => {
          if (!response.success) {
            logger.error("Failed to send AST patch", { error: response.error });
          }
          resolve(response);
        }
      );
    });
  },

  sendASTSync(projectId: string, ast: ASTNode | null, version: number): Promise<SyncResponse> {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve({ success: false, error: "Socket not connected" });
        return;
      }

      socket.emit(
        "ast:sync",
        { projectId, ast, version, clientId },
        (response) => {
          if (!response.success) {
            logger.error("Failed to sync AST", { error: response.error });
          }
          resolve(response);
        }
      );
    });
  },

  onASTPatched(handler: (data: ASTPatchedEvent) => void): () => void {
    socket?.on("ast:patched", handler);
    return () => socket?.off("ast:patched", handler);
  },

  onASTSnapshot(handler: (data: ASTSnapshotEvent) => void): () => void {
    socket?.on("ast:snapshot", handler);
    return () => socket?.off("ast:snapshot", handler);
  },

  onASTError(handler: (data: ASTErrorEvent) => void): () => void {
    socket?.on("ast:error", handler);
    return () => socket?.off("ast:error", handler);
  },

  onGenerateStart(handler: (data: GenerateStartEvent) => void): () => void {
    socket?.on("generate:start", handler);
    return () => socket?.off("generate:start", handler);
  },

  onGenerateStream(handler: (data: GenerateStreamEvent) => void): () => void {
    socket?.on("generate:stream", handler);
    return () => socket?.off("generate:stream", handler);
  },

  onGenerateComplete(handler: (data: GenerateCompleteEvent) => void): () => void {
    socket?.on("generate:complete", handler);
    return () => socket?.off("generate:complete", handler);
  },

  onGenerateError(handler: (data: GenerateErrorEvent) => void): () => void {
    socket?.on("generate:error", handler);
    return () => socket?.off("generate:error", handler);
  },

  onPreviewReload(handler: (data: PreviewReloadEvent) => void): () => void {
    socket?.on("preview:reload", handler);
    return () => socket?.off("preview:reload", handler);
  },

  onUserJoined(handler: (data: UserJoinedEvent) => void): () => void {
    socket?.on("user:joined", handler);
    return () => socket?.off("user:joined", handler);
  },

  onUserLeft(handler: (data: UserLeftEvent) => void): () => void {
    socket?.on("user:left", handler);
    return () => socket?.off("user:left", handler);
  },

  onBuildStatus(handler: (data: BuildStatusEvent) => void): () => void {
    socket?.on("build:status", handler);
    return () => socket?.off("build:status", handler);
  },
};
