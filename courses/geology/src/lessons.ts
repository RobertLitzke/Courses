// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type GeoLesson = Lesson & TreeLesson;

const written = import.meta.glob<GeoLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. Every planned lesson is written now; kept for the next ones. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<GeoLesson> = {}): GeoLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: GeoLesson[] = [
];

const BRANCH_COMING: GeoLesson[] = [
];

/** The branches: Pacific Northwest geology, read with what the trunk teaches, and three that go further than the trunk (the Moon, fossils, the deep Earth). */
export const BRANCHES: TreeBranch[] = [
  { id: 'whidbey', title: 'Whidbey Island', promise: 'Bluffs, kettles, terranes and a fault', from: 'kettles', kind: 'local', color: 'var(--b-sound)', prefix: 'W' },
  { id: 'seattle', title: 'Seattle', promise: 'Drumlins, a fault under downtown, slides and fill', from: 'faults', kind: 'local', color: 'var(--b-fir)', prefix: 'S' },
  { id: 'floods', title: 'The ice age floods', promise: 'A lake that drained in days, again and again', from: 'kettles', kind: 'local', color: 'var(--b-lichen)', prefix: 'F' },
  { id: 'cascadia', title: 'Cascadia', promise: 'The 1700 earthquake and the volcanoes', from: 'barnacles', kind: 'local', color: 'var(--b-moss)', prefix: 'C' },
  { id: 'moon', title: 'The Moon and planets', promise: 'Craters, Apollo’s rocks and where the Moon came from', from: 'age', kind: 'further', color: 'var(--b-moon)', prefix: 'P' },
  { id: 'fossils', title: 'Fossils', promise: 'The chemistry that turns wood and bone to stone', from: 'smith', kind: 'further', color: 'var(--b-sand)', prefix: 'L' },
  { id: 'deep', title: 'Deep Earth', promise: 'Weighing the planet, earthquake waves and the deepest hole', from: 'quakes', kind: 'further', color: 'var(--b-ember)', prefix: 'D' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "W2"). */
export const LESSONS: readonly GeoLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly GeoLesson[] = LESSONS.filter((l) => !l.coming);
