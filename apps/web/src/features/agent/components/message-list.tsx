"use client";

import { useEffect, useRef, useMemo } from "react";
import { User, Bot, FileCode } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/atoms";
import type { Message } from "../types";

interface MessageListProps {
  messages: Message[];
  className?: string;
}

interface ParsedContent {
  text: string;
  files: Array<{ filename: string; language: string }>;
}

function parseMessageContent(content: string): ParsedContent {
  const codeBlockRegex = /```(\w+)?(?:\s+filename="([^"]+)")?\n[\s\S]*?```/g;
  const files: Array<{ filename: string; language: string }> = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || "text";
    const filename = match[2];
    if (filename) {
      files.push({ filename, language });
    }
  }

  const text = content
    .replace(codeBlockRegex, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, files };
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const { text, files } = useMemo(
    () => (isUser ? { text: message.content, files: [] } : parseMessageContent(message.content)),
    [message.content, isUser]
  );

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
      <div className="flex-1 space-y-2 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Assistant"}
        </p>
        {text && (
          <div className="prose prose-sm max-w-none text-foreground">
            <p className="whitespace-pre-wrap break-words">
              {text}
              {message.isStreaming && (
                <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-foreground" />
              )}
            </p>
          </div>
        )}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={`${file.filename}-${index}`}
                className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs"
              >
                <FileCode className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{file.filename}</span>
              </div>
            ))}
          </div>
        )}
        {!text && files.length === 0 && message.isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-1 animate-pulse bg-foreground" />
            <span>Generating...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageList({ messages, className }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]);

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
