"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Ends the scorer's session and returns them to the PIN screen.
 *
 * Confirmed first, because signing out mid-round is a nuisance -- the scorer needs their group's
 * PIN again to get back in. `roundComplete` only changes how loud the button is: once the card is
 * in, this is the last thing they should be doing, so it takes the accent treatment; before that it
 * stays quiet enough not to be tapped by accident.
 */
export function FinishRoundButton({ roundComplete }: { roundComplete: boolean }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    const message = roundComplete
      ? "Sign out? Your card is saved. Any further change has to be made by an administrator."
      : "Sign out before the end of the round? You will need this group's PIN to start scoring again.";
    if (!window.confirm(message)) return;

    setBusy(true);
    try {
      await fetch("/api/scoring/logout", { method: "POST" });
    } catch {
      // Signing out is worth doing even if the request never lands -- the redirect below leaves the
      // scoring app either way, and a stale cookie only matters to this device.
    }
    // A hard navigation, not router.push: it drops every cached RSC payload for /score/*, so the
    // back button cannot resurrect the scoring screen from the client router cache.
    window.location.href = "/score/login";
  }

  return (
    <Button
      type="button"
      onClick={signOut}
      disabled={busy}
      variant={roundComplete ? "accent" : "outline"}
      size="lg"
      className={
        roundComplete
          ? "w-full uppercase tracking-wide"
          : "w-full border-primary-foreground/30 uppercase tracking-wide text-primary-foreground hover:bg-primary-foreground/10"
      }
    >
      {busy ? "Signing out…" : roundComplete ? "Finish & sign out" : "Sign out"}
    </Button>
  );
}
