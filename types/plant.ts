/**
 * Core data model for My Plants.
 *
 * Dates: care dates are local calendar days ("YYYY-MM-DD"), not instants.
 * See lib/dates.ts for why. Audit timestamps (createdAt/updatedAt) are epoch ms,
 * because those genuinely are instants and are never compared against "today".
 */

/** A local calendar day, "YYYY-MM-DD". Build these only via lib/dates.ts helpers. */
export type IsoDay = string;

export const CARE_ACTIONS = ["water", "fertilize", "prune", "repot"] as const;

export type CareActionId = (typeof CARE_ACTIONS)[number];

export interface CareActionMeta {
  readonly label: string;
  readonly pastLabel: string;
  readonly emoji: string;
}

export const CARE_ACTION_META: Readonly<Record<CareActionId, CareActionMeta>> =
  Object.freeze({
    water: { label: "Water", pastLabel: "Watered", emoji: "💧" },
    fertilize: { label: "Fertilize", pastLabel: "Fertilized", emoji: "🌱" },
    prune: { label: "Prune", pastLabel: "Pruned", emoji: "✂️" },
    repot: { label: "Repot", pastLabel: "Repotted", emoji: "🪴" },
  });

export interface CareState {
  /** null means the action has never been recorded. */
  lastDone: IsoDay | null;
  /** Whole days between doings. Clamped to MIN/MAX_INTERVAL_DAYS. */
  intervalDays: number;
}

export type CarePlan = Record<CareActionId, CareState>;

export interface Plant {
  id: string;
  name: string;
  description: string;
  care: CarePlan;
  createdAt: number;
  updatedAt: number;
}

export const SCHEMA_VERSION = 1;

/** The shape persisted to localStorage and written by the export button. */
export interface PlantsDocument {
  version: number;
  plants: Plant[];
}

export interface PlantsExport extends PlantsDocument {
  app: "my-plants";
  /** A real instant, so a full ISO timestamp is correct here. */
  exportedAt: string;
}

export interface PlantsSnapshot {
  readonly status: "hydrating" | "ready";
  readonly persistence: "ok" | "unavailable";
  readonly plants: readonly Plant[];
  readonly lastError: string | null;
}
