// Billing feature types
export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number | string;
}

export interface PlanComparison {
  planId: string;
  features: PlanFeature[];
}
