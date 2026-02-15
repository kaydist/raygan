"use client";

export function StatusBar() {
  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-muted/30 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>CaloriesCard</span>
        <span>·</span>
        <span>View</span>
        <span>·</span>
        <span>depth 3</span>
        <span>·</span>
        <span>2 children</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>AST synced</span>
        </div>
        <span>75%</span>
        <span>⌘K</span>
      </div>
    </div>
  );
}
