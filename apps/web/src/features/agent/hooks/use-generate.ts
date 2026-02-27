"use client";

import { useCallback, useEffect } from "react";
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
    approvePlan,
    rejectPlan,
  } = store;

  useEffect(() => {
    setProjectId(projectId);
  }, [projectId, setProjectId]);

  useEffect(() => {
    if (initialMessages.length > 0 && !streamingState.isGenerating) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages, streamingState.isGenerating]);

  const generate = useCallback(
    (request: GenerateRequest) => {
      startGeneration(request.prompt, request.modelId, queryClient, request.images);
    },
    [startGeneration, queryClient],
  );

  return {
    messages,
    streamingState,
    generate,
    stop,
    clearMessages,
    isGenerating: streamingState.isGenerating,
    error: streamingState.error,
    pendingPlan,
    approvePlan,
    rejectPlan,
  };
}
