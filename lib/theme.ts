export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "myplants:theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export interface ThemeSnapshot {
  /** What the user chose. "system" means they never chose. */
  readonly theme: Theme;
  /** What that actually renders as right now. */
  readonly resolved: ResolvedTheme;
}

/**
 * The theme preference, in its own tiny external store rather than in
 * plantsStore: it is a per-browser UI setting, so it must not travel in an
 * export or be replaced by an import.
 *
 * Same useSyncExternalStore shape as plantsStore, for the same reason —
 * localStorage does not exist on the server, so getServerSnapshot supplies the
 * value for SSR and the hydration render.
 *
 * "system" is kept as a real state even though the switch only shows two
 * positions. It is what a user who has never touched the switch is in, and it
 * is why the app still follows the OS until a deliberate choice is made.
 */

const SERVER_SNAPSHOT: ThemeSnapshot = Object.freeze({
  theme: "system",
  resolved: "light",
});

let snapshot: ThemeSnapshot = SERVER_SNAPSHOT;
let loaded = false;
const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

function readStored(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Private mode or blocked storage — fall back to following the OS.
  }
  return "system";
}

function computeResolved(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  try {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function set(theme: Theme): void {
  snapshot = Object.freeze({ theme, resolved: computeResolved(theme) });
  for (const listener of listeners) listener();
}

/** Only matters while the user is on "system" — an explicit choice wins. */
function handleMediaChange(): void {
  if (snapshot.theme === "system") set("system");
}

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    try {
      mediaQuery = window.matchMedia(DARK_QUERY);
      mediaQuery.addEventListener("change", handleMediaChange);
    } catch {
      mediaQuery = null;
    }
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && mediaQuery) {
      mediaQuery.removeEventListener("change", handleMediaChange);
      mediaQuery = null;
    }
  };
}

/** Stable reference until something actually changes, as React requires. */
export function getSnapshot(): ThemeSnapshot {
  if (!loaded) {
    loaded = true;
    const theme = readStored();
    snapshot = Object.freeze({ theme, resolved: computeResolved(theme) });
  }
  return snapshot;
}

export function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

/** Writes the choice onto <html>, which is what the CSS selectors key off. */
export function applyTheme(theme: Theme): void {
  const element = document.documentElement;
  if (theme === "system") delete element.dataset.theme;
  else element.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisting is survivable; the choice still applies for this session.
  }
  set(theme);
}

/**
 * Flips to the opposite of what is on screen right now. The first flip is also
 * what turns "system" into an explicit choice.
 */
export function toggleTheme(): void {
  setTheme(getSnapshot().resolved === "dark" ? "light" : "dark");
}
