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
  const headline = pick(["Round complete", `${playerName.split(" ").slice(-1)[0]} signs for the card`]);
  const body = pick([
    `${playerName} completes the round at ${formatToPar(toPar)}, sitting ${posLabel} on the leaderboard.`,
    `That's the card signed for ${playerName} — ${formatToPar(toPar)} for the round, currently ${posLabel}.`,
    `${playerName} finishes their round at ${formatToPar(toPar)} and moves to ${posLabel}.`,
  ]);
  return { headline, body };
}
