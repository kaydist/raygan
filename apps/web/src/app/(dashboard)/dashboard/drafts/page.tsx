"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronDown,
  Search,
  FolderOpen,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  Button,
  Input,
  Paragraph,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/atoms";
import {
  ProjectCard,
  NewProjectCard,
  ProjectCardSkeleton,
  ViewToggle,
  Breadcrumb,
  EmptyState,
} from "@/components/molecules";
import { CreateProjectModal } from "@/components/organisms";
import { useProjects, useUpdateProject } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortOption = "recent" | "name" | "created";
type FilterOption = "all" | "draft" | "deployed" | "archived";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently edited" },
  { value: "name", label: "Name" },
  { value: "created", label: "Date created" },
];

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All projects" },
  { value: "draft", label: "Drafts" },
  { value: "deployed", label: "Deployed" },
  { value: "archived", label: "Archived" },
];

export default function DraftsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("recent");
  const [filterBy, setFilterBy] = React.useState<FilterOption>("all");

  const updateProject = useUpdateProject();

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useProjects(filterBy !== "all" ? { status: filterBy } : undefined);

  const filteredProjects = React.useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "created") {
        return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
      }
      return new Date(b.updated_on).getTime() - new Date(a.updated_on).getTime();
    });

    return result;
  }, [projects, searchQuery, sortBy]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/workspace/${projectId}`);
  };

  const handleNewProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleArchiveProject = async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === "archived" ? "draft" : "archived";
    await updateProject.mutateAsync({
      uuid: projectId,
      data: { status: newStatus as "draft" | "deployed" | "archived" },
    });
  };

  const handleOpenInNewTab = (projectId: string) => {
    window.open(`/workspace/${projectId}`, "_blank");
  };

  const currentSortLabel = sortOptions.find((s) => s.value === sortBy)?.label || "Sort";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb
          items={[
            { label: "Kayode's Team", href: "/dashboard" },
            { label: "Drafts" },
          ]}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 sm:h-10">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">{currentSortLabel}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(sortBy === option.value && "bg-accent")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter</DropdownMenuLabel>
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setFilterBy(option.value)}
                  className={cn(filterBy === option.value && "bg-accent")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Paragraph variant="muted" size="sm">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
        </Paragraph>
      </div>

      {isLoading && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2"
          }
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
          title="Failed to load projects"
          description={error instanceof Error ? error.message : "Something went wrong"}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      )}

      {!isLoading && !error && filteredProjects.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={searchQuery ? "No projects found" : "No projects yet"}
          description={
            searchQuery
              ? `No projects match "${searchQuery}". Try a different search term.`
              : "Create your first project to get started building amazing mobile apps."
          }
          actionLabel={searchQuery ? "Clear search" : "Create project"}
          onAction={searchQuery ? () => setSearchQuery("") : handleNewProject}
          secondaryActionLabel={searchQuery ? undefined : "Browse templates"}
          onSecondaryAction={searchQuery ? undefined : () => router.push("/dashboard/templates")}
        />
      )}

      {!isLoading && !error && filteredProjects.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-2"
          }
        >
          <NewProjectCard onClick={handleNewProject} />

          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id.toString()}
              id={project.id.toString()}
              name={project.name}
              status={project.status}
              editedAt={`Edited ${formatRelativeTime(project.updated_on)}`}
              onClick={() => handleProjectClick(project.id.toString())}
              onArchive={() => handleArchiveProject(project.id.toString(), project.status)}
              onOpenInNewTab={() => handleOpenInNewTab(project.id.toString())}
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
