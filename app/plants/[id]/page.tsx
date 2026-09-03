import type { Metadata } from "next";

import PlantDetail from "@/components/PlantDetail";

// Static title: generateMetadata runs on the server and plant names live in
// localStorage, so a per-plant title is impossible here.
export const metadata: Metadata = { title: "Plant · My Plants" };

/**
 * A Server Component with nothing to fetch — it exists only to unwrap the route
 * param and hand it to the client boundary.
 *
 * `params` is a Promise: Next 16 removed synchronous access entirely. Do not
 * decodeURIComponent the value; Next has already decoded it.
 *
 * max-w-3xl rather than the list's max-w-6xl — this page is a single column of
 * form fields and full-width care rows, which need readable line lengths.
 */
export default async function PlantDetailPage(
  props: PageProps<"/plants/[id]">,
) {
  const { id } = await props.params;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PlantDetail id={id} />
    </main>
  );
}
