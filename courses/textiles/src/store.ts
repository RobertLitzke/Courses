// The save: Didactics' progress (lessons done, review cards, lessons left part
// way). The course keeps nothing of its own yet.

import { createStore } from 'didactics/store';
import { emptyProgress, migrateProgress, type Progress } from 'didactics/progress';

export type TextilesSave = Progress;

export const emptySave = (): TextilesSave => emptyProgress('metric', { fixedUnits: true });

export const migrate = (raw: unknown): TextilesSave => migrateProgress(raw, emptySave());

export const store = createStore<TextilesSave>({ key: 'textiles.save', empty: emptySave, migrate });
