import { sortPlantsByUrgency } from "@/lib/care";
import type { IsoDay, Plant, Room } from "@/types/plant";

export interface RoomGroup {
  /** null is the "Unassigned" group, always rendered last. */
  room: Room | null;
  plants: Plant[];
}

/**
 * Groups plants under their room, in the user's room order, with unassigned
 * plants last. Rooms with no plants are dropped — an empty heading is noise.
 * Within a group the existing urgency sort still applies, so the most
 * neglected plant in each room stays at the top.
 */
export function groupPlantsByRoom(
  plants: readonly Plant[],
  rooms: readonly Room[],
  today: IsoDay,
): RoomGroup[] {
  const byRoom = new Map<string | null, Plant[]>();
  for (const plant of plants) {
    const key = plant.roomId;
    const bucket = byRoom.get(key);
    if (bucket) bucket.push(plant);
    else byRoom.set(key, [plant]);
  }

  const groups: RoomGroup[] = [];
  for (const room of rooms) {
    const bucket = byRoom.get(room.id);
    if (bucket?.length) {
      groups.push({ room, plants: sortPlantsByUrgency(bucket, today) });
    }
  }

  const unassigned = byRoom.get(null);
  if (unassigned?.length) {
    groups.push({ room: null, plants: sortPlantsByUrgency(unassigned, today) });
  }

  return groups;
}
