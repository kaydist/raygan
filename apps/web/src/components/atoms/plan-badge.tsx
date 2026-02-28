import { Badge } from "@/components/atoms/badge";
import { PLAN_BADGE_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  plan: string;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 border-0 px-1.5 text-[10px] font-medium capitalize",
        PLAN_BADGE_COLORS[plan] || PLAN_BADGE_COLORS.free,
        className,
      )}
    >
      {label}
    </Badge>
  );
}
