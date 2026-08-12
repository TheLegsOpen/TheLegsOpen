import { formatToPar } from "@/lib/leaderboard";

export interface Commentary {
  headline: string;
  body: string;
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** ", thru N" once a holes-completed figure is known -- omitted once the round is finished ("F") or unknown. */
function thruSuffix(thru?: string): string {
  return thru && thru !== "F" ? `, thru ${thru}` : "";
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Same idea as joinNames but with a prose "and" -- used for lists inside a sentence (competition names) rather than a list of people. */
function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Main (-2), Stableford (7 pts) and Scratch (+1)" -- pairs each competition with its own score so a merged, multi-board post stays exactly as factual as three separate ones. */
function joinCompetitionScores(competitionLabels: string[], scoreLabels: string[]): string {
  return joinAnd(competitionLabels.map((label, i) => `${label} (${scoreLabels[i]})`));
}

function marginLabel(margin: number, unit: "shot" | "point"): string {
  return `${margin} ${unit}${margin === 1 ? "" : "s"} behind the leader`;
}

/** Three or more shots under par, gross -- previously lumped in with eagle (grossRelative <= -2), now its own rarer, bigger story. `playingTough`, when true, cites the field's own average on this hole -- a real, checkable number, not a guess. */
export function albatrossCommentary(playerName: string, holeNumber: number, playingTough?: boolean): Commentary {
  const suffix = playingTough ? " It's been one of the toughest holes on the course today." : "";
  const headline = pick(["ALBATROSS!", `${playerName.split(" ").slice(-1)[0]} makes history`, "Once-in-a-lifetime"]);
  const body = pick([
    `${playerName} holes out for an albatross at the ${ordinal(holeNumber)} — a shot you might never see again.${suffix}`,
    `Extraordinary scenes at the ${ordinal(holeNumber)} — ${playerName} cards an albatross.${suffix}`,
    `${playerName} produces something truly special at the ${ordinal(holeNumber)}, three under the card in one.${suffix}`,
  ]);
  return { headline, body };
}

/** `playingTough`, when true, cites the field's own average on this hole -- a real, checkable number, not a guess. */
export function eagleCommentary(playerName: string, holeNumber: number, playingTough?: boolean): Commentary {
  const suffix = playingTough ? " It's been one of the toughest holes on the course today." : "";
  const headline = pick(["Eagle!", `${playerName.split(" ").slice(-1)[0]} soars`, "Two shots gone in one"]);
  const body = pick([
    `${playerName} rolls in an eagle at the ${ordinal(holeNumber)}. That's the shot of the day so far.${suffix}`,
    `A brilliant eagle from ${playerName} on the ${ordinal(holeNumber)} — two shots clawed back at a stroke.${suffix}`,
    `${playerName} finds something special at the ${ordinal(holeNumber)}, carding an eagle to light up the board.${suffix}`,
  ]);
  return { headline, body };
}

export function birdieCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Birdie", `${playerName.split(" ").slice(-1)[0]} makes a move`, "One back"]);
  const body = pick([
    `${playerName} rolls in a birdie at the ${ordinal(holeNumber)}.`,
    `${playerName} picks up a shot at the ${ordinal(holeNumber)}.`,
    `Good hole for ${playerName} — a birdie at the ${ordinal(holeNumber)} moves them the right way.`,
    `A shot gained for ${playerName} at the ${ordinal(holeNumber)}.`,
    `${playerName} goes one under at the ${ordinal(holeNumber)}.`,
  ]);
  return { headline, body };
}

/** Nett eagle-or-better -- two or more shots under par once handicap strokes are applied. Distinct
 * from the gross-based `eagleCommentary` (Scratch): this is a Main-competition story, so the copy
 * says "nett" explicitly to avoid reading as a second claim of the same gross feat. */
export function nettEagleCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Nett eagle!", `${playerName.split(" ").slice(-1)[0]} surges`, "Huge in the Main"]);
  const body = pick([
    `${playerName} cards a nett eagle at the ${ordinal(holeNumber)} — a huge move in the Main.`,
    `Two shots clawed back at the ${ordinal(holeNumber)}, nett, for ${playerName} — a real statement in the Main race.`,
    `${playerName} rockets up the Main leaderboard with a nett eagle at the ${ordinal(holeNumber)}.`,
  ]);
  return { headline, body };
}

