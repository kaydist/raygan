import type { Server } from "socket.io";
import type { BuildStatusEvent } from "@raygan/shared";

import { logger } from "../../config";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

function getProjectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function emitBuildStatus(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  event: BuildStatusEvent,
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("build:status", event);
  logger.debug(
    { projectId, buildUuid: event.build_uuid, status: event.status },
    "Build status event emitted",
  );
}
