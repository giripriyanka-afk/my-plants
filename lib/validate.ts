import { clampInterval, createCarePlan } from "@/lib/care";
import {
  DEFAULT_INTERVAL_DAYS,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMPORT_BYTES,
  MAX_NAME_LENGTH,
} from "@/lib/constants";
import { isIsoDay } from "@/lib/dates";
import { newId } from "@/lib/id";
import {
  CARE_ACTIONS,
  SCHEMA_VERSION,
  type CarePlan,
  type Plant,
  type PlantsDocument,
} from "@/types/plant";

/**
 * Runtime validation for untrusted JSON — both uploaded backup files and
 * whatever is sitting in localStorage (a hand-edited or half-written value is
 * just as untrusted as an upload).
 *
 * Fields are read explicitly rather than spread, so unknown keys from the input
 * are never copied onto a Plant. That also makes __proto__/constructor keys a
 * non-issue: they are simply never read.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function asTimestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : Date.now();
}

function coerceCarePlan(value: unknown): CarePlan {
  const plan = createCarePlan();
  if (!isRecord(value)) return plan;

  for (const action of CARE_ACTIONS) {
    const entry = value[action];
    if (!isRecord(entry)) continue;

    plan[action] = {
      lastDone: isIsoDay(entry.lastDone) ? entry.lastDone : null,
      intervalDays:
        typeof entry.intervalDays === "number"
          ? clampInterval(entry.intervalDays)
          : DEFAULT_INTERVAL_DAYS,
    };
  }
  return plan;
}

/** Returns null for an entry with no usable name — the caller skips those. */
function coercePlant(value: unknown, seenIds: Set<string>): Plant | null {
  if (!isRecord(value)) return null;

  const name = asString(value.name, MAX_NAME_LENGTH).trim();
  if (name.length === 0) return null;

  const rawId = typeof value.id === "string" ? value.id : "";
  const id = rawId.length > 0 && !seenIds.has(rawId) ? rawId : newId();
  seenIds.add(id);

  return {
    id,
    name,
    description: asString(value.description, MAX_DESCRIPTION_LENGTH),
    care: coerceCarePlan(value.care),
    createdAt: asTimestamp(value.createdAt),
    updatedAt: asTimestamp(value.updatedAt),
  };
}

/** Parses and repairs a raw JSON string into a PlantsDocument. Never throws. */
export function coercePlantsDocument(raw: string): Parsed<PlantsDocument> {
  if (raw.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "the file is larger than 5 MB" };
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "it isn't valid JSON" };
  }

  if (!isRecord(data)) {
    return { ok: false, error: "the top level isn't a JSON object" };
  }
  if (!Array.isArray(data.plants)) {
    return { ok: false, error: 'there is no "plants" list' };
  }

  // Refuse to guess at a schema written by a newer version of the app.
  if (typeof data.version === "number" && data.version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `it was made by a newer version of My Plants (v${data.version})`,
    };
  }

  const seenIds = new Set<string>();
  const plants: Plant[] = [];
  for (const entry of data.plants) {
    const plant = coercePlant(entry, seenIds);
    if (plant) plants.push(plant);
  }

  return { ok: true, value: { version: SCHEMA_VERSION, plants } };
}

/** Wraps coercePlantsDocument with messages aimed at the import button. */
export function parsePlantsFile(raw: string): Parsed<PlantsDocument> {
  const result = coercePlantsDocument(raw);
  if (result.ok) return result;
  return {
    ok: false,
    error: `That file couldn't be imported — ${result.error}. Pick the .json file you exported from My Plants.`,
  };
}
