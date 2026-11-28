// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type AstroLesson = Lesson & TreeLesson;

const written = import.meta.glob<AstroLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
const coming = (id: string, n: number, title: string, teaches: string, more: Partial<AstroLesson> = {}): AstroLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const TRUNK_COMING: AstroLesson[] = [
  coming('ladder', 8, 'A schoolteacher’s number puzzle', 'Why atoms give out only certain colours: Balmer’s pattern and Bohr’s ladder'),
  coming('clusters', 12, 'Clusters as clocks', 'How a star’s mass decides its life, and how a cluster tells its age'),
  coming('muons', 13, 'Muons that live too long', 'Light’s speed, the same for everyone, and clocks that run slow when they move'),
  coming('bending', 14, 'The Sun bends starlight', 'Gravity as time running at different rates: Mercury, the 1919 eclipse and GPS'),
  coming('dead-stars', 15, 'Stars that shouldn’t exist', 'White dwarfs, and Chandrasekhar’s limit on how heavy one can be'),
  coming('pulsars', 16, 'Little green men', 'Jocelyn Bell’s pulsar and the neutron stars that spin'),
  coming('star-stuff', 17, 'Star stuff', 'Where the carbon in us and the gold in a ring were made'),
  coming('dark-stars', 18, 'Dark stars', 'Escape speed, event horizons and the first black hole found'),
  coming('island', 19, 'Island universes', 'Leavitt’s Cepheids and the distance to Andromeda'),
  coming('running', 20, 'Everything is running away', 'Redshifts, expansion and the age of the universe'),
  coming('quasars', 21, 'Brighter than a galaxy', 'Quasars, and the giant black hole at the centre of our own galaxy'),
  coming('dark-night', 22, 'Why is the night sky dark?', 'Olbers’s question and the afterglow of the Big Bang'),
  coming('missing-mass', 23, 'Unseen mass or a wrong law?', 'Galaxies that spin too fast, and dark matter'),
  coming('speeding', 24, 'The speeding universe', 'Exploding stars that were too faint, and dark energy'),
  coming('beginning', 25, 'Did time have a beginning?', 'Running the expansion backwards, and where Einstein’s theory breaks down'),
];

const BRANCH_COMING: AstroLesson[] = [
  coming('december', 101, 'Why is summer hot?', 'Tilt, not distance: the seasons, and Seattle’s dark Decembers', { branch: 'sky48', needs: ['shadows'] }),
  coming('phases', 102, 'The changing Moon', 'Phases, and why eclipses don’t come every month', { branch: 'sky48', needs: ['december'] }),
  coming('sun-path', 103, 'The Sun over the Olympics', 'The Sun’s path through the year at 48° N', { branch: 'sky48', needs: ['december'] }),
  coming('tides', 104, 'Two tides a day', 'Why the far side of the Earth bulges too, and springs and neaps', { branch: 'sky48', needs: ['falling', 'phases'] }),
  coming('aurora', 105, 'Aurora over Whidbey', 'The solar wind and the May 2024 storm', { branch: 'sky48', needs: ['december'] }),
  coming('meteors', 106, 'Meteors and comets', 'Halley’s return, and where the Perseids come from', { branch: 'sky48', needs: ['falling'] }),
  coming('spyglass', 201, 'Galileo’s spyglass', 'Lenses, mirrors and light grasp', { branch: 'scopes', needs: ['colour'] }),
  coming('invisible', 202, 'Beyond the rainbow', 'Infrared, radio and X-rays: light the eye can’t see', { branch: 'scopes', needs: ['spyglass'] }),
  coming('windows', 203, 'Why telescopes go to space', 'The atmosphere’s windows', { branch: 'scopes', needs: ['invisible'] }),
  coming('seeing', 204, 'Why stars twinkle', 'Turbulent air and adaptive optics', { branch: 'scopes', needs: ['spyglass'] }),
  coming('io', 301, 'Volcanoes predicted three days early', 'Tidal heating of Jupiter’s moon Io', { branch: 'giants', needs: ['sunshine'] }),
  coming('stripes', 302, 'Stripes and a storm', 'Why Jupiter is banded', { branch: 'giants', needs: ['io'] }),
  coming('rings', 303, 'Rings made of pebbles', 'Maxwell, Keeler and the Roche limit', { branch: 'giants', needs: ['io'] }),
  coming('glow', 304, 'The planet that glows', 'Jupiter’s inner heat', { branch: 'giants', needs: ['io'] }),
  coming('ice-oceans', 305, 'Oceans under ice', 'Europa and Enceladus', { branch: 'giants', needs: ['io'] }),
  coming('titan', 306, 'Methane rain', 'Titan, a world with weather', { branch: 'giants', needs: ['io'] }),
  coming('wobble', 401, 'A planet that shouldn’t be there', '51 Pegasi b and the wobble method', { branch: 'exoplanets', needs: ['hr'] }),
  coming('dip', 402, 'The dip', 'Transits and the Kepler telescope', { branch: 'exoplanets', needs: ['wobble'] }),
  coming('sub-neptunes', 403, 'Planets we don’t have', 'The commonest planets, and the radius valley', { branch: 'exoplanets', needs: ['dip'] }),
  coming('hot-jupiters', 404, 'Hot Jupiters', 'Giant planets that moved', { branch: 'exoplanets', needs: ['dip', 'nebula'] }),
  coming('goldilocks', 405, 'Goldilocks', 'Habitable zones and TRAPPIST-1', { branch: 'exoplanets', needs: ['dip'] }),
  coming('atmospheres', 406, 'Reading an atmosphere', 'Starlight through a planet’s air', { branch: 'exoplanets', needs: ['dip'] }),
  coming('nebula', 501, 'Where the planets came from', 'Spinning discs and the snow line', { branch: 'rocky', needs: ['sunshine'] }),
  coming('venus', 502, 'Venus and the greenhouse', 'Why the planet next door is hotter than an oven', { branch: 'rocky', needs: ['nebula'] }),
  coming('canals', 503, 'Canals on Mars', 'Lowell’s canals and Mariner’s craters', { branch: 'rocky', needs: ['nebula'] }),
  coming('cooling', 504, 'Why only Earth still has plates', 'Small planets cool first', { branch: 'rocky', needs: ['nebula'] }),
  coming('faint-sun', 505, 'The faint young Sun', 'Why the early Earth didn’t freeze', { branch: 'rocky', needs: ['venus'] }),
  coming('blue-dot', 601, 'The Pale Blue Dot', 'Earth from six billion kilometres', { branch: 'life', needs: ['star-stuff'] }),
  coming('life-search', 602, 'Looking for life', 'Viking, a Martian meteorite and biosignatures', { branch: 'life', needs: ['blue-dot'] }),
  coming('fermi', 603, 'Where is everybody?', 'Fermi’s question, Drake’s factors and messages in bottles', { branch: 'life', needs: ['blue-dot'] }),
  coming('future', 604, 'The long future', 'What happens to the Sun, the galaxy and the universe', { branch: 'life', needs: ['blue-dot', 'speeding'] }),
  coming('chirp', 701, 'The chirp', 'Gravitational waves', { branch: 'holes', needs: ['dark-stars', 'pulsars'] }),
  coming('hawking', 702, 'Black holes ain’t so black', 'Bekenstein’s entropy and Hawking radiation', { branch: 'holes', needs: ['dark-stars'] }),
  coming('information', 703, 'The information paradox', 'What happens to what falls in', { branch: 'holes', needs: ['hawking'] }),
  coming('shadow', 704, 'Photographing a shadow', 'The Event Horizon Telescope', { branch: 'holes', needs: ['dark-stars'] }),
  coming('superluminal', 705, 'Faster than light?', 'Quasar jets that seem to break the speed limit', { branch: 'holes', needs: ['quasars'] }),
  coming('three-minutes', 801, 'The first three minutes', 'Helium and deuterium from the Big Bang', { branch: 'beginnings', needs: ['dark-night'] }),
  coming('ripples', 802, 'Ripples in the afterglow', 'Spots on the microwave sky and the shape of space', { branch: 'beginnings', needs: ['three-minutes'] }),
  coming('first-stars', 803, 'The dark ages and the first stars', 'The quasar light that went missing', { branch: 'beginnings', needs: ['ripples'] }),
  coming('before', 804, 'Before the Big Bang?', 'The horizon problem and inflation', { branch: 'beginnings', needs: ['ripples'] }),
  coming('no-boundary', 805, 'Nothing north of the North Pole', 'Hartle and Hawking’s no-boundary proposal', { branch: 'beginnings', needs: ['before', 'beginning'] }),
  coming('arrow', 806, 'Why do we remember the past?', 'The arrow of time and a smooth beginning', { branch: 'beginnings', needs: ['ripples'] }),
  coming('six-numbers', 807, 'Just six numbers', 'The numbers that shape a universe, and why they might be as they are', { branch: 'beginnings', needs: ['ripples', 'speeding'] }),
];

