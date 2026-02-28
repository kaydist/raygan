"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, Archive, X, SlidersHorizontal } from "lucide-react";
import {
  Button,
  Input,
  Paragraph,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/atoms";
import {
  ProjectCard,
  ProjectCardSkeleton,
  ViewToggle,
  Breadcrumb,
  EmptyState,
} from "@/components/molecules";
import { useProjects, useUnarchiveProject } from "@/lib/api";
import { formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortOption = "recent" | "name" | "created";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recently edited" },
  { value: "name", label: "Name" },
  { value: "created", label: "Date created" },
];

export default function ArchivedPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("recent");

  const unarchiveProject = useUnarchiveProject();

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useProjects({ status: "archived" });

  const filteredProjects = React.useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "created")
        return new Date(b.created_on).getTime() - new Date(a.created_on).getTime();
      return new Date(b.updated_on).getTime() - new Date(a.updated_on).getTime();
    });

    return result;
  }, [projects, searchQuery, sortBy]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/workspace/${projectId}`);
  };

  const handleUnarchive = async (projectId: string) => {
    await unarchiveProject.mutateAsync(projectId);
  };

  const handleOpenInNewTab = (projectId: string) => {
    window.open(`/workspace/${projectId}`, "_blank");
  };

  const currentSortLabel = sortOptions.find((s) => s.value === sortBy)?.label || "Sort";

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Archived" }]} />

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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search archived projects..."
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
          icon={Archive}
          title={searchQuery ? "No projects found" : "No archived projects"}
          description={
            searchQuery
              ? `No archived projects match "${searchQuery}".`
              : "Projects you archive will appear here. You can unarchive them at any time."
          }
          actionLabel={searchQuery ? "Clear search" : undefined}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
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
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id.toString()}
              id={project.id.toString()}
              name={project.name}
              status={project.status}
              editedAt={`Edited ${formatRelativeTime(project.updated_on)}`}
              onClick={() => handleProjectClick(project.id.toString())}
              onArchive={() => handleUnarchive(project.id.toString())}
              onOpenInNewTab={() => handleOpenInNewTab(project.id.toString())}
            />
          ))}
        </div>
      )}
    </div>
  );
}
