import { clampInterval, createCarePlan } from "@/lib/care";
import { todayIsoDay } from "@/lib/dates";
import { newId } from "@/lib/id";
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/constants";
import { loadDocument, saveDocument } from "@/lib/storage";
import {
  SCHEMA_VERSION,
  type CareActionId,
  type Plant,
  type PlantsDocument,
  type PlantsSnapshot,
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
      plants: Object.freeze(result.document.plants) as readonly Plant[],
      lastError: result.error,
    });
  }
  return snapshot;
}

export function getServerSnapshot(): PlantsSnapshot {
  return SERVER_SNAPSHOT;
}

function commit(nextPlants: readonly Plant[]): void {
  const document: PlantsDocument = {
    version: SCHEMA_VERSION,
    plants: [...nextPlants],
  };
  const saveError = saveDocument(document);

  // Keep the in-memory change even when the save fails (quota, private mode)
  // and surface the reason — never silently discard the user's edit.
  snapshot = Object.freeze({
    status: "ready",
    persistence: saveError ? "unavailable" : "ok",
    plants: Object.freeze(nextPlants) as readonly Plant[],
    lastError: saveError,
  });

  for (const listener of listeners) listener();
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
  addPlant(input: { name: string; description: string }): string;
  updatePlant(
    id: string,
    patch: { name?: string; description?: string },
  ): void;
  deletePlant(id: string): void;
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
  addPlant({ name, description }) {
    const id = newId();
    const now = Date.now();
    const plant: Plant = {
      id,
      name: name.trim().slice(0, MAX_NAME_LENGTH),
      description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      care: createCarePlan(),
      createdAt: now,
      updatedAt: now,
    };
    commit([...snapshot.plants, plant]);
    return id;
  },

  updatePlant(id, patch) {
    mapPlant(id, (plant) => ({
      ...plant,
      name:
        patch.name === undefined
          ? plant.name
          : patch.name.trim().slice(0, MAX_NAME_LENGTH),
      description:
        patch.description === undefined
          ? plant.description
          : patch.description.slice(0, MAX_DESCRIPTION_LENGTH),
      updatedAt: Date.now(),
    }));
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

  replaceAll(document) {
    commit(document.plants);
  },

  dismissError() {
    if (snapshot.lastError === null) return;
    snapshot = Object.freeze({ ...snapshot, lastError: null });
    for (const listener of listeners) listener();
  },
};

export const actions: PlantsActions = Object.freeze(actionsImpl);
