import { logger } from "../../config";

type PlanDecision = "approved" | "rejected";

interface PendingPlan {
  resolve: (decision: PlanDecision) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class PlanApprovalGate {
  private pending = new Map<string, PendingPlan>();

  async waitForApproval(
    planId: string,
    timeoutMs = 60_000,
  ): Promise<PlanDecision> {
    return new Promise<PlanDecision>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(planId);
        logger.warn({ planId }, "Plan approval timed out, auto-rejecting");
        resolve("rejected");
      }, timeoutMs);

      this.pending.set(planId, { resolve, timer });
    });
  }

  resolve(planId: string, decision: PlanDecision): boolean {
    const entry = this.pending.get(planId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(planId);
    entry.resolve(decision);
    return true;
  }

  cancel(planId: string): void {
    const entry = this.pending.get(planId);
    if (entry) {
      clearTimeout(entry.timer);
      this.pending.delete(planId);
      entry.resolve("rejected");
    }
  }

  hasPending(planId: string): boolean {
    return this.pending.has(planId);
  }
}

let instance: PlanApprovalGate | null = null;

export function getPlanApprovalGate(): PlanApprovalGate {
  if (!instance) {
    instance = new PlanApprovalGate();
  }
  return instance;
}
