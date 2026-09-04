"use client";

import { useId, useState } from "react";

import {
  MAX_CARE_NOTES_LENGTH,
  MAX_PASSPORT_LENGTH,
} from "@/lib/constants";
import { isIsoDay } from "@/lib/dates";
import {
  LIGHT_LEVELS,
  LIGHT_LEVEL_LABEL,
  type IsoDay,
  type LightLevel,
  type Plant,
} from "@/types/plant";

export interface DetailsPatch {
  purchasedOn: IsoDay | null;
  passport: string;
  careNotes: string;
  light: LightLevel;
}

interface DetailsDraft {
  /** Raw <input type="date"> value: "" or "YYYY-MM-DD". Normalized on submit. */
  purchasedOn: string;
  passport: string;
  careNotes: string;
  light: LightLevel;
}

const DRAFT_KEYS = [
  "purchasedOn",
  "passport",
  "careNotes",
  "light",
] as const;

function toDraft(plant: Plant): DetailsDraft {
  return {
    purchasedOn: plant.purchasedOn ?? "",
    passport: plant.passport,
    careNotes: plant.careNotes,
    light: plant.light,
  };
}

interface Props {
  plant: Plant;
  onSave: (patch: DetailsPatch) => void;
}

/**
 * Explicit Save/Cancel over a local draft, not save-on-keystroke: every write
 * is a JSON.stringify of the whole document plus a synchronous setItem, so
 * typing a long note would mean hundreds of full-document writes.
 *
 * The caller keys this on plant.id, so the draft seeds from props at mount and
 * is never synced in an effect (react-hooks/set-state-in-effect). Keying on
 * updatedAt instead would look more correct and would silently wipe whatever
 * the user was typing every time a care row was marked done.
 */
export default function PlantDetailsForm({ plant, onSave }: Props) {
  const [draft, setDraft] = useState<DetailsDraft>(() => toDraft(plant));

  const purchasedId = useId();
  const lightId = useId();
  const passportId = useId();
  const notesId = useId();

  // Compared against live props, so once a save commits this flips false with
  // no effect and no remount.
  const saved = toDraft(plant);
  const isDirty = DRAFT_KEYS.some((key) => saved[key] !== draft[key]);

  function set<K extends keyof DetailsDraft>(key: K, value: DetailsDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      purchasedOn: isIsoDay(draft.purchasedOn) ? draft.purchasedOn : null,
      passport: draft.passport,
      careNotes: draft.careNotes,
      light: draft.light,
    });
  }

  const field =
    "mt-1 w-full rounded-lg border border-border-subtle bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border-subtle bg-surface p-4 sm:p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={purchasedId} className="text-sm font-medium">
            Purchased on
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id={purchasedId}
              type="date"
              value={draft.purchasedOn}
              onChange={(event) => set("purchasedOn", event.target.value)}
              className="min-h-11 flex-1 rounded-lg border border-border-subtle bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
            />
            {draft.purchasedOn !== "" && (
              <button
                type="button"
                onClick={() => set("purchasedOn", "")}
                className="min-h-11 rounded-lg border border-border-subtle px-3 text-xs font-medium hover:bg-surface-muted"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Leave empty if you don&apos;t know.
          </p>
        </div>

        <div>
          <label htmlFor={lightId} className="text-sm font-medium">
            Light
          </label>
          <select
            id={lightId}
            value={draft.light}
            onChange={(event) =>
              set("light", event.target.value as LightLevel)
            }
            className={`${field} min-h-11`}
          >
            {LIGHT_LEVELS.map((level) => (
              <option key={level} value={level}>
                {LIGHT_LEVEL_LABEL[level]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={passportId} className="text-sm font-medium">
            Plant passport
          </label>
          <textarea
            id={passportId}
            value={draft.passport}
            onChange={(event) => set("passport", event.target.value)}
            maxLength={MAX_PASSPORT_LENGTH}
            rows={2}
            placeholder="Botanical name, nursery, traceability code, country of origin"
            className={`${field} resize-y py-2`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={notesId} className="text-sm font-medium">
            Care notes
          </label>
          <textarea
            id={notesId}
            value={draft.careNotes}
            onChange={(event) => set("careNotes", event.target.value)}
            maxLength={MAX_CARE_NOTES_LENGTH}
            rows={4}
            placeholder="Let the top 2cm dry out. Sensitive to cold draughts."
            className={`${field} resize-y py-2`}
          />
          <p className="mt-1 text-xs text-muted">
            {draft.careNotes.length} / {MAX_CARE_NOTES_LENGTH}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {isDirty && (
          <p className="mr-auto text-xs text-muted">Unsaved changes</p>
        )}
        <button
          type="button"
          onClick={() => setDraft(toDraft(plant))}
          disabled={!isDirty}
          className="min-h-11 rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isDirty}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-40"
        >
          Save details
        </button>
      </div>
    </form>
  );
}
