"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, splitSurnameFirst } from "@/lib/utils";
import { cacheGroup, getUnsyncedHoles, queueHoleUpdate } from "@/lib/scoring/offline-db";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useWakeLock } from "@/hooks/use-wake-lock";

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

/** "REITH, Callum" -- same surname-first format and bold/normal weight split as the main site's leaderboard. */
function PlayerName({ name, className }: { name: string; className?: string }) {
  const { surname, firstName } = splitSurnameFirst(name);
  return (
    <span className={className}>
      <span className="font-bold">{surname}</span>
      <span className="font-normal">, {firstName}</span>
    </span>
  );
}

export function ScoringApp({ group, canSwitchGroup = false }: { group: ScoringGroupData; canSwitchGroup?: boolean }) {
  const [holesState, setHolesState] = useState<HolesState>(() =>
    Object.fromEntries(group.players.map((p) => [p.scorecardId, [...p.holes]])),
  );
  const [currentHole, setCurrentHole] = useState(() => firstUnplayedHole(group.players));
  const [view, setView] = useState<View>("entry");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { pendingCount, syncing, sessionExpired, syncNow } = useOfflineSync();
  useWakeLock(true);
  const strokeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Belt-and-suspenders alongside queueHoleUpdate's own idempotency check -- guards the moment
  // between a tap and the view actually advancing, where a second, near-simultaneous tap could
  // otherwise fire saveCurrentHole again for the same hole before currentHole updates.
  const savingRef = useRef(false);

  const holeInfo = group.holeInfos[currentHole - 1];

  // On mount: any hole entered but never synced from a previous visit (tab killed offline, phone
  // locked mid-round, etc.) takes priority over the server-provided baseline, and the group's data
  // gets cached locally so this page can render from IndexedDB rather than needing a fresh server
  // round trip if signal is merely weak -- not a substitute for full offline reload, which needs
  // the app shell itself served from a service worker (Stage 3), not this.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const unsynced = await getUnsyncedHoles();
      if (cancelled || unsynced.length === 0) return;

      setHolesState((prev) => {
        const merged: HolesState = { ...prev };
        for (const h of unsynced) {
          if (!merged[h.scorecardId]) continue;
          const holes = [...merged[h.scorecardId]];
          holes[h.holeNumber - 1] = { strokes: h.strokes, noReturn: h.noReturn };
          merged[h.scorecardId] = holes;
        }
        setCurrentHole(firstUnplayedHole(group.players.map((p) => ({ ...p, holes: merged[p.scorecardId] ?? p.holes }))));
        return merged;
      });
    })();
    cacheGroup(group);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionExpired) window.location.href = "/score/login";
  }, [sessionExpired]);

  function setPlayerHole(scorecardId: string, patch: Partial<{ strokes?: number; noReturn: boolean }>) {
    setHolesState((prev) => {
      const holes = [...prev[scorecardId]];
      holes[currentHole - 1] = { ...holes[currentHole - 1], ...patch };
      return { ...prev, [scorecardId]: holes };
    });
  }

  async function saveCurrentHole() {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await saveCurrentHoleInner();
    } finally {
      savingRef.current = false;
    }
  }

  async function saveCurrentHoleInner() {
    for (const p of group.players) {
      const hole = holesState[p.scorecardId][currentHole - 1];
      await queueHoleUpdate({
        scorecardId: p.scorecardId,
        holeNumber: currentHole,
        strokes: hole?.noReturn ? undefined : hole?.strokes,
        noReturn: hole?.noReturn ?? false,
      });
    }
    // Best-effort immediate sync -- but advance regardless of whether it actually reaches the
    // server. The whole point of the local queue is that a scorer's progress is never gated on
    // connectivity; use-offline-sync retries automatically once signal returns.
    void syncNow();

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
      <div className="flex h-dvh flex-col gap-6 p-5">
        <header className="flex shrink-0 items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-foreground/60">{group.groupLabel}</p>
            <h1 className="font-display text-xl font-bold">{view === "turn-review" ? "Front 9 review" : "Round complete -- review"}</h1>
          </div>
          <div className="flex items-center gap-3">
            {canSwitchGroup ? <SwitchGroupLink /> : null}
            {HolePicker}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-primary-foreground/15">
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
                const range = holes.slice(0, upTo);
                const hasNoReturn = range.some((h) => h.noReturn);
                const total = range.reduce((sum, h) => sum + (h.noReturn ? 0 : (h.strokes ?? 0)), 0);
                return (
                  <tr key={p.scorecardId} className="border-b border-primary-foreground/10 last:border-0">
                    <td className="px-3 py-2">
                      <PlayerName name={p.playerName} />
                    </td>
                    {holes.slice(0, upTo).map((h, i) => (
                      <td key={i} className="px-2 py-2 text-center tabular-nums">
                        <button type="button" onClick={() => jumpToHole(i + 1)} className="underline decoration-dotted underline-offset-2">
                          {h.noReturn ? "X" : (h.strokes ?? "-")}
                        </button>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{hasNoReturn ? "NR" : total || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {view === "turn-review" ? (
          <Button variant="accent" size="lg" className="w-full shrink-0 uppercase tracking-wide" onClick={() => jumpToHole(10)}>
            Continue to the 10th
          </Button>
        ) : (
          <div className="flex shrink-0 flex-col gap-3">
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
    <div className="flex h-dvh flex-col gap-6 p-5">
      <header className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-foreground/60">{group.groupLabel}</p>
          <h1 className="font-display text-2xl font-bold">{ordinal(currentHole)} hole</h1>
          {holeInfo ? <p className="text-base font-normal text-primary-foreground/70">Par {holeInfo.par} · SI {holeInfo.si}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus pendingCount={pendingCount} syncing={syncing} />
          <Link href="/score/leaderboard" className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70 hover:text-primary-foreground">
            Leaderboard
          </Link>
          {canSwitchGroup ? <SwitchGroupLink /> : null}
          {HolePicker}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {group.players.map((p, i) => {
            const hole = holesState[p.scorecardId][currentHole - 1];
            return (
              <div key={p.scorecardId} className="flex items-center gap-3 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                <PlayerName
                  name={p.playerName}
                  className="min-w-0 flex-1 truncate border-t-[3px] border-black/15 bg-accent px-3 py-2 text-left font-display text-lg text-accent-foreground"
                />
                <input
                  ref={(el) => {
                    strokeInputRefs.current[i] = el;
                  }}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  disabled={hole?.noReturn}
                  value={hole?.noReturn ? "" : (hole?.strokes ?? "")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setPlayerHole(p.scorecardId, { strokes: raw === "" ? undefined : Number(raw), noReturn: false });
                    // A single digit 2-9 can't be the start of anything else (scores don't run to
                    // 20+), and a 2-digit value is already a complete score either way -- in both
                    // cases jump straight to the next player rather than waiting for a manual tap.
                    // "1" alone is left alone since it could still become 10-19.
                    if (/^[2-9]$/.test(raw) || raw.length === 2) {
                      const next = strokeInputRefs.current[i + 1];
                      if (next) {
                        next.focus();
                        next.select();
                      }
                    }
                  }}
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
      </div>

      <div className="flex shrink-0 gap-3">
        {currentHole > 1 ? (
          <Button variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => jumpToHole(currentHole - 1)}>
            Back
          </Button>
        ) : null}
        <Button variant="accent" size="lg" className="flex-1 uppercase tracking-wide" onClick={saveCurrentHole}>
          {currentHole === 18 ? "Finish Round" : "Save & Next Hole"}
        </Button>
      </div>
    </div>
  );
}

function SwitchGroupLink() {
  return (
    <Link href="/score/groups" className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70 hover:text-primary-foreground">
      Switch Group
    </Link>
  );
}

/** Never blocks -- purely informational. A scorer's progress never waits on this. */
function SyncStatus({ pendingCount, syncing }: { pendingCount: number; syncing: boolean }) {
  if (pendingCount === 0 && !syncing) {
    return <span className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/40">Synced</span>;
  }
  return (
    <span className={cn("text-xs font-semibold uppercase tracking-wide", pendingCount > 0 ? "text-accent" : "text-primary-foreground/60")}>
      {syncing ? "Syncing…" : `${pendingCount} pending`}
    </span>
  );
}
