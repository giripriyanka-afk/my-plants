import Link from "next/link";

/**
 * Unmatched URLs only. The "plant doesn't exist" case is handled inside
 * PlantDetail, which can explain why — this page takes no props and cannot.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-dashed border-border-subtle p-10 text-center">
        <p className="text-lg font-medium">Page not found</p>
        <p className="mt-2 text-sm text-muted">
          That address doesn&apos;t match anything in My Plants.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
        >
          Back to my plants
        </Link>
      </div>
    </main>
  );
}
