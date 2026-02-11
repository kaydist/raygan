import type { StreamChunk } from "@staq/shared";

import { logger } from "../utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface SSECallbacks {
  onText?: (content: string) => void;
  onASTOperation?: (operation: unknown) => void;
  onFileUpdate?: (update: unknown) => void;
  onProgress?: (progress: number) => void;
  onDone?: (usage: { input: number; output: number }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export async function createSSEStream(
  path: string,
  body: unknown,
  callbacks: SSECallbacks
): Promise<void> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    callbacks.onError?.({
      code: error.error?.code || "GENERATION_FAILED",
      message: error.error?.message || "Generation failed",
    });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.({
      code: "NO_READER",
      message: "Response body is not readable",
    });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          const eventType = line.slice(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const chunk: StreamChunk = JSON.parse(data);
            handleChunk(chunk, callbacks);
          } catch {
            logger.warn("Failed to parse SSE data", { data });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleChunk(chunk: StreamChunk, callbacks: SSECallbacks): void {
  switch (chunk.type) {
    case "text":
      callbacks.onText?.(chunk.content || "");
      break;
    case "ast_operation":
      callbacks.onASTOperation?.(chunk.data);
      break;
    case "file_update":
      callbacks.onFileUpdate?.(chunk.data);
      break;
    case "progress":
      callbacks.onProgress?.(chunk.data as number);
      break;
    case "done":
      callbacks.onDone?.(
        chunk.tokensUsed || { input: 0, output: 0 }
      );
      break;
    case "error":
      callbacks.onError?.(chunk.data as { code: string; message: string });
      break;
  }
}
