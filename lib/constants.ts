export const STORAGE_KEY = "myplants:data";

export const DEFAULT_INTERVAL_DAYS = 14;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 3650;

/** Anything due within this many days counts as "soon". */
export const DUE_SOON_WINDOW_DAYS = 3;

export const MAX_NAME_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_PASSPORT_LENGTH = 500;
export const MAX_CARE_NOTES_LENGTH = 2000;
export const MAX_LOCATION_LENGTH = 80;
export const MAX_ROOM_NAME_LENGTH = 40;
export const MAX_ROOMS = 50;

/** Guards against JSON.parse freezing the tab on an accidentally huge file. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
