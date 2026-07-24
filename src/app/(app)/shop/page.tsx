import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ShopGrid } from "@/components/shop/shop-grid";

export const metadata: Metadata = {
  title: "Shop",
  description: "Championship collections from Fairwood, Reidholt and Marlowe & Finch.",
};

export default function ShopPage() {
  return (
    <>
      <PageHero
        eyebrow="Official Shop"
        title="Championship collections"
        description="Apparel, headwear and accessories from the championship's official suppliers."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <Container className="py-16 sm:py-24">
        <ShopGrid />
      </Container>
    </>
  );
}