/** The branches: further than the trunk goes, each read with what the trunk teaches, and one for the sky over Puget Sound. */
export const BRANCHES: TreeBranch[] = [
  { id: 'sky48', title: 'The sky from home', promise: 'Seasons, phases, tides and aurora at 48° N', from: 'shadows', kind: 'local', color: 'var(--b-sound)', prefix: 'N' },
  { id: 'scopes', title: 'Telescopes and invisible light', promise: 'Lenses, mirrors and the light the eye can’t see', from: 'colour', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'T' },
  { id: 'giants', title: 'Gas giants and their moons', promise: 'Volcanic Io, Jupiter’s stripes, Saturn’s rings, Titan’s rain', from: 'sunshine', kind: 'further', color: 'var(--b-gold)', prefix: 'G' },
  { id: 'exoplanets', title: 'Exoplanets', promise: 'Wobbles, dips and the air of other worlds', from: 'hr', kind: 'further', color: 'var(--b-sky)', prefix: 'X' },
  { id: 'rocky', title: 'Rocky planets', promise: 'Where planets came from, Venus’s greenhouse, Mars’s canals', from: 'sunshine', kind: 'further', color: 'var(--b-ember)', prefix: 'R' },
  { id: 'life', title: 'Life and the long view', promise: 'Is anyone out there, and what happens next?', from: 'star-stuff', kind: 'further', color: 'var(--b-sand)', prefix: 'L' },
  { id: 'holes', title: 'Black holes and gravitational waves', promise: 'Chirps, Hawking’s glow and a photographed shadow', from: 'dark-stars', kind: 'further', color: 'var(--b-moon)', prefix: 'B' },
  { id: 'beginnings', title: 'Cosmic beginnings', promise: 'The first three minutes, the first stars, and before', from: 'dark-night', kind: 'further', color: 'var(--b-ice)', prefix: 'C' },
];

const done = new Set(Object.values(written).map((l) => l.id));
const all = [...Object.values(written), ...[...TRUNK_COMING, ...BRANCH_COMING].filter((l) => !done.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "G2"). */
export const LESSONS: readonly AstroLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly AstroLesson[] = LESSONS.filter((l) => !l.coming);
