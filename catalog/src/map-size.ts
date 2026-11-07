// The map's drawing space: map.json places each course in it, x across and y down.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 1000;
/** How far a shelf's region reaches past its outermost courses: room for the shelf's name above and the titles below. */
export const REGION_PAD = { side: 100, top: 85, bottom: 100 };
/** The least distance between two courses on the map, so their titles never collide. */
export const MIN_GAP = 190;
