"use client";

import { useState, useCallback, useRef } from "react";

import { createSSEStream, type SSECallbacks, type FileUpdate } from "@/lib/api/sse-client";
import { useASTStore, useProjectStore } from "@/stores";
import { logger } from "@/lib/utils";
import type { ASTOperation } from "@staq/shared";

export interface GenerationState {
  isGenerating: boolean;
  streamingContent: string;
  progress: number;
  error: string | null;
  conversationId: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    generation_time_ms: number;
    cost_usd: number;
  } | null;
}

export interface GenerateOptions {
  projectId: string;
  prompt: string;
  currentFile?: string;
  selectedCode?: string;
}

export interface UseGenerationOptions {
  onGenerationStart?: () => void;
  onGenerationComplete?: (conversationId: string) => void;
  onError?: (error: string) => void;
}

const initialState: GenerationState = {
  isGenerating: false,
  streamingContent: "",
  progress: 0,
  error: null,
  conversationId: null,
  usage: null,
};

export function useGeneration(options: UseGenerationOptions = {}) {
  const { onGenerationStart, onGenerationComplete, onError } = options;

  const [state, setState] = useState<GenerationState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const applyOperation = useASTStore((s) => s.applyOperation);
  const setGenerating = useASTStore((s) => s.setGenerating);
  const setGenerationProgress = useASTStore((s) => s.setGenerationProgress);
  const setASTError = useASTStore((s) => s.setError);

  const updateFile = useProjectStore((s) => s.updateFile);
  const createFile = useProjectStore((s) => s.createFile);
  const deleteFile = useProjectStore((s) => s.deleteFile);

  const generate = useCallback(
    async ({ projectId, prompt, currentFile, selectedCode }: GenerateOptions) => {
      if (state.isGenerating) {
        logger.warn("Generation already in progress");
        return;
      }

      abortControllerRef.current = new AbortController();

      setState({
        ...initialState,
        isGenerating: true,
      });
      setGenerating(true);
      setASTError(null);
      onGenerationStart?.();

      const pendingOperations: ASTOperation[] = [];
      const pendingFileUpdates: FileUpdate[] = [];

      const callbacks: SSECallbacks = {
        onText: (content) => {
          setState((prev) => ({
            ...prev,
            streamingContent: prev.streamingContent + content,
          }));
        },

        onCodeBlock: (block) => {
          logger.info("Received code block", { filename: block.filename });
        },

        onASTOperation: (operation) => {
          logger.info("Received AST operation", { type: operation.type });
          pendingOperations.push(operation);
          applyOperation(operation);
        },

        onASTSnapshot: (snapshot) => {
          logger.info("Received AST snapshot", { version: snapshot.version });
        },

        onFileUpdate: (update) => {
          logger.info("Received file update", { path: update.path, operation: update.operation });
          pendingFileUpdates.push(update);

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
        },

        onProgress: (progress) => {
          setState((prev) => ({ ...prev, progress }));
          setGenerationProgress(progress);
        },

        onUsage: (usage) => {
          setState((prev) => ({ ...prev, usage }));
        },

        onDone: (data) => {
          logger.info("Generation complete", {
            conversationId: data.conversation_id,
            operationsApplied: pendingOperations.length,
            filesUpdated: pendingFileUpdates.length,
          });

          setState((prev) => ({
            ...prev,
            isGenerating: false,
            conversationId: data.conversation_id,
          }));
          setGenerating(false);
          onGenerationComplete?.(data.conversation_id);
        },

        onError: (error) => {
          logger.error("Generation error", undefined, { code: error.code, message: error.message });

          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: error.message,
          }));
          setGenerating(false);
          setASTError(error.message);
          onError?.(error.message);
        },
      };

      try {
        await createSSEStream(
          "/api/v1/generate",
          {
            project_id: projectId,
            prompt,
            current_file: currentFile,
            selected_code: selectedCode,
          },
          callbacks
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Generation failed";
        logger.error("Generation stream error", error instanceof Error ? error : undefined);

        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: message,
        }));
        setGenerating(false);
        setASTError(message);
        onError?.(message);
      }
    },
    [
      state.isGenerating,
      applyOperation,
      setGenerating,
      setGenerationProgress,
      setASTError,
      updateFile,
      createFile,
      deleteFile,
      onGenerationStart,
      onGenerationComplete,
      onError,
    ]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isGenerating: false,
      error: "Generation cancelled",
    }));
    setGenerating(false);
  }, [setGenerating]);

  const reset = useCallback(() => {
    setState(initialState);
    setASTError(null);
  }, [setASTError]);

  return {
    ...state,
    generate,
    cancel,
    reset,
  };
}
