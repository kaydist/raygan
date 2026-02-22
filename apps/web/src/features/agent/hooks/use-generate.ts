"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createSSEStream, type FileUpdate } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/query-keys";
import { useProjectStore, useASTStore } from "@/stores";
import type { Message, StreamingState } from "../types";

interface UseGenerateOptions {
  projectId: string;
  initialMessages?: Message[];
  onMessageComplete?: (message: Message) => void;
}

interface GenerateRequest {
  prompt: string;
  modelId?: string;
}

export function useGenerate({
  projectId,
  initialMessages = [],
  onMessageComplete,
}: UseGenerateOptions) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isGenerating: false,
    currentContent: "",
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const generate = useCallback(
    async (request: GenerateRequest) => {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: request.prompt,
        createdAt: new Date(),
      };

      const assistantMessageId = `assistant-${Date.now()}`;
      streamingMessageIdRef.current = assistantMessageId;

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStreamingState({
        isGenerating: true,
        currentContent: "",
        error: null,
      });

      abortControllerRef.current = new AbortController();

      try {
        await createSSEStream(
          `/api/v1/projects/${projectId}/generate`,
          {
            prompt: request.prompt,
            model_id: request.modelId,
          },
          {
            onText: (content) => {
              setStreamingState((prev) => ({
                ...prev,
                currentContent: prev.currentContent + content,
              }));

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + content }
                    : msg,
                ),
              );
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
            onDone: (_data) => {
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg,
                );
                const completedMessage = updated.find(
                  (msg) => msg.id === assistantMessageId,
                );
                if (completedMessage) {
                  onMessageComplete?.(completedMessage);
                }
                return updated;
              });

              setStreamingState({
                isGenerating: false,
                currentContent: "",
                error: null,
              });
              streamingMessageIdRef.current = null;

              queryClient.invalidateQueries({
                queryKey: queryKeys.files.list(projectId),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.files.snack(projectId),
              });
              queryClient.invalidateQueries({
                queryKey: queryKeys.files.tree(projectId),
              });
            },
            onError: (error) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: msg.content || "An error occurred.",
                        isStreaming: false,
                      }
                    : msg,
                ),
              );

              setStreamingState({
                isGenerating: false,
                currentContent: "",
                error: error.message,
              });
              streamingMessageIdRef.current = null;
            },
          },
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Generation failed";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: "An error occurred while generating.",
                  isStreaming: false,
                }
              : msg,
          ),
        );

        setStreamingState({
          isGenerating: false,
          currentContent: "",
          error: errorMessage,
        });
        streamingMessageIdRef.current = null;
      }
    },
    [projectId, onMessageComplete],
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();

    if (streamingMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current
            ? { ...msg, isStreaming: false }
            : msg,
        ),
      );
    }

    setStreamingState({
      isGenerating: false,
      currentContent: "",
      error: null,
    });
    streamingMessageIdRef.current = null;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingState({
      isGenerating: false,
      currentContent: "",
      error: null,
    });
  }, []);

  return {
    messages,
    streamingState,
    generate,
    stop,
    clearMessages,
    isGenerating: streamingState.isGenerating,
    error: streamingState.error,
  };
}
