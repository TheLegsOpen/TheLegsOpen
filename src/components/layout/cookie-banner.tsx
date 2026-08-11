"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "legs-open-cookie-consent";

export function CookieBanner({ logoUrl }: { logoUrl?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so whether the banner should
    // show can only be known after mount.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
    }
  }, []);

  function respond(choice: "accepted" | "declined") {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/40 p-4 backdrop-blur-sm sm:items-center animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label="Cookie preferences"
        className="w-full max-w-[380px] rounded-lg border border-border bg-card p-8 text-center shadow-card-hover animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {logoUrl ? (
          <Image src={logoUrl} alt="" width={56} height={56} className="mx-auto h-14 w-14 rounded-full object-contain" />
        ) : (
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary text-sm font-bold text-primary">
            LO
          </span>
        )}

        <h2 className="mt-4 font-display text-xl font-bold uppercase tracking-wide text-foreground">Your Cookies</h2>

        <p className="mt-4 text-sm text-muted-foreground text-balance">
          Accepting all cookies helps this fictional demo site remember your preferences between visits.
        </p>
        <p className="mt-3 text-sm text-muted-foreground text-balance">
          No data leaves your browser and nothing is shared with anyone else — this is a placeholder for learning
          purposes only.
        </p>

        <Button size="lg" className="mt-6 w-full uppercase tracking-wide" onClick={() => respond("accepted")}>
          Accept all cookies
        </Button>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => respond("declined")}
            className="font-bold text-foreground underline underline-offset-2 hover:text-primary"
          >
            Decline non-essential cookies
          </button>
          <Link href="/legal/cookie-policy" className="font-bold text-foreground underline underline-offset-2 hover:text-primary">
            Cookie Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
