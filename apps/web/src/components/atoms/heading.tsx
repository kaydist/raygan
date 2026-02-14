import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const headingVariants = cva('font-normal text-foreground', {
  variants: {
    level: {
      1: 'text-4xl md:text-5xl',
      2: 'text-3xl md:text-4xl',
      3: 'text-2xl md:text-3xl',
      4: 'text-xl md:text-2xl',
      5: 'text-lg md:text-xl',
      6: 'text-base md:text-lg',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    level: 1,
    weight: 'normal',
  },
});

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: `h${HeadingLevel}`;
}

export function Heading({
  as,
  level = 1,
  weight,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = as || (`h${level}` as `h${HeadingLevel}`);

  return (
    <Tag className={cn(headingVariants({ level, weight, className }))} {...props}>
      {children}
    </Tag>
  );
}
