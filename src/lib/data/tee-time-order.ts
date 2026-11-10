// No Payload import, so client components (the leaderboard rail) can sort tee times too.

/** "12.00" or "08:12" -> minutes since midnight, for sorting not-yet-started players by tee time. Unparsable sorts last. */
export function parseTeeTimeMinutes(time: string): number {
  const match = time.match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  // Tee times are entered on a 12-hour clock with no am/pm ("11.53", then "12.05", then "1.05"),
  // so an afternoon group parses as 1am and sorts above the morning. Hours 1-6 are read as
  // afternoon, 7-12 as morning: that covers a sheet running 7am to 6.59pm, which is every
  // realistic one. A 6am tee time would read as 6pm -- the single case this gets wrong, and much
  // the less likely of the two.
  const hour24 = hour >= 1 && hour <= 6 ? hour + 12 : hour;
  return hour24 * 60 + minute;
}
