"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export interface HoleInfo {
  par: number;
  si: number;
  yards?: number;
}

export interface ScoringPlayer {
  playerId: string;
  scorecardId: string;
  name: string;
  handicap: number;
  holes: (number | null)[];
}

export interface ScoringGroup {
  time: string;
  tee: string;
  players: ScoringPlayer[];
}

interface GroupScoringBoardProps {
  groups: ScoringGroup[];
  holeInfos: HoleInfo[];
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const FRONT_NINE = Array.from({ length: 9 }, (_, i) => i);
const BACK_NINE = Array.from({ length: 9 }, (_, i) => i + 9);

function sumRange(holes: (number | null)[], indices: number[]): number | null {
  const values = indices.map((i) => holes[i]).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

function GroupCard({ group, holeInfos }: { group: ScoringGroup; holeInfos: HoleInfo[] }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<Record<string, (number | null)[]>>(() =>
    Object.fromEntries(group.players.map((p) => [p.scorecardId, [...p.holes]])),
  );
  const [status, setStatus] = useState<SaveStatus>("idle");

  const allComplete = group.players.every((p) => rows[p.scorecardId]?.every((v) => v != null));

  function setValue(scorecardId: string, holeIndex: number, value: string) {
    setStatus("idle");
    setRows((prev) => {
      const next = { ...prev };
      const holes = [...(next[scorecardId] ?? [])];
      holes[holeIndex] = value === "" ? null : Number(value);
      next[scorecardId] = holes;
      return next;
    });
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/admin-scoring/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: group.players.map((p) => ({ scorecardId: p.scorecardId, holes: rows[p.scorecardId] })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="border border-surface-dark-foreground/15 bg-surface-dark-foreground/5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="font-semibold">
          {group.time} — {group.tee} tee — {group.players.map((p) => p.name).join(" / ")}
        </span>
        <span
          className={cn(
            "px-3 py-1 text-xs font-bold uppercase tracking-wide",
            allComplete ? "bg-[#0E3D2C] text-white" : "bg-accent text-accent-foreground",
          )}
        >
          {allComplete ? "All holes completed" : "In progress"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-surface-dark-foreground/15 p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-surface-dark-foreground/50">
                  <th className="px-2 py-1 text-left">Hole</th>
                  {FRONT_NINE.map((i) => (
                    <th key={i} className="px-1 py-1 text-center">
                      {i + 1}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center">Out</th>
                  {BACK_NINE.map((i) => (
                    <th key={i} className="px-1 py-1 text-center">
                      {i + 1}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center">In</th>
                  <th className="px-2 py-1 text-center">Total</th>
                </tr>
                <tr className="text-xs text-surface-dark-foreground/40">
                  <th className="px-2 py-1 text-left font-normal">Par</th>
                  {FRONT_NINE.map((i) => (
                    <th key={i} className="px-1 py-1 text-center font-normal">
                      {holeInfos[i]?.par}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-normal">{sumRange(holeInfos.map((h) => h.par), FRONT_NINE)}</th>
                  {BACK_NINE.map((i) => (
                    <th key={i} className="px-1 py-1 text-center font-normal">
                      {holeInfos[i]?.par}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-center font-normal">{sumRange(holeInfos.map((h) => h.par), BACK_NINE)}</th>
                  <th className="px-2 py-1 text-center font-normal">{holeInfos.reduce((a, h) => a + h.par, 0)}</th>
                </tr>
              </thead>
              <tbody>
                {group.players.map((player) => {
                  const holes = rows[player.scorecardId] ?? [];
                  const out = sumRange(holes, FRONT_NINE);
                  const inScore = sumRange(holes, BACK_NINE);
                  const total = out != null && inScore != null ? out + inScore : null;
                  return (
                    <tr key={player.scorecardId} className="border-t border-surface-dark-foreground/10">
                      <td className="whitespace-nowrap px-2 py-2 font-semibold">
                        {player.name} <span className="font-normal text-surface-dark-foreground/50">({player.handicap})</span>
                      </td>
                      {FRONT_NINE.map((i) => (
                        <td key={i} className="px-1 py-1">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={holes[i] ?? ""}
                            onChange={(e) => setValue(player.scorecardId, i, e.target.value)}
                            className="w-11 border border-surface-dark-foreground/20 bg-surface-dark px-1 py-1 text-center text-sm text-surface-dark-foreground focus:border-accent focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center font-semibold tabular-nums">{out ?? "—"}</td>
                      {BACK_NINE.map((i) => (
                        <td key={i} className="px-1 py-1">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={holes[i] ?? ""}
                            onChange={(e) => setValue(player.scorecardId, i, e.target.value)}
                            className="w-11 border border-surface-dark-foreground/20 bg-surface-dark px-1 py-1 text-center text-sm text-surface-dark-foreground focus:border-accent focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center font-semibold tabular-nums">{inScore ?? "—"}</td>
                      <td className="px-2 py-1 text-center font-bold tabular-nums">{total ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving"}
              className="bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save Group"}
            </button>
            {status === "saved" && <span className="text-sm text-[#0E3D2C]">Saved.</span>}
            {status === "error" && <span className="text-sm text-[#CB333B]">Save failed — try again.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function GroupScoringBoard({ groups, holeInfos }: GroupScoringBoardProps) {
  if (groups.length === 0) {
    return <p className="text-surface-dark-foreground/70">No tee groups found for the current championship.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupCard key={`${group.time}-${group.tee}`} group={group} holeInfos={holeInfos} />
      ))}
    </div>
  );
}
