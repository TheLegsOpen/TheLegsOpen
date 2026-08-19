"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn, splitSurnameFirst } from "@/lib/utils";

export interface PickableGroup {
  teeTimeRoundId: string;
  groupId: string;
  label: string;
  playerNames: string[];
}

export function GroupPicker({ groups }: { groups: PickableGroup[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectGroup(group: PickableGroup) {
    setPendingId(group.groupId);
    setError(null);
    try {
      const res = await fetch("/api/scoring/select-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teeTimeRoundId: group.teeTimeRoundId, groupId: group.groupId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't open that group.");
        setPendingId(null);
        return;
      }
      router.push("/score/play");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {groups.map((group) => (
        <button
          key={group.groupId}
          type="button"
          disabled={pendingId !== null}
          onClick={() => selectGroup(group)}
          className={cn(
            "flex flex-col gap-1 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4 text-left transition-colors",
            pendingId === group.groupId && "opacity-60",
            pendingId === null && "hover:border-accent hover:bg-primary-foreground/10",
          )}
        >
          <span className="font-display text-lg font-bold">{pendingId === group.groupId ? "Opening…" : group.label}</span>
          <span className="text-sm text-primary-foreground/70">
            {group.playerNames.map((name, i) => (
              <span key={name}>
                {i > 0 ? " · " : ""}
                <PlayerName name={name} />
              </span>
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

function PlayerName({ name }: { name: string }) {
  const { surname, firstName } = splitSurnameFirst(name);
  return (
    <>
      <span className="font-semibold">{surname}</span>, {firstName}
    </>
  );
}
