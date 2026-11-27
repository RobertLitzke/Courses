// The save file: what has been learned and how it went. Kept in localStorage by
// app/store.ts. The fields every lesson app has, and their repair, are
// Didactics' progress.ts; this adds what only Clouds keeps, and the moves
// from Clouds' own older lesson ids. All of it can be tested without a browser.

import { emptyProgress, migrateProgress, moveLesson, stringSet, type Progress } from 'didactics/progress';

export { finishLesson, type LessonRecord } from 'didactics/progress';

export interface SaveData extends Progress {
  /** Seeding orders filled, by id (core/orders.ts). */
  orders: string[];
}

export function emptySave(): SaveData {
  // Metric by default; feet are a setting away.
  return { ...emptyProgress('metric', { radio: false }), orders: [] };
}

/** Repair whatever was stored into a valid save, keeping all that can be kept. */
export function migrate(raw: unknown): SaveData {
  const out: SaveData = { ...migrateProgress(raw, emptySave()), orders: [] };
  if (typeof raw === 'object' && raw !== null) out.orders = stringSet((raw as Record<string, unknown>).orders);
  // Until 2026-11-27 the save also kept the radio talks' fields (talk,
  // introSeen, heard); migrateProgress drops them, as emptySave has none.
  // The first lesson, "textures", was split in two (fog, then heaps); having
  // done it counts for both.
  const old = out.lessons.textures;
  if (old) {
    out.lessons.fog ??= { ...old };
    out.lessons.heaps ??= { ...old };
    delete out.lessons.textures;
  }
  // Then the lessons were rebuilt around questions asked of the sky: heaps went
  // into the first lesson, and the two on seeding became one.
  moveLesson(out, 'heaps', 'fog');
  moveLesson(out, 'seeding-limits', 'seeding');
  return out;
}
