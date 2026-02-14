import { io, type Socket } from "socket.io-client";

import { SOCKET_EVENTS } from "@staq/shared";

import { logger } from "../utils";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

let socket: Socket | null = null;

export const socketClient = {
  connect(token: string, projectId: string): Socket {
    if (socket?.connected) {
      socket.disconnect();
    }

    socket = io(WS_URL, {
      auth: { token },
      query: { projectId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      logger.info("Socket connected", { projectId });
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.info("Socket disconnected", { reason });
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error: Error) => {
      logger.error("Socket error", error);
    });

    return socket;
  },

  disconnect(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket(): Socket | null {
    return socket;
  },

  emit(event: string, data?: unknown): void {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      logger.warn("Cannot emit, socket not connected", { event });
    }
  },

  on(event: string, handler: (...args: unknown[]) => void): void {
    socket?.on(event, handler);
  },

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (handler) {
      socket?.off(event, handler);
    } else {
      socket?.off(event);
    }
  },
};
