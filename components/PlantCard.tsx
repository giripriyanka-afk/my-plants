"use client";

import CareActionRow from "@/components/CareActionRow";
import { CARE_ACTIONS, type IsoDay, type Plant } from "@/types/plant";

interface Props {
  plant: Plant;
  today: IsoDay;
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
}

export default function PlantCard({ plant, today, onEdit, onDelete }: Props) {
  return (
    <article className="flex flex-col rounded-xl border border-border-subtle bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold break-words">{plant.name}</h2>
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

      {/* One row per action, driven off the CARE_ACTIONS tuple rather than four
          hardcoded copies. */}
      <div className="mt-3">
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