export function bogeyCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Bogey", "Shot dropped", `${playerName.split(" ").slice(-1)[0]} slips`]);
  const body = pick([
    `${playerName} drops a shot at the ${ordinal(holeNumber)}.`,
    `A bogey at the ${ordinal(holeNumber)} for ${playerName}.`,
    `A shot lost for ${playerName} at the ${ordinal(holeNumber)}.`,
    `${playerName} goes one over at the ${ordinal(holeNumber)}.`,
  ]);
  return { headline, body };
}

/** Double bogey or worse, nett -- a bigger story than an ordinary bogey, so it's its own category rather than a copy variant inside bogeyCommentary. */
export function doubleBogeyCommentary(playerName: string, holeNumber: number, relativeToPar: number): Commentary {
  const headline = pick(["Dropped shots", `Trouble at the ${ordinal(holeNumber)}`]);
  const body = pick([
    `A difficult ${ordinal(holeNumber)} for ${playerName} — ${relativeToPar} over the hole, nett.`,
    `${playerName} finds trouble at the ${ordinal(holeNumber)}, dropping ${relativeToPar} shots.`,
    `Not the hole ${playerName} wanted at the ${ordinal(holeNumber)} — a costly one there.`,
  ]);
  return { headline, body };
}

export function leaderCommentary(playerName: string, scoreLabel: string, competitionLabel: string, thru?: string): Commentary {
  const suffix = thruSuffix(thru);
  const headline = pick(["New leader", `${playerName.split(" ").slice(-1)[0]} takes control`]);
  const body = pick([
    `${playerName} moves to the top of the ${competitionLabel} leaderboard at ${scoreLabel}${suffix}.`,
    `${playerName} now holds the outright lead in the ${competitionLabel} standings on ${scoreLabel}${suffix}.`,
    `A new name at the top — ${playerName} leads the ${competitionLabel} competition at ${scoreLabel}${suffix}.`,
  ]);
  return { headline, body };
}

/** Same real-world moment can cross the same threshold on Main, Stableford, and Scratch at once -- one merged post naming every board involved, instead of the same story told two or three times seconds apart. */
export function leaderCommentaryMulti(playerName: string, competitionLabels: string[], scoreLabels: string[], thru?: string): Commentary {
  const suffix = thruSuffix(thru);
  const list = joinCompetitionScores(competitionLabels, scoreLabels);
  const headline = pick(["New leader", `${playerName.split(" ").slice(-1)[0]} takes control`]);
  const body = pick([
    `${playerName} moves to the top of the ${list} leaderboards${suffix}.`,
    `A clean sweep at the top — ${playerName} now leads the ${list} standings${suffix}.`,
  ]);
  return { headline, body };
}

/** Fires once, when enough of the field has reached the turn. Every figure (leader, average,
 * challengers) is each player's own toPar through exactly hole 9, not their current standing --
 * see toParThroughHole in generate.ts for why that distinction matters for a field still spread
 * across different tee times. */
export function turnReportCommentary(leaderNames: string[], leaderToPar: number, fieldAverageToPar: number, challengerNames: string[]): Commentary {
  const leaders = joinNames(leaderNames);
  const leadWord = leaderNames.length > 1 ? "share the lead" : "leads";
  const lurkWord = challengerNames.length > 1 ? "lurk" : "lurks";
  const challengerClause = challengerNames.length > 0 ? ` ${joinNames(challengerNames)} ${lurkWord} within range.` : "";
  const headline = pick(["At the turn", "Front-nine picture"]);
  const body = pick([
    `At the turn, ${leaders} ${leadWord} the Main on ${formatToPar(leaderToPar)}, with the field averaging ${formatToPar(Math.round(fieldAverageToPar))} through the front nine.${challengerClause}`,
    `Front-nine picture: ${leaders} ${leadWord} at ${formatToPar(leaderToPar)}, the field averaging ${formatToPar(Math.round(fieldAverageToPar))} so far.${challengerClause}`,
  ]);
  return { headline, body };
}

export function competitionUnderwayCommentary(year: number, venueName: string): Commentary {
  const headline = pick(["Under way", "First balls down the fairway"]);
  const body = pick([
    `The first scores are on the board. The ${year} Legs Open is under way at ${venueName}.`,
    `First balls are down the fairway — the ${year} Legs Open gets under way at ${venueName}.`,
    `And we're off. The ${year} Legs Open begins at ${venueName}.`,
  ]);
  return { headline, body };
}

