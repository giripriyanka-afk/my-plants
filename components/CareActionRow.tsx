"use client";

import { computeCareStatus, type DueStatus } from "@/lib/care";
import { MAX_INTERVAL_DAYS, MIN_INTERVAL_DAYS } from "@/lib/constants";
import { formatIsoDay, relativeDayLabel } from "@/lib/dates";
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

function badgeText(
  status: DueStatus,
  daysUntilDue: number | null,
  dueDate: IsoDay | null,
  today: IsoDay,
): string {
  if (status === "never" || dueDate === null) return "Not yet recorded";
  if (status === "due") return "Due today";
  if (status === "overdue") {
    const overdueBy = -(daysUntilDue ?? 0);
    return `Overdue by ${overdueBy} ${overdueBy === 1 ? "day" : "days"}`;
  }
  return `Due ${relativeDayLabel(dueDate, today)}`;
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

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-subtle py-2 first:border-t-0">
      {/* basis-full puts the label on its own line on a phone; min-w-0 stops a
          long badge from forcing horizontal page scroll. */}
      <span className="flex min-w-0 basis-full items-center gap-2 sm:basis-auto sm:flex-1">
        <span aria-hidden="true">{meta.emoji}</span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span
          className={`truncate rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASS[status.status]}`}
          title={
            status.lastDone
              ? `${meta.pastLabel} ${formatIsoDay(status.lastDone)}`
              : `Never ${meta.pastLabel.toLowerCase()}`
          }
        >
          {badgeText(status.status, status.daysUntilDue, status.dueDate, today)}
        </span>
      </span>

      <span className="ml-auto flex items-center gap-1.5">
        <span className="flex items-center rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() =>
              actions.setCareInterval(plantId, action, care.intervalDays - 1)
            }
            disabled={care.intervalDays <= MIN_INTERVAL_DAYS}
            aria-label={`Decrease ${meta.label.toLowerCase()} interval`}
            className="size-11 rounded-l-lg text-lg leading-none hover:bg-surface-muted disabled:opacity-30 sm:size-9"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_INTERVAL_DAYS}
            max={MAX_INTERVAL_DAYS}
            value={care.intervalDays}
            onChange={(event) => {
              const next = Number(event.target.value);
              // An empty or non-numeric field yields NaN — leave the stored
              // value alone rather than clamping it to the minimum mid-typing.
              if (Number.isFinite(next) && event.target.value !== "") {
                actions.setCareInterval(plantId, action, next);
              }
            }}
            aria-label={`${meta.label} every N days`}
            className="w-12 border-x border-border-subtle bg-transparent py-1 text-center text-base tabular-nums outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-soon [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() =>
              actions.setCareInterval(plantId, action, care.intervalDays + 1)
            }
            disabled={care.intervalDays >= MAX_INTERVAL_DAYS}
            aria-label={`Increase ${meta.label.toLowerCase()} interval`}
            className="size-11 rounded-r-lg text-lg leading-none hover:bg-surface-muted disabled:opacity-30 sm:size-9"
          >
            +
          </button>
        </span>
        <span className="text-xs text-muted">days</span>

        <button
          type="button"
          onClick={() => actions.markCareDone(plantId, action)}
          className="min-h-11 rounded-lg bg-foreground px-3 text-xs font-semibold text-background sm:min-h-9"
        >
          Done
        </button>
      </span>
    </div>
  );
}
