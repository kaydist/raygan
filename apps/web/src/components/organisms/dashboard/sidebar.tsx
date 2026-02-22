"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  Star,
  LayoutTemplate,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { Logo, ScrollArea, Separator } from "@/components/atoms";
import {
  NavItem,
  NavSection,
  SearchBar,
  CreditDisplay,
  UserMenu,
} from "@/components/molecules";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  isExpanded?: boolean;
}

interface SidebarProps {
  teams?: Team[];
  currentTeamId?: string;
  user: {
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  credits: {
    plan: string;
    used: number;
    total: number;
  };
  onSearch?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function Sidebar({
  teams = [],
  currentTeamId: _currentTeamId,
  user,
  credits,
  onSearch,
  onLogout,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const onProfile = () => {
    router.push("/profile");
  };

  return (
    <aside
      className={cn(
        "flex h-screen w-60 flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="p-4">
        <Logo size="sm" />
      </div>

      <div className="px-3">
        <SearchBar onFocus={onSearch} />
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <NavSection>
          <NavItem
            icon={Clock}
            label="Recents"
            href="/dashboard/recents"
            isActive={pathname === "/dashboard/recents"}
          />
          <NavItem
            icon={FileText}
            label="Drafts"
            href="/dashboard/drafts"
            count={5}
            isActive={pathname === "/dashboard/drafts"}
          />
          <NavItem
            icon={Star}
            label="Favorites"
            href="/dashboard/favorites"
            isActive={pathname === "/dashboard/favorites"}
          />
          <NavItem
            icon={LayoutTemplate}
            label="Templates"
            href="/dashboard/templates"
            isActive={pathname === "/dashboard/templates"}
          />
        </NavSection>

        <Separator className="my-4" />

        {teams.map((team) => (
          <NavSection key={team.id}>
            <div className="flex items-center gap-2 px-3 py-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{team.name}</span>
            </div>
            <NavItem
              icon={FileText}
              label="Drafts"
              href={`/dashboard/team/${team.id}/drafts`}
              isActive={pathname === `/dashboard/team/${team.id}/drafts`}
            />
            <NavItem
              icon={FolderOpen}
              label="All projects"
              href={`/dashboard/team/${team.id}/projects`}
              isActive={pathname === `/dashboard/team/${team.id}/projects`}
            />
          </NavSection>
        ))}
      </ScrollArea>

      <div className="mt-auto space-y-3 p-3">
        <CreditDisplay
          plan={credits.plan}
          used={credits.used}
          total={credits.total}
        />
        <Separator />
        <UserMenu
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          onProfile={onProfile}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
}