export function roundCompleteCommentary(playerName: string, toPar: number, position: number, tied: boolean): Commentary {
  const posLabel = `${tied ? "T" : ""}${position}`;
  const headline = pick(["In the clubhouse", `${playerName.split(" ").slice(-1)[0]} signs for the card`]);
  const body = pick([
    `${playerName} is in the clubhouse at ${formatToPar(toPar)}, sitting ${posLabel} on the leaderboard.`,
    `That's the card signed for ${playerName} — ${formatToPar(toPar)} for the round, currently ${posLabel}.`,
    `${playerName} finishes their round at ${formatToPar(toPar)} and moves to ${posLabel}.`,
  ]);
  return { headline, body };
}

export function lastGroupOutCommentary(venueName: string): Commentary {
  const headline = pick(["Last group out", "The whole field is out"]);
  const body = pick([
    `The final group has played their first hole — the entire field is now out on the course at ${venueName}.`,
    `Last tee time away and under way — every player is now out on the course.`,
    `The day's last group is off and running at ${venueName}. The whole field is in play.`,
  ]);
  return { headline, body };
}

export function movingUpCommentary(playerName: string): Commentary {
  const headline = pick(["Moving up", `${playerName.split(" ").slice(-1)[0]} on the move`, "Climbing"]);
  const body = pick([
    `${playerName} has gone under par on two straight holes — climbing the leaderboard.`,
    `Back-to-back birdies for ${playerName}, who's moving up the leaderboard.`,
    `Two in a row for ${playerName} — a real move up the standings.`,
    `${playerName} finds some form, under par on two in a row.`,
  ]);
  return { headline, body };
}

export function chargeCommentary(playerName: string, streak: number): Commentary {
  const headline = pick(["Making a charge", `${playerName.split(" ").slice(-1)[0]} is charging`]);
  const body = pick([
    `${playerName} has gone under par on ${streak} holes in a row — this is a real charge up the leaderboard.`,
    `${streak} straight holes under par for ${playerName}. They're making a serious charge.`,
    `${playerName} can't miss right now — ${streak} in a row and charging up the board.`,
  ]);
  return { headline, body };
}

/** Fires once, the hole a strict consecutive run first extends past chargeCommentary's 3 -- an escalation, not a replacement, so the copy should read as "still going", not restate the charge. */
export function hotStreakCommentary(playerName: string, streak: number): Commentary {
  const headline = pick(["Can't be stopped", `${playerName.split(" ").slice(-1)[0]} is on fire`, "Relentless"]);
  const body = pick([
    `${playerName} just keeps going — ${streak} holes in a row under par now, one of the great streaks of the day.`,
    `Still under par: ${playerName} has gone ${streak} straight holes now, a genuinely rare run.`,
    `${playerName} shows no sign of stopping — ${streak} in a row and counting.`,
  ]);
  return { headline, body };
}

/** Distinct from chargeCommentary -- that one asserts a strict consecutive run ("N straight holes"), which would be inaccurate for this looser "N birdies within the last `windowSize` holes" pattern (there may be a par mixed in). */
/** `birdieCount` actually counts birdie-OR-BETTER holes (an eagle in the window still counts), so
 * the copy deliberately says "sub-par holes" rather than "birdies" -- calling an eagle a birdie
 * would be a factual error, not just loose phrasing. */
export function birdieRunCommentary(playerName: string, birdieCount: number, windowSize: number): Commentary {
  const headline = pick(["Hot streak", `${playerName.split(" ").slice(-1)[0]} is heating up`]);
  const body = pick([
    `${playerName} has gone under par ${birdieCount} times in the last ${windowSize} holes — climbing fast.`,
    `${birdieCount} sub-par holes in the last ${windowSize} for ${playerName}. A real hot streak.`,
  ]);
  return { headline, body };
}

export function movingDownCommentary(playerName: string): Commentary {
  const headline = pick(["Moving down", `${playerName.split(" ").slice(-1)[0]} slips`]);
  const body = pick([
    `${playerName} has dropped shots on two straight holes — sliding back down the leaderboard.`,
    `Back-to-back bogeys for ${playerName}, who's slipping down the standings.`,
    `Two dropped in a row for ${playerName} — a costly spell.`,
  ]);
  return { headline, body };
}

export function troubleCommentary(playerName: string, streak: number): Commentary {
  const headline = pick(["Trouble", `${playerName.split(" ").slice(-1)[0]} in trouble`]);
  const body = pick([
    `${playerName} has dropped shots on ${streak} holes in a row — real trouble for them now.`,
    `${streak} straight holes over par for ${playerName}. This is turning into a difficult spell.`,
    `A tough stretch for ${playerName} — ${streak} in a row dropped.`,
  ]);
  return { headline, body };
}

