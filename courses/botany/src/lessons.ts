// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type PlantLesson = Lesson & TreeLesson;

const written = import.meta.glob<PlantLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<PlantLesson> = {}): PlantLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: PlantLesson[] = [
];

const BRANCH_COMING: PlantLesson[] = [
];

/** The branches: naming plants, crops, and odd plants. */
export const BRANCHES: TreeBranch[] = [
  { id: 'keys', title: 'Naming and keying plants', promise: 'Names, keys, families and deadly look-alikes', from: 'orchid', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'K' },
  { id: 'crops', title: 'Crops and breeding', promise: 'Mendel, maize, Palouse wheat and Wenatchee apples', from: 'orchid', kind: 'people', color: 'var(--b-clay)', prefix: 'C' },
  { id: 'odd', title: 'Odd plants', promise: 'Flytraps, thieves, giants and flowers that make heat', from: 'bending', kind: 'further', color: 'var(--b-gold)', prefix: 'O' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "T2"). */
export const LESSONS: readonly PlantLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly PlantLesson[] = LESSONS.filter((l) => !l.coming);
