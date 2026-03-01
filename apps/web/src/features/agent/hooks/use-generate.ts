"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAgentStore } from "@/stores/agent-store";
import type { Message, ImageAttachment } from "../types";

interface UseGenerateOptions {
  projectId: string;
  initialMessages?: Message[];
}

interface GenerateRequest {
  prompt: string;
  modelId?: string;
  images?: ImageAttachment[];
}

export function useGenerate({
  projectId,
  initialMessages = [],
}: UseGenerateOptions) {
  const queryClient = useQueryClient();

  const store = useAgentStore();
  const {
    messages,
    streamingState,
    pendingPlan,
    setProjectId,
    setMessages,
    startGeneration,
    stop,
    clearMessages,
    retry: storeRetry,
    approvePlan,
    rejectPlan,
  } = store;

  const hasLoadedHistory = useRef(false);

  useEffect(() => {
    hasLoadedHistory.current = false;
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  useEffect(() => {
    if (!hasLoadedHistory.current && initialMessages.length > 0 && !streamingState.isGenerating) {
      hasLoadedHistory.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages, streamingState.isGenerating]);

  const generate = useCallback(
    (request: GenerateRequest) => {
      startGeneration(request.prompt, request.modelId, queryClient, request.images);
    },
    [startGeneration, queryClient],
  );

  const retry = useCallback(() => {
    storeRetry(queryClient);
  }, [storeRetry, queryClient]);

  return {
    messages,
    streamingState,
    generate,
    stop,
    clearMessages,
    retry,
    isGenerating: streamingState.isGenerating,
    error: streamingState.error,
    pendingPlan,
    approvePlan,
    rejectPlan,
  };
}
