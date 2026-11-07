// The catalog's map page (#map): every course on the site, first as a map
// with the short bridge courses that join two courses drawn on the lines
// between them, then listed by department the way a printed college catalog
// lists them, each with its icon, a short summary and a link that opens it.
// The front page, the shelves, is home.ts. Each course keeps its own look
// once opened; these pages stay plain paper and ink.

import { el } from 'didactics/dom';
import { dayCounts, migrateCollection } from 'didactics/srs';
import type { Bridge, CatalogEntry, CatalogMap } from '../registry';
import { MAP_HEIGHT, MAP_WIDTH, REGION_PAD } from './map-size';
import { splitIcon } from './split';

type Read = (key: string) => string | null;

/** Cards due today across every course, from each save's review cards. */
export function dueEverywhere(courses: readonly CatalogEntry[], read: Read): number {
  let n = 0;
  for (const c of courses) {
    try {
      const save = JSON.parse(read(c.save) ?? 'null') as { review?: unknown } | null;
      if (!save?.review) continue;
      const d = dayCounts(migrateCollection(save.review));
      n += d.new + d.learning + d.review;
    } catch {
      // Not a save: nothing due.
    }
  }
  return n;
}

/** How many lessons the reader has finished in a course on this device, and whether one is under way. */
export function progress(entry: CatalogEntry, read: Read): { done: number; going: boolean } {
  let save: unknown;
  try {
    save = JSON.parse(read(entry.save) ?? 'null');
  } catch {
    return { done: 0, going: false };
  }
  if (typeof save !== 'object' || save === null) return { done: 0, going: false };
  const { lessons, resume } = save as { lessons?: Record<string, { done?: boolean }>; resume?: Record<string, unknown> };
  return { done: Object.values(lessons ?? {}).filter((l) => l?.done).length, going: Object.keys(resume ?? {}).length > 0 };
}

/** How far the reader has got in a course on this device, from its save, or null if not begun. */
export function standing(entry: CatalogEntry, read: Read): string | null {
  const { done, going } = progress(entry, read);
  if (done >= entry.lessonCount && done > 0) return 'all completed';
  if (done) return `${done} completed`;
  if (going) return 'in progress';
  return null;
}

const lessonsLine = (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`;
const href = (folder: string) => `./${folder}/`;
/** "Beta · version 0.3" or "Version 1.0". */
export const versionLine = (c: CatalogEntry) => (c.release.stage === 'beta' ? `Beta · version ${c.release.version}` : `Version ${c.release.version}`);

/** What beta means, where the catalog lists a course in beta. */
export const BETA_NOTE = 'A course marked Beta is still being written and checked: its lessons may be added to, reworded or reordered, and some facts and pictures have not been checked yet. Your progress is kept through every change.';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const EMPTY_MAP: CatalogMap = { courses: {}, bridges: [] };

/** The course at the other end of a bridge from `folder`. */
const otherEnd = (b: Bridge, folder: string) => (b.between[0] === folder ? b.between[1] : b.between[0]);

function courseEntry(c: CatalogEntry, read: Read, bridges: readonly Bridge[], titles: ReadonlyMap<string, string>): HTMLElement {
  const status = standing(c, read);
  const mine = bridges.filter((b) => b.between.includes(c.folder));
  return el(
    'article.course',
    { id: `course-${c.folder}` },
    // An <img> rather than inline SVG, so one icon's ids cannot clash with another's.
    el('a.course-icon', { href: href(c.folder), 'aria-hidden': 'true', tabIndex: -1 }, el('img', { src: c.icon, alt: '' })),
    el(
      'div.course-text',
      {},
      el('h3', {}, el('a', { href: href(c.folder) }, c.title), c.subtitle ? el('span.course-subtitle', {}, c.subtitle) : null),
      el('p.course-summary', {}, c.summary),
      el('p.course-meta', {}, el('span', {}, lessonsLine(c.lessonCount)), el('span.course-version', {}, versionLine(c)), status ? el('span.course-standing', {}, status) : null),
      mine.length
        ? el(
            'p.course-bridges',
            {},
            el('span.label', {}, 'Bridges: '),
            mine.flatMap((b, i) => [i ? ', ' : '', el('a', { href: `#bridge-${b.id}` }, b.title), ` (with ${titles.get(otherEnd(b, c.folder)) ?? otherEnd(b, c.folder)})`]),
          )
        : null,
      el('a.course-open', { href: href(c.folder) }, status ? 'Continue the course' : 'Open the course'),
    ),
  );
}