export function leaderFaltersCommentary(playerName: string, streak: number): Commentary {
  const headline = pick(["Leader falters", `${playerName.split(" ").slice(-1)[0]} under pressure`]);
  const body = pick([
    `${playerName} has dropped shots on ${streak} straight holes coming down the stretch — the pressure is showing at the top.`,
    `Signs of nerves from the leader: ${playerName} has gone ${streak} holes in a row dropping shots as the finish nears.`,
    `${playerName}'s advantage is looking shaky — ${streak} dropped shots in a row in the closing holes.`,
  ]);
  return { headline, body };
}

/** Same idea as leaderFaltersCommentary but for a genuine challenger (within striking distance, not the outright leader) collapsing in the closing stretch -- names them specifically rather than a generic "moving down". */
export function challengeFaltersCommentary(playerName: string, streak: number): Commentary {
  const headline = pick(["Challenge falters", `${playerName.split(" ").slice(-1)[0]} fades`]);
  const body = pick([
    `${playerName}'s challenge is fading — ${streak} dropped shots in a row coming down the stretch.`,
    `The pressure tells on ${playerName}, who has gone ${streak} holes in a row dropping shots as the finish nears.`,
    `A real setback for ${playerName} — ${streak} straight holes lost in the closing stretch.`,
  ]);
  return { headline, body };
}

/** Fires at most once per player per championship, only when a defending champion's first hole of
 * their title defence is a par -- a birdie-or-better or bogey-or-worse first hole already gets its
 * own post via the normal per-hole categories, this only fills the gap when the scoreboard itself
 * has nothing to say. */
export function defendingChampionUnderwayCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Defending champion under way", `${playerName.split(" ").slice(-1)[0]} begins the defence`]);
  const body = pick([
    `Defending champion ${playerName} is under way, matching par at the ${ordinal(holeNumber)}.`,
    `${playerName}, defending the title, gets started with a par at the ${ordinal(holeNumber)}.`,
  ]);
  return { headline, body };
}

export function noReturnCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Picked up", `${playerName.split(" ").slice(-1)[0]} picks up`]);
  const body = pick([
    `${playerName} picks up at the ${ordinal(holeNumber)} and is out of the Main and Scratch competitions -- still live in the Stableford.`,
    `A no-return at the ${ordinal(holeNumber)} for ${playerName}, who's now out of contention for Main and Scratch -- the Stableford points keep counting.`,
  ]);
  return { headline, body };
}

export function playoffCommentary(names: string[], competitionLabel: string, scoreLabel: string): Commentary {
  const joined = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
  const headline = pick(["Playoff!", "It's a playoff"]);
  const body = pick([
    `${joined} are locked together at ${scoreLabel} after 18 holes — the ${competitionLabel} title goes to a playoff.`,
    `Level at the top on ${scoreLabel}. ${joined} will settle the ${competitionLabel} title on countback.`,
  ]);
  return { headline, body };
}

/** `margin` is shots behind the leader (0 for the leader themselves) -- covers both the leader's own checkpoint and a close follower's, since both now get the same single hole-10 report. */
export function throughCommentary(playerName: string, holesCompleted: number, toPar: number, margin: number, tied: boolean): Commentary {
  const headline = pick(["Through", `${playerName.split(" ").slice(-1)[0]}${margin === 0 ? " leads" : " stays close"}`]);
  const positionPhrase = margin === 0 ? (tied ? "shares the lead" : "leads") : `sits ${margin} shot${margin === 1 ? "" : "s"} back`;
  const body = pick([
    `${playerName} ${positionPhrase} through ${holesCompleted} at ${formatToPar(toPar)}.`,
    `Through ${holesCompleted} holes, ${playerName} ${positionPhrase} at ${formatToPar(toPar)}.`,
    `Checkpoint: ${playerName} ${positionPhrase} through ${holesCompleted}, at ${formatToPar(toPar)}.`,
    `${holesCompleted} down, ${18 - holesCompleted} to play — ${playerName} ${positionPhrase} at ${formatToPar(toPar)}.`,
  ]);
  return { headline, body };
}

