import type { Server } from "socket.io";
import type { ReleaseStatusEvent } from "@raygan/shared";

import { logger } from "../../config";
import type { ServerToClientEvents, ClientToServerEvents } from "../types";

function getProjectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function emitReleaseStatus(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  projectId: string,
  event: ReleaseStatusEvent,
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit("release:status", event);
  logger.debug(
    { projectId, releaseUuid: event.release_uuid, status: event.status },
    "Release status event emitted",
  );
}
