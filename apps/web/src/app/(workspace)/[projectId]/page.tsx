"use client";

import { use } from "react";

import { WorkspaceLayout, WorkspaceToolbar } from "@/components/organisms";
import { useASTSocketSync } from "@/hooks";

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = use(params);

  const { isConnected, isSyncing } = useASTSocketSync({ projectId });

  return (
    <>
      <WorkspaceToolbar
        projectName={`Project ${projectId}`}
        isConnected={isConnected}
        isSyncing={isSyncing}
      />
      <WorkspaceLayout projectId={projectId} />
    </>
  );
}
