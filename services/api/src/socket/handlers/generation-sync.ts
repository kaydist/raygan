import type { Server } from "socket.io";
import { logger } from "../../config";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

function getProjectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function emitGenerateStart(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  userId: number,
  conversationId?: string
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("generate:start", {
    projectId,
    conversationId,
    userId,
  });
  logger.debug({ projectId, userId }, "Generation started event emitted");
}

export function emitGenerateStream(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  type: "text" | "code_block" | "ast_operation",
  content?: string,
  data?: unknown
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("generate:stream", {
    projectId,
    type,
    content,
    data,
  });
}

export function emitGenerateComplete(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  conversationId: string,
  filesUpdated: string[]
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("generate:complete", {
    projectId,
    conversationId,
    filesUpdated,
  });
  logger.debug({ projectId, conversationId, filesUpdated }, "Generation complete event emitted");
}

export function emitGenerateError(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  message: string,
  code?: string
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("generate:error", {
    projectId,
    message,
    code,
  });
  logger.warn({ projectId, message, code }, "Generation error event emitted");
}

export function emitPreviewReload(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  changedFiles: string[]
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("preview:reload", {
    projectId,
    changedFiles,
  });
  logger.debug({ projectId, changedFiles }, "Preview reload event emitted");
}
