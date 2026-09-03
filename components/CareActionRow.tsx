"use client";

import { computeCareStatus, type DueStatus } from "@/lib/care";
import { formatIsoDay } from "@/lib/dates";
import { usePlants } from "@/hooks/usePlants";
import {
  CARE_ACTION_META,
  type CareActionId,
  type CareState,
  type IsoDay,
} from "@/types/plant";

const BADGE_CLASS: Record<DueStatus, string> = {
  never: "bg-status-never-bg text-status-never",
  overdue: "bg-status-overdue-bg text-status-overdue",
  due: "bg-status-due-bg text-status-due",
  soon: "bg-status-soon-bg text-status-soon",
  ok: "bg-status-ok-bg text-status-ok",
};

/** Kept short so the whole row fits on one line down to phone width. */
function badgeText(
  status: DueStatus,
  daysUntilDue: number | null,
  dueDate: IsoDay | null,
): string {
  if (status === "never" || dueDate === null) return "Never";
  if (status === "due") return "Due today";
  if (status === "overdue") return `Overdue ${-(daysUntilDue ?? 0)}d`;
  return `Due in ${daysUntilDue}d`;
}

interface Props {
  plantId: string;
  action: CareActionId;
  care: CareState;
  today: IsoDay;
}

export default function CareActionRow({ plantId, action, care, today }: Props) {
  const { actions } = usePlants();
  const meta = CARE_ACTION_META[action];
  const status = computeCareStatus(action, care, today);

  const title = status.lastDone
    ? `${meta.pastLabel} ${formatIsoDay(status.lastDone)}${
        status.dueDate ? ` · due ${formatIsoDay(status.dueDate)}` : ""
      }`
    : `Never ${meta.pastLabel.toLowerCase()}`;

  return (
    // One line at every width: nothing wraps, and the label is the only part
    // allowed to shrink.
    <div className="flex flex-nowrap items-center gap-2 border-t border-border-subtle py-2 first:border-t-0 sm:gap-3">
      <span aria-hidden="true" className="shrink-0">
        {meta.emoji}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {meta.label}
      </span>

      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[status.status]}`}
        title={title}
      >
        {badgeText(status.status, status.daysUntilDue, status.dueDate)}
      </span>

      <span className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums">
        every {care.intervalDays}d
      </span>

      <button
        type="button"
        onClick={() => actions.markCareDone(plantId, action)}
        className="min-h-11 shrink-0 rounded-lg bg-foreground px-3 text-xs font-semibold text-background sm:min-h-9"
      >
        Done
      </button>
    </div>
  );
}
