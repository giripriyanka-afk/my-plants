"use client";

import { useEffect, useRef } from "react";

import type { Plant } from "@/types/plant";

interface Props {
  plant: Plant;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Mounted only while a delete is pending, so showModal() runs once, on mount. */
export default function ConfirmDeleteDialog({
  plant,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:w-[min(28rem,calc(100vw-2rem))]"
    >
      <div className="mt-auto rounded-t-2xl border border-border-subtle bg-surface p-5 text-foreground shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold">Delete this plant?</h2>
        <p className="mt-2 text-sm break-words text-muted">
          {plant.name} and its care dates will be removed. This can&apos;t be
          undone.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-status-overdue px-4 text-sm font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
