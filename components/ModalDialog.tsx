"use client";

import { useEffect, useRef } from "react";

/**
 * The app's modal shell: title, body, a Cancel, and one or more actions.
 *
 * Native <dialog> gives focus trapping, Esc-to-close, top-layer stacking and an
 * inert background for free. Mounted only while a decision is pending, so
 * showModal() runs once, on mount.
 *
 * Actions are a list rather than a single "confirm" because some decisions have
 * two valid answers — importing a file can either add to the library or replace
 * it, and both are legitimate choices rather than a yes/no.
 */
export interface DialogAction {
  label: string;
  /**
   * "primary" is the safe default and the only filled green.
   * "danger" fills red — for when destroying is the whole point of the dialog.
   * "danger-quiet" outlines instead, for when a destructive option sits beside
   * a safe one and must stay available without being the loudest thing there.
   */
  tone: "primary" | "danger" | "danger-quiet";
  onClick: () => void;
}

const TONE_CLASS: Readonly<Record<DialogAction["tone"], string>> = Object.freeze(
  {
    primary: "bg-accent text-accent-foreground",
    danger: "bg-status-overdue text-white",
    "danger-quiet":
      "border border-status-overdue text-status-overdue hover:bg-status-overdue-bg",
  },
);

interface Props {
  title: string;
  children: React.ReactNode;
  /** Rendered left to right after Cancel, so the last one reads as the default. */
  actions: DialogAction[];
  onCancel: () => void;
}

export default function ModalDialog({
  title,
  children,
  actions,
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
      className="m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:w-[min(30rem,calc(100vw-2rem))]"
    >
      <div className="mt-auto rounded-t-2xl border border-border-subtle bg-surface p-5 text-foreground shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm break-words text-muted">{children}</div>
        {/* flex-col-reverse on a phone puts the default action nearest the
            thumb and the destructive one furthest from it. */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Cancel
          </button>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${TONE_CLASS[action.tone]}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}
