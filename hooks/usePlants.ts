"use client";

import { useSyncExternalStore } from "react";

import {
  actions,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type PlantsActions,
} from "@/lib/plantsStore";
import type { PlantsSnapshot } from "@/types/plant";

/** The only way components reach the store. */
export function usePlants(): {
  snapshot: PlantsSnapshot;
  actions: PlantsActions;
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { snapshot, actions };
}
