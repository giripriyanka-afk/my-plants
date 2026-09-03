import { clampInterval, createCarePlan } from "@/lib/care";
import { isIsoDay, todayIsoDay } from "@/lib/dates";
import { newId } from "@/lib/id";
import {
  MAX_CARE_NOTES_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSPORT_LENGTH,
  MAX_ROOM_NAME_LENGTH,
  MAX_ROOMS,
} from "@/lib/constants";
import { loadDocument, saveDocument } from "@/lib/storage";
import {
  CARE_ACTIONS,
  SCHEMA_VERSION,
  type CareActionId,
  type IsoDay,
  type LightLevel,
  type Plant,
  type PlantsDocument,
  type PlantsSnapshot,
  type Room,
} from "@/types/plant";

/**
 * An external store read through useSyncExternalStore.
 *
 * Why not useState or Context: localStorage does not exist on the server and
 * Next statically prerenders "/". getServerSnapshot() is React's purpose-built
 * answer — it supplies the value for both SSR and the client's hydration
 * render, then React re-renders once hydration commits and getSnapshot()
 * returns a different reference. No `mounted` flag, no load effect, and no way
 * for a hydration mismatch to creep back in during a refactor.
 */

const SERVER_SNAPSHOT: PlantsSnapshot = Object.freeze({
  status: "hydrating",
  persistence: "ok",
  rooms: Object.freeze([]) as readonly Room[],
  plants: Object.freeze([]) as readonly Plant[],
  lastError: null,
});

let snapshot: PlantsSnapshot = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Must return a stable reference until something actually changes, or React
 * throws "The result of getSnapshot should be cached to avoid an infinite
 * loop." Hence the single frozen object, replaced only in commit().
 */
export function getSnapshot(): PlantsSnapshot {
  if (!loaded) {
    loaded = true;
    const result = loadDocument();
    snapshot = Object.freeze({
      status: "ready",
      persistence: result.available ? "ok" : "unavailable",
      rooms: Object.freeze(result.document.rooms) as readonly Room[],
      plants: Object.freeze(result.document.plants) as readonly Plant[],
      lastError: result.error,
    });
  }
  return snapshot;
}

export function getServerSnapshot(): PlantsSnapshot {
  return SERVER_SNAPSHOT;
}

function commit(
  nextPlants: readonly Plant[],
  nextRooms: readonly Room[] = snapshot.rooms,
): void {
  const document: PlantsDocument = {
    version: SCHEMA_VERSION,
    rooms: [...nextRooms],
    plants: [...nextPlants],
  };
  const saveError = saveDocument(document);

  // Keep the in-memory change even when the save fails (quota, private mode)
  // and surface the reason — never silently discard the user's edit.
  snapshot = Object.freeze({
    status: "ready",
    persistence: saveError ? "unavailable" : "ok",
    rooms: Object.freeze(nextRooms) as readonly Room[],
    plants: Object.freeze(nextPlants) as readonly Plant[],
    lastError: saveError,
  });

  for (const listener of listeners) listener();
}

/**
 * A roomId is only ever stored if it points at a room that exists. Keeping this
 * at the store boundary means the list page can group on roomId without a plant
 * ever vanishing into a room that isn't there.
 */
function resolveRoomId(roomId: string | null): string | null {
  if (roomId === null) return null;
  return snapshot.rooms.some((room) => room.id === roomId) ? roomId : null;
}

function mapPlant(
  id: string,
  update: (plant: Plant) => Plant,
): void {
  let changed = false;
  const next = snapshot.plants.map((plant) => {
    if (plant.id !== id) return plant;
    changed = true;
    return update(plant);
  });
  if (changed) commit(next);
}

export interface PlantsActions {
  addPlant(input: {
    name: string;
    description: string;
    /** Chosen once at creation; omitted actions fall back to the default. */
    intervals?: Partial<Record<CareActionId, number>>;
    roomId?: string | null;
  }): string;
  updatePlant(
    id: string,
    patch: {
      name?: string;
      description?: string;
      intervals?: Partial<Record<CareActionId, number>>;
      /** undefined leaves the date alone; null clears it. */
      purchasedOn?: IsoDay | null;
      passport?: string;
      careNotes?: string;
      light?: LightLevel;
      location?: string;
      roomId?: string | null;
    },
  ): void;
  deletePlant(id: string): void;
  addRoom(name: string): void;
  renameRoom(roomId: string, name: string): void;
  /** Plants in the room become unassigned rather than being orphaned. */
  deleteRoom(roomId: string): void;
  /** Moves a room one place up (-1) or down (+1) in display order. */
  moveRoom(roomId: string, delta: -1 | 1): void;
  /** Stamps today's date, overwriting whatever was there. No history is kept. */
  markCareDone(id: string, action: CareActionId): void;
  clearCareDone(id: string, action: CareActionId): void;
  setCareInterval(id: string, action: CareActionId, days: number): void;
  replaceAll(document: PlantsDocument): void;
  dismissError(): void;
}

/**
 * Frozen module singleton, so its identity is stable and consumers never need
 * useCallback or have to worry about it in a dependency array.
 * Note: setCareInterval, not setInterval — the latter shadows the global.
 */
