"use client";

import { use } from "react";

import { WorkspaceLayout, WorkspaceToolbar } from "@/components/organisms";

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = use(params);
  const projectIdNum = projectId;

  return (
    <>
      <WorkspaceToolbar projectName={`Project ${projectId}`} />
      <WorkspaceLayout projectId={projectIdNum} />
    </>
  );
}