export function tieCommentary(
  playerName: string,
  scoreLabel: string,
  competitionLabel: string,
  thru?: string,
  otherLeaderNames: string[] = [],
): Commentary {
  const suffix = thruSuffix(thru);
  const withOthers = otherLeaderNames.length > 0 ? ` with ${joinNames(otherLeaderNames)}` : "";
  const headline = pick(["Tie at the top", `${playerName.split(" ").slice(-1)[0]} draws level`, "Level at the summit"]);
  const body = pick([
    `${playerName} joins the lead in the ${competitionLabel} competition${withOthers} at ${scoreLabel}${suffix}.`,
    `We have a share of the lead — ${playerName} moves level at the top${withOthers} on ${scoreLabel}${suffix}.`,
    `${playerName} draws level at the summit of the ${competitionLabel} standings${withOthers}, on ${scoreLabel}${suffix}.`,
    `${playerName} catches up${withOthers} at the top of the ${competitionLabel} leaderboard, ${scoreLabel}${suffix}.`,
  ]);
  return { headline, body };
}

/** Merged tie post -- deliberately drops otherLeaderNames (unlike tieCommentary), since who else shares the lead can differ board to board and naming them here risks misattributing a co-leader to a board they aren't actually tied on. */
export function tieCommentaryMulti(playerName: string, competitionLabels: string[], scoreLabels: string[], thru?: string): Commentary {
  const suffix = thruSuffix(thru);
  const list = joinCompetitionScores(competitionLabels, scoreLabels);
  const headline = pick(["Tie at the top", `${playerName.split(" ").slice(-1)[0]} draws level`]);
  const body = pick([
    `${playerName} draws level at the top of the ${list} leaderboards${suffix}.`,
    `A share of the lead on multiple boards — ${playerName} moves level in the ${list} standings${suffix}.`,
  ]);
  return { headline, body };
}

export function leadExtendsCommentary(playerName: string, leadMargin: number, competitionLabel: string, thru?: string): Commentary {
  const suffix = thruSuffix(thru);
  const headline = pick(["Advantage grows", `${playerName.split(" ").slice(-1)[0]} pulls clear`, "Stretching away"]);
  const body = pick([
    `${playerName} extends the ${competitionLabel} lead to ${leadMargin}${suffix}.`,
    `The gap grows — ${playerName} now leads by ${leadMargin} in the ${competitionLabel} competition${suffix}.`,
    `${playerName} stretches clear at the top, the lead now out to ${leadMargin}${suffix}.`,
    `${playerName} opens up some daylight, the ${competitionLabel} lead now ${leadMargin}${suffix}.`,
  ]);
  return { headline, body };
}

export function leadExtendsCommentaryMulti(playerName: string, competitionLabels: string[], leadMargins: number[], thru?: string): Commentary {
  const suffix = thruSuffix(thru);
  const list = joinAnd(competitionLabels.map((label, i) => `${label} (by ${leadMargins[i]})`));
  const headline = pick(["Advantage grows", `${playerName.split(" ").slice(-1)[0]} pulls clear`]);
  const body = pick([
    `${playerName} extends the lead across the ${list} competitions${suffix}.`,
    `The gap grows on multiple boards — ${playerName} stretches clear in the ${list} competitions${suffix}.`,
  ]);
  return { headline, body };
}

export function enteringContentionCommentary(
  playerName: string,
  competitionLabel: string,
  margin: number,
  unit: "shot" | "point",
  thru?: string,
): Commentary {
  const detail = ` They lie ${marginLabel(margin, unit)}${thruSuffix(thru)}.`;
  const headline = pick(["Into contention", `${playerName.split(" ").slice(-1)[0]} joins the race`, "In the mix"]);
  const body = pick([
    `${playerName} moves into the ${competitionLabel} race.${detail}`,
    `${playerName} is now firmly in contention in the ${competitionLabel} competition.${detail}`,
    `A real move — ${playerName} climbs into the ${competitionLabel} race.${detail}`,
    `${playerName} is right in the mix in the ${competitionLabel} competition now.${detail}`,
  ]);
  return { headline, body };
}

export function enteringContentionCommentaryMulti(
  playerName: string,
  competitionLabels: string[],
  margins: number[],
  units: ("shot" | "point")[],
  thru?: string,
): Commentary {
  const list = joinAnd(competitionLabels.map((label, i) => `${label} (${marginLabel(margins[i], units[i])})`));
  const suffix = thruSuffix(thru);
  const headline = pick(["Into contention", `${playerName.split(" ").slice(-1)[0]} joins the race`]);
  const body = pick([
    `${playerName} moves into contention across the ${list}${suffix}.`,
    `A real move — ${playerName} climbs into contention in the ${list}${suffix}.`,
  ]);
  return { headline, body };
}

