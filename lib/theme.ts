export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "myplants:theme";

export const THEMES: readonly Theme[] = ["light", "system", "dark"] as const;

export const THEME_LABEL: Readonly<Record<Theme, string>> = Object.freeze({
  light: "Light",
  system: "System",
  dark: "Dark",
});

/**
 * The theme preference, kept in its own tiny external store rather than in
 * plantsStore: it is a per-browser UI preference, not plant data, so it must
 * not travel in an export or be replaced by an import.
 *
 * Same useSyncExternalStore shape as plantsStore, and for the same reason —
 * localStorage does not exist on the server, so getServerSnapshot supplies the
 * value for SSR and the hydration render, and React re-renders once hydration
 * commits. The inline script in layout.tsx is what stops that one-frame
 * difference being visible.
 */

let snapshot: Theme = "system";
let loaded = false;
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Private mode or blocked storage — fall back to following the OS.
  }
  return "system";
}

/** Writes the choice onto <html>, which is what the CSS selectors key off. */
export function applyTheme(theme: Theme): void {
  const element = document.documentElement;
  if (theme === "system") delete element.dataset.theme;
  else element.dataset.theme = theme;
}

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getSnapshot(): Theme {
  if (!loaded) {
    loaded = true;
    snapshot = readStored();
  }
  return snapshot;
}

export function getServerSnapshot(): Theme {
  return "system";
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisting is survivable; the choice still applies for this session.
  }
  snapshot = theme;
  for (const listener of listeners) listener();
}
