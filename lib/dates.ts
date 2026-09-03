import type { IsoDay } from "@/types/plant";

/**
 * Calendar-day arithmetic.
 *
 * Rule: every day computation goes through Date.UTC. UTC has no DST, so
 * (a - b) / MS_PER_DAY is an exact integer day count. Local Date is used in
 * exactly one place — todayIsoDay(), reading today off the wall clock.
 *
 * Two bugs this avoids, both reproduced in Europe/Berlin:
 *   new Date(2026,9,5,0,30).toISOString().slice(0,10) === "2026-10-04"
 *     -> marking a plant watered at 00:30 would record yesterday.
 *   (new Date(2026,2,30) - new Date(2026,2,29)) / 86400000 === 0.958
 *     -> Math.floor gives 0, so an overdue plant silently isn't.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Today in the user's local zone. Never toISOString() — that yields the UTC day. */
export function todayIsoDay(now: Date = new Date()): IsoDay {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Shape check plus a real-calendar check, so "2026-02-30" is rejected. */
export function isIsoDay(value: unknown): value is IsoDay {
  if (typeof value !== "string" || !ISO_DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isoDayToUtcMs(day: IsoDay): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToIsoDay(ms: number): IsoDay {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/**
 * Calendar days added. addDays("2026-03-29", 1) === "2026-03-30" even though
 * that local day is only 23 hours long in Europe/Berlin.
 */
export function addDays(day: IsoDay, delta: number): IsoDay {
  return utcMsToIsoDay(isoDayToUtcMs(day) + delta * MS_PER_DAY);
}

/** Signed calendar days from `from` to `to`. Exact integer, no rounding needed. */
export function daysBetween(from: IsoDay, to: IsoDay): number {
  return (isoDayToUtcMs(to) - isoDayToUtcMs(from)) / MS_PER_DAY;
}

/**
 * timeZone: "UTC" is required. Without it a UTC-midnight instant renders as the
 * previous day in western zones, reintroducing the off-by-one at the display layer.
 */
export function formatIsoDay(
  day: IsoDay,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Date(isoDayToUtcMs(day)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

/** "today" | "yesterday" | "3 days ago" | "in 5 days" */
export function relativeDayLabel(day: IsoDay, today: IsoDay): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return "today";
  if (diff === -1) return "yesterday";
  if (diff === 1) return "tomorrow";
  if (diff < 0) return `${-diff} days ago`;
  return `in ${diff} days`;
}