export function leavingContentionCommentary(
  playerName: string,
  competitionLabel: string,
  margin: number,
  unit: "shot" | "point",
  thru?: string,
): Commentary {
  const detail = ` They're now ${marginLabel(margin, unit)}${thruSuffix(thru)}.`;
  const headline = pick(["Pressure eases", `${playerName.split(" ").slice(-1)[0]} drops back`, "Falling away"]);
  const body = pick([
    `${playerName} drops outside the ${competitionLabel} race.${detail}`,
    `${playerName} slips out of contention in the ${competitionLabel} competition.${detail}`,
    `The gap tells — ${playerName} falls back from the ${competitionLabel} race.${detail}`,
    `${playerName} loses touch with the ${competitionLabel} lead.${detail}`,
  ]);
  return { headline, body };
}

export function leavingContentionCommentaryMulti(
  playerName: string,
  competitionLabels: string[],
  margins: number[],
  units: ("shot" | "point")[],
  thru?: string,
): Commentary {
  const list = joinAnd(competitionLabels.map((label, i) => `${label} (${marginLabel(margins[i], units[i])})`));
  const suffix = thruSuffix(thru);
  const headline = pick(["Pressure eases", `${playerName.split(" ").slice(-1)[0]} drops back`]);
  const body = pick([
    `${playerName} drops out of contention across the ${list}${suffix}.`,
    `The gap tells — ${playerName} falls back from the ${list}${suffix}.`,
  ]);
  return { headline, body };
}

export function bogeyMissLabel(relativeToPar: number): string | undefined {
  if (relativeToPar === 2) return "double bogey";
  if (relativeToPar === 3) return "triple bogey";
  if (relativeToPar >= 4) return "big number";
  return undefined;
}

/** Mirrors bogeyMissLabel for the positive direction -- names the hole result (nett) behind a big
 * climb up the board, the same way bogeyMissLabel names the result behind a big drop. */
export function birdieGainLabel(relativeToPar: number): string | undefined {
  if (relativeToPar === -1) return "birdie";
  if (relativeToPar <= -2) return "nett eagle";
  return undefined;
}

export function aceCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["HOLE IN ONE!", `${playerName.split(" ").slice(-1)[0]} makes an ace`]);
  const body = pick([
    `${playerName} holes it straight from the tee at the ${ordinal(holeNumber)} — a hole in one!`,
    `Incredible scenes at the ${ordinal(holeNumber)} — ${playerName} makes an ace.`,
  ]);
  return { headline, body };
}

/** `gainLabel`/`gainHole` (from birdieGainLabel + the actual hole that produced this save's best
 * nett result), when known, name what caused the move -- matches bigDropCommentary naming the
 * mistake behind a fall. Omitted when the move spans a save with no single clear cause (e.g. a
 * position change with nothing better than par this save). */
export function enterTopCommentary(playerName: string, topN: number, position: number, gainLabel?: string, gainHole?: number): Commentary {
  const cause = gainLabel && gainHole ? ` after a ${gainLabel} at the ${ordinal(gainHole)}` : "";
  const headline = pick([`Into the top ${topN}`, `${playerName.split(" ").slice(-1)[0]} breaks into the top ${topN}`]);
  const body = pick([
    `${playerName} moves into the top ${topN}${cause}, up to ${ordinal(position)}.`,
    `A big move — ${playerName} climbs into the top ${topN} at ${ordinal(position)}${cause}.`,
  ]);
  return { headline, body };
}

export function bigGainCommentary(playerName: string, positionsGained: number, position: number, gainLabel?: string, gainHole?: number): Commentary {
  const cause = gainLabel && gainHole ? ` with a ${gainLabel} at the ${ordinal(gainHole)}` : "";
  const headline = pick(["Big mover", `${playerName.split(" ").slice(-1)[0]} surges up the board`]);
  const body = pick([
    `${playerName} climbs ${positionsGained} places to ${ordinal(position)}${cause}.`,
    `A real surge — ${playerName} moves up ${positionsGained} spots to ${ordinal(position)}${cause}.`,
  ]);
  return { headline, body };
}

