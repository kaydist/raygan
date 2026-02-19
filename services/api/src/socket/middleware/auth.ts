import type { Socket } from "socket.io";
import { getSupabaseClient } from "../../config/supabase";
import { UserService } from "../../services";
import { logger } from "../../config";
import type { AuthenticatedSocket, SocketUser } from "../types";

const userService = new UserService();

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      logger.warn({ socketId: socket.id }, "Socket connection without token");
      return next(new Error("Authentication required"));
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      logger.error({ socketId: socket.id }, "Supabase client not initialized");
      return next(new Error("Unauthorized"));
    }

    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      logger.warn({ socketId: socket.id, error }, "Invalid socket auth token");
      return next(new Error("Unauthorized"));
    }

    const dbUser = await userService.findByAuthId(authUser.id);
    if (!dbUser) {
      logger.warn({ socketId: socket.id, authUserId: authUser.id }, "User not found in database");
      return next(new Error("Unauthorized"));
    }

    if (dbUser.deleted_flag) {
      logger.warn({ socketId: socket.id, userId: dbUser.id }, "Deleted user attempted socket connection");
      return next(new Error("Unauthorized"));
    }

    if (!dbUser.activated_flag) {
      logger.warn({ socketId: socket.id, userId: dbUser.id }, "Deactivaated user attempted socket connection");
      return next(new Error("Unauthorized"));
    }

    const socketUser: SocketUser = {
      id: dbUser.id,
      uuid: dbUser.uuid,
      email: dbUser.email,
    };

    (socket as AuthenticatedSocket).user = socketUser;

    logger.info({ socketId: socket.id, userId: dbUser.id }, "Socket authenticated");
    next();
  } catch (err) {
    logger.error({ err, socketId: socket.id }, "Socket authentication error");
    next(new Error("Authentication failed"));
  }
}
