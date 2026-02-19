"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { Button, Paragraph } from "@/components/atoms";
import {
  ProjectCard,
  NewProjectCard,
  ViewToggle,
  Breadcrumb,
} from "@/components/molecules";
import { CreateProjectModal } from "@/components/organisms";
import { useProjects } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatters";

type ViewMode = "grid" | "list";

export default function DraftsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useProjects({ include_archived: false });

  const handleProjectClick = (projectId: string) => {
    router.push(`/workspace/${projectId}`);
  };

  const handleNewProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb
          items={[
            { label: "Kayode's Team", href: "/dashboard" },
            { label: "Drafts" },
          ]}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View toggle - hidden on smallest screens */}
          <div className="hidden sm:block">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* Sort button - text hidden on mobile */}
          <Button variant="outline" size="sm" className="gap-2 sm:h-10">
            <span className="hidden sm:inline">Sort: Recent</span>
            <span className="sm:hidden">Sort</span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* New button - icon only on mobile */}
          <Button
            size="sm"
            className="gap-2 sm:h-10"
            onClick={handleNewProject}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Project count */}
      <div className="mb-4">
        <Paragraph variant="muted">
          All projects <span className="ml-1">{projects.length}</span>
        </Paragraph>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Paragraph variant="muted">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </Paragraph>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Paragraph variant="muted">No projects yet</Paragraph>
          <Button onClick={handleNewProject}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !error && projects.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2"
          }
        >
          <NewProjectCard onClick={handleNewProject} />

          {projects.map((project) => (
            <ProjectCard
              key={project.id.toString()}
              id={project.id.toString()}
              name={project.name}
              status={project.is_archived ? "draft" : "deployed"}
              editedAt={`Edited ${formatRelativeTime(project.updated_on)}`}
              screenCount={0}
              onClick={() => handleProjectClick(project.id.toString())}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
