"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { Video } from "@/types/video";

export function VideoCard({ video }: { video: Video }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="group flex flex-col gap-3 text-left">
        <div className="relative">
          <PlaceholderArt
            label={video.imageLabel}
            tone="navy"
            ratio="16/9"
            className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-primary shadow-card transition-transform duration-200 ease-standard group-hover:scale-110">
              <Play className="h-5 w-5 translate-x-0.5 fill-current" />
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[11px] font-medium tabular-nums text-white">
            {video.durationLabel}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-display font-bold leading-snug text-balance group-hover:text-primary">{video.title}</h3>
          <p className="text-xs text-muted-foreground">{formatDate(video.publishedAt)}</p>
        </div>
      </button>

      <DialogContent className="max-w-2xl">
        <DialogTitle>{video.title}</DialogTitle>
        <PlaceholderArt label={video.imageLabel} tone="navy" ratio="16/9" />
        <p className="text-sm text-muted-foreground">
          Video playback isn&rsquo;t wired up in this build — this is a placeholder for where a real player (e.g. an
          embedded Vimeo/Mux player) would sit once a video source exists.
        </p>
      </DialogContent>
    </Dialog>
  );
}
