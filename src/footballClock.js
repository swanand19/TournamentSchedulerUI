// The football clock, read from the match's timestamps: shared by the scorer's console and the
// watcher's screen so both tick the same. Some server times arrive without a "Z" — they are UTC.

export function parseUtc(dateString) {
  if (!dateString) return null;
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(dateString);
  return new Date(hasTz ? dateString : dateString + "Z");
}

export function formatStopwatch(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Regulation length of a given period — extra-time halves are usually shorter than regulation ones.
export function periodMinutes(match, period) {
  if (period <= 2) return match.minutesPerHalf || 0;
  return match.extraTimeMinutesPerHalf || match.minutesPerHalf || 0;
}

export function priorPeriodsMinutes(match) {
  let total = 0;
  for (let p = 1; p < match.currentHalf; p++) total += periodMinutes(match, p);
  return total;
}

/** Seconds played in the current period, less every pause (including one still going). */
export function periodSeconds(match, now = Date.now()) {
  if (!match.halfStartedAt) return 0;
  const started = parseUtc(match.halfStartedAt).getTime();
  const activePause = match.pausedAt ? now - parseUtc(match.pausedAt).getTime() : 0;
  return Math.max(0, Math.floor((now - started - (match.pausedDurationMs || 0) - activePause) / 1000));
}
