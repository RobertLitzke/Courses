// The tutorial series: lessons of a workbook, laid out as a tree. The trunk is
// training, from fog to local tricks; branches fork off it (the Pacific coast,
// and more to come), and the 1946 lesson on cloud seeding hangs off the end of
// the trunk as a leaf. Each lesson starts from a question asked of the sky, and is a short
// illustrated article in the manner of an interactive explainer: paragraphs
// and live figures to play with. A lesson comes in parts; the next part opens
// once the figures in this one have had their small task done. The last part
// is a check, and the lesson ends with its summary.
//
// Each lesson's words are in a JSON file in data/lessons, one per lesson.
//
// The lesson format and the view that reads it are Didactics' lesson.ts.
// Text takes a little markup (see app/figures/kit.ts prose): **bold**,
// *italic*, [[words|colour]] to tie a word to the same colour in a figure,
// and [^id] for a footnote from the file's `footnotes` table, which opens in a
// popup (Didactics' footnote.ts).

import { CHART_IDS } from 'didactics/charts';
import { LIVE_CHART_IDS } from 'didactics/live-charts';
import type { Footnotes } from 'didactics/footnote';
import type { Block as KitBlock, Lesson, Part as KitPart } from 'didactics/lesson';
import { lessonCodes, type TreeBranch } from 'didactics/tree';
import type { GenusId } from './clouds';
import fog from '../data/lessons/fog.json';
import lowSky from '../data/lessons/low-sky.json';
import middleSky from '../data/lessons/middle-sky.json';
import iceRealm from '../data/lessons/ice-realm.json';
import giants from '../data/lessons/giants.json';
import front from '../data/lessons/front.json';
import localSky from '../data/lessons/local-sky.json';
import seeding from '../data/lessons/seeding.json';
import wind from '../data/lessons/wind.json';
import coast from '../data/lessons/coast.json';
import rivers from '../data/lessons/rivers.json';
import violent from '../data/lessons/violent.json';
import tornado from '../data/lessons/tornado.json';
import hurricane from '../data/lessons/hurricane.json';
import winterFog from '../data/lessons/winter-fog.json';
import eastWind from '../data/lessons/east-wind.json';

