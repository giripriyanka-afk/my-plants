"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/constants";
import type { Plant } from "@/types/plant";

interface Props {
  /** null = adding a new plant; a Plant = editing that one. */
  plant: Plant | null;
  onSave: (values: { name: string; description: string }) => void;
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameId = useId();
  const descriptionId = useId();

  const [name, setName] = useState(plant?.name ?? "");
  const [description, setDescription] = useState(plant?.description ?? "");

  useEffect(() => {
    // showModal(), not the `open` attribute — the attribute alone renders a
    // non-modal dialog with no backdrop and no focus trap.
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    onSave({ name: trimmed, description });
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:w-[min(32rem,calc(100vw-2rem))]"
    >
      {/* max-sm:mt-auto pins the sheet to the bottom edge on a phone, where a
          top-layer dialog is otherwise centred by margin:auto. */}
      <form
        onSubmit={handleSubmit}
        className="mt-auto flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border border-border-subtle bg-surface p-5 text-foreground shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">
          {plant ? "Edit plant" : "Add a plant"}
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
            className="min-h-11 rounded-lg bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40"
          >
            {plant ? "Save changes" : "Add plant"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
