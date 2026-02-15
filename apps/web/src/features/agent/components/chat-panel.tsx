"use client";

import { useMemo } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms";
import { useConversations } from "@/lib/api/queries";
import { useGenerate } from "../hooks/use-generate";
import { MessageList } from "./message-list";
import { PromptInput } from "./prompt-input";
import type { Message } from "../types";

interface ChatPanelProps {
  projectId: string;
  className?: string;
}

export function ChatPanel({ projectId, className }: ChatPanelProps) {
  const {
    data: conversations,
    isLoading: isLoadingHistory,
  } = useConversations(projectId);

  const initialMessages = useMemo<Message[]>(() => {
    if (!conversations?.length) return [];
    return conversations.map((msg) => ({
      id: msg.uuid,
      role: msg.role as "user" | "assistant",
      content: msg.content,
      createdAt: new Date(msg.created_on),
    }));
  }, [conversations]);

  const { messages, isGenerating, error, generate, stop, clearMessages } =
    useGenerate({ projectId, initialMessages });

  const handleSubmit = (prompt: string) => {
    generate({ prompt });
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="text-sm font-medium">Chat</h3>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={isGenerating}
            className="h-8 gap-1 text-xs text-muted-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Messages */}
      {isLoadingHistory ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageList messages={messages} className="flex-1" />
      )}

      {/* Input */}
      <PromptInput
        onSubmit={handleSubmit}
        onStop={stop}
        isGenerating={isGenerating}
      />
    </div>
  );
}
