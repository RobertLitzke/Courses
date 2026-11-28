// Every lesson, written or to come, and the branches of the lesson tree.
// Written lessons are JSON in src/lessons/; the rest are listed here as
// "coming", so the home page shows the whole plan.

import type { Lesson } from 'didactics/lesson';
import { lessonCodes, type TreeBranch, type TreeLesson } from 'didactics/tree';

export type RiverLesson = Lesson & TreeLesson;

const written = import.meta.glob<RiverLesson>('./lessons/*.json', { eager: true, import: 'default' });

/** A lesson not written yet: its place in the tree and what it will answer. */
export const coming = (id: string, n: number, title: string, teaches: string, more: Partial<RiverLesson> = {}): RiverLesson =>
  ({ id, n, title, teaches, parts: [], coming: true, summary: [], ...more });

const COMING: RiverLesson[] = [
  coming('watershed', 1, 'Which sea does a raindrop reach?', 'Watersheds and divides, where rain goes once it lands, and snow as a reservoir'),
  coming('floods', 2, 'The same storm, twice the flood', 'Discharge, the river gauge and its hydrograph, rain on snow, and what a "100-year flood" means'),
  coming('baseflow', 3, "Where August's river comes from", "Groundwater in the spaces between grains, Darcy's law, baseflow, and gaining and losing streams"),
  coming('sediment', 4, 'Why the river runs brown in November', "What a river carries, the speed a grain needs to move (Hjulström), and the Elwha's century of trapped sediment"),
  coming('meanders', 5, 'The river that changed its mind', 'Why bends grow and cut off, braided and meandering rivers, log jams and avulsion'),
  coming('lake', 6, 'Why the bottom of the lake stays cold', "Density and temperature, a lake's layers, Lake Washington's one winter mixing, and seiches"),
  coming('waves', 7, 'What a wave knows about the wind', 'Waves carry energy, not water; fetch and duration, chop and swell, wave speed in deep and shallow water, and waves against a current'),
  coming('tides', 8, 'Two tides a day', 'Why the Moon raises two bulges, the Sun\'s share, and spring and neap tides'),
  coming('inequality', 9, 'Why one low tide is lower', "The Moon's tilt, the tide as a sum of regular waves, Kelvin's tide-predicting machine, and why summer's lowest tides come in daylight"),
  coming('olympia', 10, "Why Olympia's tide is nearly twice Port Townsend's", 'The tide as a long wave, its speed in shallow water, a basin that resonates, king tides and rising sea level'),
  coming('narrows', 11, 'Why Deception Pass runs at eight knots', 'Currents driven by a difference in level, and why slack water comes after high water'),
  coming('estuary', 12, 'Why the Sound stays cold in July', 'Salt and density, the two-layer exchange over the sills, renewal at neap tides, upwelling, and the salt wedge at a river mouth'),
  coming('hoodcanal', 13, 'Why Hood Canal runs out of breath', "A fjord's slow flushing, and how new ocean water lifts the old water to the surface"),
  coming('beach', 14, 'Where the beach comes from', 'Feeder bluffs, longshore drift and spits, what a bulkhead does, and the Elwha\'s sand returning'),
  coming('cedar', 101, 'The hill that drained a reservoir', "Where Seattle's water comes from, and the Masonry Dam's leak through glacial gravel in 1918", { branch: 'seattle', needs: ['baseflow'] }),
  coming('lowering', 102, 'The summer Lake Washington fell', 'The 1916 lowering, the vanished Black River, and the locks that keep the salt out', { branch: 'seattle', needs: ['cedar'] }),
  coming('duwamish', 103, 'Straightening the Duwamish', 'How a meandering estuary became a waterway, and the rivers that were moved away from it', { branch: 'seattle', needs: ['lowering'] }),
  coming('celilo', 201, 'The falls that went under', 'The Columbia turned into a stair of reservoirs, and Celilo Falls drowned in 1957', { branch: 'columbia', needs: ['floods'] }),
  coming('vanport', 202, 'The town behind the embankment', 'Vanport, 1948: levees, a snowmelt flood and a regulated river', { branch: 'columbia', needs: ['celilo'] }),
  coming('bar', 203, 'The bar at the mouth', 'Where the Columbia meets the Pacific swell, and why the bar is one of the most dangerous in the world', { branch: 'columbia', needs: ['waves'] }),
  coming('tables', 301, 'Reading a tide table and a current table', 'Planning a beach walk at a minus tide and a crossing at slack water', { branch: 'field', needs: ['narrows'] }),
  coming('gauge', 302, 'Measuring a creek', 'An orange, a stopwatch and a USGS gauge page: discharge measured by hand', { branch: 'field', needs: ['tables'] }),
];

/** The branches: Seattle's waterworks, the Columbia, and in the field. */
export const BRANCHES: TreeBranch[] = [
  { id: 'seattle', title: "Seattle's waterworks", promise: 'The Cedar, the lowered lake, the locks and the straightened Duwamish', from: 'lake', kind: 'local', color: 'var(--b-fir)', prefix: 'S' },
  { id: 'columbia', title: 'The Columbia', promise: 'Drowned falls, a lost town and the bar at the mouth', from: 'floods', kind: 'local', color: 'var(--b-sound)', prefix: 'C' },
  { id: 'field', title: 'In the field', promise: 'Tide tables, current tables and measuring a creek', from: 'narrows', kind: 'hands-on', color: 'var(--b-violet)', prefix: 'F' },
];

/** How many lessons the trunk has: "Lesson 3 of 14". */
export const TRUNK = 14;

const done = Object.values(written);
const ids = new Set(done.map((l) => l.id));
const all = [...done, ...COMING.filter((l) => !ids.has(l.id))].sort((a, b) => a.n - b.n);
const codes = lessonCodes(all, BRANCHES);

/** Every lesson in tree order, each with its code ("3", "S2"). */
export const LESSONS: readonly RiverLesson[] = all.map((l) => ({ ...l, code: l.branch ? codes.get(l.id) : undefined }));

/** The lessons that are written. */
export const WRITTEN: readonly RiverLesson[] = LESSONS.filter((l) => !l.coming);
