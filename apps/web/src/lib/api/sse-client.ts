import { getAuthToken, logger } from "../utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface SSECallbacks {
  onText?: (content: string) => void;
  onASTOperation?: (operation: unknown) => void;
  onFileUpdate?: (update: unknown) => void;
  onProgress?: (progress: number) => void;
  onUsage?: (usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    generation_time_ms: number;
    cost_usd: number;
  }) => void;
  onDone?: (data: { conversation_id: string; finish_reason: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
}

export async function createSSEStream(
  path: string,
  body: unknown,
  callbacks: SSECallbacks,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
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
  let currentEventType = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let line of lines) {
        // Remove carriage return if present (handles \r\n line endings)
        line = line.replace(/\r$/, "").trim();

        if (!line) continue;

        if (line.startsWith("event:")) {
          currentEventType = line.slice(6).trim();
          console.log("[STAQ-DEBUG] SSE event type:", currentEventType);
          continue;
        }

        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            console.log("[STAQ-DEBUG] SSE parsed:", { eventType: currentEventType, keys: Object.keys(parsed) });
            handleEvent(currentEventType, parsed, callbacks);
            currentEventType = "";
          } catch (e) {
            // Log detailed error info
            const error = e as Error;
            console.error("[STAQ-DEBUG] JSON parse failed!");
            console.error("[STAQ-DEBUG] Error message:", error.message);
            console.error("[STAQ-DEBUG] Event type:", currentEventType);
            console.error("[STAQ-DEBUG] Data length:", data.length);
            console.error("[STAQ-DEBUG] First 100 chars:", JSON.stringify(data.substring(0, 100)));
            console.error("[STAQ-DEBUG] Last 100 chars:", JSON.stringify(data.substring(data.length - 100)));

            // Check for common issues
            if (data.includes("\n")) {
              console.error("[STAQ-DEBUG] Data contains unescaped newlines!");
            }
            if (!data.startsWith("{") && !data.startsWith("[")) {
              console.error("[STAQ-DEBUG] Data doesn't start with { or [");
            }
            if (!data.endsWith("}") && !data.endsWith("]")) {
              console.error("[STAQ-DEBUG] Data doesn't end with } or ]");
            }

            logger.warn("Failed to parse SSE data", { error: error.message, dataLength: data.length });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function handleEvent(
  eventType: string,
  data: Record<string, unknown>,
  callbacks: SSECallbacks,
): void {
  switch (eventType) {
    case "text":
      callbacks.onText?.((data.content as string) || "");
      break;
    case "ast_operation":
      callbacks.onASTOperation?.(data);
      break;
    case "file_update":
      callbacks.onFileUpdate?.(data);
      break;
    case "progress":
      callbacks.onProgress?.(data.progress as number);
      break;
    case "usage":
      callbacks.onUsage?.(
        data as {
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          generation_time_ms: number;
          cost_usd: number;
        },
      );
      break;
    case "done":
      callbacks.onDone?.(
        data as { conversation_id: string; finish_reason: string },
      );
      break;
    case "error":
      callbacks.onError?.(data as { code: string; message: string });
      break;
    case "close":
      break;
  }
}
