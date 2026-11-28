// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type FungusLesson = Lesson & TreeLesson;

const written = import.meta.glob<FungusLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<FungusLesson> = {}): FungusLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const COMING: FungusLesson[] = [
  coming('rings', 1, 'The ring in the meadow', 'A mushroom is only the fruit of a hidden net of threads; a fairy ring is one fungus spreading outward for centuries'),
  coming('kingdom', 2, 'Closer to us than to plants', 'Why fungi are a kingdom of their own: chitin walls, digestion outside the body, and DNA that puts them beside animals'),
  coming('tips', 3, 'Eating from the outside', 'How a hypha grows at its tip, digests food outside itself, and how a mycelium searches and moves food'),
  coming('spores', 4, 'Seven trillion spores', 'How fungi spread by spores, how gills launch them, and why most land close while a few cross oceans'),
  coming('sexes', 5, 'Twenty thousand sexes', "Mating types, fused threads and the two-nucleus stage of a mushroom's life"),
  coming('groups', 6, 'Sacs and clubs', 'The main groups of fungi told apart by how they make spores'),
  coming('yeast', 7, 'The yeast that wastes its sugar', 'Single-celled fungi, fermentation, and why yeast makes alcohol even with oxygen'),
  coming('rot', 8, 'The gap in the coal', 'White and brown rot, lignin, and whether wood-rotting fungi ended the age of coal'),
  coming('network', 9, 'Do trees share through fungi?', 'The two kinds of root fungi and what the evidence shows about carbon passing between trees'),
  coming('lichens', 10, 'A lichen is two (or three)', 'A fungus farming algae, and how drying out and waking lets lichens live on bare rock'),
  coming('mould', 11, "The mould on Fleming's plate", 'Fungal chemical weapons, penicillin, and resistance'),
  coming('glow', 12, 'The wood that glows', 'Fungi that make cold light, foxfire, and a mushroom that glows on a clock to draw insects'),
  coming('hunters', 13, 'Fungi that hunt', 'Fungi that trap roundworms for nitrogen, fungi that steer ants, and why a new parasite can be a catastrophe'),
  coming('individual', 14, 'The largest living thing?', "Telling one fungus from another with mating tests and DNA; Michigan's humongous Armillaria"),
  coming('prototaxites', 15, 'A trunk with no leaves', 'How a Devonian fossil eight metres tall is weighed as fungus or not, and fungi with the first land plants'),
  coming('log', 16, "A log's hundred years", 'Which fungi arrive in a fallen log and in what order, and what they leave behind'),
  coming('bark', 101, 'The lichens that left the city', 'Lichens as a gauge of sulphur in the air, and their return since coal smoke ended', { branch: 'lichens', needs: ['lichens'] }),
  coming('lichenometry', 102, 'Dating a moraine by its lichens', 'Using the slow steady growth of crust lichens to date bare rock', { branch: 'lichens', needs: ['bark'] }),
  coming('canopy', 103, 'Gardens in the canopy', 'Nitrogen-fixing lichens high in old Douglas-firs and what they add to the forest', { branch: 'lichens', needs: ['lichenometry'] }),
  coming('flush', 201, 'The autumn flush', 'Why Northwest mushrooms come up after the first soaking autumn rain and stop with hard frost', { branch: 'northwest', needs: ['spores'] }),
  coming('pumice', 202, 'Gophers on the pumice', "How pocket gophers brought root fungi back to Mount St Helens' pumice plain", { branch: 'northwest', needs: ['network'] }),
  coming('truffles', 203, 'The squirrel, the truffle and the owl', 'Underground truffles, the flying squirrels that spread them and the owls that eat the squirrels', { branch: 'northwest', needs: ['network'] }),
  coming('spore-print', 301, 'A spore print and a microscope', 'How mycologists examine a fungus: spore prints, gills and spores under the microscope', { branch: 'closely', needs: ['groups'] }),
  coming('barcode', 302, 'Names written in DNA', 'Naming fungi by a DNA barcode and finding unseen groups in soil', { branch: 'closely', needs: ['spore-print'] }),
  coming('how-many', 303, 'How many kinds of fungi?', 'About 150,000 named and 2 to 4 million estimated, and how that estimate is made', { branch: 'closely', needs: ['barcode'] }),
];

/** The branches: lichens, the Northwest, and looking closely. */
export const BRANCHES: TreeBranch[] = [
  { id: 'lichens', title: 'More lichens', promise: 'Air quality, dating rocks, and gardens in the treetops', from: 'lichens', kind: 'further', color: 'var(--b-gold)', prefix: 'L' },
  { id: 'northwest', title: 'Northwest fungi', promise: 'The autumn flush, Mount St Helens, truffles and owls', from: 'network', kind: 'local', color: 'var(--b-fir)', prefix: 'N' },
  { id: 'closely', title: 'Looking closely', promise: 'Spore prints, DNA names and how many kinds there are', from: 'groups', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'M' },
];

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "L2"). */
export const LESSONS: readonly FungusLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly FungusLesson[] = LESSONS.filter((l) => !l.coming);
