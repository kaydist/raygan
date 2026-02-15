"use client";

import { useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/atoms";
import type { Message } from "../types";

interface MessageListProps {
  messages: Message[];
  className?: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "bg-muted/50" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Assistant"}
        </p>
        <div className="prose prose-sm max-w-none text-foreground">
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && (
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-foreground" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, className }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="text-center">
          <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium">Start a conversation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Describe what you want to build and AI will help you create it
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="divide-y divide-border">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
