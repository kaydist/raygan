"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import type { OrganizationWithRole } from "@raygan/shared";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Button,
  PlanBadge,
} from "@/components/atoms";
import { getAvatarColor, getOrgUuid } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface OrgSwitcherProps {
  organizations: OrganizationWithRole[];
  currentOrgId?: string;
  onSwitch: (orgId: string) => void;
  className?: string;
}

export function OrgSwitcher({
  organizations,
  currentOrgId,
  onSwitch,
  className,
}: OrgSwitcherProps) {
  const router = useRouter();
  const currentOrg = organizations.find(
    (o) => getOrgUuid(o) === currentOrgId,
  );
  const currentIndex = organizations.findIndex(
    (o) => getOrgUuid(o) === currentOrgId,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between gap-2 px-3 py-2 h-auto font-normal",
            className,
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white",
                getAvatarColor(currentIndex >= 0 ? currentIndex : 0),
              )}
            >
              {currentOrg?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="truncate text-sm font-medium">
              {currentOrg?.name || "Select organization"}
            </span>
            {currentOrg && <PlanBadge plan={currentOrg.plan} />}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {organizations.map((org, index) => {
          const orgUuid = getOrgUuid(org);
          return (
            <DropdownMenuItem
              key={orgUuid}
              onClick={() => onSwitch(orgUuid)}
              className="flex items-center gap-2 px-2 py-2"
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white",
                  getAvatarColor(index),
                )}
              >
                {org.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm">{org.name}</span>
              <PlanBadge plan={org.plan} />
              {orgUuid === currentOrgId && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        {/* <DropdownMenuItem
          onClick={() => router.push("/dashboard/new-organization")}
          className="gap-2 px-2"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Create new</span>
        </DropdownMenuItem> */}

        <DropdownMenuItem
          onClick={() => router.push("/dashboard/trash")}
          className="gap-2 px-2"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Trash</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
