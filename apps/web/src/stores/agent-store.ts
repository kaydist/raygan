import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { createSSEStream, type FileUpdate } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/query-keys";
import { getAuthToken } from "@/lib/utils";
import { useProjectStore } from "./project-store";
import { useASTStore } from "./ast-store";
import type {
  Message,
  StreamingState,
  AgentPlanState,
  ToolCallActivity,
  ImageAttachment,
} from "@/features/agent/types";
import type { QueryClient } from "@tanstack/react-query";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface AgentState {
  projectId: string | null;
  messages: Message[];
  streamingState: StreamingState;
  pendingPlan: AgentPlanState | null;
}

interface AgentActions {
  setProjectId: (projectId: string) => void;
  setMessages: (messages: Message[]) => void;
  startGeneration: (
    prompt: string,
    modelId: string | undefined,
    queryClient: QueryClient,
    images?: ImageAttachment[],
  ) => void;
  stop: () => void;
  clearMessages: () => void;
  retry: (queryClient: QueryClient) => void;
  approvePlan: (planId: string) => Promise<void>;
  rejectPlan: (planId: string) => Promise<void>;
}

let abortController: AbortController | null = null;
let streamingMessageId: string | null = null;

export const useAgentStore = create<AgentState & AgentActions>()(
  immer((set, get) => ({
    projectId: null,
    messages: [],
    streamingState: {
      isGenerating: false,
      currentContent: "",
      error: null,
    },
    pendingPlan: null,

    setProjectId: (projectId) => {
      const current = get().projectId;
      if (current !== projectId) {
        set((s) => {
          s.projectId = projectId;
          s.messages = [];
          s.streamingState = {
            isGenerating: false,
            currentContent: "",
            error: null,
          };
          s.pendingPlan = null;
        });
      }
    },

    setMessages: (messages) => {
      const state = get();
      if (state.streamingState.isGenerating) return;
      const hasSessionMessages = state.messages.some(
        (m) => m.status === "error" || m.status === "streaming" || m.status === "cancelled",
      );
      if (hasSessionMessages) return;
      set((s) => {
        s.messages = messages;
      });
    },

    startGeneration: (prompt, modelId, queryClient, images) => {
      const projectId = get().projectId;
      if (!projectId) return;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: prompt,
        images: images && images.length > 0 ? images : undefined,
        modelId,
        createdAt: new Date(),
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      streamingMessageId = assistantMessageId;

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        status: "streaming",
        isStreaming: true,
        toolCalls: [],
        createdAt: new Date(),
      };

      set((s) => {
        s.messages.push(userMessage, assistantMessage);
        s.streamingState = {
          isGenerating: true,
          currentContent: "",
          error: null,
        };
        s.pendingPlan = null;
      });

      abortController = new AbortController();

      const invalidateFiles = () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.list(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.snack(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.files.tree(projectId),
        });
      };

      const sseImages = images?.map((img) => ({
        media_type: img.media_type,
        data: img.data,
      }));

      createSSEStream(
        `/api/v1/projects/${projectId}/generate`,
        { prompt, model_id: modelId, images: sseImages },
        {
          onText: (content) => {
            set((s) => {
              s.streamingState.currentContent += content;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg) msg.content += content;
            });
          },
          onToolCall: (toolCall) => {
            const activity: ToolCallActivity = {
              id: toolCall.id,
              name: toolCall.name,
              input: toolCall.input,
              timestamp: new Date(),
            };
            set((s) => {
              s.streamingState.currentToolCall = toolCall.name;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg) {
                if (!msg.toolCalls) msg.toolCalls = [];
                msg.toolCalls.push(activity);
              }
            });
          },
          onToolResult: (result) => {
            set((s) => {
              s.streamingState.currentToolCall = undefined;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg?.toolCalls) {
                const tc = msg.toolCalls.find(
                  (t) => t.id === result.tool_use_id,
                );
                if (tc) {
                  tc.result = result.content;
                  tc.is_error = result.is_error;
                }
              }
            });
          },
          onPlanProposed: (plan) => {
            const planState: AgentPlanState = {
              plan_id: plan.plan_id,
              summary: plan.summary,
              changes: plan.changes,
              status: "pending",
            };
            set((s) => {
              s.pendingPlan = planState;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg) msg.plan = planState;
            });
          },
          onPlanApproved: (data) => {
            set((s) => {
              s.pendingPlan = null;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg?.plan?.plan_id === data.plan_id) {
                msg.plan.status = "approved";
              }
            });
          },
          onPlanRejected: (data) => {
            set((s) => {
              s.pendingPlan = null;
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg?.plan?.plan_id === data.plan_id) {
                msg.plan.status = "rejected";
              }
            });
          },
          onASTOperation: (operation) => {
            const { applyOperation } = useASTStore.getState();
            applyOperation(operation);
          },
          onFileUpdate: (update: FileUpdate) => {
            const { createFile, updateFile, deleteFile } =
              useProjectStore.getState();
            switch (update.operation) {
              case "create":
                createFile(update.path, update.content);
                break;
              case "update":
                updateFile(update.path, update.content);
                break;
              case "delete":
                deleteFile(update.path);
                break;
            }
            queryClient.invalidateQueries({
              queryKey: queryKeys.files.list(projectId),
            });
          },
          onFileCreated: () => invalidateFiles(),
          onFileModified: () => invalidateFiles(),
          onFileDeleted: () => invalidateFiles(),
          onDone: () => {
            set((s) => {
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg) {
                msg.isStreaming = false;
                msg.status = "done";
              }
              s.streamingState = {
                isGenerating: false,
                currentContent: "",
                error: null,
              };
              s.pendingPlan = null;
            });
            streamingMessageId = null;
            invalidateFiles();
          },
          onError: (error) => {
            set((s) => {
              const msg = s.messages.find((m) => m.id === assistantMessageId);
              if (msg) {
                msg.isStreaming = false;
                msg.status = "error";
                msg.error = error.message || "An error occurred";
              }
              s.streamingState = {
                isGenerating: false,
                currentContent: "",
                error: error.message,
              };
              s.pendingPlan = null;
            });
            streamingMessageId = null;
          },
        },
        { signal: abortController.signal },
      ).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const errorMessage = error instanceof Error ? error.message : "Generation failed";
        set((s) => {
          const msg = s.messages.find((m) => m.id === assistantMessageId);
          if (msg) {
            msg.isStreaming = false;
            msg.status = "error";
            msg.error = errorMessage;
          }
          s.streamingState = {
            isGenerating: false,
            currentContent: "",
            error: errorMessage,
          };
          s.pendingPlan = null;
        });
        streamingMessageId = null;
      });
    },

    stop: () => {
      abortController?.abort();
      set((s) => {
        if (streamingMessageId) {
          const msg = s.messages.find((m) => m.id === streamingMessageId);
          if (msg) {
            msg.isStreaming = false;
            msg.status = "cancelled";
          }
        }
        s.streamingState = {
          isGenerating: false,
          currentContent: "",
          error: null,
        };
        s.pendingPlan = null;
      });
      streamingMessageId = null;
    },

    retry: (queryClient) => {
      const { messages, startGeneration } = get();
      const lastErrorIdx = [...messages]
        .reverse()
        .findIndex((m) => m.role === "assistant" && m.status === "error");
      if (lastErrorIdx === -1) return;

      const errorIdx = messages.length - 1 - lastErrorIdx;
      const erroredMsg = messages[errorIdx];

      let userMsg: Message | undefined;
      for (let i = errorIdx - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg && msg.role === "user") {
          userMsg = msg;
          break;
        }
      }
      if (!userMsg) return;

      set((s) => {
        s.messages.splice(errorIdx, 1);
        s.streamingState.error = null;
      });

      startGeneration(
        userMsg.content,
        userMsg.modelId || erroredMsg?.modelId,
        queryClient,
        userMsg.images,
      );
    },

    clearMessages: () => {
      set((s) => {
        s.messages = [];
        s.streamingState = {
          isGenerating: false,
          currentContent: "",
          error: null,
        };
        s.pendingPlan = null;
      });
    },

    approvePlan: async (planId) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${BASE_URL}/api/v1/generate/plans/${planId}/approve`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      set((s) => {
        s.pendingPlan = null;
      });
    },

    rejectPlan: async (planId) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${BASE_URL}/api/v1/generate/plans/${planId}/reject`, {
        method: "POST",
        headers,
        credentials: "include",
      });
      set((s) => {
        s.pendingPlan = null;
      });
    },
  })),
);
