"use client";

import { MessageSquare } from "lucide-react";

import { PanelHeader } from "./panel-header";

export function AgentPanel() {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Agent" icon={MessageSquare} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">AI Chat Panel</p>
          <p className="text-sm text-muted-foreground">
            Describe your app and let AI build it
          </p>
        </div>
      </div>
    </div>
  );
}
