"use client";

import dynamic from "next/dynamic";

import { useProjectStore } from "@/stores";

const SnackPreview = dynamic(
  () => import("@/features/preview").then((mod) => mod.SnackPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
);

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
