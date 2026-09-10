"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn, splitSurnameFirst } from "@/lib/utils";
import {
  cacheGroup,
  forgetHoles,
  getAllHoles,
  getUnsyncedHoles,
  queueHoleUpdate,
} from "@/lib/scoring/offline-db";
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
    const anyMissing = players.some(
      (p) => p.holes[i]?.strokes === undefined && !p.holes[i]?.noReturn,
    );
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

export function ScoringApp({
  group,
  canSwitchGroup = false,
}: {
  group: ScoringGroupData;
  canSwitchGroup?: boolean;
}) {
  const [holesState, setHolesState] = useState<HolesState>(() =>
    Object.fromEntries(group.players.map((p) => [p.scorecardId, [...p.holes]])),
  );
  const [currentHole, setCurrentHole] = useState(() =>
    firstUnplayedHole(group.players),
  );
  const [view, setView] = useState<View>("entry");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { pendingCount, syncing, sessionExpired, syncNow } = useOfflineSync();
  useWakeLock(true);
  // Which player the keypad is aimed at, and any half-typed number. digitBuffer only ever holds
  // "1": a leading 1 is the one digit that might still become 10-19, so the keypad waits on it
  // instead of advancing. Everything else is a complete score the moment it is pressed.
  const [activePlayer, setActivePlayer] = useState(0);
  const [digitBuffer, setDigitBuffer] = useState("");
  // Belt-and-suspenders alongside queueHoleUpdate's own idempotency check -- guards the moment
  // between a tap and the view actually advancing, where a second, near-simultaneous tap could
  // otherwise fire saveCurrentHole again for the same hole before currentHole updates.
  const savingRef = useRef(false);

  const holeInfo = group.holeInfos[currentHole - 1];

  /**
   * Mount only. Lays any hole still waiting to sync over the server's card, and picks the hole to
   * start on.
   *
   * Deliberately not re-run when new server data arrives. It used to be, paired with a
   * router.refresh() to defeat Next's client router cache -- and that combination broke score entry
   * outright on championship morning: refresh re-rendered the server component, the new group prop
   * re-ran this, and setHolesState replaced the card wholesale. A typed score lives only in local
   * state until Save is pressed, so it was wiped the moment it was typed.
   *
   * The server is still the authority for anything already synced -- only a queued hole, one the
   * server has never seen, is laid on top. That is what stops a scorecard cleared in the admin
   * reappearing on the phone.
   */
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
          holes[h.holeNumber - 1] = {
            strokes: h.strokes,
            noReturn: h.noReturn,
          };
          merged[h.scorecardId] = holes;
        }
        setCurrentHole(
          firstUnplayedHole(
            group.players.map((p) => ({
              ...p,
              holes: merged[p.scorecardId] ?? p.holes,
            })),
          ),
        );
        return merged;
      });
    })();
    cacheGroup(group);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Drops queued holes the server no longer agrees with.
   *
   * A synced entry is not inert once a score has been cleared in the admin: queueHoleUpdate skips
   * anything already synced with the same value, so re-entering that exact score would never be
   * sent. Forgetting the entry restores a clean slate for that hole. Read-only as far as React is
   * concerned -- it touches IndexedDB and nothing else, so it cannot disturb entry.
   */
  useEffect(() => {
    (async () => {
      const entered = await getAllHoles();
      const byCard = new Map(
        group.players.map((p) => [p.scorecardId, p.holes]),
      );
      const stale = entered
        .filter((h) => {
          if (!h.synced) return false;
          const serverHole = byCard.get(h.scorecardId)?.[h.holeNumber - 1];
          if (!serverHole) return false;
          const serverEmpty =
            (serverHole.strokes === undefined || serverHole.strokes === null) &&
            !serverHole.noReturn;
          return serverEmpty;
        })
        .map((h) => `${h.scorecardId}:${h.holeNumber}`);
      if (stale.length > 0) await forgetHoles(stale);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionExpired) window.location.href = "/score/login";
  }, [sessionExpired]);

  function setPlayerHole(
    scorecardId: string,
    patch: Partial<{ strokes?: number; noReturn: boolean }>,
  ) {
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

  /** Whenever the hole changes, aim the keypad at the first player still to be scored on it. */
  useEffect(() => {
    const firstEmpty = group.players.findIndex((p) => {
      const h = holesState[p.scorecardId][currentHole - 1];
      return h?.strokes === undefined && !h?.noReturn;
    });
    setActivePlayer(firstEmpty === -1 ? 0 : firstEmpty);
    setDigitBuffer("");
    // Deliberately keyed on the hole alone: re-running this as scores change would yank the
    // highlight away from whoever the scorer is part-way through typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHole]);

  function jumpToHole(hole: number) {
    setCurrentHole(hole);
    setView("entry");
    setPickerOpen(false);
  }

  const holePickerStatus = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => {
      const allEntered = group.players.every(
        (p) =>
          holesState[p.scorecardId][i]?.strokes !== undefined ||
          holesState[p.scorecardId][i]?.noReturn,
      );
      const anyEntered = group.players.some(
        (p) =>
          holesState[p.scorecardId][i]?.strokes !== undefined ||
          holesState[p.scorecardId][i]?.noReturn,
      );
      return allEntered ? "complete" : anyEntered ? "partial" : "empty";
    });
  }, [group.players, holesState]);

  /** Moves to the next player still without a score, or stays put if they all have one. */
  function advance(from: number) {
    for (let step = 1; step <= group.players.length; step++) {
      const i = (from + step) % group.players.length;
      const h = holesState[group.players[i].scorecardId][currentHole - 1];
      if (h?.strokes === undefined && !h?.noReturn) {
        setActivePlayer(i);
        return;
      }
    }
  }

  function pressKey(key: string) {
    const player = group.players[activePlayer];
    if (!player) return;

    if (key === "clear") {
      // Empties this hole for everyone in the group, not just the highlighted player: fixing one
      // wrong score is done by typing over it, so clearing was only ever wanted for a hole entered
      // against the wrong players or started by mistake. Local only until Save, like every other
      // key here.
      for (const p of group.players) {
        setPlayerHole(p.scorecardId, { strokes: undefined, noReturn: false });
      }
      setActivePlayer(0);
      setDigitBuffer("");
      return;
    }

    if (key === "X") {
      setPlayerHole(player.scorecardId, { noReturn: true, strokes: undefined });
      setDigitBuffer("");
      advance(activePlayer);
      return;
    }

    // A 0 on its own is not a score -- it only means anything as the second digit of 10.
    if (digitBuffer === "" && key === "0") return;

    if (digitBuffer === "1") {
      setPlayerHole(player.scorecardId, {
        strokes: Number("1" + key),
        noReturn: false,
      });
      setDigitBuffer("");
      advance(activePlayer);
      return;
    }

    setPlayerHole(player.scorecardId, {
      strokes: Number(key),
      noReturn: false,
    });
    if (key === "1") {
      // Could still be the start of 10-19, so hold here and let the next press decide.
      setDigitBuffer("1");
      return;
    }
    setDigitBuffer("");
    advance(activePlayer);
  }

  const HolePicker = (
    <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
        >
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
                "flex h-12 flex-col items-center justify-center rounded-md border font-display text-base font-bold",
                status === "complete" &&
                  "border-primary bg-primary text-primary-foreground",
                status === "partial" &&
                  "border-accent bg-accent/20 text-foreground",
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
      <div className="flex h-[100svh] flex-col gap-6 overflow-hidden p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header className="flex shrink-0 items-center justify-between">
          <div>
            <p className="text-base uppercase tracking-wide text-primary-foreground/70">
              {group.groupLabel}
            </p>
            <h1 className="font-display text-xl font-bold">
              {view === "turn-review"
                ? "Front 9 review"
                : "Round complete -- review"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {canSwitchGroup ? <SwitchGroupLink /> : null}
            {HolePicker}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-primary-foreground/15">
          <table className="w-full min-w-[620px] border-collapse text-base">
            <thead>
              <tr className="border-b border-primary-foreground/15 text-left text-sm uppercase tracking-wide text-primary-foreground/70">
                <th className="px-3 py-2">Player</th>
                {Array.from({ length: upTo }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center">
                    {i + 1}
                  </th>
                ))}
                {view === "turn-review" ? (
                  <th className="px-3 py-2 text-right">Out</th>
                ) : (
                  <>
                    <th className="px-3 py-2 text-right">Out</th>
                    <th className="px-3 py-2 text-right">In</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {group.players.map((p) => {
                const holes = holesState[p.scorecardId];
                const range = holes.slice(0, upTo);
                const hasNoReturn = range.some((h) => h.noReturn);
                const sum = (rows: { strokes?: number; noReturn: boolean }[]) =>
                  rows.reduce(
                    (acc, h) => acc + (h.noReturn ? 0 : (h.strokes ?? 0)),
                    0,
                  );
                const front = holes.slice(0, 9);
                const back = holes.slice(9, 18);
                const total = sum(range);
                const frontNR = front.some((h) => h.noReturn);
                const backNR = back.some((h) => h.noReturn);
                const cell = (nr: boolean, value: number) =>
                  nr ? "NR" : value || "-";
                return (
                  <tr
                    key={p.scorecardId}
                    className="border-b border-primary-foreground/10 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <PlayerName name={p.playerName} />
                    </td>
                    {holes.slice(0, upTo).map((h, i) => (
                      <td
                        key={i}
                        className="px-2 py-2 text-center tabular-nums"
                      >
                        <button
                          type="button"
                          onClick={() => jumpToHole(i + 1)}
                          className="underline decoration-dotted underline-offset-2"
                        >
                          {h.noReturn ? "X" : (h.strokes ?? "-")}
                        </button>
                      </td>
                    ))}
                    {view === "turn-review" ? (
                      <td className="px-3 py-2 text-right font-bold tabular-nums">
                        {hasNoReturn ? "NR" : total || "-"}
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-right tabular-nums text-primary-foreground/70">
                          {cell(frontNR, sum(front))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-primary-foreground/70">
                          {cell(backNR, sum(back))}
                        </td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">
                          {hasNoReturn ? "NR" : total || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {view === "turn-review" ? (
          <Button
            variant="accent"
            size="lg"
            className="w-full shrink-0 uppercase tracking-wide"
            onClick={() => jumpToHole(10)}
          >
            Continue to the 10th
          </Button>
        ) : (
          <div className="flex shrink-0 flex-col gap-3">
            <p className="text-center text-base text-primary-foreground/70">
              Tap any score above to go back and correct it.
            </p>
            <Button
              asChild
              variant="accent"
              size="lg"
              className="w-full uppercase tracking-wide"
            >
              <Link href="/score/leaderboard">
                Confirm &amp; View Leaderboard
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[100svh] flex-col gap-3 overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* One compact line. "1st hole" at display size used to wrap onto two lines and eat a
       * quarter of the screen before a single score was visible. */}
      <header className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-xl font-bold leading-tight">
            Hole {currentHole}
          </h1>
          {holeInfo ? (
            <p className="truncate text-xs text-primary-foreground/70">
              Par {holeInfo.par} · SI {holeInfo.si}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <SyncStatus pendingCount={pendingCount} syncing={syncing} />
          <Link
            href="/score/leaderboard"
            className="font-semibold uppercase tracking-wide text-primary-foreground/70 hover:text-primary-foreground"
          >
            Board
          </Link>
          {canSwitchGroup ? <SwitchGroupLink /> : null}
          {HolePicker}
        </div>
      </header>

      {/* Player rows: compact, because the keypad below does the typing. Tapping a row aims the
       * keypad at that player -- the highlighted row is the one being scored. */}
      <div className="flex shrink-0 flex-col gap-2">
        {group.players.map((p, i) => {
          const hole = holesState[p.scorecardId][currentHole - 1];
          const active = i === activePlayer;
          return (
            <button
              key={p.scorecardId}
              type="button"
              onClick={() => {
                setActivePlayer(i);
                setDigitBuffer("");
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border p-2 text-left transition-colors",
                active
                  ? "border-accent bg-accent/15"
                  : "border-primary-foreground/15 bg-primary-foreground/5",
              )}
            >
              <PlayerName
                name={p.playerName}
                className="min-w-0 flex-1 truncate rounded-md border-t-[3px] border-black/15 bg-accent px-3 py-2 font-display text-xl text-accent-foreground"
              />
              <span
                className={cn(
                  "flex h-11 w-14 shrink-0 items-center justify-center rounded-md border font-display text-3xl font-bold leading-none",
                  active
                    ? "border-accent text-accent"
                    : "border-primary-foreground/25 text-primary-foreground",
                )}
              >
                {hole?.noReturn ? "X" : (hole?.strokes ?? "")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Keypad. This is the whole point of the redesign: the native numeric keyboard covered half
       * the screen whenever a score was being entered, which is what forced the rows to be huge in
       * the first place. Buttons are flex-1 so the pad grows into whatever height is left. */}
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "X"].map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => pressKey(key)}
              className={cn(
                "flex items-center justify-center rounded-lg border border-primary-foreground/20 font-display font-bold leading-none active:bg-primary-foreground/20",
                key === "clear" || key === "X"
                  ? "text-lg uppercase tracking-wide text-primary-foreground/70"
                  : "text-4xl text-primary-foreground",
              )}
            >
              {key === "clear" ? "Clear hole" : key}
            </button>
          ),
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        {currentHole > 1 ? (
          <Button
            variant="outline"
            size="lg"
            className="h-14 border-primary-foreground/30 px-5 text-base text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => jumpToHole(currentHole - 1)}
          >
            Back
          </Button>
        ) : null}
        <Button
          variant="accent"
          size="lg"
          className="h-14 flex-1 text-base uppercase tracking-wide"
          onClick={saveCurrentHole}
        >
          {currentHole === 18 ? "Finish Round" : "Save & Next Hole"}
        </Button>
      </div>
    </div>
  );
}

function SwitchGroupLink() {
  return (
    <Link
      href="/score/groups"
      className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/70 hover:text-primary-foreground"
    >
      Switch
    </Link>
  );
}

/** Never blocks -- purely informational. A scorer's progress never waits on this. */
function SyncStatus({
  pendingCount,
  syncing,
}: {
  pendingCount: number;
  syncing: boolean;
}) {
  if (pendingCount === 0 && !syncing) {
    return (
      <span className="text-sm font-semibold uppercase tracking-wide text-primary-foreground/50">
        Synced
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-sm font-semibold uppercase tracking-wide",
        pendingCount > 0 ? "text-accent" : "text-primary-foreground/60",
      )}
    >
      {syncing ? "Syncing…" : `${pendingCount} pending`}
    </span>
  );
}
