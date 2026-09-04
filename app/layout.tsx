import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import ThemeToggle from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Plants",
  description:
    "Track watering, fertilizing, pruning and repotting for your plants.",
};

// Next 16 requires viewport/themeColor as their own export, and only supports
// it in Server Components — which is why this layout stays one.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Runs synchronously during HTML parsing — before first paint, before React
 * exists. Without it a user who chose dark would get a full frame of the light
 * palette on every page load, because the stored choice can only be read on
 * the client. Static string, no interpolation of user data.
 */
const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning because the script above adds an attribute React
    // did not render. It suppresses the diff for this element's own attributes
    // only — it does not leak into the subtree.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Site-level chrome: navigation and the theme switch together, on
            every route. Both are app-wide concerns rather than list-page
            actions, which is why they sit outside {children}. */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-1 px-4 pt-4 sm:px-6 lg:px-8">
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"
          >
            About
          </Link>
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