/** `missLabel` (e.g. "double bogey"), when known, names the mistake that caused the fall -- matches the pattern the field's example used ("A costly double bogey drops ... from second to eighth."). `missHole`, when also known, names where. */
export function bigDropCommentary(playerName: string, beforePosition: number, afterPosition: number, missLabel?: string, missHole?: number): Commentary {
  const fromTo = `from ${ordinal(beforePosition)} to ${ordinal(afterPosition)}`;
  const at = missHole ? ` at the ${ordinal(missHole)}` : "";
  const headline = pick(["Costly spell", `${playerName.split(" ").slice(-1)[0]} slips back`]);
  const body = missLabel
    ? pick([`A costly ${missLabel}${at} drops ${playerName} ${fromTo}.`, `${playerName} tumbles ${fromTo} after a ${missLabel}${at}.`])
    : pick([`${playerName} slips ${fromTo} after a tough stretch.`, `A difficult spell sees ${playerName} fall ${fromTo}.`]);
  return { headline, body };
}

/** Fires on entry to holes 16-18, not just the 18th -- copy deliberately stays general ("the
 * closing holes of the championship") rather than naming one exact hole, so it never risks reading
 * as inaccurate whichever of the three holes triggered it. */
export function pressureMomentCommentary(playerName: string, margin: number, unit: "shot" | "point", competitionLabel: string): Commentary {
  const marginLabel = margin === 0 ? `level with the lead` : `${margin} ${unit}${margin === 1 ? "" : "s"} off the lead`;
  const headline = pick(["Pressure moment", `${playerName.split(" ").slice(-1)[0]} enters the closing stretch`]);
  const body = pick([
    `${playerName} reaches the closing holes of the championship ${marginLabel} in the ${competitionLabel} competition.`,
    `Into the closing holes of the championship for ${playerName}, ${marginLabel}.`,
  ]);
  return { headline, body };
}

/** `playoffDetail`, when supplied (e.g. "beating Bobby Ferguson on countback, -2 to E"), is appended so the result post names who was beaten and how -- not just that a title was won. */
export function winnerConfirmedCommentary(playerName: string, competitionLabel: string, scoreLabel: string, playoffDetail?: string): Commentary {
  const headline = pick(["Champion confirmed", `${playerName.split(" ").slice(-1)[0]} takes the title`]);
  const suffix = playoffDetail ? ` ${playoffDetail}` : "";
  const body = pick([
    `With the field home, ${playerName} is confirmed as the ${competitionLabel} winner on ${scoreLabel}.${suffix}`,
    `${playerName} has won the ${competitionLabel} competition, finishing on ${scoreLabel}.${suffix}`,
    `That's the competition decided — ${playerName} is champion of the ${competitionLabel} on ${scoreLabel}.${suffix}`,
  ]);
  return { headline, body };
}

export function clubhouseLeaderCommentary(playerName: string, toPar: number): Commentary {
  const headline = pick(["Clubhouse leader", `${playerName.split(" ").slice(-1)[0]} sets the target`]);
  const body = pick([
    `${playerName} is the new clubhouse leader at ${formatToPar(toPar)} — the target for those still out on the course.`,
    `${playerName} posts ${formatToPar(toPar)} to take over as clubhouse leader.`,
    `That's the new mark to beat — ${playerName} leads the clubhouse at ${formatToPar(toPar)}.`,
  ]);
  return { headline, body };
}

/** Mirrors clubhouseLeaderCommentary but for gross/Scratch -- the tournament's best gross round so far, live. */
export function bestGrossRoundCommentary(playerName: string, toPar: number): Commentary {
  const headline = pick(["Best of the day (gross)", `${playerName.split(" ").slice(-1)[0]} sets the Scratch target`]);
  const body = pick([
    `${playerName} posts the lowest gross round of the day so far, ${formatToPar(toPar)} — the new Scratch target.`,
    `That's the new mark to beat, gross — ${playerName} leads the Scratch clubhouse at ${formatToPar(toPar)}.`,
    `${playerName} sets the pace on gross scoring, in at ${formatToPar(toPar)}.`,
  ]);
  return { headline, body };
}

/** All-time course record, not just the day's best (see bestGrossRoundCommentary for that) -- the
 * lowest gross round ever played at this venue, across every championship held there. "Ahead of
 * pace" is a true statement about their position against a real historical figure at the same
 * point in the round, not a prediction dressed as fact -- it never claims they will break it. */
