import type { OrganizationWithRole } from "@raygan/shared";

import { AVATAR_COLORS } from "@/lib/constants";

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length] ?? "bg-blue-500";
}

export function getOrgUuid(org: OrganizationWithRole): string {
  return org.uuid ?? org.id?.toString();
}
