import {
  addDays,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  daysBetween,
} from "@/lib/dates";
import {
  DEFAULT_INTERVAL_DAYS,
  DUE_SOON_WINDOW_DAYS,
  MAX_INTERVAL_DAYS,
  MIN_INTERVAL_DAYS,
} from "@/lib/constants";
import {
  CARE_ACTIONS,
  type CareActionId,
  type CarePlan,
  type CareState,
  type IsoDay,
  type Plant,
} from "@/types/plant";

/** A fresh care plan with every action seeded at the default interval. */
export function createCarePlan(
  intervals?: Partial<Record<CareActionId, number>>,
): CarePlan {
  return Object.fromEntries(
    CARE_ACTIONS.map((action) => [
      action,
      {
        lastDone: null,
        intervalDays: clampInterval(
          intervals?.[action] ?? DEFAULT_INTERVAL_DAYS,
        ),
      },
    ]),
  ) as CarePlan;
}

/** Rounds to a whole number of days and clamps into the allowed range. */
export function clampInterval(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_INTERVAL_DAYS;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, Math.round(days)));
}

export type DueStatus = "never" | "overdue" | "due" | "soon" | "ok";

export interface CareStatus {
  action: CareActionId;
  lastDone: IsoDay | null;
  intervalDays: number;
  /** null iff the action has never been done. */
  dueDate: IsoDay | null;
  /** Negative = overdue, 0 = due today. null iff never done. */
  daysUntilDue: number | null;
  status: DueStatus;
}

/** Most urgent first. Drives both the badge colour and the card ordering. */
const SEVERITY: Record<DueStatus, number> = {
  never: 0,
  overdue: 1,
  due: 2,
  soon: 3,
  ok: 4,
};

export function computeCareStatus(
  action: CareActionId,
  care: CareState,
  today: IsoDay,
): CareStatus {
  if (care.lastDone === null) {
    return {
      action,
      lastDone: null,
      intervalDays: care.intervalDays,
      dueDate: null,
      daysUntilDue: null,
      status: "never",
    };
  }

  const dueDate = addDays(care.lastDone, care.intervalDays);
  const daysUntilDue = daysBetween(today, dueDate);

  let status: DueStatus;
  if (daysUntilDue < 0) status = "overdue";
  else if (daysUntilDue === 0) status = "due";
  else if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) status = "soon";
  else status = "ok";

  return {
    action,
    lastDone: care.lastDone,
    intervalDays: care.intervalDays,
    dueDate,
    daysUntilDue,
    status,
  };
}

export function computePlantStatus(
  plant: Plant,
  today: IsoDay,
): { statuses: CareStatus[]; worst: DueStatus } {
  const statuses = CARE_ACTIONS.map((action) =>
    computeCareStatus(action, plant.care[action], today),
  );
  const worst = statuses.reduce<DueStatus>(
    (acc, s) => (SEVERITY[s.status] < SEVERITY[acc] ? s.status : acc),
    "ok",
  );
  return { statuses, worst };
}

/** Never-done and overdue plants float to the top; alphabetical breaks ties. */
export function sortPlantsByUrgency(
  plants: readonly Plant[],
  today: IsoDay,
): Plant[] {
  return [...plants]
    .map((plant) => {
      const { statuses, worst } = computePlantStatus(plant, today);
      const soonest = statuses.reduce<number>(
        (acc, s) => (s.daysUntilDue !== null && s.daysUntilDue < acc ? s.daysUntilDue : acc),
        Number.POSITIVE_INFINITY,
      );
      return { plant, worst, soonest };
    })
    .sort(
      (a, b) =>
        SEVERITY[a.worst] - SEVERITY[b.worst] ||
        a.soonest - b.soonest ||
        a.plant.name.localeCompare(b.plant.name),
    )
    .map((entry) => entry.plant);
}

/**
 * Interval entry units. Intervals are always *stored* in days — the unit is
 * only how the number was typed, so nothing here reaches localStorage.
 *
 * The conversion factors are the same constants the display formatter uses, so
 * a schedule entered as "2 months" reads back as "2mo" rather than drifting to
 * something like "1.9mo".
 */
export const INTERVAL_UNITS = ["days", "months", "years"] as const;

export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

const UNIT_DAYS: Readonly<Record<IntervalUnit, number>> = Object.freeze({
  days: 1,
  months: DAYS_PER_MONTH,
  years: DAYS_PER_YEAR,
});

export function unitToDays(value: number, unit: IntervalUnit): number {
  return value * UNIT_DAYS[unit];
}

export function daysToUnit(days: number, unit: IntervalUnit): number {
  return days / UNIT_DAYS[unit];
}

/** Keeps the number input's max meaningful: 3650 days, 121 months, 10 years. */
export function maxValueForUnit(unit: IntervalUnit): number {
  return Math.floor(MAX_INTERVAL_DAYS / UNIT_DAYS[unit]);
}

/**
 * The unit a stored interval was most likely typed in, so reopening the dialog
 * shows "2 months" rather than "60 days".
 *
 * Only exact multiples qualify. 45 days stays 45 days rather than being
 * rounded into "1.5 months" — the form is where values are set, so it must
 * never quietly change one just by being opened.
 */
export function bestUnitFor(days: number): IntervalUnit {
  if (days % DAYS_PER_YEAR === 0) return "years";
  if (days > DAYS_PER_MONTH && days % DAYS_PER_MONTH === 0) return "months";
  return "days";
}
