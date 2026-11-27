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
  coming('spinoza', 12, 'Could you have done otherwise?', 'Determinism, Spinoza\'s freedom as understanding, compatibilism, and Libet\'s experiment'),
  coming('locke', 13, 'Are you the person you were at ten?', 'Personal identity: the ship of Theseus, memory, the Buddhist chariot and the teletransporter'),
  coming('hume', 14, 'Why do you expect the sun to rise tomorrow?', 'The problem of induction, cause as habit, and is against ought'),
  coming('kant', 15, 'Can you lie to a murderer at the door?', 'Duty, the categorical imperative, and the 1797 argument with Constant'),
  coming('leap', 16, 'Would you obey God if he told you to kill your son?', 'Faith without proof: Pascal\'s wager and Kierkegaard\'s Abraham'),
  coming('mill', 17, 'Is it better to be Socrates dissatisfied than a pig satisfied?', 'Utilitarianism, Mill\'s higher pleasures, the harm principle and the experience machine'),
  coming('nietzsche', 18, 'Who killed God?', 'The death of God, master and slave morality, eternal recurrence, and what his sister did to him'),
  coming('sartre', 19, 'Are you condemned to be free?', 'Existence before essence, bad faith, the student\'s dilemma and responsibility'),
  coming('beauvoir', 20, 'Is a woman born or made?', 'The Second Sex, the Other, freedom in a situation, and Sor Juana and Wollstonecraft before her'),
  coming('camus', 21, 'Should we imagine Sisyphus happy?', 'The absurd, revolt, and the 1952 quarrel with Sartre'),
  coming('rawls', 22, 'What rules would you pick before you knew who you\'d be?', 'The veil of ignorance, the difference principle, Harsanyi and Nozick'),
  coming('singer', 23, 'Would you ruin your clothes to save a drowning child?', 'Singer\'s drowning child, the trolley problem as Foot meant it, and effective altruism'),
  coming('bat', 24, 'What is it like to be a bat?', 'Consciousness: Nagel\'s bat, the Chinese room, and whether a chatbot could feel pain'),
  coming('gadfly', 25, 'What do philosophers do now?', 'Philosophy today, what is still argued over and what was abandoned, and your verdicts read back'),
  coming('dao', 101, 'What happens if you stop forcing it?', 'Laozi and Zhuangzi on acting without strain, beside the Stoics', { branch: 'elsewhere', needs: ['stoics'] }),
  coming('nyaya', 102, 'Who wrote the first rules for a fair debate?', 'The Nyāya rules of argument and the Cārvāka sceptics of ancient India', { branch: 'elsewhere', needs: ['socrates'] }),
  coming('nahua', 103, 'How do you keep your footing on slippery earth?', 'The Nahua (Aztec) sages on a world always in motion, and how we know what they said', { branch: 'elsewhere', needs: ['stoics'] }),
  coming('ubuntu', 104, 'Are you a person through other people?', 'Ubuntu ethics and its use in South Africa\'s Truth and Reconciliation Commission', { branch: 'elsewhere', needs: ['aristotle'] }),
  coming('machiavelli', 201, 'Is it better to be feared than loved?', 'The Prince, read in its setting', { branch: 'power', needs: ['hobbes'] }),
  coming('rousseau', 202, 'Does the general will ever get it wrong?', 'Rousseau\'s social contract and the general will', { branch: 'power', needs: ['hobbes'] }),
  coming('marx', 203, 'Is philosophy supposed to change things?', 'Alienation, and Marx\'s diagnosis set apart from his failed predictions', { branch: 'power', needs: ['nietzsche'] }),
  coming('speech', 204, 'Should you hear out the other side?', 'Mill on free speech, tested on echo chambers, experts and epistemic injustice', { branch: 'power', needs: ['mill'] }),
  coming('arendt', 205, 'Can ordinary people do great evil?', 'Arendt at the Eichmann trial and the banality of evil', { branch: 'power', needs: ['rawls'] }),
  coming('fallacies', 301, 'How to lose an argument', 'Common fallacies, charity and steelmanning', { branch: 'tools', needs: ['socrates'] }),
  coming('zeno', 302, 'Can Achilles catch the tortoise?', 'Zeno\'s paradoxes and what infinite sums settle', { branch: 'tools', needs: ['socrates'] }),
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
