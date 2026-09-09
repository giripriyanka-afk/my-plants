"use client";

import { useRef, useState } from "react";

import ModalDialog from "@/components/ModalDialog";
import { usePlants } from "@/hooks/usePlants";
import {
  buildExportPayload,
  downloadJson,
  suggestedExportFilename,
} from "@/lib/transfer";
import { parsePlantsFile } from "@/lib/validate";
import type { PlantsDocument } from "@/types/plant";

interface Props {
  /** Results are reported upward so all banners render in one place. */
  onNotice: (message: string) => void;
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * Export and import, at the foot of the list page.
 *
 * Import asks which of two things the user meant, rather than assuming. Adding
 * is offered as the default because it cannot lose anything; replacing is
 * available but marked destructive and states exactly what it deletes. It used
 * to replace unconditionally, so one mis-picked file destroyed the library.
 *
 * Self-contained by design: it owns the hidden file input and both handlers, so
 * PlantsApp no longer carries file-transfer concerns alongside list rendering.
 * It reads the store directly rather than taking plants as props, the same way
 * the care rows do — the store is global, so threading it through would be
 * ceremony.
 */
export default function BackupSection({ onNotice }: Props) {
  const { snapshot, actions } = usePlants();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<PlantsDocument | null>(
    null,
  );

  function handleExport() {
    downloadJson(
      buildExportPayload(snapshot.plants, snapshot.rooms),
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
      onNotice(result.error);
      return;
    }
    // Nothing is written until the user has chosen add or replace.
    setPendingImport(result.value);
  }

  function addImport() {
    if (!pendingImport) return;
    const { plantsAdded, roomsAdded } = actions.mergeIn(pendingImport);
    setPendingImport(null);
    onNotice(
      roomsAdded > 0
        ? `Added ${plural(plantsAdded, "plant", "plants")} and ${plural(roomsAdded, "new room", "new rooms")}.`
        : `Added ${plural(plantsAdded, "plant", "plants")}.`,
    );
  }

  function replaceWithImport() {
    if (!pendingImport) return;
    const count = pendingImport.plants.length;
    actions.replaceAll(pendingImport);
    setPendingImport(null);
    onNotice(
      `Replaced everything with ${plural(count, "plant", "plants")} from the file.`,
    );
  }

  const existing = snapshot.plants.length;
  const incoming = pendingImport?.plants.length ?? 0;

  return (
    <>
      <footer className="mt-12 border-t border-border-subtle pt-6">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          Backup
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Your plants are saved in this browser only. Export a copy to keep a
          backup, or to move them to another device. When you import, you choose
          whether to add the file to your list or replace it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={existing === 0}
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
        </div>
      </footer>

      {pendingImport && (
        <ModalDialog
          title={`Import ${plural(incoming, "plant", "plants")}`}
          onCancel={() => setPendingImport(null)}
          // Add is listed last so it sits in the default position, and is the
          // only one toned as primary. Replace is reachable but never the
          // path of least resistance.
          actions={[
            {
              label: "Replace everything",
              // Outlined, not filled: it must be reachable without being the
              // loudest button in a dialog whose safe option is the default.
              tone: "danger-quiet",
              onClick: replaceWithImport,
            },
            {
              label: "Add to my plants",
              tone: "primary",
              onClick: addImport,
            },
          ]}
        >
          <dl className="space-y-3">
            <div>
              <dt className="font-medium text-foreground">Add to my plants</dt>
              <dd>
                Keeps the {plural(existing, "plant", "plants")} you already
                have and adds these {incoming}, leaving you with{" "}
                {plural(existing + incoming, "plant", "plants")}. Nothing is
                removed.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-status-overdue">
                Replace everything
              </dt>
              <dd>
                Deletes your {plural(existing, "plant", "plants")} and all your
                rooms, leaving only what is in this file. This can&apos;t be
                undone.
              </dd>
            </div>
          </dl>
        </ModalDialog>
      )}
    </>
  );
}
