"use client";

import { useEffect, useState } from "react";

import { todayIsoDay } from "@/lib/dates";
import type { IsoDay } from "@/types/plant";

/**
 * Today's local calendar day, refreshed when the tab regains focus.
 *
 * That covers a tab left open past midnight and a laptop waking from sleep,
 * both of which would otherwise leave every due date a day stale.
 *
 * Lint-safe: setToday runs inside listeners registered by the effect, never in
 * the effect body, so react-hooks/set-state-in-effect does not fire.
 */
export function useToday(): IsoDay {
  const [today, setToday] = useState(() => todayIsoDay());

  useEffect(() => {
    const refresh = () => setToday(todayIsoDay());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}
