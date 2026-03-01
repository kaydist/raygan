import * as React from "react";
import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WizardStep } from "./build-modal.types";

const STEPS = [
  { number: 1 as WizardStep, label: "App Info" },
  { number: 2 as WizardStep, label: "Build Config" },
  { number: 3 as WizardStep, label: "Review & Build" },
];

export function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-start gap-1.5">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.number}>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
              s.number === currentStep &&
                "bg-foreground text-background shadow-sm",
              s.number < currentStep && "bg-muted text-muted-foreground",
              s.number > currentStep && "text-muted-foreground/40",
            )}
            disabled
          >
            {s.number < currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  s.number === currentStep
                    ? "bg-background/20"
                    : "border border-current",
                )}
              >
                {s.number}
              </span>
            )}
            {s.label}
          </button>
          {i < STEPS.length - 1 && (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/30" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
