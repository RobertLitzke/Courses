// The catalog's front page, and the installed app's home: the courses as
// books on three shelves, each cover in its own course's colours.
//
// A reader new to this device gets a welcome, a first lesson picked at random
// and a word on installing. A returning reader gets their desk instead: the
// lesson they were last in (from the `seen` time Didactics keeps in each
// lesson's resume), another course under way, and the review cards waiting.
// The bridges sit on a last shelf; the map and the full listing are at #map
// (page.ts).

import { el } from 'didactics/dom';
import type { Bridge, CatalogEntry, CatalogMap, LessonInfo } from '../registry';
import { installSlip } from './install';
import { splitIcon } from './split';
import { BETA_NOTE, dueEverywhere, progress } from './page';

type Read = (key: string) => string | null;

interface Save {
  lessons?: Record<string, { done?: boolean; finishedAt?: string }>;
  resume?: Record<string, { part?: number; seen?: number }>;
}

function readSave(c: CatalogEntry, read: Read): Save | null {
  try {
    const s = JSON.parse(read(c.save) ?? 'null') as unknown;
    return typeof s === 'object' && s !== null ? (s as Save) : null;
  } catch {
    return null;
  }
}

/** Somewhere to pick up: a lesson in a course, with the part to open and when the reader was last there. */
export interface Place {
  course: CatalogEntry;
  lesson: LessonInfo;
  /** The part open, from 0, when the lesson is under way; null when it is the next one to start. */
  part: number | null;
  /** When the reader was last in the course, ms; 0 when the save does not say. */
  seen: number;
  /** When the reader was last in this lesson, ms, if the save says. */
  lessonSeen?: number;
}

/** Where each course the reader has begun stands, the most recent first: its lesson under way, or else the next one to start. */
export function places(courses: readonly CatalogEntry[], read: Read): Place[] {
  const out: Place[] = [];
  for (const course of courses) {
    const save = readSave(course, read);
    if (!save) continue;
    const done = (id: string) => save.lessons?.[id]?.done === true;
    const going = course.lessonList
      .filter((l) => save.resume?.[l.id] && !done(l.id))
      .map((l) => ({ l, r: save.resume![l.id] }))
      .sort((a, b) => (b.r.seen ?? 0) - (a.r.seen ?? 0) || a.l.n - b.l.n)[0];
    const finished = Object.values(save.lessons ?? {}).flatMap((l) => (l?.done && l.finishedAt ? [Date.parse(l.finishedAt) || 0] : []));
    const seen = Math.max(0, going?.r.seen ?? 0, ...finished);
    if (going) {
      out.push({ course, lesson: going.l, part: Math.max(0, Math.min(going.l.parts - 1, going.r.part ?? 0)), seen, lessonSeen: going.r.seen });
      continue;
    }
    if (!course.lessonList.some((l) => done(l.id))) continue;
    // The next lesson: the lowest-numbered one not done, on the trunk if any is left.
    const next = course.lessonList.find((l) => !done(l.id) && l.n < 100) ?? course.lessonList.find((l) => !done(l.id));
    if (next) out.push({ course, lesson: next, part: null, seen });
  }
  return out.sort((a, b) => b.seen - a.seen || (a.part === null ? 1 : 0) - (b.part === null ? 1 : 0));
}

/** Whether the reader has begun anything on this device. */
export function begun(courses: readonly CatalogEntry[], read: Read): boolean {
  return courses.some((c) => {
    const { done, going } = progress(c, read);
    return done > 0 || going;
  });
}

