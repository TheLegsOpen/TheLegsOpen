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

export function eagleCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Eagle!", `${playerName.split(" ").slice(-1)[0]} soars`, "Two shots gone in one"]);
  const body = pick([
    `${playerName} rolls in an eagle at the ${ordinal(holeNumber)}. That's the shot of the day so far.`,
    `A brilliant eagle from ${playerName} on the ${ordinal(holeNumber)} — two shots clawed back at a stroke.`,
    `${playerName} finds something special at the ${ordinal(holeNumber)}, carding an eagle to light up the board.`,
  ]);
  return { headline, body };
}

export function birdieCommentary(playerName: string, holeNumber: number): Commentary {
  const headline = pick(["Birdie", `${playerName.split(" ").slice(-1)[0]} makes a move`, "Under the card"]);
  const body = pick([
    `${playerName} rolls in a birdie at the ${ordinal(holeNumber)}.`,
    `A confident putt drops for ${playerName} at the ${ordinal(holeNumber)} — birdie there.`,
    `${playerName} picks up a shot at the ${ordinal(holeNumber)}, the putt never in doubt.`,
    `Good hole for ${playerName} — a birdie at the ${ordinal(holeNumber)} moves them the right way.`,
  ]);
  return { headline, body };
}

export function bogeyCommentary(playerName: string, holeNumber: number, relativeToPar: number): Commentary {
  const isDouble = relativeToPar >= 2;
  const headline = isDouble ? pick(["Dropped shots", "Trouble at the last"]) : pick(["Bogey", "Shot dropped"]);
  const body = isDouble
    ? pick([
        `A difficult ${ordinal(holeNumber)} for ${playerName} — ${relativeToPar} over the hole.`,
        `${playerName} finds trouble at the ${ordinal(holeNumber)}, dropping ${relativeToPar} shots.`,
        `Not the hole ${playerName} wanted at the ${ordinal(holeNumber)} — a costly one there.`,
      ])
    : pick([
        `${playerName} drops a shot at the ${ordinal(holeNumber)}.`,
        `A bogey at the ${ordinal(holeNumber)} for ${playerName}.`,
        `${playerName} can't get up and down at the ${ordinal(holeNumber)} — one shot gone.`,
      ]);
  return { headline, body };
}

export function leaderCommentary(playerName: string, scoreLabel: string, competitionLabel: string): Commentary {
  const headline = pick(["New leader", `${playerName.split(" ").slice(-1)[0]} takes control`]);
  const body = pick([
    `${playerName} moves to the top of the ${competitionLabel} leaderboard at ${scoreLabel}.`,
    `${playerName} now holds the outright lead in the ${competitionLabel} standings on ${scoreLabel}.`,
    `A new name at the top — ${playerName} leads the ${competitionLabel} competition at ${scoreLabel}.`,
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
  const headline = pick(["Moving up", `${playerName.split(" ").slice(-1)[0]} on the move`]);
  const body = pick([
    `${playerName} has gone under par on two straight holes — climbing the leaderboard.`,
    `Back-to-back birdies for ${playerName}, who's moving up the leaderboard.`,
    `Two in a row for ${playerName} — a real move up the standings.`,
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

export function leaderThroughCommentary(playerName: string, holesCompleted: number, toPar: number, tied: boolean): Commentary {
  const headline = pick(["Through", `${playerName.split(" ").slice(-1)[0]} leads`]);
  const shareWord = tied ? "shares the lead" : "leads";
  const body = pick([
    `${playerName} ${shareWord} through ${holesCompleted} at ${formatToPar(toPar)}.`,
    `Through ${holesCompleted} holes, ${playerName} ${shareWord} at ${formatToPar(toPar)}.`,
  ]);
  return { headline, body };
}

export function tieCommentary(playerName: string, scoreLabel: string, competitionLabel: string): Commentary {
  const headline = pick(["Tie at the top", `${playerName.split(" ").slice(-1)[0]} draws level`]);
  const body = pick([
    `${playerName} joins the lead in the ${competitionLabel} competition at ${scoreLabel}.`,
    `We have a share of the lead — ${playerName} moves level at the top on ${scoreLabel}.`,
    `${playerName} draws level at the summit of the ${competitionLabel} standings, ${scoreLabel}.`,
  ]);
  return { headline, body };
}

export function leadExtendsCommentary(playerName: string, leadMargin: number, competitionLabel: string): Commentary {
  const headline = pick(["Advantage grows", `${playerName.split(" ").slice(-1)[0]} pulls clear`]);
  const body = pick([
    `${playerName} extends the ${competitionLabel} lead to ${leadMargin} with a strong spell.`,
    `The gap grows — ${playerName} now leads by ${leadMargin} in the ${competitionLabel} competition.`,
    `${playerName} stretches clear at the top, the lead now out to ${leadMargin}.`,
  ]);
  return { headline, body };
}

export function enteringContentionCommentary(playerName: string, competitionLabel: string): Commentary {
  const headline = pick(["Into contention", `${playerName.split(" ").slice(-1)[0]} joins the race`]);
  const body = pick([
    `${playerName} moves into the ${competitionLabel} race after a strong spell of holes.`,
    `${playerName} is now firmly in contention in the ${competitionLabel} competition.`,
    `A real move — ${playerName} climbs into the ${competitionLabel} race.`,
  ]);
  return { headline, body };
}

export function leavingContentionCommentary(playerName: string, competitionLabel: string): Commentary {
  const headline = pick(["Pressure eases", `${playerName.split(" ").slice(-1)[0]} drops back`]);
  const body = pick([
    `${playerName} drops outside the ${competitionLabel} race after a difficult spell.`,
    `${playerName} slips out of contention in the ${competitionLabel} competition.`,
    `The gap tells — ${playerName} falls back from the ${competitionLabel} race.`,
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
