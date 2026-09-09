"use client";

import { useRef } from "react";

import { usePlants } from "@/hooks/usePlants";
import {
  buildExportPayload,
  downloadJson,
  suggestedExportFilename,
} from "@/lib/transfer";
import { parsePlantsFile } from "@/lib/validate";

interface Props {
  /** Results are reported upward so all banners render in one place. */
  onNotice: (message: string) => void;
}

/**
 * Export and import, at the foot of the list page.
 *
 * Self-contained by design: it owns the hidden file input and both handlers, so
 * PlantsApp no longer carries file-transfer concerns alongside list rendering.
 * It reads the store directly rather than taking plants as props, the same way
 * the care rows do — the store is global, so threading it through would be
 * ceremony.
 *
 * Backup sits at the foot of the page because it is occasional maintenance
 * rather than a per-visit action, and shouldn't compete with Add plant.
 */
export default function BackupSection({ onNotice }: Props) {
  const { snapshot, actions } = usePlants();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const count = result.value.plants.length;
    const confirmed = window.confirm(
      `Import ${count} ${count === 1 ? "plant" : "plants"}?\n\nThis replaces all ${snapshot.plants.length} plants currently in the app. Export a backup first if you want to keep them.`,
    );
    if (!confirmed) return;

    actions.replaceAll(result.value);
    onNotice(`Imported ${count} ${count === 1 ? "plant" : "plants"}.`);
  }

  return (
    <footer className="mt-12 border-t border-border-subtle pt-6">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Backup
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Your plants are saved in this browser only. Export a copy to keep a
        backup, or to move them to another device.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
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
      </div>
    </footer>
  );
}
