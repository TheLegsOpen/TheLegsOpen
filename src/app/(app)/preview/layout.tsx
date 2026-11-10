import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";

/**
 * Hidden previews of proposed layout changes, on real data, for the user to approve before any
 * real page changes (see the layout review of 2026-11-10). Not linked from anywhere, kept out of
 * search engines, and removed once each change is approved or rejected.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-accent bg-accent text-accent-foreground">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs font-bold uppercase tracking-wide">
          <span>Preview · not live · proposed layout changes</span>
          <Link href="/preview" className="underline underline-offset-2">
            All previews
          </Link>
        </Container>
      </div>
      {children}
    </>
  );
}
