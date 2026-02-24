import type { PlanTier } from "@raygan/shared";

import { DEFAULT_CREDITS } from "../constants";

export function hasCredits(remaining: number): boolean {
  return remaining > 0;
}

export function getCreditsForPlan(plan: PlanTier): number {
  return DEFAULT_CREDITS[plan] || 0;
}

export function formatCreditsRemaining(
  remaining: number,
  total: number
): string {
  return `${remaining}/${total}`;
}

export function getCreditsPercentage(remaining: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((remaining / total) * 100);
}

export function isLowCredits(remaining: number, total: number): boolean {
  return getCreditsPercentage(remaining, total) < 20;
}
