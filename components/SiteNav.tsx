"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import ThemeToggle from "@/components/ThemeToggle";

/**
 * The site's navigation band.
 *
 * It is a client component only so it can read the current path and mark the
 * active link — layout.tsx has to stay a Server Component, because Next 16
 * only allows the `viewport` export there.
 *
 * Sticky, because the plant list is the kind of page you scroll: losing the
 * way back to About and the theme switch after two screens of cards is the
 * thing a top bar exists to prevent.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const onAbout = pathname === "/about";

  return (
    <header className="sticky top-0 z-40 border-b-2 border-nav-edge bg-nav text-nav-foreground">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          aria-label="My Plants, home"
          className="flex items-center gap-2 rounded-lg py-1.5 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground"
        >
          <span className="wordmark text-lg">My Plants</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/about"
            // aria-current is what a screen reader announces; the background
            // tint is the same fact rendered for everyone else.
            aria-current={onAbout ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-nav-foreground ${
              onAbout
                ? "bg-nav-foreground/15 text-nav-foreground"
                : "text-nav-muted hover:bg-nav-foreground/10 hover:text-nav-foreground"
            }`}
          >
            About
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
