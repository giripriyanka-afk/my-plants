"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  getServerSnapshot,
  getSnapshot,
  setTheme,
  subscribe,
  THEME_LABEL,
  THEMES,
} from "@/lib/theme";

/**
 * Three states rather than a two-way switch. A plain on/off toggle has to pick
 * a side at first load, which would silently override the OS preference for
 * everyone who never touches it; keeping System as the default means the app
 * behaves exactly as it did before until a deliberate choice is made.
 */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Runs before paint, so switching never shows a frame of the old palette.
  // Also repairs the attribute after React's Strict Mode dev remount, which
  // resets <html> to only the attributes rendered from JSX and would otherwise
  // wipe what the inline boot script set.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex rounded-lg border border-border-subtle p-0.5"
    >
      {THEMES.map((option) => {
        const selected = option === theme;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            // aria-pressed rather than a visual-only highlight: the selected
            // state has to be announced, not just coloured in.
            aria-pressed={selected}
            className={`min-h-9 rounded-md px-2.5 text-xs font-medium transition-colors ${
              selected
                ? "bg-foreground text-background"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {THEME_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}
