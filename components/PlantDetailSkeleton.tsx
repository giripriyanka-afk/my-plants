/**
 * No "use client" and no client-only imports: this renders in both the server
 * graph (app/plants/[id]/loading.tsx) and the client graph (PlantDetail's
 * hydrating branch). Sharing it is what removes the visual seam between the two.
 *
 * Block heights mirror the loaded layout so hydration causes no layout shift.
 */
export default function PlantDetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-5 w-28 rounded bg-surface-muted" />
      <div className="mt-4 h-8 w-2/3 rounded bg-surface-muted" />
      <div className="mt-2 h-4 w-full rounded bg-surface-muted" />

      <div className="mt-8 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-muted" />
        ))}
      </div>

      <div className="mt-8 h-72 rounded-xl bg-surface-muted" />
    </div>
  );
}
