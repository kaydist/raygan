import Link from 'next/link';
import { Progress, Paragraph } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface CreditDisplayProps {
  plan: string;
  used: number;
  total: number;
  upgradeHref?: string;
  className?: string;
}

export function CreditDisplay({
  plan,
  used,
  total,
  upgradeHref = '/settings/billing',
  className,
}: CreditDisplayProps) {
  const percentage = Math.round((used / total) * 100);

  return (
    <div className={cn('space-y-2 rounded-lg bg-accent/30 p-3', className)}>
      <div className="flex items-center justify-between">
        <Paragraph size="sm">{plan}</Paragraph>
        <Link
          href={upgradeHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          Upgrade
        </Link>
      </div>
      <Progress value={percentage} className="h-1" />
      <Paragraph size="xs" variant="muted">
        {used.toLocaleString()} / {total.toLocaleString()} credits
      </Paragraph>
    </div>
  );
}
