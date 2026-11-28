// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The first nine are
// PatchMatch's nine stages, one module of the synth each (STAGE_LESSONS in
// core/campaign.ts ties a stage to its lesson). The plan for the rest (lessons
// 10-23 and the branches) is the doc "Synthesizers: plan for lessons 10 onward".

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type SynthLesson = Lesson & TreeLesson;

const written = import.meta.glob<SynthLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<SynthLesson> = {}): SynthLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: SynthLesson[] = [
];

const BRANCH_COMING: SynthLesson[] = [
];

/** The branches: the other kinds of oscillator, and the studio around the synth. */
export const BRANCHES: TreeBranch[] = [
  { id: 'engines', title: 'Other oscillators', promise: 'Wavetables, organs, plucked strings, talking synths, samples and grains', from: 'macros', kind: 'further', color: 'var(--b-gold)', prefix: 'O' },
  { id: 'studio', title: 'Around the synth', promise: 'Reverb, and how a room answers a sound', from: 'echo', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'S' },
];

const all = [...Object.values(written), ...TRUNK_COMING, ...BRANCH_COMING].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "H2"). */
export const LESSONS: readonly SynthLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly SynthLesson[] = LESSONS.filter((l) => !l.coming);