export const FIGURE_IDS = [
  'jar', 'parcel', 'freezing', 'iceGrowth', 'thermals', 'sounding', 'nudge', 'night', 'spread', 'drops', 'sunThrough', 'hand', 'shadow',
  'streaks', 'prism', 'halo', 'front', 'storm', 'flash', 'wave', 'billow', 'mamma', 'sort', 'names', 'check',
  'molecules', 'expand', 'stability', 'heap', 'dayNight', 'radiators', 'fogStratus',
  'edges', 'nameGrid', 'layerKinds', 'subsidence', 'million', 'collide', 'depth',
  'specks', 'inversion', 'burnOff', 'latent', 'kettle', 'density',
  'glide', 'overturn', 'freezeSeeds', 'haloSight', 'escape', 'snowToRain', 'tropopause', 'charge',
  'lowMap', 'barometer', 'frontPass', 'slope', 'crossedWinds', 'rainShadow', 'buysBallot', 'barograph', 'veer', 'twoFronts', 'occlusion',
  'coldBox', 'dryIce', 'lattice', 'seedLayer', 'cloudWater', 'seedWindow', 'trial',
  'iceSteal', 'iceShortage', 'agentRange', 'fallstreak', 'mountainSeed', 'conveyor', 'fogHole', 'fairTest',
  'radarEcho', 'brightBand', 'stormRadar', 'radarMap', 'frontRadar', 'seedLines',
  'lookAlike',
  'pressureMap', 'turntable', 'spinLatitude', 'windBalance', 'lowHigh', 'jetStream',
  'upwelling', 'pacificHigh', 'marineLayer', 'coastSounding',
  'stormTrack', 'atmosphericRiver', 'windward', 'acrossWashington', 'snowLevel', 'convergenceZone',
  'fuelSounding', 'capDay', 'stormSorter', 'hailstone', 'stormRecipe',
  'shearRoll', 'skater', 'supercell', 'hookEcho', 'efScale',
  'tradeWinds', 'heatEngine', 'shipThrough', 'hurricaneBelt', 'surge',
  'coldPool', 'fogMaker', 'rime', 'iceLayers',
  'dustWall', 'downslope', 'gorgeGap', 'santaAna',
  ...CHART_IDS,
  ...LIVE_CHART_IDS,
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;

/**
 * The photos a check opens with. mode is 'floor' (call in the floor), 'name'
 * (call in the genus) or 'spot' (say whether it is target or not, for a
 * lesson that has met only one cloud; decoys are the others shown, as many as
 * the target); pool is the genera dealt; known the genera the reader has met
 * (look-alike answers are drawn from these); count how many.
 */
export interface PhotoCalls {
  mode: 'floor' | 'name' | 'spot';
  pool?: GenusId[];
  known?: GenusId[];
  target?: GenusId;
  decoys?: GenusId[];
  count?: number;
}

/** A forecasting question: a sky over some hours, and what it is up to. */
export interface Forecast {
  /** Questions with an id come last in the check, after the shuffled ones. */
  id?: string;
  /**
   * The sky over the hours, oldest first; one drawing per entry. Only what the
   * question says has been seen: never a later sky that gives the answer away.
   * Left out (with no profile) for a question asked in words alone.
   */
  sky?: SkyPanel[];
  /** What the barometer and the wind vane say, shown as readings under the sky. */
  instruments?: string[];
  /** A slice up through the air instead of the sky drawings: the freezing level and the cloud, by height. */
  profile?: Profile;
  question: string;
  options: string[];
  answer: number;
  why: string;
}

/**
 * One drawing in a forecast's sky strip: the cloud, and whatever the question
 * says about it that the bare genus drawing would not show.
 */
export interface SkyPanel {
  /** Left out for a clear sky. */
  genus?: GenusId;
  when: string;
  /** Light: day unless given; night has a moon for a sun. */
  time?: 'dawn' | 'day' | 'dusk' | 'night';
  /** The sun (or moon) as seen through the cloud. Sheets have their own: sharp through cirrostratus, a dim disc through altostratus, gone behind the rest. */
  sun?: 'clear' | 'halo' | 'dim' | 'hidden';
  /** How thick and dark a sheet or deck is, 0 to 1: a thicker sheet is darker, lower, and rains harder. */
  thick?: number;
  /** Heaps: how many, and how big. */
  count?: number;
  size?: 'small' | 'congestus';
  /** Across the sky, −1 (west, on the left) to 1 (east); `far` draws it smaller, away on the horizon. */
  x?: number;
  far?: boolean;
  /** A storm's rain (on unless false), lightning, and dust blown up ahead of it. */
  rain?: boolean;
  lightning?: boolean;
  dust?: boolean;
  /** Ground fog over the fields, hiding the ridges; thin lets the ridge tops show. */
  fog?: 'dense' | 'thin';
  /** A stratus ceiling so low it hides the hilltops, with the fields clear below. */
  low?: boolean;
  /** Streaks that hang from the base and vanish before the ground. */
  virga?: boolean;
  /** A deck that covers the whole sky (decks of cells and heaps; sheets always do). */
  cover?: boolean;
  /** A cloud's shape beyond its genus. */
  shape?: 'castellanus' | 'lenticular' | 'hole' | 'iced';
  contrails?: 'short' | 'wide';
  /** Draw the town, grain elevator and all. */
  town?: boolean;
}

export interface Profile {
  /** Height of the 0 °C level, km; temperatures fall 6.5 °C a km above it. Left out, no freezing level or temperatures are drawn. */
  freezeKm?: number;
  /** Two or more clouds stand side by side; `dark` shades one's base. */
  clouds: { baseKm: number; topKm: number; name: string; dark?: boolean }[];
  /** How high to draw, km. */
  topKm?: number;
  /** A note on the ground, such as "dry air below". */
  ground?: string;
}

/** A lesson (Didactics' Lesson shape, which its JSON file holds), with what only Clouds adds. */
export interface CloudLesson extends Lesson<FigureId> {
  /** The clouds this lesson introduces. */
  clouds: GenusId[];
  /** The clouds drawn over the fields at the top of the lesson: the ones it introduces, or the ones it is about. */
  sky: GenusId[];
  /** Training, or the lessons on cloud seeding that come after it. */
  book: 'training' | 'seeding';
  /** Where it sits in the tree on the home page (Didactics' tree.ts): its branch, and what it leans on. */
  branch?: string;
  needs?: string[];
  betterAfter?: string[];
  /** Its name in the tree and in the app: "5" on the trunk, "P2" on the Pacific coast branch. Set from BRANCHES below. */
  code?: string;
}

/**
 * A lesson whose words live in a JSON file in data/lessons, so they can be
 * edited outside the code. The file holds everything but the clouds the
 * lesson introduces. The content tests check the files' shape, since JSON has
 * no types of its own.
 */
interface LessonFile {
  id: string;
  n: number;
  title: string;
  teaches: string;
  parts: unknown[];
  summary: string[];
  footnotes?: Record<string, { kind: string; title: string; text: string; glossary?: boolean | string }>;
}
type Place = Pick<CloudLesson, 'branch' | 'needs' | 'betterAfter'>;
function fromJson(file: LessonFile, clouds: GenusId[], more: { sky?: GenusId[]; book?: CloudLesson['book'] } & Place = {}): CloudLesson {
  return {
    id: file.id,
    n: file.n,
    title: file.title,
    clouds,
    sky: more.sky ?? clouds,
    book: more.book ?? 'training',
    teaches: file.teaches,
    parts: file.parts as Part[],
    summary: file.summary,
    footnotes: (file.footnotes ?? {}) as Footnotes,
    ...(more.branch ? { branch: more.branch } : {}),
    ...(more.needs ? { needs: more.needs } : {}),
    ...(more.betterAfter ? { betterAfter: more.betterAfter } : {}),
  };
}

export const LESSONS: readonly CloudLesson[] = [
  // -------------------------------------------------------------------------
  // The trunk. Lessons 3 and 4 can be taken in either order.
  fromJson(fog, ['stratus', 'cumulus']),
  fromJson(lowSky, ['stratocumulus', 'nimbostratus'], { needs: ['fog'] }),
  fromJson(middleSky, ['altocumulus', 'cirrocumulus', 'cirrus'], { needs: ['low-sky'] }),
  fromJson(iceRealm, ['cirrostratus', 'altostratus'], { sky: ['cirrus', 'cirrostratus', 'altostratus'], needs: ['low-sky'], betterAfter: ['middle-sky'] }),
  fromJson(giants, ['cumulonimbus'], { needs: ['middle-sky', 'ice-realm'] }),
  // These meet no new clouds: they put the ones already met to work.
  fromJson(front, [], { sky: ['cirrostratus', 'altostratus', 'cumulonimbus'], needs: ['giants'] }),
  fromJson(localSky, [], { sky: ['altocumulus', 'stratocumulus', 'stratus'], needs: ['front'] }),
  // A leaf off the end of the trunk: fifteen years on.
  fromJson(seeding, [], { sky: ['altocumulus', 'stratus'], book: 'seeding', branch: 'seeding', needs: ['local-sky'] }),
  // -------------------------------------------------------------------------
  // The Pacific coast, forking off after Lesson 6. Its first lesson is the
  // bridge into weather on the scale of the planet, which later branches lean on too.
  fromJson(wind, [], { sky: ['cirrus', 'altostratus'], branch: 'coast' }),
  fromJson(coast, [], { sky: ['stratus', 'stratocumulus'], branch: 'coast', betterAfter: ['wind'] }),
  fromJson(rivers, [], { sky: ['nimbostratus', 'cumulus'], branch: 'coast', betterAfter: ['coast', 'local-sky'] }),
  // Violent storms, forking off after Lesson 5's thunderstorms.
  fromJson(violent, [], { sky: ['cumulonimbus', 'cumulus'], branch: 'storms', needs: ['giants'] }),
  fromJson(tornado, [], { sky: ['cumulonimbus'], branch: 'storms', needs: ['violent'], betterAfter: ['wind'] }),
  fromJson(hurricane, [], { sky: ['cumulonimbus', 'cirrostratus'], branch: 'storms', betterAfter: ['wind', 'violent'] }),
  // Fog, dust and wind, forking off after Lesson 2: the weather of dry inland basins.
  fromJson(winterFog, [], { sky: ['stratus', 'nimbostratus'], branch: 'ground', needs: ['low-sky'], betterAfter: ['local-sky'] }),
  fromJson(eastWind, [], { sky: ['cumulonimbus', 'altocumulus'], branch: 'ground', betterAfter: ['giants', 'winter-fog'] }),
];

/** A lesson in the tree that is not written yet. */
export interface ComingLesson {
  id: string;
  n: number;
  title: string;
  teaches: string;
  branch: string;
  needs?: string[];
  betterAfter?: string[];
  coming: true;
  code?: string;
}

/** The branches of the tree, each forking off the trunk lesson it grows from. */
export const BRANCHES: readonly TreeBranch[] = [
  { id: 'coast', title: 'The Pacific coast', promise: 'Why the coast almost never thunders, and where a week of winter rain comes from', from: 'front', color: 'var(--coast)', prefix: 'P' },
  { id: 'storms', title: 'Violent storms', promise: 'Hail, tornadoes and hurricanes: what turns a shower into a monster', from: 'giants', color: 'var(--storms)', prefix: 'V' },
  { id: 'ground', title: 'Fog, dust and wind', promise: 'Weeks of winter grey, walls of dust, and the hot, dry winds off the mountains', from: 'low-sky', color: 'var(--ground)', prefix: 'F' },
  { id: 'seeding', title: 'Cloud seeding', promise: '', from: 'local-sky', leaf: true, color: 'var(--rose)', prefix: 'S' },
];

/** Lessons shown in the tree before they are written: the next branch to come. */
export const COMING: readonly ComingLesson[] = [
];

/** Every lesson the home page's tree shows, written or coming, in the order the tree lists them. */
export const TREE_LESSONS: readonly (CloudLesson | ComingLesson)[] = [...LESSONS, ...COMING];

for (const [id, code] of lessonCodes(TREE_LESSONS, BRANCHES)) TREE_LESSONS.find((l) => l.id === id)!.code = code;

/** How the app names a lesson: "Lesson 5", "Lesson P2". */
export const lessonName = (l: { n: number; code?: string }) => `Lesson ${l.code ?? l.n}`;

export function lessonById(id: string): CloudLesson | undefined {
  return LESSONS.find((s) => s.id === id);
}
