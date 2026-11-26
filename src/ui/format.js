// Small display helpers shared by the frame and the lists.

/** "12 Oct" / "12 Oct 2027" from "YYYY-MM-DD", without time-zone surprises. */
export function shortDay(iso, withYear) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

/** "25 Oct – 6 Dec 2026", or null before the dates are chosen. */
export function dateRange(t) {
  if (!t?.startDate || !t?.endDate) return null;
  const sameYear = t.startDate.slice(0, 4) === t.endDate.slice(0, 4);
  return t.startDate === t.endDate ? shortDay(t.startDate, true) : `${shortDay(t.startDate, !sameYear)} – ${shortDay(t.endDate, true)}`;
}
