import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import { getActiveChampionship, parseTeeTimeMinutes } from "@/lib/data/scorecards";
import { GroupPicker, type PickableGroup } from "@/components/scoring/group-picker";
import type { Player } from "@/payload-types";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

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

  const [championshipRounds, practiceRounds] = await Promise.all([
    championship
      ? payload.find({
          collection: "tee-time-rounds",
          where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
          limit: 50,
          depth: 1,
        })
      : undefined,
    payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ round: { equals: "Practice" } }, { archived: { not_equals: true } }] },
      limit: 50,
      depth: 1,
    }),
  ]);

  const groups: PickableGroup[] = [];
  for (const round of championshipRounds?.docs ?? []) {
    for (const group of round.groups ?? []) {
      const players = (group.players ?? []).filter((p): p is Player => typeof p === "object");
      if (players.length === 0) continue;
      groups.push({
        teeTimeRoundId: String(round.id),
        groupId: String(group.id),
        label: `${group.time} · ${group.tee} tee`,
        sortMinutes: parseTeeTimeMinutes(group.time ?? ""),
        playerNames: players.map((p) => p.name),
      });
    }
  }
  // Sorted on the parsed time rather than the label: localeCompare with numeric:true read "1.05"
  // as one-point-nought-five and put the afternoon groups above the morning ones.
  groups.sort((a, b) => a.sortMinutes - b.sortMinutes);

  const practiceGroups: PickableGroup[] = [];
  for (const round of practiceRounds.docs) {
    for (const group of round.groups ?? []) {
      const players = (group.players ?? []).filter((p): p is Player => typeof p === "object");
      if (players.length === 0) continue;
      practiceGroups.push({
        teeTimeRoundId: String(round.id),
        groupId: String(group.id),
        label: `Practice · ${group.time} · ${group.tee} tee`,
        sortMinutes: parseTeeTimeMinutes(group.time ?? ""),
        playerNames: players.map((p) => p.name),
      });
    }
  }
  practiceGroups.sort((a, b) => a.sortMinutes - b.sortMinutes);

  if (groups.length === 0 && practiceGroups.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-primary-foreground/70">
          No tee groups found. Set a championship as &quot;Currently Being Scored&quot;, or add a Practice round, in the admin first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">The Legs Open · Admin</p>
        <h1 className="font-display text-2xl font-bold">{championship ? `${championship.year} — Select a Group` : "Select a Group"}</h1>
      </div>
      {groups.length > 0 ? <GroupPicker groups={groups} /> : null}
      {practiceGroups.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">Practice Rounds</p>
          <GroupPicker groups={practiceGroups} />
        </div>
      ) : null}
    </div>
  );
}
