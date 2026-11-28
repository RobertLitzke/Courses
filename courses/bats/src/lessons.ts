// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type BatLesson = Lesson & TreeLesson;

const written = import.meta.glob<BatLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<BatLesson> = {}): BatLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const COMING: BatLesson[] = [
  coming('dark', 1, 'How does a bat fly in the dark?', "Spallanzani's and Jurine's experiments, the 140 years nobody believed them, and Pierce and Griffin hearing ultrasound in 1938"),
  coming('hand', 2, 'A hand with skin between the fingers', 'What a bat is: a wing made of a hand, one mammal species in five, and wing shape setting where each bat hunts'),
  coming('ultrasound', 3, 'Why so high?', 'Wavelength against the size of an insect, why higher calls find smaller prey but carry less far, and the two shapes of call'),
  coming('buzz', 4, 'The feeding buzz', 'Why a bat calls faster as it closes on prey, the buzz at 200 calls a second, and brain cells that read distance from delay'),
  coming('crowds', 5, 'Twenty million voices', 'Doppler shift and how horseshoe bats correct for it, and how bats in a crowd avoid jamming each other'),
  coming('moths', 6, 'The moth that hears the bat', 'Moth ears with two cells, turning away and diving, tiger moths that click back, and the arms race'),
  coming('winter', 7, 'The winter fat budget', "Torpor, how two grams of fat last a winter, why each waking is so costly, and white-nose syndrome"),
  coming('lives', 8, 'Long lives, slow births', 'Why bats live so long for their size, one pup a year and slow recovery, and what bats and viruses really show'),
  coming('diets', 9, 'Blood, nectar and fruit', 'The many diets of bats, nectar bats and seed rain, and why vampire bats share blood with roost-mates'),
  coming('home', 10, 'The way home', "How fruit bats fly straight home, big brown bats' sunset compass, and migrating hoary bats and wind turbines"),
  coming('heterodyne', 101, 'Hearing the unhearable', "How a heterodyne detector mixes a bat's call down into hearing, and a detector on a breadboard", { branch: 'listening', needs: ['ultrasound'] }),
  coming('sonograms', 102, 'Reading a sonogram', "Frequency division, and telling Washington's bats apart by the shape and pitch of their calls", { branch: 'listening', needs: ['heterodyne'] }),
  coming('green-lake', 201, 'Dusk at Green Lake', 'Who comes out when over a Seattle lake, high flyers and water skimmers, what they eat, and the season', { branch: 'northwest', needs: ['buzz'] }),
  coming('washington', 202, "Washington's fifteen", "Washington's fifteen species, where they roost, the dry-side bats, and what a bat house needs", { branch: 'northwest', needs: ['green-lake'] }),
  coming('people', 301, 'Bats and people', 'A bat in the house, rabies and what to do, a bridge colony in Austin, guano, and the 1943 bat bomb', { branch: 'people', needs: ['lives'] }),
];

/** The branches: listening in, the Northwest, and bats and people. */
export const BRANCHES: TreeBranch[] = [
  { id: 'listening', title: 'Listening in', promise: 'A bat detector, and reading the calls it hears', from: 'ultrasound', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'L' },
  { id: 'northwest', title: 'Northwest bats', promise: 'Dusk over a Seattle lake, and the fifteen species of Washington', from: 'buzz', kind: 'local', color: 'var(--b-fir)', prefix: 'N' },
  { id: 'people', title: 'Bats and people', promise: 'Bats in the attic, rabies, guano and a bomb', from: 'lives', kind: 'people', color: 'var(--b-madder)', prefix: 'P' },
];

/** How many lessons the trunk has: "Lesson 3 of 10". */
export const TRUNK = 10;

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "N2"). */
export const LESSONS: readonly BatLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly BatLesson[] = LESSONS.filter((l) => !l.coming);
