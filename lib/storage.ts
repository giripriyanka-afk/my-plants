import { STORAGE_KEY } from "@/lib/constants";
import { coercePlantsDocument } from "@/lib/validate";
import { SCHEMA_VERSION, type PlantsDocument } from "@/types/plant";

/**
 * The single persistence seam. Nothing else in the app touches localStorage.
 *
 * Swapping to IndexedDB later changes only this file: loadDocument() would
 * return a Promise and resolve into the store's commit() (flipping status from
 * "hydrating" to "ready" when it lands), and saveDocument() would become
 * fire-and-forget behind a serialized write queue. Components and the hook are
 * unaffected.
 */

export interface LoadResult {
  document: PlantsDocument;
  /** false when localStorage is missing or blocked (private mode, disabled cookies). */
  available: boolean;
  error: string | null;
}

export function emptyDocument(): PlantsDocument {
  return { version: SCHEMA_VERSION, plants: [] };
}

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probeKey = "myplants:probe";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return window.localStorage;
  } catch {
    // Safari private mode and blocked-storage settings throw on access.
    return null;
  }
}

export function loadDocument(): LoadResult {
  const store = getStore();
  if (!store) {
    return { document: emptyDocument(), available: false, error: null };
  }

  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return { document: emptyDocument(), available: false, error: null };
  }

  if (raw === null) {
    return { document: emptyDocument(), available: true, error: null };
  }

  // What comes out of localStorage is untrusted too — a half-written or
  // hand-edited value must not white-screen the app.
  const parsed = coercePlantsDocument(raw);
  if (!parsed.ok) {
    return {
      document: emptyDocument(),
      available: true,
      error: `Saved data couldn't be read (${parsed.error}). Starting empty — your old data is still in storage under "${STORAGE_KEY}".`,
    };
  }

  return { document: parsed.value, available: true, error: null };
}

/** Returns an error message on failure, or null on success. Never throws. */
export function saveDocument(document: PlantsDocument): string | null {
  const store = getStore();
  if (!store) {
    return "Changes aren't being saved — this browser is blocking local storage.";
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(document));
    return null;
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return isQuota
      ? "Storage is full, so this change wasn't saved. Export a backup and remove some plants."
      : "Changes aren't being saved — this browser is blocking local storage.";
  }
}
