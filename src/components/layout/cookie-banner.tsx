"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";

const STORAGE_KEY = "legs-open-cookie-consent";

export function CookieBanner() {
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
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-card-hover animate-in slide-in-from-bottom duration-300"
    >
      <Container className="flex flex-col items-start gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          We use cookies to run this fictional demo site and to remember your preferences. No data leaves your
          browser — this is a placeholder for learning purposes only.
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={() => respond("declined")}>
            Decline non-essential
          </Button>
          <Button size="sm" onClick={() => respond("accepted")}>
            Accept all
          </Button>
        </div>
      </Container>
    </div>
  );
}
