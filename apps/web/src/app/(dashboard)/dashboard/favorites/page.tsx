"use client";

import { Star } from "lucide-react";
import { Breadcrumb, EmptyState } from "@/components/molecules";

export default function FavoritesPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Favorites" },
          ]}
        />
      </div>

      <EmptyState
        icon={Star}
        title="No favorites yet"
        description="Star your most-used projects for quick access."
      />
    </div>
  );
}
