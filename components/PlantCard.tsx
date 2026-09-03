"use client";

import Link from "next/link";
import { useId, useState } from "react";

import CareActionRow from "@/components/CareActionRow";
import { CareStatusDot } from "@/components/CareBadge";
import { computePlantStatus } from "@/lib/care";
import { CARE_ACTIONS, type IsoDay, type Plant } from "@/types/plant";

interface Props {
  plant: Plant;
  today: IsoDay;
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export default function PlantCard({ plant, today, onEdit, onDelete }: Props) {
  // Collapsed by default: a card at rest is name, description, Edit, Delete.
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Reuses the same severity model the urgency sort runs on, so the dot and the
  // card's position in its room can never disagree.
  const { statuses, worst } = computePlantStatus(plant, today);
  const needsAttention = statuses.filter(
    (s) => s.status === "overdue" || s.status === "due" || s.status === "never",
  ).length;

  return (
    <article className="flex flex-col rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {/* Only the name is the link. The card holds four Done buttons plus
              Edit and Delete, so wrapping the whole thing in an anchor would
              nest interactive elements. */}
          {/* The dot sits inline in the text flow, not as a flex sibling. Its
              wrapper is exactly one line box tall (h-7 == text-lg's 1.75rem
              line-height) and centres the dot inside it, so the dot lands on
              the optical middle of the first line however the name wraps. */}
          <h2 className="text-lg font-semibold break-words">
            <span className="mr-2 inline-flex h-7 items-center align-top">
              <CareStatusDot status={worst} needsAttention={needsAttention} />
            </span>
            <Link
              href={`/plants/${encodeURIComponent(plant.id)}`}
              className="rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-status-soon"
            >
              {plant.name}
            </Link>
          </h2>
          {plant.description && (
            <p className="mt-1 line-clamp-3 text-sm break-words text-muted">
              {plant.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(plant)}
            aria-label={`Edit ${plant.name}`}
            className="min-h-11 min-w-11 rounded-lg text-sm hover:bg-surface-muted"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(plant)}
            aria-label={`Delete ${plant.name}`}
            className="min-h-11 min-w-11 rounded-lg text-sm text-status-overdue hover:bg-status-overdue-bg"
          >
            Delete
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground"
      >
        <span>Care</span>
        <Chevron open={open} />
      </button>

      {/* Rendered even while collapsed and hidden with the `hidden` attribute,
          so aria-controls always points at a real element. One row per action,
          driven off the CARE_ACTIONS tuple rather than four hardcoded copies. */}
      <div id={panelId} hidden={!open} className="mt-1">
        {CARE_ACTIONS.map((action) => (
          <CareActionRow
            key={action}
            plantId={plant.id}
            action={action}
            care={plant.care[action]}
            today={today}
          />
        ))}
      </div>
    </article>
  );
}
