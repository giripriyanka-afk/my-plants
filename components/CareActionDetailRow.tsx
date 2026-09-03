"use client";

import CareBadge from "@/components/CareBadge";
import { computeCareStatus } from "@/lib/care";
import { formatIsoDay, relativeDayLabel } from "@/lib/dates";
import { usePlants } from "@/hooks/usePlants";
import {
  CARE_ACTION_META,
  type CareActionId,
  type CareState,
  type IsoDay,
} from "@/types/plant";

interface Props {
  plantId: string;
  action: CareActionId;
  care: CareState;
  today: IsoDay;
}

/**
 * The wide counterpart to CareActionRow. That one is built to survive phone
 * width in a card — truncated, abbreviated, dates hidden in a tooltip. Here
 * there is room to spell everything out, so reusing it would make the detail
 * page show less than the card's tooltip does.
 */
export default function CareActionDetailRow({
  plantId,
  action,
  care,
  today,
}: Props) {
  const { actions } = usePlants();
  const meta = CARE_ACTION_META[action];
  const status = computeCareStatus(action, care, today);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden="true">{meta.emoji}</span>
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <CareBadge status={status} />

        <span className="ml-auto flex items-center gap-2">
          {status.lastDone && (
            <button
              type="button"
              onClick={() => actions.clearCareDone(plantId, action)}
              className="min-h-11 rounded-lg border border-border-subtle px-3 text-xs font-medium hover:bg-surface-muted sm:min-h-9"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => actions.markCareDone(plantId, action)}
            className="min-h-11 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-foreground sm:min-h-9"
          >
            Done today
          </button>
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-muted">Last {meta.pastLabel.toLowerCase()}</dt>
          <dd className="tabular-nums">
            {status.lastDone
              ? `${formatIsoDay(status.lastDone)} (${relativeDayLabel(status.lastDone, today)})`
              : "Not recorded"}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-muted">Next due</dt>
          <dd className="tabular-nums">
            {status.dueDate
              ? `${formatIsoDay(status.dueDate)} (${relativeDayLabel(status.dueDate, today)})`
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-xs text-muted">Every</dt>
          <dd className="tabular-nums">
            {care.intervalDays} {care.intervalDays === 1 ? "day" : "days"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