function bridgeEntry(b: Bridge, byFolder: ReadonlyMap<string, CatalogEntry>, read: Read): HTMLElement {
  const [a, z] = b.between.map((f) => byFolder.get(f)!);
  const own = b.folder ? byFolder.get(b.folder) : undefined;
  const status = own ? standing(own, read) : null;
  return el(
    `article.course.bridge${own ? '' : '.coming'}`,
    { id: `bridge-${b.id}` },
    el('span.course-icon', {}, splitIcon(a, z, !own)),
    el(
      'div.course-text',
      {},
      el('h3', {}, own ? el('a', { href: href(own.folder) }, b.title) : b.title, el('span.course-subtitle', {}, `A bridge between ${a.title} and ${z.title}`)),
      el('p.course-summary', {}, b.promise),
      own
        ? [
            el('p.course-meta', {}, el('span', {}, lessonsLine(own.lessonCount)), status ? el('span.course-standing', {}, status) : null),
            el('a.course-open', { href: href(own.folder) }, status ? 'Continue the bridge' : 'Open the bridge'),
          ]
        : el('p.course-meta', {}, el('span', {}, 'In preparation')),
    ),
  );
}

/** Where a shelf's region sits on the map, around its courses, in map units. */
export function regionBox(places: readonly (readonly [number, number])[]): { x: number; y: number; w: number; h: number } {
  const xs = places.map((p) => p[0]);
  const ys = places.map((p) => p[1]);
  const x = Math.max(0, Math.min(...xs) - REGION_PAD.side);
  const y = Math.max(0, Math.min(...ys) - REGION_PAD.top);
  return { x, y, w: Math.min(MAP_WIDTH, Math.max(...xs) + REGION_PAD.side) - x, h: Math.min(MAP_HEIGHT, Math.max(...ys) + REGION_PAD.bottom) - y };
}

