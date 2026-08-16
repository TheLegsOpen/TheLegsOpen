"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "score-ios-install-hint-dismissed";

/**
 * iOS has no native "install this app" prompt -- Safari only offers Add to Home Screen via the
 * Share sheet, and only tells the user that if they know to look. This surfaces it directly.
 */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = "standalone" in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (isIos && !isStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary-foreground/15 bg-primary-foreground/5 px-4 py-2 text-xs text-primary-foreground/80">
      <span>
        Install this app: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
      </span>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
        className="shrink-0 font-semibold uppercase tracking-wide text-primary-foreground/60"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
