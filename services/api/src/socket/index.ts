import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { logger, env } from "../config";
import { socketAuthMiddleware } from "./middleware/auth";
import { registerASTHandlers } from "./handlers/ast-sync";
import type {
  AuthenticatedSocket,
  ServerToClientEvents,
  ClientToServerEvents,
} from "./types";

export type { ServerToClientEvents, ClientToServerEvents } from "./types";
export {
  emitGenerateStart,
  emitGenerateStream,
  emitGenerateComplete,
  emitGenerateError,
  emitPreviewReload,
} from "./handlers/generation-sync";
export { emitASTSnapshot, emitASTError } from "./handlers/ast-sync";
export { emitBuildStatus } from "./handlers/build-sync";

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setupSocketServer(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use(socketAuthMiddleware as never);

  io.on("connection", (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    logger.info(
      { socketId: socket.id, userId: authSocket.user.id },
      "Socket connected"
    );

    registerASTHandlers(io!, authSocket);
  });

  logger.info("Socket.io server initialized");
  return io;
}

export function getSocketServer(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return io;
}

export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (io) {
      io.close(() => {
        logger.info("Socket.io server closed");
        io = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
