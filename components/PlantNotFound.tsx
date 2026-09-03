"use client";

import Link from "next/link";

import type { PlantsSnapshot } from "@/types/plant";

/**
 * Rendered instead of notFound(). The miss is only discoverable client-side,
 * after the server already streamed a 200, so notFound() would buy a soft 404
 * with none of the status-code benefit — and app/not-found.tsx takes no props,
 * so it could not explain *why* the plant is missing. These three causes are
 * the ones that actually happen, and each wants different words.
 */
export default function PlantNotFound({
  snapshot,
}: {
  snapshot: PlantsSnapshot;
}) {
  const { heading, body } =
    snapshot.persistence === "unavailable"
      ? {
          heading: "Local storage is blocked",
          body: "This browser is blocking local storage, so there are no plants to show. Try a normal (non-private) window.",
        }
      : snapshot.plants.length === 0
        ? {
            heading: "No plants in this browser",
            body: "Plants are stored per-browser, so this link may have come from a different browser or device. Import a backup to bring them across.",
          }
        : {
            heading: "No plant with this link",
            body: "It may have been deleted, or the address may be mistyped.",
          };

  return (
    <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center">
      <p className="text-lg font-medium">{heading}</p>
      <p className="mx-auto mt-2 max-w-prose text-sm text-muted">{body}</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
      >
        Back to my plants
      </Link>
    </div>
  );
}