/** The map: each shelf a region with its courses in it, bridges as split icons on the lines between, and beside it (on a wide screen) the entry of whichever is picked. */
function mapSection(courses: readonly CatalogEntry[], map: CatalogMap, read: Read): HTMLElement | null {
  const byFolder = new Map(courses.map((c) => [c.folder, c]));
  const placed = courses.filter((c) => map.courses[c.folder]);
  if (!placed.length) return null;
  const at = (f: string) => map.courses[f];
  const pct = ([x, y]: readonly number[]) => ({ left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` });
  const bridges = map.bridges.filter((b) => b.between.every((f) => byFolder.has(f) && map.courses[f]));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const lines = new Map<string, SVGLineElement>();
  for (const b of bridges) {
    const [[x1, y1], [x2, y2]] = b.between.map(at);
    const line = document.createElementNS(ns, 'line');
    for (const [k, v] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(k, String(v));
    line.setAttribute('class', `edge${b.folder ? '' : ' coming'}`);
    svg.append(line);
    lines.set(b.id, line);
  }

  // Each shelf is a region of the map, drawn round its courses.
  const regions = (map.shelves ?? []).flatMap((s) => {
    const ps = s.courses.filter((f) => byFolder.has(f) && map.courses[f]).map(at);
    if (!ps.length) return [];
    const r = regionBox(ps);
    return [el('div.map-region', { style: { left: `${(r.x / MAP_WIDTH) * 100}%`, top: `${(r.y / MAP_HEIGHT) * 100}%`, width: `${(r.w / MAP_WIDTH) * 100}%`, height: `${(r.h / MAP_HEIGHT) * 100}%` } }, el('span.region-name', {}, s.title))];
  });

  const nodes = new Map<string, HTMLElement>();
  for (const c of placed) {
    const { done } = progress(c, read);
    const node = el(
      'a.map-node.map-course',
      { href: href(c.folder), style: pct(at(c.folder)) },
      el('img', { src: c.icon, alt: '' }),
      el('span.map-title', {}, c.title),
      done ? el('span.map-bar', { 'aria-label': `${Math.min(done, c.lessonCount)} of ${c.lessonCount} done` }, el('i', { style: { width: `${Math.min(1, done / c.lessonCount) * 100}%` } })) : null,
    );
    nodes.set(c.folder, node);
  }
  for (const b of bridges) {
    const t = b.at ?? 0.5;
    const [[x1, y1], [x2, y2]] = b.between.map(at);
    const [a, z] = b.between.map((f) => byFolder.get(f)!);
    const own = b.folder ? byFolder.get(b.folder) : undefined;
    const node = el(
      `${own ? 'a' : 'button'}.map-node.map-bridge${own ? '' : '.coming'}`,
      { ...(own ? { href: href(own.folder) } : { type: 'button' }), style: pct([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]), title: `${b.title}: a bridge between ${a.title} and ${z.title}${own ? '' : ', in preparation'}` },
      splitIcon(a, z, !own),
      el('span.map-title', {}, b.title),
    );
    nodes.set(`bridge:${b.id}`, node);
  }

  const panel = el('aside.map-panel', { 'aria-live': 'polite' });
  const bridgeLine = (b: Bridge, from: string) => {
    const own = b.folder ? byFolder.get(b.folder) : undefined;
    const other = byFolder.get(otherEnd(b, from))!;
    return el(
      'li',
      {},
      splitIcon(byFolder.get(b.between[0])!, byFolder.get(b.between[1])!, !own),
      el(
        'span',
        {},
        own ? el('a', { href: href(own.folder) }, b.title) : el('a', { href: `#bridge-${b.id}` }, b.title),
        el('small', {}, `With ${other.title} · ${own ? lessonsLine(own.lessonCount) : 'in preparation'}`),
      ),
    );
  };
  const showCourse = (c: CatalogEntry) => {
    const status = standing(c, read);
    const mine = bridges.filter((b) => b.between.includes(c.folder));
    panel.replaceChildren(el(
      'div.panel-body',
      {},
      el('p.panel-kind', {}, c.department),
      el('h3', {}, el('a', { href: href(c.folder) }, c.title)),
      c.subtitle ? el('p.panel-sub', {}, c.subtitle) : null,
      el('p.panel-summary', {}, c.summary),
      el('p.course-meta', {}, el('span', {}, lessonsLine(c.lessonCount)), el('span.course-version', {}, versionLine(c)), status ? el('span.course-standing', {}, status) : null),
      el('a.course-open', { href: href(c.folder) }, status ? 'Continue the course' : 'Open the course'),
      mine.length ? [el('h4', {}, 'Bridges'), el('ul.panel-bridges', {}, mine.map((b) => bridgeLine(b, c.folder)))] : null,
    ));
  };
  const showBridge = (b: Bridge) => {
    const [a, z] = b.between.map((f) => byFolder.get(f)!);
    const own = b.folder ? byFolder.get(b.folder) : undefined;
    const status = own ? standing(own, read) : null;
    panel.replaceChildren(el(
      'div.panel-body',
      {},
      el('p.panel-kind', {}, own ? 'Bridge' : 'Bridge · in preparation'),
      splitIcon(a, z, !own),
      el('h3', {}, own ? el('a', { href: href(own.folder) }, b.title) : b.title),
      el('p.panel-sub', {}, `Between ${a.title} and ${z.title}`),
      el('p.panel-summary', {}, b.promise),
      own
        ? [
            el('p.course-meta', {}, el('span', {}, lessonsLine(own.lessonCount)), status ? el('span.course-standing', {}, status) : null),
            el('a.course-open', { href: href(own.folder) }, status ? 'Continue the bridge' : 'Open the bridge'),
          ]
        : el('p.panel-note', {}, 'Not written yet.'),
      el('h4', {}, 'It joins'),
      el('ul', {}, [a, z].map((c) => el('li', {}, el('a', { href: href(c.folder) }, c.title), el('small', {}, standing(c, read) ?? lessonsLine(c.lessonCount))))),
    ));
  };

  // Picking one lights it, its lines and what they join, and dims the rest.
  const pick = (key: string, dim = true) => {
    const folder = key.startsWith('bridge:') ? null : key;
    const bridge = folder ? null : bridges.find((b) => `bridge:${b.id}` === key)!;
    const near = new Set<string>([key]);
    for (const b of bridges) {
      if (folder ? b.between.includes(folder) : b === bridge) {
        near.add(`bridge:${b.id}`);
        for (const f of b.between) near.add(f);
      }
    }
    for (const [k, n] of nodes) {
      n.classList.toggle('picked', k === key);
      n.classList.toggle('far', dim && !near.has(k));
    }
    for (const b of bridges) lines.get(b.id)!.classList.toggle('lit', dim && near.has(`bridge:${b.id}`));
    shown = key;
    if (folder) showCourse(byFolder.get(folder)!);
    else showBridge(bridge!);
  };
  for (const [k, n] of nodes) {
    n.addEventListener('mouseenter', () => pick(k));
    n.addEventListener('focus', () => pick(k));
  }
  // A bridge still in preparation has nowhere to go: on a wide screen it is
  // shown beside the map; on a phone its entry further down.
  for (const b of bridges) {
    if (b.folder) continue;
    nodes.get(`bridge:${b.id}`)!.addEventListener('click', () => {
      pick(`bridge:${b.id}`);
      if (!matchMedia('(min-width: 960px)').matches) document.getElementById(`bridge-${b.id}`)?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  // Leaving the map lifts the dimming and keeps the panel as it is.
  let shown = '';
  const mapBox = el('div.map', {}, regions, svg, [...nodes.values()]);
  mapBox.addEventListener('mouseleave', () => pick(shown, false));
  // Start on the course the reader went furthest in, or the first, with
  // nothing dimmed until the reader points at something.
  const first = [...placed].sort((p, q) => progress(q, read).done - progress(p, read).done)[0];
  pick(first.folder, false);

  return el(
    'section.map-section',
    { 'aria-label': 'Map of the courses' },
    el(
      'div.map-wrap',
      {},
      el(
        'div',
        {},
        mapBox,
        bridges.length
          ? el('p.map-legend', {}, el('span.legend-icon', {}, splitIcon(placed[0], placed[Math.min(1, placed.length - 1)], true)), 'A bridge: a short course that needs the two courses either side of it. Dashed until it is written.')
          : null,
      ),
      panel,
    ),
  );
}

export function mapPage(courses: readonly CatalogEntry[], read: Read, map: CatalogMap = EMPTY_MAP): HTMLElement {
  const bridgeFolders = new Set(map.bridges.flatMap((b) => (b.folder ? [b.folder] : [])));
  const main = courses.filter((c) => !bridgeFolders.has(c.folder));
  const byFolder = new Map(courses.map((c) => [c.folder, c]));
  const titles = new Map(courses.map((c) => [c.folder, c.title]));
  const departments = [...new Set(main.map((c) => c.department))];
  return el(
    'div.catalog',
    {},
    el(
      'header.masthead',
      {},
      el('p.running', {}, el('a', { href: '#' }, '← The shelves'), el('span', {}, 'Course Catalog')),
      el('h1', {}, 'The map'),
      el(
        'p.lede',
        {},
        'Every course on the site, grouped as on the shelves. ',
        map.bridges.length ? 'The split icons between them are bridges, short courses that need both of their neighbours. ' : '',
        'Start any course first; your place in each is kept on this device.',
      ),
    ),
    reviewLine(courses, read),
    mapSection(main, map, read),
    el(
      'nav.contents',
      { 'aria-label': 'Departments' },
      el('h2', {}, 'Contents'),
      el('ol', {}, departments.map((d) => el('li', {}, el('a', { href: `#${slug(d)}` }, d))), map.bridges.length ? el('li', {}, el('a', { href: '#bridges' }, 'Bridges')) : null),
    ),
    el(
      'div.listing',
      {},
      departments.map((d) =>
        el('section.department', { id: slug(d) }, el('h2', {}, d), el('div.entries', {}, main.filter((c) => c.department === d).map((c) => courseEntry(c, read, map.bridges, titles)))),
      ),
      map.bridges.length
        ? el('section.department.bridges', { id: 'bridges' }, el('h2', {}, 'Bridges'), el('div.entries', {}, map.bridges.map((b) => bridgeEntry(b, byFolder, read))))
        : null,
    ),
    el('footer.colophon', {}, el('p', {}, el('a', { href: '#' }, '← Back to the shelves'))),
  );
}

/** The way to review every course's cards together, with how many are waiting today. */
function reviewLine(courses: readonly CatalogEntry[], read: Read): HTMLElement {
  const n = dueEverywhere(courses, read);
  return el('p.review-line', {}, el('a', { href: '#review' }, 'Review all courses'), n ? `: ${n} ${n === 1 ? 'card' : 'cards'} waiting today, from every course in one sitting.` : ': the cards from every course’s checks, in one sitting.');
}
