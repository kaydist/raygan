import type { ASTNode, ASTOperation, AgentToolCall, AgentPlan } from "@raygan/shared";
import { getAuthToken, logger } from "../utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface FileUpdate {
  path: string;
  content: string;
  operation: "create" | "update" | "delete";
}

export interface ASTSnapshot {
  ast: ASTNode;
  version: number;
}

export interface CodeBlock {
  language: string;
  filename: string | null;
  content: string;
}

export interface ToolResultData {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface SSECallbacks {
  onText?: (content: string) => void;
  onCodeBlock?: (block: CodeBlock) => void;
  onASTOperation?: (operation: ASTOperation) => void;
  onASTSnapshot?: (snapshot: ASTSnapshot) => void;
  onFileUpdate?: (update: FileUpdate) => void;
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
  onToolCall?: (toolCall: AgentToolCall) => void;
  onToolResult?: (result: ToolResultData) => void;
  onPlanProposed?: (plan: AgentPlan) => void;
  onPlanApproved?: (data: { plan_id: string }) => void;
  onPlanRejected?: (data: { plan_id: string }) => void;
  onFileCreated?: (data: { path: string }) => void;
  onFileModified?: (data: { path: string }) => void;
  onFileDeleted?: (data: { path: string }) => void;
}

export async function createSSEStream(
  path: string,
  body: unknown,
  callbacks: SSECallbacks,
  options?: { signal?: AbortSignal },
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
    signal: options?.signal,
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

  if (options?.signal) {
    const onAbort = () => reader.cancel();
    options.signal.addEventListener("abort", onAbort, { once: true });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventType = "";

  try {
    while (true) {
      if (options?.signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (let line of lines) {
        line = line.replace(/\r$/, "").trim();

        if (!line) continue;

        if (line.startsWith("event:")) {
          currentEventType = line.slice(6).trim();
          continue;
        }

        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            handleEvent(currentEventType, parsed, callbacks);
            currentEventType = "";
          } catch (e) {
            const error = e as Error;
            logger.warn("Failed to parse SSE data", {
              error: error.message,
              eventType: currentEventType,
              dataLength: data.length,
            });
          }
        }
      }
    }
  } catch {
    if (options?.signal?.aborted) return;
    throw new Error("SSE stream read failed");
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
    case "code_block":
      callbacks.onCodeBlock?.(data as unknown as CodeBlock);
      break;
    case "ast_operation":
      callbacks.onASTOperation?.(data as unknown as ASTOperation);
      break;
    case "ast_snapshot":
      callbacks.onASTSnapshot?.(data as unknown as ASTSnapshot);
      break;
    case "file_update":
      callbacks.onFileUpdate?.(data as unknown as FileUpdate);
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
    case "tool_call":
      callbacks.onToolCall?.(data as unknown as AgentToolCall);
      break;
    case "tool_result":
      callbacks.onToolResult?.(data as unknown as ToolResultData);
      break;
    case "plan_proposed":
      callbacks.onPlanProposed?.(data as unknown as AgentPlan);
      break;
    case "plan_approved":
      callbacks.onPlanApproved?.(data as { plan_id: string });
      break;
    case "plan_rejected":
      callbacks.onPlanRejected?.(data as { plan_id: string });
      break;
    case "file_created":
      callbacks.onFileCreated?.(data as { path: string });
      break;
    case "file_modified":
      callbacks.onFileModified?.(data as { path: string });
      break;
    case "file_deleted":
      callbacks.onFileDeleted?.(data as { path: string });
      break;
    case "close":
      break;
  }
}
