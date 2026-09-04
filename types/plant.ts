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

/** Slugs, not labels, are what persist — display copy can change without a migration. */
export const LIGHT_LEVELS = [
  "unspecified",
  "full-sun",
  "bright-indirect",
  "partial-shade",
  "low-light",
] as const;

export type LightLevel = (typeof LIGHT_LEVELS)[number];

export const LIGHT_LEVEL_LABEL: Readonly<Record<LightLevel, string>> =
  Object.freeze({
    unspecified: "Unspecified",
    "full-sun": "Full sun",
    "bright-indirect": "Bright indirect",
    "partial-shade": "Partial shade",
    "low-light": "Low light",
  });

/**
 * v3. User-defined, so this is data rather than a union like LightLevel.
 * Display order is array order — no separate `order` field to keep in sync.
 */
export interface Room {
  id: string;
  name: string;
}

/** Seeded once when a pre-v3 document is upgraded. Not a fixed list. */
export const DEFAULT_ROOM_NAMES = [
  "Living room",
  "Master bedroom",
  "Kitchen",
  "Bathroom",
  "Kids bedroom",
] as const;

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
  /** v2. The day the plant was acquired. null = not recorded. */
  purchasedOn: IsoDay | null;
  /** v2. Free text off the plant passport label. */
  passport: string;
  /** v2. Longer-form notes; `description` stays the short card blurb. */
  careNotes: string;
  /** v2. */
  light: LightLevel;
  /** v3. Points at a Room.id, or null for unassigned. */
  roomId: string | null;
  createdAt: number;
  updatedAt: number;
}

export const SCHEMA_VERSION = 3;

/** The shape persisted to localStorage and written by the export button. */
export interface PlantsDocument {
  version: number;
  rooms: Room[];
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
  readonly rooms: readonly Room[];
  readonly plants: readonly Plant[];
  readonly lastError: string | null;
}
