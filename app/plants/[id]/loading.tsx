import PlantDetailSkeleton from "@/components/PlantDetailSkeleton";

/**
 * Mostly here to enable partial prefetching of this dynamic route for <Link>.
 * It will rarely be seen: the page has no async data, so the real wait is
 * client hydration, which PlantDetail's own hydrating branch covers with the
 * same skeleton.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <PlantDetailSkeleton />
    </main>
  );
}
