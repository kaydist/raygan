import { Separator } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface OrDividerProps {
  className?: string;
}

export function OrDivider({ className }: OrDividerProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Separator className="flex-1" />
      <span className="text-xs font-medium text-muted-foreground">OR</span>
      <Separator className="flex-1" />
    </div>
  );
}
