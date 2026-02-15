"use client";

import { SnackPreview } from "@/features/preview";
import { useProjectStore } from "@/stores";

interface PreviewPanelProps {
  projectId: string;
}

export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const currentProject = useProjectStore((state) => state.currentProject);

  return (
    <SnackPreview
      projectId={projectId}
      projectName={currentProject?.name ?? "Preview"}
      className="h-full"
    />
  );
}