const lessonHref = (c: CatalogEntry, l: LessonInfo) => `./${c.folder}/#/lesson/${l.id}`;
const lessonsLine = (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`;
const lessonNo = (l: LessonInfo) => (l.n > 0 && l.n < 100 ? `lesson ${l.n}` : 'a branch lesson');
const icon = (c: CatalogEntry) => el('img.ico', { src: c.icon, alt: '' });

/** The parts of a lesson as a row of ticks: those before done, the open one marked. */
function partTicks(of: number, at: number): HTMLElement {
  return el('span.ticks', { 'aria-hidden': 'true' }, Array.from({ length: of }, (_, i) => el(`i${i < at ? '.d' : i === at ? '.n' : ''}`)));
}

function ago(ms: number, now: number): string {
  if (!ms) return '';
  const days = Math.floor((now - ms) / 864e5);
  if (days < 1) return ' · today';
  if (days < 2) return ' · yesterday';
  if (days < 14) return ` · ${days} days ago`;
  return '';
}

function continueCard(p: Place, now: number): HTMLElement {
  const c = p.course;
  return el(
    'article.desk-card.desk-main',
    {},
    icon(c),
    el(
      'div.desk-text',
      {},
      el('p.caps', {}, `${p.part === null ? 'Next up' : 'Where you left off'}${p.part === null ? '' : ago(p.lessonSeen ?? 0, now)}`),
      el('h3', {}, el('a', { href: lessonHref(c, p.lesson) }, p.lesson.title)),
      el(
        'p.desk-meta',
        {},
        p.part === null ? `${c.title} · ${lessonNo(p.lesson)}` : [partTicks(p.lesson.parts, p.part), el('span', {}, `${c.title} · part ${p.part + 1} of ${p.lesson.parts}`)],
      ),
    ),
    el('a.btn', { href: lessonHref(c, p.lesson) }, p.part === null ? 'Start' : 'Continue'),
  );
}

function alsoCard(p: Place): HTMLElement {
  const c = p.course;
  return el(
    'article.desk-card.desk-also',
    {},
    icon(c),
    el('div.desk-text', {}, el('h3', {}, el('a', { href: `./${c.folder}/` }, c.title)), el('p.desk-meta', {}, `${p.part === null ? 'Next' : 'Under way'}: ${p.lesson.title}`)),
    el('a.btn.ghost', { href: lessonHref(c, p.lesson) }, 'Open'),
  );
}

function reviewCard(n: number): HTMLElement {
  return el(
    'article.desk-card.desk-review',
    {},
    el('span.cards-stack', { 'aria-hidden': 'true' }, el('i'), el('i'), el('i', {}, n ? String(n) : '✓')),
    el('div.desk-text', {}, el('h3', {}, el('a', { href: '#review' }, 'Review')), el('p.desk-meta', {}, n ? `${n} ${n === 1 ? 'card' : 'cards'} waiting, from every course` : 'Nothing due today')),
    el('a.btn.ghost', { href: '#review' }, 'Go'),
  );
}

function welcome(courses: readonly CatalogEntry[], pick: () => number): HTMLElement {
  const firsts = courses.filter((c) => c.lessonList.length);
  const one = firsts[Math.floor(pick() * firsts.length) % Math.max(1, firsts.length)];
  return el(
    'section.welcome',
    { 'aria-label': 'Welcome' },
    el('img.welcome-mark', { src: './icons/icon.svg', alt: '' }),
    el(
      'div',
      {},
      el('h2', {}, 'Take any book off the shelf.'),
      el('p', {}, `${spell(courses.length)} illustrated workbooks, each lesson ending in a short quiz. Start anywhere: no course needs another first, and your place is kept on this device.`),
      el('p.facts', {}, el('span', {}, '15 to 25 minutes a lesson'), el('span', {}, 'works offline'), el('span', {}, 'no account')),
    ),
    one ? el('a.btn.gold', { href: lessonHref(one, one.lessonList[0]), title: `${one.title}: ${one.lessonList[0].title}` }, 'Show me one') : null,
  );
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const spell = (n: number) => WORDS[n] ?? String(n);

function cover(c: CatalogEntry, read: Read, under: boolean): HTMLElement {
  const { done } = progress(c, read);
  const t = c.theme;
  const first = c.lessonList[0];
  const all = done >= c.lessonCount;
  return el(
    'a.cover',
    {
      href: `./${c.folder}/`,
      // Custom properties need a style string: el() assigns style objects by property name.
      style: t ? `--bg:${t.bg};--a:${t.accent};--t:${t.text};${t.display ? `--d:${t.display}` : ''}` : '',
      title: c.release.stage === 'beta' ? `${c.summary}\n\nBeta, version ${c.release.version}: still being written and checked.` : c.summary,
    },
    under ? el('span.ribbon', { 'aria-label': 'Under way' }) : null,
    icon(c),
    el('span.cover-text', {}, el('b', {}, c.title), c.subtitle ? el('i', {}, c.subtitle) : null, c.release.stage === 'beta' ? el('span.beta', {}, 'Beta') : null),
    el(
      'span.cover-foot',
      {},
      done
        ? [el('span', {}, all ? '✓ Finished' : `${done} of ${lessonsLine(c.lessonCount)}`), el('span.bar', {}, el('i', { style: { width: `${Math.min(1, done / c.lessonCount) * 100}%` } }))]
        : [first ? el('span.begins', {}, `Begins: “${first.title}”`) : null, el('span', {}, lessonsLine(c.lessonCount))],
    ),
  );
}

function bridgeCover(b: Bridge, byFolder: ReadonlyMap<string, CatalogEntry>): HTMLElement {
  const [a, z] = b.between.map((f) => byFolder.get(f)!);
  const own = b.folder ? byFolder.get(b.folder) : undefined;
  return el(
    own ? 'a.cover.bridge' : 'a.cover.bridge.coming',
    { href: own ? `./${own.folder}/` : `#bridge-${b.id}`, title: b.promise },
    splitIcon(a, z, !own),
    el('span.bridge-text', {}, el('b', {}, b.title), el('span.cover-foot', {}, own ? `${a.title} + ${z.title}` : `${a.title} + ${z.title} · being written`)),
  );
}

