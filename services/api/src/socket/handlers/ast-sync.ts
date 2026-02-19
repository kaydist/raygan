import type { Server } from "socket.io";
import { ProjectService } from "../../services";
import { logger } from "../../config";
import type {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
  ASTPatchEvent,
  ASTSyncEvent,
  JoinResponse,
  PatchResponse,
  SyncResponse,
} from "../types";

const projectService = new ProjectService();

const projectVersions = new Map<string, number>();
const projectUsers = new Map<string, Set<number>>();

function getProjectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function registerASTHandlers(
  _io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
): void {
  socket.on("project:join", async (projectId: string, callback: (response: JoinResponse) => void) => {
    try {
      const project = await projectService.findByUuid(projectId);
      if (!project) {
        callback({ success: false, error: "Project not found" });
        return;
      }

      const access = await projectService.checkAccess(socket.user.id, project.id);
      if (!access) {
        callback({ success: false, error: "Access denied" });
        return;
      }

      const room = getProjectRoom(projectId);
      await socket.join(room);
      socket.projectId = projectId;

      if (!projectVersions.has(projectId)) {
        projectVersions.set(projectId, 1);
      }

      if (!projectUsers.has(projectId)) {
        projectUsers.set(projectId, new Set());
      }
      projectUsers.get(projectId)!.add(socket.user.id);

      const connectedUsers = projectUsers.get(projectId)!.size;

      socket.to(room).emit("user:joined", {
        projectId,
        user: { id: socket.user.id, email: socket.user.email },
        connectedUsers,
      });

      logger.info(
        { socketId: socket.id, userId: socket.user.id, projectId, connectedUsers },
        "User joined project room"
      );

      callback({
        success: true,
        ast: project.ast_snapshot as never,
        version: projectVersions.get(projectId),
        connectedUsers,
      });
    } catch (err) {
      logger.error({ err, projectId, userId: socket.user.id }, "Error joining project room");
      callback({ success: false, error: "Failed to join project" });
    }
  });

  socket.on("project:leave", async (projectId: string) => {
    const room = getProjectRoom(projectId);
    await socket.leave(room);

    if (projectUsers.has(projectId)) {
      projectUsers.get(projectId)!.delete(socket.user.id);
      const connectedUsers = projectUsers.get(projectId)!.size;

      socket.to(room).emit("user:left", {
        projectId,
        userId: socket.user.id,
        connectedUsers,
      });

      if (connectedUsers === 0) {
        projectUsers.delete(projectId);
      }
    }

    socket.projectId = undefined;
    logger.info({ socketId: socket.id, userId: socket.user.id, projectId }, "User left project room");
  });

  socket.on("ast:patch", async (data: ASTPatchEvent, callback: (response: PatchResponse) => void) => {
    try {
      const { projectId, operations, version, clientId } = data;

      const project = await projectService.findByUuid(projectId);
      if (!project) {
        callback({ success: false, error: "Project not found" });
        return;
      }

      const access = await projectService.checkAccess(socket.user.id, project.id);
      if (!access) {
        callback({ success: false, error: "Access denied" });
        return;
      }

      const currentVersion = projectVersions.get(projectId) || 1;

      if (version < currentVersion) {
        logger.warn(
          { projectId, clientVersion: version, serverVersion: currentVersion },
          "Client version behind server"
        );
      }

      const newVersion = currentVersion + 1;
      projectVersions.set(projectId, newVersion);

      const room = getProjectRoom(projectId);
      socket.to(room).emit("ast:patched", {
        projectId,
        operations,
        version: newVersion,
        userId: socket.user.id,
        clientId,
      });

      logger.debug(
        { projectId, userId: socket.user.id, operationCount: operations.length, newVersion },
        "AST patch broadcast"
      );

      callback({ success: true, version: newVersion });
    } catch (err) {
      logger.error({ err, projectId: data.projectId }, "Error processing AST patch");
      callback({ success: false, error: "Failed to apply patch" });
    }
  });

  socket.on("ast:sync", async (data: ASTSyncEvent, callback: (response: SyncResponse) => void) => {
    try {
      const { projectId, ast, version, clientId } = data;

      const project = await projectService.findByUuid(projectId);
      if (!project) {
        callback({ success: false, error: "Project not found" });
        return;
      }

      const access = await projectService.checkAccess(socket.user.id, project.id);
      if (!access) {
        callback({ success: false, error: "Access denied" });
        return;
      }

      const currentVersion = projectVersions.get(projectId) || 1;
      const newVersion = Math.max(currentVersion, version) + 1;
      projectVersions.set(projectId, newVersion);

      const room = getProjectRoom(projectId);
      socket.to(room).emit("ast:snapshot", {
        projectId,
        ast: ast as never,
        version: newVersion,
        clientId,
      });

      logger.debug(
        { projectId, userId: socket.user.id, newVersion },
        "AST sync broadcast"
      );

      callback({ success: true, version: newVersion });
    } catch (err) {
      logger.error({ err, projectId: data.projectId }, "Error processing AST sync");
      callback({ success: false, error: "Failed to sync AST" });
    }
  });

  socket.on("disconnect", () => {
    if (socket.projectId) {
      const projectId = socket.projectId;
      const room = getProjectRoom(projectId);

      if (projectUsers.has(projectId)) {
        projectUsers.get(projectId)!.delete(socket.user.id);
        const connectedUsers = projectUsers.get(projectId)!.size;

        socket.to(room).emit("user:left", {
          projectId,
          userId: socket.user.id,
          connectedUsers,
        });

        if (connectedUsers === 0) {
          projectUsers.delete(projectId);
        }
      }
    }

    logger.info({ socketId: socket.id, userId: socket.user.id }, "Socket disconnected");
  });
}

export function emitASTSnapshot(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  ast: unknown,
  version: number
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("ast:snapshot", {
    projectId,
    ast: ast as never,
    version,
  });
}

export function emitASTError(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  message: string,
  code: string
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("ast:error", {
    projectId,
    message,
    code,
  });
}
