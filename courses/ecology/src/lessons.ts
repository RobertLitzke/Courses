// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type EcoLesson = Lesson & TreeLesson;

const written = import.meta.glob<EcoLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<EcoLesson> = {}): EcoLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: EcoLesson[] = [
];

const BRANCH_COMING: EcoLesson[] = [
];

/** The branches: three that carry the trunk's ideas further, and three on the Pacific Northwest. */
export const BRANCHES: TreeBranch[] = [
  { id: 'people', title: 'People in the web', promise: 'Poisons, newcomers and a fishery that collapsed', from: 'pyramid', kind: 'people', color: 'var(--b-madder)', prefix: 'H' },
  { id: 'ants', title: 'Ants and other societies', promise: 'Trails, sterile workers and fungus farms', from: 'acacia', kind: 'further', color: 'var(--b-gold)', prefix: 'N' },
  { id: 'tidepools', title: 'Tide pools of the Salish Sea', promise: 'Zones, a sea star plague and the otters’ return', from: 'seastar', kind: 'local', color: 'var(--b-sound)', prefix: 'T' },
  { id: 'helens', title: 'Mount St Helens', promise: 'Life after the 1980 blast', from: 'glacier-bay', kind: 'local', color: 'var(--b-moss)', prefix: 'M' },
  { id: 'dry', title: 'The dry side', promise: 'Shrub-steppe, cheatgrass and the Palouse', from: 'humboldt', kind: 'local', color: 'var(--b-lichen)', prefix: 'S' },
  { id: 'salmon', title: 'Salmon and Lake Washington', promise: 'Ocean nitrogen in the forest, and a lake that cleared', from: 'curtain', kind: 'local', color: 'var(--b-fir)', prefix: 'W' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "T2"). */
export const LESSONS: readonly EcoLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly EcoLesson[] = LESSONS.filter((l) => !l.coming);
