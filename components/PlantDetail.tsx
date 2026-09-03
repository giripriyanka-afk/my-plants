"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CareActionDetailRow from "@/components/CareActionDetailRow";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PlantDetailSkeleton from "@/components/PlantDetailSkeleton";
import PlantDetailsForm from "@/components/PlantDetailsForm";
import PlantFormDialog from "@/components/PlantFormDialog";
import PlantNotFound from "@/components/PlantNotFound";
import { usePlants } from "@/hooks/usePlants";
import { useToday } from "@/hooks/useToday";
import { formatIsoDay } from "@/lib/dates";
import {
  CARE_ACTIONS,
  LIGHT_LEVEL_LABEL,
  type Plant,
} from "@/types/plant";

/**
 * The app's second "use client" boundary — the component the dynamic route
 * imports, and the first thing on it to touch the store or the router.
 */
export default function PlantDetail({ id }: { id: string }) {
  const { snapshot, actions } = usePlants();
  const today = useToday();
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingExit, setPendingExit] = useState(false);

  // Order matters. getServerSnapshot() has plants: [], so a find() before this
  // check would 404 every valid plant on the SSR and hydration renders.
  if (snapshot.status === "hydrating") return <PlantDetailSkeleton />;

  const plant = snapshot.plants.find((p) => p.id === id);

  if (!plant) {
    // pendingExit covers the gap between the synchronous delete commit and the
    // navigation landing, so a successful delete doesn't flash "not found".
    return pendingExit ? (
      <PlantDetailSkeleton />
    ) : (
      <>
        <BackLink />
        <div className="mt-6">
          <PlantNotFound snapshot={snapshot} />
        </div>
      </>
    );
  }

  function confirmDelete() {
    if (!plant) return;
    setPendingExit(true);
    actions.deletePlant(plant.id);
    // replace, not push — Back must not return to a URL that no longer resolves.
    router.replace("/");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <BackLink />
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-11 rounded-lg border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted"
          >
            Edit name &amp; schedule
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-status-overdue hover:bg-status-overdue-bg"
          >
            Delete
          </button>
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-bold break-words">{plant.name}</h1>
      {plant.description && (
        <p className="mt-1 break-words text-muted">{plant.description}</p>
      )}
      <PlantChips plant={plant} />

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">
        Care
      </h2>
      <div className="mt-2 space-y-2">
        {CARE_ACTIONS.map((action) => (
          <CareActionDetailRow
            key={action}
            plantId={plant.id}
            action={action}
            care={plant.care[action]}
            today={today}
          />
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-muted uppercase">
        Details
      </h2>
      <div className="mt-2">
        {/* Keyed on id alone: the store hands back a new plant object on every
            commit, and remounting on those would wipe an in-progress edit. */}
        <PlantDetailsForm
          key={plant.id}
          plant={plant}
          onSave={(patch) => actions.updatePlant(plant.id, patch)}
        />
      </div>

      {editOpen && (
        <PlantFormDialog
          key={plant.id}
          plant={plant}
          onSave={({ name, description, intervals }) =>
            actions.updatePlant(plant.id, { name, description, intervals })
          }
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmingDelete && (
        <ConfirmDeleteDialog
          plant={plant}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}

function BackLink() {
  // A Link, never router.back() — back() is wrong for a deep link opened in a
  // fresh tab, and wrong after the delete-and-replace above.
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-muted hover:text-foreground"
    >
      ← All plants
    </Link>
  );
}

/** At-a-glance values, derived straight from the plant so they update on save. */
function PlantChips({ plant }: { plant: Plant }) {
  const chips: string[] = [];
  if (plant.light !== "unspecified") {
    chips.push(`🪟 ${LIGHT_LEVEL_LABEL[plant.light]}`);
  }
  if (plant.location) chips.push(`📍 ${plant.location}`);
  if (plant.purchasedOn) {
    chips.push(`🧾 Purchased ${formatIsoDay(plant.purchasedOn)}`);
  }
  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full bg-surface-muted px-3 py-1 text-xs"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
