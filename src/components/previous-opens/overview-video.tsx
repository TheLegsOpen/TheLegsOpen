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
 * A link to a video file rather than to a video site: one of our own Media files
 * (`/api/media/file/...`, as Media shows it, or the same with the site's address in front), or any
 * https address ending in a video extension. Returned ready for a <video> src; anything else is
 * null, and toEmbedUrl gets its turn.
 */
export function hostedVideoUrl(raw: string): string | null {
  const value = raw.trim();
  if (value.startsWith("/api/media/file/")) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "thelegsopen.com" && url.pathname.startsWith("/api/media/file/")) return url.pathname;
  if (url.protocol === "https:" && /\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) return url.toString();
  return null;
}

/**
 * The Open runs a 748x425 player between the paragraphs of a championship write-up -- near enough
 * 16:9, so that is what this holds rather than their exact pixels, which were a function of their
 * column width rather than a choice.
 */
export function OverviewVideo({
  url,
  fileUrl,
  poster,
  className,
}: {
  url?: string;
  /** A video file hosted on the site. Wins over `url` when both are set. */
  fileUrl?: string;
  /** Still shown before play for a hosted file. */
  poster?: string;
  className?: string;
}) {
  // A link field holding one of our own files plays the same way as the upload field.
  const src = fileUrl ?? (url ? hostedVideoUrl(url) : null);
  if (src) {
    // The browser's own player: no third-party branding, adverts or suggested videos afterwards.
    // preload="metadata" fetches the length and first frame only, so the page stays light until
    // someone presses play.
    return (
      <div className={cn("relative aspect-video w-full overflow-hidden bg-black", className)}>
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-contain"
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  const embed = url ? toEmbedUrl(url) : null;
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
