import type { TeeTimeRound } from "@/types/championship";
import { PLAYERS } from "@/data/players";


export const TEE_TIMES: TeeTimeRound[] = [
  {
    round: 1,
    day: "Thursday",
    date: "16 July 2026",
    groups: [
      { time: "06:35", tee: "1st", players: [PLAYERS[17], PLAYERS[10]] },
      { time: "06:46", tee: "1st", players: [PLAYERS[15], PLAYERS[5], PLAYERS[13]] },
      { time: "07:08", tee: "1st", players: [PLAYERS[8], PLAYERS[2], PLAYERS[19]] },
      { time: "12:20", tee: "1st", players: [PLAYERS[0], PLAYERS[6], PLAYERS[8]] },
      { time: "12:31", tee: "1st", players: [PLAYERS[1], PLAYERS[3], PLAYERS[9]] },
      { time: "06:35", tee: "10th", players: [PLAYERS[4], PLAYERS[12]] },
      { time: "06:46", tee: "10th", players: [PLAYERS[7], PLAYERS[14], PLAYERS[16]] },
    ],
  },
  {
    round: 2,
    day: "Friday",
    date: "17 July 2026",
    groups: [
      { time: "06:35", tee: "10th", players: [PLAYERS[17], PLAYERS[10]] },
      { time: "06:46", tee: "10th", players: [PLAYERS[15], PLAYERS[5], PLAYERS[13]] },
      { time: "12:20", tee: "10th", players: [PLAYERS[0], PLAYERS[6], PLAYERS[8]] },
      { time: "12:31", tee: "10th", players: [PLAYERS[1], PLAYERS[3], PLAYERS[9]] },
    ],
  },
  {
    round: 3,
    day: "Saturday",
    date: "18 July 2026",
    groups: [
      { time: "08:30", tee: "1st", players: [PLAYERS[9], PLAYERS[10]] },
      { time: "08:41", tee: "1st", players: [PLAYERS[3], PLAYERS[13]] },
      { time: "13:15", tee: "1st", players: [PLAYERS[6], PLAYERS[8]] },
      { time: "13:26", tee: "1st", players: [PLAYERS[0], PLAYERS[15]] },
    ],
  },
  {
    round: 4,
    day: "Sunday",
    date: "19 July 2026",
    groups: [
      { time: "09:00", tee: "1st", players: [PLAYERS[9], PLAYERS[13]] },
      { time: "09:11", tee: "1st", players: [PLAYERS[3], PLAYERS[8]] },
      { time: "13:45", tee: "1st", players: [PLAYERS[6], PLAYERS[15]] },
      { time: "13:56", tee: "1st", players: [PLAYERS[0], PLAYERS[12]] },
    ],
  },
];
