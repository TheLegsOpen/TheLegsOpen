"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "score-install-hint-dismissed";

/** The event Chrome fires when it considers the app installable. Not in TypeScript's DOM lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Getting the scoring app onto a scorer's home screen, on either platform.
 *
 * Neither one installs a web app on its own, and the two need opposite handling:
 *
 * iOS has no install prompt at all -- Safari only offers Add to Home Screen through the Share
 * sheet, and only tells you if you already know to look. So it gets instructions.
 *
 * Android can prompt, but Chrome decides when, based on engagement heuristics we do not control;
 * left alone it often never appears and the option stays buried in the ⋮ menu. Capturing
 * beforeinstallprompt lets us offer a button outright instead of hoping. The event only fires when
 * Chrome already considers the app installable, so the button cannot appear where it would not work.
 */
export function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "ios" | "android">("hidden");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Private mode or blocked storage -- show the hint rather than suppress it.
    }
    if (dismissed) return;

    // Already installed: iOS reports navigator.standalone, everyone else the display-mode query.
    const isStandalone =
      ("standalone" in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) return;

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("ios");
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      // Without this Chrome shows its own mini-infobar instead, on its own schedule.
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setMode("android");
    }
    function onInstalled() {
      setMode("hidden");
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not being able to remember the dismissal is not a reason to leave the banner up.
    }
    setMode("hidden");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    // The event is single-use either way; a declined install should not leave a dead button.
    setInstallEvent(null);
    if (outcome === "accepted") setMode("hidden");
    else dismiss();
  }

  if (mode === "hidden") return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/15 bg-primary-foreground/5 px-4 py-2 text-xs text-primary-foreground/80">
      {mode === "ios" ? (
        <span>
          Install this app: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
        </span>
      ) : (
        <span>Install this app for full-screen scoring that works without signal.</span>
      )}

      <div className="flex shrink-0 items-center gap-3">
        {mode === "android" ? (
          <button
            type="button"
            onClick={install}
            className="rounded border border-accent px-3 py-1 font-semibold uppercase tracking-wide text-accent"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="font-semibold uppercase tracking-wide text-primary-foreground/60"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
