"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/organisms";
import { MobileHeader } from "@/components/molecules";
import { cn } from "@/lib/utils";
import { getOrgUuid } from "@/lib/helpers";
import {
  useLogout,
  useCurrentUser,
  useOrganizations,
  useProjects,
  useSwitchOrganization,
} from "@/lib/api/queries";

interface DashboardTemplateProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardTemplate({
  children,
  className,
}: DashboardTemplateProps) {
  const router = useRouter();
  const logout = useLogout();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const { data: currentUser } = useCurrentUser();
  const { data: organizations = [] } = useOrganizations();
  const { data: draftProjects = [] } = useProjects({ status: "draft" });
  const { data: archivedProjects = [] } = useProjects({ status: "archived" });
  const switchOrg = useSwitchOrganization();

  const firstOrg = organizations[0];
  const currentOrgId =
    currentUser?.current_organization_id ??
    (firstOrg ? getOrgUuid(firstOrg) : undefined);

  const userName =
    currentUser?.display_name ||
    [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") ||
    "User";

  const user = {
    name: userName,
    email: currentUser?.email,
    avatarUrl: currentUser?.avatar_url ?? undefined,
  };

  const currentOrg = organizations.find((o) => o.uuid === currentOrgId);
  const credits = {
    plan: currentOrg
      ? `${currentOrg.plan.charAt(0).toUpperCase() + currentOrg.plan.slice(1)} plan`
      : "Free plan",
    used: 0,
    total: 0,
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  const handleSwitchOrg = (orgId: string) => {
    if (orgId === currentOrgId) return;
    switchOrg.mutate(orgId, {
      onSuccess: () => {
        router.refresh();
      },
    });
  };

  return (
    <div className="flex h-screen flex-col bg-background lg:flex-row">
      {switchOrg.isPending && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Switching organization...
          </p>
        </div>
      )}

      <MobileHeader
        isMenuOpen={isSidebarOpen}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          organizations={organizations}
          currentOrgId={currentOrgId}
          onSwitchOrg={handleSwitchOrg}
          user={user}
          credits={credits}
          draftCount={draftProjects.length}
          archivedCount={archivedProjects.length}
          onLogout={handleLogout}
        />
      </div>

      <main className={cn("flex-1 overflow-auto", className)}>{children}</main>
    </div>
  );
}
