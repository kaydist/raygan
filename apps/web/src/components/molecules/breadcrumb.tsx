import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Paragraph } from '@/components/atoms';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.label} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <Paragraph
                size="sm"
                weight={isLast ? 'semibold' : 'normal'}
                variant={isLast ? 'default' : 'muted'}
              >
                {item.label}
              </Paragraph>
            )}
          </div>
        );
      })}
    </nav>
  );
}
