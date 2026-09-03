"use client";

import { useEffect, useId, useRef, useState } from "react";

import { usePlants } from "@/hooks/usePlants";
import { clampInterval } from "@/lib/care";
import {
  DEFAULT_INTERVAL_DAYS,
  MAX_DESCRIPTION_LENGTH,
  MAX_INTERVAL_DAYS,
  MAX_NAME_LENGTH,
  MIN_INTERVAL_DAYS,
} from "@/lib/constants";
import {
  CARE_ACTIONS,
  CARE_ACTION_META,
  type CareActionId,
  type Plant,
} from "@/types/plant";

export interface PlantFormValues {
  name: string;
  description: string;
  intervals: Record<CareActionId, number>;
  /**
   * Room lives here rather than in the detail form: it decides which group a
   * card appears under, so it belongs on the surface you reach from the list,
   * where plants get placed in bulk.
   */
  roomId: string | null;
}

interface Props {
  /** null = adding a new plant; a Plant = editing that one. */
  plant: Plant | null;
  onSave: (values: PlantFormValues) => void;
  onClose: () => void;
}

/**
 * Native <dialog>: focus trapping, Esc-to-close, top-layer stacking and an
 * inert background all come for free, with no dependency.
 *
 * The caller mounts this only while the form is open, and keys it by plant, so
 * the fields initialize straight from props. That avoids syncing state in an
 * effect, and means an abandoned edit can't leak into the next one.
 */
export default function PlantFormDialog({ plant, onSave, onClose }: Props) {
  const { snapshot } = usePlants();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameId = useId();
  const descriptionId = useId();
  const roomSelectId = useId();
  const isNew = plant === null;

  const [name, setName] = useState(plant?.name ?? "");
  const [description, setDescription] = useState(plant?.description ?? "");
  const [roomId, setRoomId] = useState<string | null>(plant?.roomId ?? null);

  // Held as text so the field can be cleared mid-typing without snapping back
  // to a clamped value. Clamped once, on submit.
  const [intervalText, setIntervalText] = useState<Record<CareActionId, string>>(
    () =>
      Object.fromEntries(
        CARE_ACTIONS.map((action) => [
          action,
          String(plant?.care[action].intervalDays ?? DEFAULT_INTERVAL_DAYS),
        ]),
      ) as Record<CareActionId, string>,
  );

  useEffect(() => {
    // showModal(), not the `open` attribute — the attribute alone renders a
    // non-modal dialog with no backdrop and no focus trap.
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    onSave({
      name: trimmed,
      description,
      roomId,
      intervals: Object.fromEntries(
        CARE_ACTIONS.map((action) => [
          action,
          clampInterval(Number(intervalText[action])),
        ]),
      ) as Record<CareActionId, number>,
    });
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:w-[min(32rem,calc(100vw-2rem))]"
    >
      {/* mt-auto pins the sheet to the bottom edge on a phone, where a
          top-layer dialog is otherwise centred by margin:auto. */}
      <form
        onSubmit={handleSubmit}
        className="mt-auto flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border border-border-subtle bg-surface p-5 text-foreground shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">
          {isNew ? "Add a plant" : "Edit plant"}
        </h2>

        <label htmlFor={nameId} className="mt-4 text-sm font-medium">
          Name
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_NAME_LENGTH}
          required
          autoFocus
          placeholder="Monstera"
          /* text-base (16px) is required — anything smaller triggers iOS
             Safari's auto-zoom-on-focus. */
          className="mt-1 min-h-11 w-full rounded-lg border border-border-subtle bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
        />

        <label htmlFor={descriptionId} className="mt-4 text-sm font-medium">
          Description
        </label>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          placeholder="Bright indirect light, by the kitchen window."
          className="mt-1 w-full resize-y rounded-lg border border-border-subtle bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
        />
        <p className="mt-1 text-xs text-muted">
          {description.length} / {MAX_DESCRIPTION_LENGTH}
        </p>

        <label htmlFor={roomSelectId} className="mt-4 text-sm font-medium">
          Room
        </label>
        <select
          id={roomSelectId}
          value={roomId ?? ""}
          onChange={(event) => setRoomId(event.target.value || null)}
          className="mt-1 min-h-11 w-full rounded-lg border border-border-subtle bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
        >
          <option value="">Unassigned</option>
          {snapshot.rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        {/* Shown for both add and edit — the pencil on a care row reopens this
            dialog rather than editing the schedule inline. */}
        <fieldset className="mt-4 border-0 p-0">
          <legend className="text-sm font-medium">How often?</legend>
          <p className="mt-0.5 text-xs text-muted">
            Days between each action.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CARE_ACTIONS.map((action) => {
              const meta = CARE_ACTION_META[action];
              return (
                <label
                  key={action}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span aria-hidden="true">{meta.emoji}</span>
                    <span className="truncate">{meta.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN_INTERVAL_DAYS}
                      max={MAX_INTERVAL_DAYS}
                      value={intervalText[action]}
                      onChange={(event) =>
                        setIntervalText((current) => ({
                          ...current,
                          [action]: event.target.value,
                        }))
                      }
                      aria-label={`${meta.label} every N days`}
                      className="w-14 rounded-md border border-border-subtle bg-background px-2 py-1 text-center text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-status-soon"
                    />
                    <span className="text-xs text-muted">days</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            {isNew ? "Add plant" : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
