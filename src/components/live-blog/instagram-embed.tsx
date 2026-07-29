"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const SCRIPT_SRC = "https://www.instagram.com/embed.js";

/** Renders Instagram's own embed widget for a post URL -- genuine Instagram styling, not restyled to match the site. */
export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => window.instgrm?.Embeds.process());
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => window.instgrm?.Embeds.process());
    document.body.appendChild(script);
  }, [url]);

  return (
    <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14" style={{ margin: 0 }}>
      <a href={url} target="_blank" rel="noreferrer">
        View this post on Instagram
      </a>
    </blockquote>
  );
}
