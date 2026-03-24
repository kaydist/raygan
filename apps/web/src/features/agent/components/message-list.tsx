"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { User, Sparkles, Loader2, StopCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea, InlineBanner } from "@/components/atoms";
import type { Message, ContentSegment } from "../types";
import { AgentActivity } from "./agent-activity";
import { ChangePlan } from "./change-plan";

interface MessageListProps {
  messages: Message[];
  className?: string;
  onApprovePlan?: (planId: string) => void;
  onRejectPlan?: (planId: string) => void;
  onRetry?: (messageId: string) => void;
}

function MessageBubble({
  message,
  onApprovePlan,
  onRejectPlan,
  onRetry,
}: {
  message: Message;
  onApprovePlan?: (planId: string) => void;
  onRejectPlan?: (planId: string) => void;
  onRetry?: (messageId: string) => void;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const hasImages = message.images && message.images.length > 0;
    const hasText = message.content?.trim();
    if (!hasImages && !hasText) return null;

    return (
      <div className="flex gap-3 px-5 py-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border/60">
          <User className="h-3.5 w-3.5 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5 space-y-2">
          {hasImages && (
            <div className="flex flex-wrap gap-2">
              {message.images!.map((img) => (
                <img
                  key={img.id}
                  src={img.preview}
                  alt="Uploaded"
                  className="h-16 w-16 rounded-lg object-cover border border-border/60"
                />
              ))}
            </div>
          )}
          {hasText && (
            <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>
      </div>
    );
  }

  const hasContent = message.content.trim().length > 0;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasPlan = !!message.plan;
  const hasSegments = message.segments && message.segments.length > 0;
  const isEmpty = !hasContent && !hasToolCalls && !hasPlan;

  const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-[14px]">{children}</li>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="mb-1.5 mt-3 text-[14px] font-semibold first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mb-1 mt-2.5 text-[14px] font-semibold first:mt-0">{children}</h3>
    ),
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className="block overflow-x-auto rounded-md bg-accent/60 px-3 py-2 font-mono text-xs text-foreground/90">
            {children}
          </code>
        );
      }
      return (
        <code className="rounded bg-accent/60 px-1 py-0.5 font-mono text-[13px]">
          {children}
        </code>
      );
    },
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="mb-2 last:mb-0">{children}</pre>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  const renderTextSegment = (content: string, isLast: boolean) => (
    <div className="prose-chat text-[14px] leading-relaxed text-foreground break-words">
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
      {isLast && message.isStreaming && !hasToolCalls && (
        <span className="inline-flex items-center gap-1 pl-0.5 align-middle">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:400ms]" />
        </span>
      )}
    </div>
  );

  const renderSegments = (segments: ContentSegment[]) => {
    const toolCallsRendered = new Set<string>();
    let planRendered = false;

    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1;

      if (segment.type === "text" && segment.content.trim()) {
        return (
          <div key={`text-${index}`}>
            {renderTextSegment(segment.content, isLast)}
          </div>
        );
      }

      if (segment.type === "tool_call") {
        const tc = message.toolCalls?.find((t) => t.id === segment.toolCallId);
        if (tc && !toolCallsRendered.has(tc.id)) {
          toolCallsRendered.add(tc.id);
          return (
            <AgentActivity
              key={`tool-${tc.id}`}
              toolCalls={[tc]}
              isStreaming={message.isStreaming && isLast}
            />
          );
        }
        return null;
      }

      if (segment.type === "plan" && message.plan && !planRendered) {
        planRendered = true;
        return (
          <ChangePlan
            key="plan"
            plan={message.plan}
            toolCalls={message.toolCalls}
            isStreaming={message.isStreaming}
            onApprove={() => onApprovePlan?.(message.plan!.plan_id)}
            onReject={() => onRejectPlan?.(message.plan!.plan_id)}
          />
        );
      }

      return null;
    });
  };

  return (
    <div className="flex gap-3 px-5 py-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 pt-0.5">
        {hasSegments ? (
          renderSegments(message.segments!)
        ) : (
          <>
            {hasContent && renderTextSegment(message.content, !hasToolCalls)}

            {hasToolCalls && (
              <AgentActivity toolCalls={message.toolCalls!} isStreaming={message.isStreaming} />
            )}

            {hasPlan && (
              <ChangePlan
                plan={message.plan!}
                toolCalls={message.toolCalls}
                isStreaming={message.isStreaming}
                onApprove={() => onApprovePlan?.(message.plan!.plan_id)}
                onReject={() => onRejectPlan?.(message.plan!.plan_id)}
              />
            )}
          </>
        )}

        {isEmpty && message.isStreaming && (
          <div className="flex items-center gap-2.5 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
            <span className="text-[13px] text-muted-foreground">Thinking...</span>
          </div>
        )}

        {message.status === "error" && (
          <InlineBanner
            variant="error"
            message="Response was interrupted. Please try again."
            action={onRetry ? { label: "Retry", onClick: () => onRetry(message.id) } : undefined}
          />
        )}

        {message.status === "cancelled" && (
          <InlineBanner
            variant="warning"
            message="Generation stopped"
            icon={StopCircle}
          />
        )}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  className,
  onApprovePlan,
  onRejectPlan,
  onRetry,
}: MessageListProps) {
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
            <Sparkles className="h-6 w-6 text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">What do you want to build?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe your app and I&apos;ll generate the code
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)} ref={scrollRef}>
      <div className="divide-y divide-border/40">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApprovePlan={onApprovePlan}
            onRejectPlan={onRejectPlan}
            onRetry={onRetry}
          />
        ))}
      </div>
      <div ref={bottomRef} className="h-4" />
    </ScrollArea>
  );
}
