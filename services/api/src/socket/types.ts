import type { Socket } from "socket.io";
import type { ASTNode, ASTOperation, BuildStatusEvent } from "@raygan/shared";

export interface SocketUser {
  id: number;
  uuid: string;
  email: string;
}

export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
  projectId?: string;
}

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
  user: {
    id: number;
    email: string;
  };
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
