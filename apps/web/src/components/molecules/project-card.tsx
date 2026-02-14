"use client";

import { MoreHorizontal, Star } from "lucide-react";
import { Badge, Card, IconButton, Paragraph } from "@/components/atoms";
import { cn } from "@/lib/utils";

type ProjectStatus = "draft" | "deployed";

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnail?: string;
  status: ProjectStatus;
  editedAt: string;
  screenCount: number;
  color?: string;
  onClick?: () => void;
  onMenuClick?: () => void;
  onFavorite?: () => void;
  className?: string;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  deployed: { label: "Deployed", variant: "default" },
};

export function ProjectCard({
  name,
  thumbnail,
  status,
  editedAt,
  screenCount,
  color = "#3B82F6",
  onClick,
  onMenuClick,
  onFavorite,
  className,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden border-0 bg-[#f7f7f7] transition-all hover:ring-2 hover:ring-ring",
        className,
      )}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-[#c2c2c2] p-4">
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton
            size="sm"
            variant="ghost"
            className="h-7 w-7 bg-background/10 backdrop-blur"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
          >
            <Star className="h-4 w-4" />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            className="h-7 w-7 bg-background/80 backdrop-blur"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick?.();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </div>

        <Badge
          variant={statusInfo.variant}
          className={cn(
            "absolute right-2 top-2 group-hover:hidden",
            status === "deployed" &&
              "bg-emerald-500 text-white hover:bg-emerald-500",
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
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <Paragraph size="sm" weight="medium" className="truncate">
            {name}
          </Paragraph>
          <Paragraph size="xs" variant="muted">
            {editedAt} · {screenCount} screen{screenCount !== 1 ? "s" : ""}
          </Paragraph>
        </div>
      </div>
    </Card>
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
