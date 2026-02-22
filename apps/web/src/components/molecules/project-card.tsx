"use client";

import {
  MoreHorizontal,
  Star,
  Archive,
  Copy,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  Badge,
  Card,
  IconButton,
  Paragraph,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/atoms";
import { cn } from "@/lib/utils";

type ProjectStatus = "draft" | "deployed" | "archived";

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnail?: string;
  status: ProjectStatus;
  editedAt: string;
  color?: string;
  isFavorite?: boolean;
  onClick?: () => void;
  onFavorite?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onOpenInNewTab?: () => void;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  deployed: { label: "Deployed", variant: "default" },
  archived: { label: "Archived", variant: "outline" },
};

export function ProjectCard({
  name,
  thumbnail,
  status,
  editedAt,
  color = "#3B82F6",
  isFavorite = false,
  onClick,
  onFavorite,
  onArchive,
  onDuplicate,
  onDelete,
  onOpenInNewTab,
  className,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];

  const menuItems = (
    <>
      {onOpenInNewTab && (
        <ContextMenuItem onClick={onOpenInNewTab}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in new tab
        </ContextMenuItem>
      )}
      {onDuplicate && (
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>
      )}
      {onFavorite && (
        <ContextMenuItem onClick={onFavorite}>
          <Star className={cn("mr-2 h-4 w-4", isFavorite && "fill-current text-yellow-500")} />
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </ContextMenuItem>
      )}
      {onArchive && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            {status === "archived" ? "Unarchive" : "Archive"}
          </ContextMenuItem>
        </>
      )}
      {onDelete && (
        <ContextMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      )}
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            "group cursor-pointer overflow-hidden border-0 bg-[#f7f7f7] transition-all hover:ring-2 hover:ring-ring dark:bg-zinc-900",
            className,
          )}
          onClick={onClick}
        >
          <div className="relative aspect-[4/3] bg-[#c2c2c2] p-4 dark:bg-zinc-800">
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <IconButton
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 w-7 bg-background/80 backdrop-blur",
                  isFavorite && "text-yellow-500",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.();
                }}
              >
                <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
              </IconButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 bg-background/80 backdrop-blur"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onOpenInNewTab && (
                    <DropdownMenuItem onClick={onOpenInNewTab}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in new tab
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onArchive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onArchive}>
                        <Archive className="mr-2 h-4 w-4" />
                        {status === "archived" ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Badge
              variant={statusInfo.variant}
              className={cn(
                "absolute right-2 top-2 group-hover:hidden",
                status === "deployed" &&
                  "bg-emerald-500 text-white hover:bg-emerald-500",
                status === "archived" && "bg-zinc-400 text-white hover:bg-zinc-400",
              )}
            >
              {statusInfo.label}
            </Badge>

            {thumbnail ? (
              <img
                src={thumbnail}
                alt={name}
                className="h-full w-full rounded object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="h-24 w-16 rounded-lg bg-[#3C3C3E] p-2">
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded bg-[#4C4C4E]" />
                    <div className="h-1.5 w-3/4 rounded bg-[#4C4C4E]" />
                    <div className="h-1.5 w-1/2 rounded bg-[#4C4C4E]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-3">
            <div
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <Paragraph size="sm" weight="medium" className="truncate">
                {name}
              </Paragraph>
              <Paragraph size="xs" variant="muted">
                {editedAt}
              </Paragraph>
            </div>
          </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>{menuItems}</ContextMenuContent>
    </ContextMenu>
  );
}

interface NewProjectCardProps {
  onClick?: () => void;
  className?: string;
}

export function NewProjectCard({ onClick, className }: NewProjectCardProps) {
  return (
    <Card
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center border border-dashed border-border bg-transparent transition-all hover:border-foreground/50",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border">
          <span className="text-2xl text-muted-foreground">+</span>
        </div>
        <Paragraph variant="muted">New project</Paragraph>
        <Paragraph size="xs" variant="muted">
          or choose a template
        </Paragraph>
      </div>
    </Card>
  );
}

interface ProjectCardSkeletonProps {
  className?: string;
}

export function ProjectCardSkeleton({ className }: ProjectCardSkeletonProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-0 bg-[#f7f7f7] dark:bg-zinc-900",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-[#c2c2c2] p-4 dark:bg-zinc-800">
        <div className="flex h-full items-center justify-center">
          <div className="h-24 w-16 animate-pulse rounded-lg bg-zinc-400/50 dark:bg-zinc-700/50" />
        </div>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="h-3 w-3 shrink-0 animate-pulse rounded-sm bg-zinc-300 dark:bg-zinc-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-300 dark:bg-zinc-700" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </Card>
  );
}
