"use client";

import { LayoutTemplate } from "lucide-react";
import { Breadcrumb, EmptyState } from "@/components/molecules";

export default function TemplatesPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Templates" },
          ]}
        />
      </div>

      <EmptyState
        icon={LayoutTemplate}
        title="Templates coming soon"
        description="Pre-built app templates will be available here to help you get started faster."
      />
    </div>
  );
}
