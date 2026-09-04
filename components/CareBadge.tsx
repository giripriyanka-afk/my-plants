"use client";

import type { CareStatus, DueStatus } from "@/lib/care";
import { formatDurationShort, formatIsoDay } from "@/lib/dates";
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

/** Solid fills, unlike the badge's tinted background — a 10px dot needs them. */
const DOT_CLASS: Record<DueStatus, string> = {
  never: "bg-status-never",
  overdue: "bg-status-overdue",
  due: "bg-status-due",
  soon: "bg-status-soon",
  ok: "bg-status-ok",
};

/**
 * The whole-plant summary shown beside the name on a collapsed card, so an
 * overdue plant is visible without expanding it.
 *
 * Colour alone can't carry this (WCAG 1.4.1), so the accessible name spells the
 * state out and doubles as the hover tooltip.
 */
export function CareStatusDot({
  status,
  needsAttention,
}: {
  status: DueStatus;
  needsAttention: number;
}) {
  const label =
    needsAttention > 0
      ? `${needsAttention} ${needsAttention === 1 ? "action needs" : "actions need"} attention`
      : status === "soon"
        ? "Something is due soon"
        : "All up to date";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-block size-2.5 shrink-0 rounded-full ${DOT_CLASS[status]}`}
    />
  );
}

/** Deliberately short — the compact row has to fit one line at phone width. */
export function badgeText(status: CareStatus): string {
  if (status.status === "never" || status.dueDate === null) return "Never";
  if (status.status === "due") return "Due today";
  if (status.status === "overdue") {
    return `Overdue ${formatDurationShort(-(status.daysUntilDue ?? 0))}`;
  }
  return `Due in ${formatDurationShort(status.daysUntilDue ?? 0)}`;
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
