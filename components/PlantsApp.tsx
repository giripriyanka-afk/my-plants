"use client";

import { useRef, useState } from "react";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PlantCard from "@/components/PlantCard";
import PlantFormDialog from "@/components/PlantFormDialog";
import { usePlants } from "@/hooks/usePlants";
import { useToday } from "@/hooks/useToday";
import { sortPlantsByUrgency } from "@/lib/care";
import {
  buildExportPayload,
  downloadJson,
  suggestedExportFilename,
} from "@/lib/transfer";
import { parsePlantsFile } from "@/lib/validate";
import type { Plant } from "@/types/plant";

// Wide cards: each care row has to hold emoji, label, badge, interval and
// button on one line, which a three-up grid cannot give it.
const CARD_GRID = "grid grid-cols-1 gap-4 xl:grid-cols-2";

/**
 * The single "use client" boundary. Everything it imports joins the client
 * graph automatically, so layout.tsx and page.tsx stay Server Components.
 */
export default function PlantsApp() {
  const { snapshot, actions } = usePlants();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plant | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Only read once hydration has produced real data, so no date crosses the
  // hydration boundary.
  const today = useToday();

  function handleExport() {
    downloadJson(
      buildExportPayload(snapshot.plants),
      suggestedExportFilename(),
    );
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice fires `change` again.
    event.target.value = "";
    if (!file) return;

    const result = parsePlantsFile(await file.text());
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    const count = result.value.plants.length;
    const confirmed = window.confirm(
      `Import ${count} ${count === 1 ? "plant" : "plants"}?\n\nThis replaces all ${snapshot.plants.length} plants currently in the app. Export a backup first if you want to keep them.`,
    );
    if (!confirmed) return;

    actions.replaceAll(result.value);
    setNotice(`Imported ${count} ${count === 1 ? "plant" : "plants"}.`);
  }

  const isHydrating = snapshot.status === "hydrating";
  const plants = isHydrating ? [] : sortPlantsByUrgency(snapshot.plants, today);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Plants</h1>
          <p className="text-sm text-muted">
            {isHydrating
              ? " "
              : `${snapshot.plants.length} ${snapshot.plants.length === 1 ? "plant" : "plants"} · saved in this browser`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
          <button
            type="button"
            onClick={handleExport}
            disabled={snapshot.plants.length === 0}
            className="min-h-11 rounded-lg border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted disabled:opacity-40"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 rounded-lg border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="min-h-11 rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
          >
            Add plant
          </button>
        </div>
      </header>

      {snapshot.persistence === "unavailable" && (
        <p className="mt-4 rounded-lg bg-status-due-bg px-3 py-2 text-sm text-status-due">
          Changes aren&apos;t being saved — this browser is blocking local
          storage. The app still works, but your plants will disappear when you
          close the tab.
        </p>
      )}

      {snapshot.lastError && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-status-overdue-bg px-3 py-2 text-sm text-status-overdue">
          <span className="flex-1">{snapshot.lastError}</span>
          <button
            type="button"
            onClick={actions.dismissError}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </p>
      )}

      {notice && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-status-soon-bg px-3 py-2 text-sm text-status-soon">
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-semibold underline"
          >
            Dismiss
          </button>
        </p>
      )}

      {isHydrating ? (
        // Same grid classes as the real list, so hydration causes no layout shift.
        <div className={`${CARD_GRID} mt-6`} aria-hidden="true">
          <div className="h-56 animate-pulse rounded-xl bg-surface-muted" />
        </div>
      ) : plants.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border-subtle p-10 text-center">
          <p className="text-lg font-medium">No plants yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first plant to start tracking watering, fertilizing,
            pruning and repotting.
          </p>
        </div>
      ) : (
        <div className={`${CARD_GRID} mt-6`}>
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              today={today}
              onEdit={(target) => {
                setEditing(target);
                setFormOpen(true);
              }}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <PlantFormDialog
          key={editing?.id ?? "new"}
          plant={editing}
          onSave={({ name, description, intervals }) => {
            if (editing)
              actions.updatePlant(editing.id, { name, description, intervals });
            else actions.addPlant({ name, description, intervals });
          }}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          plant={pendingDelete}
          onConfirm={() => {
            actions.deletePlant(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
