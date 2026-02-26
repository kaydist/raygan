"use client";

import { useEffect, useRef, useMemo } from "react";
import { User, Bot, FileCode, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/atoms";
import type { Message } from "../types";
import { parseMessageSegments } from "../utils/task-parser";
import { TaskProgress } from "./task-progress";

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

function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1 pl-0.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:200ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:400ms]" />
    </span>
  );
}

function StreamingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const parsed = useMemo(() => {
    if (isUser) return null;

    const { segments, taskState } = parseMessageSegments(message.content);
    if (taskState) {
      return { mode: "tasks" as const, segments, taskState };
    }

    const legacy = parseMessageContent(message.content);
    return { mode: "legacy" as const, ...legacy };
  }, [message.content, isUser]);

  return (
    <div
      className={cn(
        "flex gap-3 px-5 py-4",
        isUser ? "bg-muted/40" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-3 pt-0.5">
        {isUser && (
          <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {!isUser && parsed?.mode === "tasks" && (
          <>
            {parsed.segments.map((segment, index) => {
              switch (segment.type) {
                case "text":
                  return (
                    <p
                      key={index}
                      className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words"
                    >
                      {segment.content}
                    </p>
                  );
                case "task_list":
                  return (
                    <TaskProgress
                      key={index}
                      tasks={parsed.taskState.tasks}
                      completedCount={parsed.taskState.completedCount}
                      totalCount={parsed.taskState.totalCount}
                    />
                  );
              }
            })}
            {message.isStreaming && <StreamingIndicator label="Working..." />}
          </>
        )}

        {!isUser && parsed?.mode === "legacy" && (
          <>
            {parsed.text && (
              <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {parsed.text}
                {message.isStreaming && <StreamingDots />}
              </p>
            )}
            {parsed.files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {parsed.files.map((file, index) => (
                  <div
                    key={`${file.filename}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-accent/50 px-2.5 py-1 text-xs transition-colors hover:bg-accent"
                  >
                    <FileCode className="h-3 w-3 text-muted-foreground/60" />
                    <span className="font-mono text-muted-foreground">{file.filename}</span>
                  </div>
                ))}
              </div>
            )}
            {!parsed.text && parsed.files.length === 0 && message.isStreaming && (
              <StreamingIndicator label="Grinding..." />
            )}
          </>
        )}

        {!isUser && !parsed && message.isStreaming && (
          <StreamingIndicator label="Grinding..." />
        )}
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
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
            <Bot className="h-6 w-6 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">What do you want to build?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe your app and I'll generate the code for you
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
      <div ref={bottomRef} className="h-4" />
    </ScrollArea>
  );
}
