import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Queue } from "bullmq";

import { getBuildQueue } from "./queues";

const BASE_PATH = "/admin/queues";

let serverAdapter: ExpressAdapter | null = null;
let board: ReturnType<typeof createBullBoard> | null = null;

export function createBullBoardMiddleware(): ExpressAdapter {
  if (serverAdapter) return serverAdapter;

  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BASE_PATH);

  board = createBullBoard({
    queues: [new BullMQAdapter(getBuildQueue())],
    serverAdapter,
  });

  return serverAdapter;
}

export function addQueueToBoard(queue: Queue): void {
  if (!board) return;
  board.addQueue(new BullMQAdapter(queue));
}
