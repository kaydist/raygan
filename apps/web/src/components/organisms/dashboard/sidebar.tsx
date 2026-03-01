"use client";

import { usePathname, useRouter } from "next/navigation";
import { Clock, FileText, Star, LayoutTemplate, Archive } from "lucide-react";
import type { OrganizationWithRole } from "@raygan/shared";
import { Logo, ScrollArea, Separator } from "@/components/atoms";
import {
  NavItem,
  NavSection,
  SearchBar,
  CreditDisplay,
  UserMenu,
  OrgSwitcher,
} from "@/components/molecules";
import { cn } from "@/lib/utils";

interface SidebarProps {
  organizations: OrganizationWithRole[];
  currentOrgId?: string;
  onSwitchOrg: (orgId: string) => void;
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
  draftCount?: number;
  archivedCount?: number;
  onSearch?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function Sidebar({
  organizations,
  currentOrgId,
  onSwitchOrg,
  user,
  credits,
  draftCount,
  archivedCount,
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
        <OrgSwitcher
          organizations={organizations}
          currentOrgId={currentOrgId}
          onSwitch={onSwitchOrg}
        />
      </div>

      <div className="px-3 pt-3">
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
            count={draftCount}
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
          <NavItem
            icon={Archive}
            label="Archived"
            href="/dashboard/archived"
            count={archivedCount}
            isActive={pathname === "/dashboard/archived"}
          />
        </NavSection>
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
