"use client";

import CareBadge from "@/components/CareBadge";
import { computeCareStatus } from "@/lib/care";
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

export default function CareActionRow({ plantId, action, care, today }: Props) {
  const { actions } = usePlants();
  const meta = CARE_ACTION_META[action];
  const status = computeCareStatus(action, care, today);

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

      <CareBadge status={status} />

      <span className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums">
        every {care.intervalDays}d
      </span>

      <button
        type="button"
        onClick={() => actions.markCareDone(plantId, action)}
        className="min-h-11 shrink-0 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-foreground sm:min-h-9"
      >
        Done
      </button>
    </div>
  );
}
