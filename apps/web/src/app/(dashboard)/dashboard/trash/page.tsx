"use client";

import { Trash2 } from "lucide-react";
import { Breadcrumb, EmptyState } from "@/components/molecules";

export default function TrashPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Trash" },
          ]}
        />
      </div>

      <EmptyState
        icon={Trash2}
        title="No deleted projects"
        description="Deleted projects will appear here. You can restore them within 30 days."
      />
    </div>
  );
}
