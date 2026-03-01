import { Apple, Smartphone, ChevronLeft } from "lucide-react";

import { Button } from "@/components/atoms";

interface PlatformPickerProps {
  onSelectAndroid: () => void;
  onBack: () => void;
}

export function PlatformPicker({ onSelectAndroid, onBack }: PlatformPickerProps) {
  return (
    <>
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-[15px] font-semibold">Build APK/IPA</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a platform to build for
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-6 py-5">
        <button
          type="button"
          disabled
          className="flex flex-col items-center gap-3 rounded-xl border border-border/50 px-4 py-5 opacity-40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Apple className="h-6 w-6 text-foreground" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[13px] font-medium text-foreground">iOS</span>
            <span className="rounded-md border border-border/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              COMING SOON
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onSelectAndroid}
          className="flex flex-col items-center gap-3 rounded-xl border border-border/50 px-4 py-5 transition-all hover:border-border hover:bg-accent/30"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Smartphone className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[13px] font-medium text-foreground">
              Android
            </span>
            <span className="text-[11px] text-muted-foreground">Build APK</span>
          </div>
        </button>
      </div>

      <div className="flex border-t border-border/50 px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>
    </>
  );
}
