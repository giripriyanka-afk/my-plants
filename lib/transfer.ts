import { todayIsoDay } from "@/lib/dates";
import {
  SCHEMA_VERSION,
  type Plant,
  type PlantsExport,
  type Room,
} from "@/types/plant";

export function buildExportPayload(
  plants: readonly Plant[],
  rooms: readonly Room[],
): PlantsExport {
  return {
    app: "my-plants",
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    // Rooms travel with the plants, otherwise importing on another machine
    // would drop every plant into Unassigned.
    rooms: [...rooms],
    plants: [...plants],
  };
}

export function suggestedExportFilename(): string {
  return `my-plants-${todayIsoDay()}.json`;
}

/** Pretty-printed so the backup file is readable and diffable in a text editor. */
export function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
