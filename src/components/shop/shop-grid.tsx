"use client";

import { useMemo, useState } from "react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { cn } from "@/lib/utils";
import { PRODUCTS } from "@/data/products";

const CATEGORIES = ["All", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

export function ShopGrid() {
  const [category, setCategory] = useState("All");

  const filtered = useMemo(
    () => (category === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category)),
    [category],
  );

  return (
    <div className="flex flex-col gap-10">
      <div role="tablist" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            type="button"
            aria-selected={category === cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent hover:bg-secondary",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <div key={product.id} className="flex flex-col gap-3">
              <PlaceholderArt label={product.imageLabel} tone="slate" ratio="3/4" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.collection}</p>
                <h3 className="text-sm font-medium">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
