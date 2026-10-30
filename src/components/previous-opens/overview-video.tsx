import { cn } from "@/lib/utils";

/**
 * Turns the link someone would actually paste into the one an iframe will accept.
 *
 * Editors copy what is in the address bar, not an embed URL, so youtu.be links, watch?v= links
 * and Vimeo page links all have to work. Anything unrecognised returns null and the player simply
 * does not render -- better a missing video than an iframe pointed at a page that refuses to be
 * framed, which renders as a blank grey box with no explanation.
 */
export function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    // Already an /embed/ or /v/ link -- leave it be.
    if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/v/")) return url.toString();
    return null;
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") return url.toString();

  return null;
}

/**
 * The Open runs a 748x425 player between the paragraphs of a championship write-up -- near enough
 * 16:9, so that is what this holds rather than their exact pixels, which were a function of their
 * column width rather than a choice.
 */
export function OverviewVideo({ url, className }: { url: string; className?: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) return null;

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-surface-dark", className)}>
      <iframe
        src={embed}
        title="Championship highlights"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