export function courseRecordPaceCommentary(playerName: string, venueName: string, holesCompleted: number, recordGrossTotal: number, recordHolderName: string, recordYear: number): Commentary {
  const headline = pick(["Record pace", `${playerName.split(" ").slice(-1)[0]} chasing history`, "Course record in sight"]);
  const body = pick([
    `${playerName} is ahead of course-record pace at ${venueName} through ${holesCompleted} holes — ${recordHolderName} holds the mark, a gross ${recordGrossTotal} set in ${recordYear}.`,
    `Keep an eye on ${playerName} — they're tracking inside the course record through ${holesCompleted} holes. ${recordHolderName}'s ${recordGrossTotal} from ${recordYear} is the one to catch.`,
    `${playerName} is on course-record pace at ${venueName}, ${holesCompleted} holes in. The mark to beat: a gross ${recordGrossTotal}, set by ${recordHolderName} in ${recordYear}.`,
  ]);
  return { headline, body };
}

/** Largest lead ever held by any player, at any point in a round, across championship history --
 * mirrors the Records page's "Largest lead by any player". Fires once, the save a live lead first
 * clears the all-time mark (see the LARGEST_LEAD gating in generate.ts). */
export function recordLeadCommentary(playerName: string, margin: number, previousHolderName: string, previousYear: number): Commentary {
  const shots = `${margin} shot${margin === 1 ? "" : "s"}`;
  const headline = pick(["Record lead", `${playerName.split(" ").slice(-1)[0]} out in front like never before`, "Biggest lead in championship history"]);
  const body = pick([
    `${playerName} now holds the biggest lead in championship history — ${shots} clear. The previous mark was ${previousHolderName}'s lead in ${previousYear}.`,
    `A lead like no other — ${playerName} is ${shots} clear at the top, beyond anything seen before. ${previousHolderName} held the previous record, set in ${previousYear}.`,
  ]);
  return { headline, body };
}

/** Biggest winning margin ever recorded -- mirrors "Largest margin of victory". */
export function recordMarginCommentary(playerName: string, margin: number, previousHolderName: string, previousYear: number): Commentary {
  const shots = `${margin} shot${margin === 1 ? "" : "s"}`;
  const headline = pick(["Record winning margin", `${playerName.split(" ").slice(-1)[0]} wins like no one before`]);
  const body = pick([
    `${playerName} wins by ${shots} — the largest winning margin in championship history. The previous record was set by ${previousHolderName} in ${previousYear}.`,
    `A record-breaking margin of victory — ${playerName} takes the title by ${shots}, beating ${previousHolderName}'s ${previousYear} mark.`,
  ]);
  return { headline, body };
}

/** Lowest winning total ever recorded -- mirrors "Lowest winning total in relation to par" / "Lowest score in a round by a champion". */
export function recordLowScoreCommentary(playerName: string, toPar: number, previousHolderName: string, previousYear: number): Commentary {
  const headline = pick(["Record winning score", `${playerName.split(" ").slice(-1)[0]} sets a new mark`]);
  const body = pick([
    `${playerName} wins on ${formatToPar(toPar)} — the lowest winning total in championship history. The previous record was ${previousHolderName}'s, in ${previousYear}.`,
    `A new record winning score — ${playerName} takes the title on ${formatToPar(toPar)}, beating the mark ${previousHolderName} set in ${previousYear}.`,
  ]);
  return { headline, body };
}

export function courseRecordCommentary(playerName: string, venueName: string, grossTotal: number, grossToPar: number, previousHolderName: string, previousYear: number, tied: boolean): Commentary {
  const headline = pick(
    tied
      ? ["Course record equalled", `${playerName.split(" ").slice(-1)[0]} matches the mark`]
      : ["NEW COURSE RECORD!", `${playerName.split(" ").slice(-1)[0]} makes history`, "Record broken"],
  );
  const body = pick(
    tied
      ? [
          `${playerName} matches the lowest round ever recorded at ${venueName}, a gross ${grossTotal} (${formatToPar(grossToPar)}) — level with ${previousHolderName}'s ${previousYear} mark.`,
          `${playerName} equals the course record at ${venueName} — a gross ${grossTotal}, matching ${previousHolderName}'s round from ${previousYear}.`,
        ]
      : [
          `${playerName} breaks the course record at ${venueName} — a gross ${grossTotal} (${formatToPar(grossToPar)}). The previous mark was set by ${previousHolderName} in ${previousYear}.`,
          `A new course record at ${venueName} — ${playerName} closes with a gross ${grossTotal}, going past ${previousHolderName}'s ${previousYear} mark.`,
          `History at ${venueName}: ${playerName} posts a gross ${grossTotal}, the lowest round ever recorded there, ahead of ${previousHolderName}'s ${previousYear} mark.`,
        ],
  );
  return { headline, body };
}
