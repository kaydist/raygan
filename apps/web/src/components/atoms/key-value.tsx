import { cn } from "@/lib/utils";

interface KeyValueItem {
  label: string;
  value: React.ReactNode;
}

type KeyValueVariant = "inline" | "stacked";

interface KeyValueProps {
  items: KeyValueItem[];
  variant?: KeyValueVariant;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function KeyValue({ items, variant = "inline", columns = 1, className }: KeyValueProps) {
  if (variant === "stacked") {
    return (
      <dl
        className={cn(
          "grid gap-4 text-xs",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-3",
          columns === 4 && "grid-cols-4",
          className,
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs", className)}>
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
