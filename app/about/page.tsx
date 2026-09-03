import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About · My Plants",
  description: "About this houseplant management app.",
};

// A Server Component: nothing here touches the store or the browser, so it
// stays out of the client bundle entirely.
export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-3 text-muted">
        This is a Next.js Houseplant Management app built during a course.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
      >
        ← Back to my plants
      </Link>
    </main>
  );
}
