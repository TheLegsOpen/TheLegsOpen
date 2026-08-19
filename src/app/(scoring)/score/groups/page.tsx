import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { GroupPicker, type PickableGroup } from "@/components/scoring/group-picker";
import type { Player } from "@/payload-types";

/**
 * Admin-only "pick a group" screen -- the alternative entry point to a PIN. Reachable only with a
 * real Payload session (see the Admin tab on /score/login); picking a group here issues the same
 * scorer_session cookie a PIN would (see /api/scoring/select-group), so everything downstream
 * (/score/play, /api/scoring/save) is identical either way.
 */
export default async function ScoreGroupsPage() {
  const payload = await getPayload({ config });
  const headersList = await getHeaders();
  const { user } = await payload.auth({ headers: headersList });
  if (!user) redirect("/score/login");

  const championship = await getActiveChampionship(payload);
  if (!championship) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-primary-foreground/70">No active championship found. Set one as &quot;Currently Being Scored&quot; in the admin first.</p>
      </div>
    );
  }

  const teeTimeRounds = await payload.find({
    collection: "tee-time-rounds",
    where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
    limit: 50,
    depth: 1,
  });

  const groups: PickableGroup[] = [];
  for (const round of teeTimeRounds.docs) {
    for (const group of round.groups ?? []) {
      const players = (group.players ?? []).filter((p): p is Player => typeof p === "object");
      if (players.length === 0) continue;
      groups.push({
        teeTimeRoundId: String(round.id),
        groupId: String(group.id),
        label: `${group.time} · ${group.tee} tee`,
        playerNames: players.map((p) => p.name),
      });
    }
  }
  groups.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  return (
    <div className="flex min-h-screen flex-col gap-6 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">The Legs Open · Admin</p>
        <h1 className="font-display text-2xl font-bold">{championship.year} — Select a Group</h1>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-primary-foreground/70">No tee groups found for the active championship yet.</p>
      ) : (
        <GroupPicker groups={groups} />
      )}
    </div>
  );
}