export interface HomeOptions {
  /** Now, in ms; for "yesterday". */
  now?: number;
  /** A number in [0, 1), to pick the welcome's first lesson. */
  pick?: () => number;
  /** For the install hint: storage and whether the page is already an installed app. */
  write?: (key: string, value: string) => void;
  installed?: boolean;
}

export function homePage(courses: readonly CatalogEntry[], read: Read, map: CatalogMap, o: HomeOptions = {}): HTMLElement {
  const now = o.now ?? Date.now();
  const byFolder = new Map(courses.map((c) => [c.folder, c]));
  const bridgeFolders = new Set(map.bridges.flatMap((b) => (b.folder ? [b.folder] : [])));
  const shelves = map.shelves?.length
    ? map.shelves.map((s) => ({ ...s, courses: s.courses.flatMap((f) => (byFolder.has(f) ? [byFolder.get(f)!] : [])) }))
    : [{ title: 'Courses', note: undefined, courses: courses.filter((c) => !bridgeFolders.has(c.folder)) }];
  const due = dueEverywhere(courses, read);
  const back = begun(courses, read);
  const where = places(courses, read);
  const underWay = new Set(where.filter((p) => p.part !== null).map((p) => p.course.folder));

  const desk = back
    ? el(
        'section.desk',
        { 'aria-label': 'Your desk' },
        where[0] ? continueCard(where[0], now) : null,
        where[1] ? alsoCard(where[1]) : null,
        reviewCard(due),
      )
    : [welcome(shelves.flatMap((s) => s.courses), o.pick ?? Math.random), installSlip(read, o.write, o.installed)];

  return el(
    'div.catalog.home',
    {},
    el(
      'header.home-head',
      {},
      el('h1', {}, 'Courses'),
      el('p.home-tag', {}, 'Self-paced workbooks'),
      el('nav.home-tools', { 'aria-label': 'Other pages' }, el('a.btn.ghost', { href: '#map' }, 'Map'), el('a.btn.ghost', { href: '#review' }, due ? `Review · ${due}` : 'Review')),
    ),
    desk,
    shelves.map((s) =>
      el(
        'section.shelf',
        { 'aria-label': s.title },
        el('div.shelf-head', {}, el('h2', {}, s.title), s.note ? el('p', {}, s.note) : null),
        el('div.shelf-row', {}, s.courses.map((c) => cover(c, read, underWay.has(c.folder)))),
      ),
    ),
    map.bridges.length
      ? el(
          'section.shelf.bridges',
          { 'aria-label': 'Bridges' },
          el('div.shelf-head', {}, el('h2', {}, 'Bridges'), el('p', {}, 'Short courses where two shelves meet')),
          el('div.shelf-row', {}, map.bridges.filter((b) => b.between.every((f) => byFolder.has(f))).map((b) => bridgeCover(b, byFolder))),
          el('p.shelf-more', {}, el('a', { href: '#map' }, 'See them all on the map →')),
        )
      : null,
    el(
      'footer.colophon',
      {},
      courses.some((c) => c.release.stage === 'beta') ? el('p.beta-note', {}, el('span.beta', {}, 'Beta'), ' ', BETA_NOTE) : null,
      el('p', {}, 'Each course keeps its own colours, progress and settings. The menu in any course leads back here under All courses.'),
    ),
  );
}