const actionsImpl: PlantsActions = {
  addPlant({ name, description, intervals, roomId }) {
    const id = newId();
    const now = Date.now();
    const plant: Plant = {
      id,
      name: name.trim().slice(0, MAX_NAME_LENGTH),
      description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      care: createCarePlan(intervals),
      purchasedOn: null,
      passport: "",
      careNotes: "",
      light: "unspecified",
      location: "",
      roomId: resolveRoomId(roomId ?? null),
      createdAt: now,
      updatedAt: now,
    };
    commit([...snapshot.plants, plant]);
    return id;
  },

  updatePlant(id, patch) {
    mapPlant(id, (plant) => {
      // lastDone is never touched here — only the schedule changes.
      const care = { ...plant.care };
      for (const action of CARE_ACTIONS) {
        const days = patch.intervals?.[action];
        if (days !== undefined) {
          care[action] = {
            ...care[action],
            intervalDays: clampInterval(days),
          };
        }
      }
      return {
        ...plant,
        name:
          patch.name === undefined
            ? plant.name
            : patch.name.trim().slice(0, MAX_NAME_LENGTH),
        description:
          patch.description === undefined
            ? plant.description
            : patch.description.slice(0, MAX_DESCRIPTION_LENGTH),
        care,
        // Re-validated at the boundary, the same defence in depth as
        // clampInterval: a bad value from any caller becomes null, not corrupt
        // state.
        purchasedOn:
          patch.purchasedOn === undefined
            ? plant.purchasedOn
            : isIsoDay(patch.purchasedOn)
              ? patch.purchasedOn
              : null,
        passport:
          patch.passport === undefined
            ? plant.passport
            : patch.passport.slice(0, MAX_PASSPORT_LENGTH),
        careNotes:
          patch.careNotes === undefined
            ? plant.careNotes
            : patch.careNotes.slice(0, MAX_CARE_NOTES_LENGTH),
        light: patch.light ?? plant.light,
        location:
          patch.location === undefined
            ? plant.location
            : patch.location.trim().slice(0, MAX_LOCATION_LENGTH),
        roomId:
          patch.roomId === undefined
            ? plant.roomId
            : resolveRoomId(patch.roomId),
        updatedAt: Date.now(),
      };
    });
  },

  deletePlant(id) {
    const next = snapshot.plants.filter((plant) => plant.id !== id);
    if (next.length !== snapshot.plants.length) commit(next);
  },

  markCareDone(id, action) {
    const today = todayIsoDay();
    mapPlant(id, (plant) => ({
      ...plant,
      care: {
        ...plant.care,
        [action]: { ...plant.care[action], lastDone: today },
      },
      updatedAt: Date.now(),
    }));
  },

  clearCareDone(id, action) {
    mapPlant(id, (plant) => ({
      ...plant,
      care: {
        ...plant.care,
        [action]: { ...plant.care[action], lastDone: null },
      },
      updatedAt: Date.now(),
    }));
  },

  setCareInterval(id, action, days) {
    mapPlant(id, (plant) => ({
      ...plant,
      care: {
        ...plant.care,
        [action]: { ...plant.care[action], intervalDays: clampInterval(days) },
      },
      updatedAt: Date.now(),
    }));
  },

  addRoom(name) {
    const trimmed = name.trim().slice(0, MAX_ROOM_NAME_LENGTH);
    if (trimmed.length === 0) return;
    if (snapshot.rooms.length >= MAX_ROOMS) return;
    commit(snapshot.plants, [
      ...snapshot.rooms,
      { id: newId(), name: trimmed },
    ]);
  },

  renameRoom(roomId, name) {
    const trimmed = name.trim().slice(0, MAX_ROOM_NAME_LENGTH);
    if (trimmed.length === 0) return;
    let changed = false;
    const rooms = snapshot.rooms.map((room) => {
      if (room.id !== roomId || room.name === trimmed) return room;
      changed = true;
      return { ...room, name: trimmed };
    });
    if (changed) commit(snapshot.plants, rooms);
  },

  deleteRoom(roomId) {
    const rooms = snapshot.rooms.filter((room) => room.id !== roomId);
    if (rooms.length === snapshot.rooms.length) return;
    // Unassign rather than orphan — a plant must never point at a missing room.
    const plants = snapshot.plants.map((plant) =>
      plant.roomId === roomId
        ? { ...plant, roomId: null, updatedAt: Date.now() }
        : plant,
    );
    commit(plants, rooms);
  },

  moveRoom(roomId, delta) {
    const from = snapshot.rooms.findIndex((room) => room.id === roomId);
    if (from === -1) return;
    const to = from + delta;
    if (to < 0 || to >= snapshot.rooms.length) return;
    const rooms = [...snapshot.rooms];
    const [moved] = rooms.splice(from, 1);
    rooms.splice(to, 0, moved);
    commit(snapshot.plants, rooms);
  },

  replaceAll(document) {
    commit(document.plants, document.rooms);
  },

  dismissError() {
    if (snapshot.lastError === null) return;
    snapshot = Object.freeze({ ...snapshot, lastError: null });
    for (const listener of listeners) listener();
  },
};

export const actions: PlantsActions = Object.freeze(actionsImpl);
