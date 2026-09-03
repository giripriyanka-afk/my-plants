"use client";

import { useEffect, useId, useRef, useState } from "react";

import { usePlants } from "@/hooks/usePlants";
import { MAX_ROOM_NAME_LENGTH, MAX_ROOMS } from "@/lib/constants";
import type { Plant, Room } from "@/types/plant";

/**
 * Add, rename, reorder and delete rooms. Every action commits immediately —
 * unlike the plant details form, each one is a single discrete change with an
 * obvious undo (rename it back, add it again), so a Save button would only add
 * a step.
 */
export default function RoomsDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, actions } = usePlants();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const newRoomId = useId();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newName.trim().length === 0) return;
    actions.addRoom(newName);
    setNewName("");
  }

  const atLimit = snapshot.rooms.length >= MAX_ROOMS;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-0 w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50 sm:m-auto sm:w-[min(32rem,calc(100vw-2rem))]"
    >
      <div className="mt-auto flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border border-border-subtle bg-surface p-5 text-foreground shadow-xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold">Rooms</h2>
        <p className="mt-1 text-xs text-muted">
          Plants are grouped by room on the main page, in this order.
        </p>

        <ul className="mt-4 space-y-2">
          {snapshot.rooms.map((room, index) => (
            <RoomRow
              key={room.id}
              room={room}
              index={index}
              total={snapshot.rooms.length}
              plants={snapshot.plants}
            />
          ))}
        </ul>

        {snapshot.rooms.length === 0 && (
          <p className="mt-4 rounded-lg border border-dashed border-border-subtle p-4 text-center text-sm text-muted">
            No rooms yet. Every plant will show under &ldquo;Unassigned&rdquo;.
          </p>
        )}

        <form onSubmit={handleAdd} className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor={newRoomId} className="text-sm font-medium">
              Add a room
            </label>
            <input
              id={newRoomId}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={MAX_ROOM_NAME_LENGTH}
              placeholder="Hallway"
              disabled={atLimit}
              className="mt-1 min-h-11 w-full rounded-lg border border-border-subtle bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-status-soon disabled:opacity-40"
            />
          </div>
          <button
            type="submit"
            disabled={newName.trim().length === 0 || atLimit}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            Add
          </button>
        </form>
        {atLimit && (
          <p className="mt-1 text-xs text-muted">
            That&apos;s the maximum of {MAX_ROOMS} rooms.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-border-subtle px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}

function RoomRow({
  room,
  index,
  total,
  plants,
}: {
  room: Room;
  index: number;
  total: number;
  plants: readonly Plant[];
}) {
  const { actions } = usePlants();
  const [name, setName] = useState(room.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const count = plants.filter((plant) => plant.roomId === room.id).length;

  return (
    <li className="rounded-lg border border-border-subtle p-2">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim().length === 0) setName(room.name);
            else actions.renameRoom(room.id, name);
          }}
          maxLength={MAX_ROOM_NAME_LENGTH}
          aria-label={`Rename ${room.name}`}
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-base outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-status-soon"
        />
        <span className="shrink-0 text-xs whitespace-nowrap text-muted tabular-nums">
          {count} {count === 1 ? "plant" : "plants"}
        </span>
        <button
          type="button"
          onClick={() => actions.moveRoom(room.id, -1)}
          disabled={index === 0}
          aria-label={`Move ${room.name} up`}
          className="size-11 shrink-0 rounded-lg hover:bg-surface-muted disabled:opacity-30 sm:size-9"
        >
          â†‘
        </button>
        <button
          type="button"
          onClick={() => actions.moveRoom(room.id, 1)}
          disabled={index === total - 1}
          aria-label={`Move ${room.name} down`}
          className="size-11 shrink-0 rounded-lg hover:bg-surface-muted disabled:opacity-30 sm:size-9"
        >
          â†“
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Delete ${room.name}`}
          className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-medium text-status-overdue hover:bg-status-overdue-bg sm:min-h-9"
        >
          Delete
        </button>
      </div>

      {confirmingDelete && (
        <div className="mt-2 rounded-lg bg-status-overdue-bg p-3 text-sm text-status-overdue">
          <p>
            Delete {room.name}?
            {count > 0 &&
              ` Its ${count} ${count === 1 ? "plant moves" : "plants move"} to Unassigned — no plant is deleted.`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="min-h-11 rounded-lg border border-border-subtle px-3 text-xs font-medium text-foreground hover:bg-surface-muted sm:min-h-9"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => actions.deleteRoom(room.id)}
              className="min-h-11 rounded-lg bg-status-overdue px-3 text-xs font-semibold text-white sm:min-h-9"
            >
              Delete room
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
