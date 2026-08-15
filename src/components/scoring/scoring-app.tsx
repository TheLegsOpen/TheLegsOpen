"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ScoringGroupData {
  groupLabel: string;
  holeInfos: { par: number; si: number }[];
  players: {
    playerId: string;
    playerName: string;
    scorecardId: string;
    holes: { strokes?: number; noReturn: boolean }[];
  }[];
}

type HolesState = Record<string, { strokes?: number; noReturn: boolean }[]>;

type View = "entry" | "turn-review" | "final-review";

function firstUnplayedHole(players: ScoringGroupData["players"]): number {
  for (let i = 0; i < 18; i++) {
    const anyMissing = players.some((p) => p.holes[i]?.strokes === undefined && !p.holes[i]?.noReturn);
    if (anyMissing) return i + 1;
  }
  return 18;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function ScoringApp({ group }: { group: ScoringGroupData }) {
  const [holesState, setHolesState] = useState<HolesState>(() =>
    Object.fromEntries(group.players.map((p) => [p.scorecardId, [...p.holes]])),
  );
  const [currentHole, setCurrentHole] = useState(() => firstUnplayedHole(group.players));
  const [view, setView] = useState<View>("entry");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const holeInfo = group.holeInfos[currentHole - 1];

  function setPlayerHole(scorecardId: string, patch: Partial<{ strokes?: number; noReturn: boolean }>) {
    setHolesState((prev) => {
      const holes = [...prev[scorecardId]];
      holes[currentHole - 1] = { ...holes[currentHole - 1], ...patch };
      return { ...prev, [scorecardId]: holes };
    });
  }

  async function saveCurrentHole() {
    setSaving(true);
    setSaveError(null);

    const updates = group.players.map((p) => {
      const hole = holesState[p.scorecardId][currentHole - 1];
      return { scorecardId: p.scorecardId, holeNumber: currentHole, strokes: hole?.noReturn ? undefined : hole?.strokes, noReturn: hole?.noReturn ?? false };
    });

    try {
      const res = await fetch("/api/scoring/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok && res.status === 401) {
        window.location.href = "/score/login";
        return;
      }
      if (!res.ok) {
        setSaveError("Couldn't save that hole -- check your connection and try again.");
        setSaving(false);
        return;
      }
    } catch {
      setSaveError("Couldn't reach the server -- check your connection and try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    if (currentHole === 9) setView("turn-review");
    else if (currentHole === 18) setView("final-review");
    else setCurrentHole((h) => Math.min(18, h + 1));
  }

  function jumpToHole(hole: number) {
    setCurrentHole(hole);
    setView("entry");
    setPickerOpen(false);
  }

  const holePickerStatus = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const allEntered = group.players.every((p) => holesState[p.scorecardId][i]?.strokes !== undefined || holesState[p.scorecardId][i]?.noReturn);
      const anyEntered = group.players.some((p) => holesState[p.scorecardId][i]?.strokes !== undefined || holesState[p.scorecardId][i]?.noReturn);
      return allEntered ? "complete" : anyEntered ? "partial" : "empty";
    });
  }, [group.players, holesState]);

  const HolePicker = (
    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
          Holes
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle>Jump to a hole</SheetTitle>
        <div className="mt-4 grid grid-cols-6 gap-2">
          {holePickerStatus.map((status, i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpToHole(i + 1)}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-md border font-display text-sm font-bold",
                status === "complete" && "border-primary bg-primary text-primary-foreground",
                status === "partial" && "border-accent bg-accent/20 text-foreground",
                status === "empty" && "border-border text-muted-foreground",
                currentHole === i + 1 && "ring-2 ring-accent ring-offset-2",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  if (view === "turn-review" || view === "final-review") {
    const upTo = view === "turn-review" ? 9 : 18;
    return (
      <div className="flex min-h-screen flex-col gap-6 p-5">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-foreground/60">{group.groupLabel}</p>
            <h1 className="font-display text-xl font-bold">{view === "turn-review" ? "Front 9 review" : "Round complete -- review"}</h1>
          </div>
          {HolePicker}
        </header>

        <div className="overflow-x-auto rounded-lg border border-primary-foreground/15">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-primary-foreground/15 text-left text-xs uppercase tracking-wide text-primary-foreground/60">
                <th className="px-3 py-2">Player</th>
                {Array.from({ length: upTo }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center">
                    {i + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">{view === "turn-review" ? "Out" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {group.players.map((p) => {
                const holes = holesState[p.scorecardId];
                const total = holes.slice(0, upTo).reduce((sum, h) => sum + (h.noReturn ? 0 : h.strokes ?? 0), 0);
                return (
                  <tr key={p.scorecardId} className="border-b border-primary-foreground/10 last:border-0">
                    <td className="px-3 py-2 font-semibold">{p.playerName}</td>
                    {holes.slice(0, upTo).map((h, i) => (
                      <td key={i} className="px-2 py-2 text-center tabular-nums">
                        <button type="button" onClick={() => jumpToHole(i + 1)} className="underline decoration-dotted underline-offset-2">
                          {h.noReturn ? "X" : (h.strokes ?? "-")}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{total || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {view === "turn-review" ? (
          <Button variant="accent" size="lg" className="w-full uppercase tracking-wide" onClick={() => jumpToHole(10)}>
            Continue to the 10th
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm text-primary-foreground/70">Tap any score above to go back and correct it.</p>
            <Button asChild variant="accent" size="lg" className="w-full uppercase tracking-wide">
              <Link href="/score/leaderboard">Confirm &amp; View Leaderboard</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-foreground/60">{group.groupLabel}</p>
          <h1 className="font-display text-2xl font-bold">
            {ordinal(currentHole)} hole
            {holeInfo ? <span className="ml-2 text-base font-normal text-primary-foreground/70">Par {holeInfo.par} · SI {holeInfo.si}</span> : null}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/score/leaderboard" className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70 hover:text-primary-foreground">
            Leaderboard
          </Link>
          {HolePicker}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {group.players.map((p) => {
          const hole = holesState[p.scorecardId][currentHole - 1];
          return (
            <div key={p.scorecardId} className="flex items-center gap-3 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
              <span className="flex-1 font-display text-lg font-semibold">{p.playerName}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                disabled={hole?.noReturn}
                value={hole?.noReturn ? "" : (hole?.strokes ?? "")}
                onChange={(e) => setPlayerHole(p.scorecardId, { strokes: e.target.value === "" ? undefined : Number(e.target.value), noReturn: false })}
                className="h-14 w-16 rounded-md border border-primary-foreground/30 bg-primary text-center font-display text-2xl font-bold text-primary-foreground disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setPlayerHole(p.scorecardId, { noReturn: !hole?.noReturn, strokes: undefined })}
                aria-pressed={hole?.noReturn}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-md border font-display text-xl font-bold",
                  hole?.noReturn ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/30 text-primary-foreground/60",
                )}
              >
                X
              </button>
            </div>
          );
        })}
      </div>

      {saveError ? <p className="text-center text-sm font-medium text-destructive">{saveError}</p> : null}

      <div className="flex gap-3">
        {currentHole > 1 ? (
          <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => jumpToHole(currentHole - 1)}>
            Back
          </Button>
        ) : null}
        <Button variant="accent" size="lg" className="flex-1 uppercase tracking-wide" onClick={saveCurrentHole} disabled={saving}>
          {saving ? "Saving…" : currentHole === 18 ? "Finish Round" : "Save & Next Hole"}
        </Button>
      </div>
    </div>
  );
}
