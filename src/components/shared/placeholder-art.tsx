import { cn } from "@/lib/utils";

const TONES = {
  navy: ["#0a1f3d", "#1d3f6e", "#f0dca8"],
  gold: ["#7a5b1e", "#c9a13a", "#f4e6c1"],
  dusk: ["#1c2b3a", "#3c5a72", "#e8c893"],
  slate: ["#22262a", "#4a5560", "#c7cdd3"],
} as const;

type Tone = keyof typeof TONES;

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

interface PlaceholderArtProps {
  label: string;
  tone?: Tone;
  ratio?: "16/9" | "4/3" | "3/4" | "1/1" | "21/9";
  className?: string;
  showCaption?: boolean;
  /** Fill the parent element (absolute inset-0) instead of sizing by `ratio`. */
  fill?: boolean;
}

/**
 * Generative stand-in for real photography: an abstract "linksland" scene
 * (sky gradient, horizon, sun) rendered as inline SVG so no external image
 * asset is fetched or copied. Deterministic per-label seed keeps repeat
 * renders of the same card stable across the server/client boundary.
 */
export function PlaceholderArt({ label, tone = "navy", ratio = "4/3", className, showCaption = false, fill = false }: PlaceholderArtProps) {
  const seed = hashSeed(label);
  const [dark, mid, light] = TONES[tone];
  const horizon = 55 + (seed % 15);
  const sunX = 20 + (seed % 60);
  const gradientId = `pa-grad-${seed}`;

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", fill ? "absolute inset-0" : "rounded-lg", className)}
      style={fill ? undefined : { aspectRatio: ratio.replace("/", " / ") }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dark} />
            <stop offset="100%" stopColor={mid} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${gradientId})`} />
        <circle cx={sunX * 4} cy={horizon * 2.2} r="26" fill={light} opacity="0.85" />
        <path
          d={`M0 ${horizon * 3} Q100 ${horizon * 3 - 20} 200 ${horizon * 3 - 5} T400 ${horizon * 3 - 10} V300 H0 Z`}
          fill={dark}
          opacity="0.9"
        />
        <path
          d={`M0 ${horizon * 3 + 20} Q120 ${horizon * 3} 240 ${horizon * 3 + 15} T400 ${horizon * 3 + 5} V300 H0 Z`}
          fill={dark}
        />
      </svg>
      {showCaption ? (
        <span className="absolute bottom-2 left-2 rounded bg-primary/70 px-2 py-1 text-[11px] font-medium text-primary-foreground backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
