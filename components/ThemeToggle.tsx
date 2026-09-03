"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  toggleTheme,
} from "@/lib/theme";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="theme-icon-light size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v1.5M10 16.5V18M18 10h-1.5M3.5 10H2M15.7 4.3l-1 1M5.3 14.7l-1 1M15.7 15.7l-1-1M5.3 5.3l-1-1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="theme-icon-dark size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z" />
    </svg>
  );
}

/**
 * An on/off switch. Its *visual* state — knob position and which icon shows —
 * is driven entirely by CSS, using the same selectors that pick the palette.
 * That means the correct position is painted with the page, so the switch never
 * flickers into the right state after hydration the way a JS-rendered one would.
 *
 * JS supplies only the ARIA state and the click. If `resolved` is briefly wrong
 * during hydration it costs nothing visible.
 */
export default function ThemeToggle() {
  const { theme, resolved } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Before paint, so switching never shows a frame of the old palette. Also
  // repairs the attribute after React's Strict Mode dev remount, which resets
  // <html> to only the attributes rendered from JSX and would otherwise wipe
  // what the inline boot script set.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={resolved === "dark"}
      aria-label="Dark mode"
      // min-h-11 gives the 44px tap target; the track inside is the visual.
      className="inline-flex min-h-11 items-center rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
    >
      <span className="relative flex h-7 w-12 items-center rounded-full border border-border-subtle bg-surface-muted px-0.5">
        <span className="theme-knob flex size-6 items-center justify-center rounded-full bg-foreground text-background transition-transform">
          <SunIcon />
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}
