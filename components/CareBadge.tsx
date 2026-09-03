"use client";

import type { CareStatus, DueStatus } from "@/lib/care";
import { formatIsoDay } from "@/lib/dates";
import { CARE_ACTION_META } from "@/types/plant";

/**
 * The single source of truth for care-status colour and wording, shared by the
 * compact list row and the detail row. Keeping these in one place is what stops
 * the two presentations drifting apart.
 */

const BADGE_CLASS: Record<DueStatus, string> = {
  never: "bg-status-never-bg text-status-never",
  overdue: "bg-status-overdue-bg text-status-overdue",
  due: "bg-status-due-bg text-status-due",
  soon: "bg-status-soon-bg text-status-soon",
  ok: "bg-status-ok-bg text-status-ok",
};

/** Deliberately short — the compact row has to fit one line at phone width. */
export function badgeText(status: CareStatus): string {
  if (status.status === "never" || status.dueDate === null) return "Never";
  if (status.status === "due") return "Due today";
  if (status.status === "overdue") {
    return `Overdue ${-(status.daysUntilDue ?? 0)}d`;
  }
  return `Due in ${status.daysUntilDue}d`;
}

export default function CareBadge({ status }: { status: CareStatus }) {
  const meta = CARE_ACTION_META[status.action];
  const title = status.lastDone
    ? `${meta.pastLabel} ${formatIsoDay(status.lastDone)}${
        status.dueDate ? ` · due ${formatIsoDay(status.dueDate)}` : ""
      }`
    : `Never ${meta.pastLabel.toLowerCase()}`;

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[status.status]}`}
      title={title}
    >
      {badgeText(status)}
    </span>
  );
}
