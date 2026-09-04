import { clampInterval, createCarePlan } from "@/lib/care";
import {
  DEFAULT_INTERVAL_DAYS,
  MAX_CARE_NOTES_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_IMPORT_BYTES,
  MAX_NAME_LENGTH,
  MAX_PASSPORT_LENGTH,
  MAX_ROOM_NAME_LENGTH,
  MAX_ROOMS,
} from "@/lib/constants";
import { isIsoDay } from "@/lib/dates";
import { newId } from "@/lib/id";
import {
  CARE_ACTIONS,
  DEFAULT_ROOM_NAMES,
  LIGHT_LEVELS,
  SCHEMA_VERSION,
  type CarePlan,
  type LightLevel,
  type Plant,
  type PlantsDocument,
  type Room,
} from "@/types/plant";

/**
 * Runtime validation for untrusted JSON — both uploaded backup files and
 * whatever is sitting in localStorage (a hand-edited or half-written value is
 * just as untrusted as an upload).
 *
 * Fields are read explicitly rather than spread, so unknown keys from the input
 * are never copied onto a Plant. That also makes __proto__/constructor keys a
 * non-issue: they are simply never read.
 *
 * Migration policy: new schema fields are defaulted per-field here, not in a
 * separate version-gated migrate() pass. Two reasons. A version gate would skip
 * repair on a document that already claims the current version but holds a bad
 * value — and this coercer runs on every localStorage read, where that is a real
 * case. And nothing so far needs deriving: every v2 field's "absent" meaning is
 * exactly its "user hasn't set it" default.
 *
 * That holds only while absent == unset. A future field whose value must be
 * computed from older data (splitting a field, changing units) needs a real
 * version-gated step ahead of this coercer — and this coercer must still
 * validate that step's output.
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

function asLightLevel(value: unknown): LightLevel {
  // The cast is needed because includes() narrows its argument to the union.
  return typeof value === "string" &&
    (LIGHT_LEVELS as readonly string[]).includes(value)
    ? (value as LightLevel)
    : "unspecified";
}

/**
 * Ids are URL path segments as of v2, so an imported id has to be safe in one.
 * Without this, a file carrying `"id": "a/b#c"` produces an unreachable detail
 * page. newId() output already matches, so no existing id is disturbed.
 */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

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
function coerceRoom(value: unknown, seenIds: Set<string>): Room | null {
  if (!isRecord(value)) return null;

  const name = asString(value.name, MAX_ROOM_NAME_LENGTH).trim();
  if (name.length === 0) return null;

  const rawId =
    typeof value.id === "string" && ID_RE.test(value.id) ? value.id : "";
  const id = rawId.length > 0 && !seenIds.has(rawId) ? rawId : newId();
  seenIds.add(id);

  return { id, name };
}

export function createDefaultRooms(): Room[] {
  return DEFAULT_ROOM_NAMES.map((name) => ({ id: newId(), name }));
}

/**
 * Returns null for an entry with no usable name — the caller skips those.
 * `roomIds` is the set of rooms that survived coercion; a roomId outside it is
 * a dangling reference and becomes null (unassigned) rather than hiding the
 * plant from every group on the list page.
 */
function coercePlant(
  value: unknown,
  seenIds: Set<string>,
  roomIds: ReadonlySet<string>,
): Plant | null {
  if (!isRecord(value)) return null;

  const name = asString(value.name, MAX_NAME_LENGTH).trim();
  if (name.length === 0) return null;

  const rawId =
    typeof value.id === "string" && ID_RE.test(value.id) ? value.id : "";
  const id = rawId.length > 0 && !seenIds.has(rawId) ? rawId : newId();
  seenIds.add(id);

  // A v1 plant has none of the v2 keys, so each falls through to its default.
  // That absence IS the migration.
  return {
    id,
    name,
    description: asString(value.description, MAX_DESCRIPTION_LENGTH),
    care: coerceCarePlan(value.care),
    purchasedOn: isIsoDay(value.purchasedOn) ? value.purchasedOn : null,
    passport: asString(value.passport, MAX_PASSPORT_LENGTH),
    careNotes: asString(value.careNotes, MAX_CARE_NOTES_LENGTH),
    light: asLightLevel(value.light),
    roomId:
      typeof value.roomId === "string" && roomIds.has(value.roomId)
        ? value.roomId
        : null,
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

  const sourceVersion =
    typeof data.version === "number" && Number.isFinite(data.version)
      ? data.version
      : 1;

  const roomIdPool = new Set<string>();
  let rooms: Room[] = [];
  if (Array.isArray(data.rooms)) {
    for (const entry of data.rooms.slice(0, MAX_ROOMS)) {
      const room = coerceRoom(entry, roomIdPool);
      if (room) rooms.push(room);
    }
  }

  // The one genuinely version-gated step, and the reason the policy note above
  // exists. Seeding has to depend on where the document came from, not on
  // whether `rooms` happens to be empty: a v3 user who deletes every room must
  // get an empty list back, not the defaults resurrected on next load.
  if (sourceVersion < SCHEMA_VERSION && !Array.isArray(data.rooms)) {
    rooms = createDefaultRooms();
    for (const room of rooms) roomIdPool.add(room.id);
  }

  const seenIds = new Set<string>();
  const plants: Plant[] = [];
  for (const entry of data.plants) {
    const plant = coercePlant(entry, seenIds, roomIdPool);
    if (plant) plants.push(plant);
  }

  return { ok: true, value: { version: SCHEMA_VERSION, rooms, plants } };
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
