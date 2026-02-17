"use client";

import { MessageSquare } from "lucide-react";

import { ChatPanel } from "@/features/agent";
import { PanelHeader } from "./panel-header";

interface AgentPanelProps {
  projectId: string;
}

export function AgentPanel({ projectId }: AgentPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PanelHeader title="Agent" icon={MessageSquare} />
      <ChatPanel projectId={projectId} className="flex-1 min-h-0" />
    </div>
  );
}
