// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan. The plan is the outline in
// the project files (philosophy/outline.md, v3 of 27 Nov 2026).

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type PhilosophyLesson = Lesson & TreeLesson;

const written = import.meta.glob<PhilosophyLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<PhilosophyLesson> = {}): PhilosophyLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const COMING: PhilosophyLesson[] = [
  coming('heap', 303, 'When does a heap stop being a heap?', 'The sorites paradox and vague words', { branch: 'tools', needs: ['socrates'] }),
  coming('gettier', 304, 'The three pages that broke knowledge', 'Justified true belief and Gettier\'s 1963 counterexamples', { branch: 'tools', needs: ['hume'] }),
  coming('science', 305, 'How does science know it\'s wrong?', 'Popper\'s falsification, the Vienna Circle, and Kuhn\'s paradigm shifts', { branch: 'tools', needs: ['hume'] }),
  coming('wittgenstein', 306, 'Can you have a private language?', 'Wittgenstein, language games and the beetle in the box', { branch: 'tools', needs: ['hume'] }),
  coming('gibberish', 307, 'Why does some philosophy sound like gibberish?', 'The analytic and continental split, and Heidegger in plain words', { branch: 'tools', needs: ['sartre'] }),
  coming('future', 308, 'What do we owe people who don\'t exist yet?', 'Parfit\'s non-identity problem and duties to future generations', { branch: 'tools', needs: ['singer'] }),
];

/** The branches: philosophy outside Europe, power and politics, and tools and puzzles. */
export const BRANCHES: TreeBranch[] = [
  { id: 'elsewhere', title: 'Elsewhere', promise: 'Daoism, Indian logic, Nahua thought and Ubuntu', from: 'aristotle', color: 'var(--teal)', prefix: 'E' },
  { id: 'power', title: 'Power', promise: 'Machiavelli, Rousseau, Marx, free speech and Arendt', from: 'hobbes', color: 'var(--rose)', prefix: 'P' },
  { id: 'tools', title: 'Tools and puzzles', promise: 'Fallacies, paradoxes, knowledge, science, language and why some philosophy reads as gibberish', from: 'socrates', color: 'var(--violet)', prefix: 'K' },
];

/** How many lessons the trunk has: "Lesson 3 of 25". */
export const TRUNK = 25;

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "K2"). */
export const LESSONS: readonly PhilosophyLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly PhilosophyLesson[] = LESSONS.filter((l) => !l.coming);

/** A lesson by id. */
export const lessonById = (id: string): PhilosophyLesson | undefined => LESSONS.find((l) => l.id === id);
