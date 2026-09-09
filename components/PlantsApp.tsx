"use client";

import { useState } from "react";

import BackupSection from "@/components/BackupSection";
import Banner from "@/components/Banner";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PlantCard from "@/components/PlantCard";
import PlantFormDialog from "@/components/PlantFormDialog";
import RoomsDialog from "@/components/RoomsDialog";
import { usePlants } from "@/hooks/usePlants";
import { useToday } from "@/hooks/useToday";
import { groupPlantsByRoom } from "@/lib/rooms";
import type { Plant } from "@/types/plant";

/**
 * Two columns at most, never three: a care row has to hold emoji, label, badge,
 * interval and button on one line, which a three-up card is too narrow for.
 *
 * items-start stops a row stretching every card to match its tallest sibling,
 * which would leave a collapsed card with a column of blank space beside an
 * expanded one.
 */
const CARD_GRID = "grid grid-cols-1 items-start gap-4 xl:grid-cols-2";

/**
 * The single "use client" boundary. Everything it imports joins the client
 * graph automatically, so layout.tsx and page.tsx stay Server Components.
 */
export default function PlantsApp() {
  const { snapshot, actions } = usePlants();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Plant | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Only read once hydration has produced real data, so no date crosses the
  // hydration boundary.
  const today = useToday();

  const isHydrating = snapshot.status === "hydrating";
  const groups = isHydrating
    ? []
    : groupPlantsByRoom(snapshot.plants, snapshot.rooms, today);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Plants</h1>
          <p className="text-sm text-muted">
            {isHydrating
              ? " "
              : `${snapshot.plants.length} ${snapshot.plants.length === 1 ? "plant" : "plants"} in your home. Keep'em thriving!`}
          </p>
        </div>

        {/* flex-wrap rather than a fixed grid: the control count changes as
            features land, and wrapping handles any number of them. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRoomsOpen(true)}
            className="min-h-11 rounded-lg border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted"
          >
            Rooms
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            Add plant
          </button>
        </div>
      </header>

      {snapshot.persistence === "unavailable" && (
        <Banner tone="warning">
          Changes aren&apos;t being saved — this browser is blocking local
          storage. The app still works, but your plants will disappear when you
          close the tab.
        </Banner>
      )}

      {snapshot.lastError && (
        <Banner tone="error" onDismiss={actions.dismissError}>
          {snapshot.lastError}
        </Banner>
      )}

      {notice && (
        <Banner tone="info" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {isHydrating ? (
        // Same grid classes as the real list, so hydration causes no layout shift.
        <div className={`${CARD_GRID} mt-6`} aria-hidden="true">
          <div className="h-56 animate-pulse rounded-xl bg-surface-muted" />
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border-subtle p-10 text-center">
          <p className="text-lg font-medium">No plants yet</p>
          <p className="mt-1 text-sm text-muted">
            Add your first plant to start tracking watering, fertilizing,
            pruning and repotting.
          </p>
        </div>
      ) : (
        // One section per room, in the user's room order, unassigned last.
        // Empty rooms are dropped — a heading with nothing under it is noise.
        groups.map(({ room, plants }) => (
          <section key={room?.id ?? "unassigned"} className="mt-8">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
              {room?.name ?? "Unassigned"}
              <span className="text-xs font-normal normal-case tabular-nums">
                {plants.length}
              </span>
            </h2>
            <div className={`${CARD_GRID} mt-3`}>
              {plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  today={today}
                  onEdit={(target) => {
                    setEditing(target);
                    setFormOpen(true);
                  }}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <BackupSection onNotice={setNotice} />

      {formOpen && (
        <PlantFormDialog
          key={editing?.id ?? "new"}
          plant={editing}
          onSave={({ name, description, intervals, roomId }) => {
            if (editing)
              actions.updatePlant(editing.id, {
                name,
                description,
                intervals,
                roomId,
              });
            else actions.addPlant({ name, description, intervals, roomId });
          }}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          plant={pendingDelete}
          onConfirm={() => {
            actions.deletePlant(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {roomsOpen && <RoomsDialog onClose={() => setRoomsOpen(false)} />}
    </>
  );
}
