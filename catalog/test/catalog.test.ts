// @vitest-environment happy-dom
// The catalog: every course folder's course.json, and the page listing them.

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { infoProblems, mapProblems, readCatalog, readMap, type CatalogEntry, type CatalogMap } from '../registry';
import { begun, homePage, places } from '../src/home';
import { mapPage as catalogPage, regionBox, standing } from '../src/page';

const courses = resolve(__dirname, '../../courses');
const BETA = { version: '0.1', stage: 'beta', date: '2026-11-04' } as const;

describe('the courses on the site', () => {
  const all = readCatalog(courses);

  it('reads every course folder with a course.json, with its lessons counted and listed by number, and its icon', () => {
    expect(all.map((c) => c.folder)).toContain('clouds');
    for (const c of all) {
      expect(c.lessonCount).toBeGreaterThan(0);
      expect(c.lessonList.length, c.folder).toBeGreaterThan(0);
      expect(c.lessonList[0].n, c.folder).toBe(1);
      expect(c.lessonList.every((l) => l.id && l.title && l.parts > 0)).toBe(true);
      expect(c.icon).toMatch(/^data:image\//);
    }
  });

  it('keeps each course\'s save key, so progress from before the move is still found', () => {
    expect(all.find((c) => c.folder === 'clouds')!.save).toBe('clouds.save');
    expect(new Set(all.map((c) => c.save)).size).toBe(all.length);
  });

  it('refuses a cute folder name or a course.json missing its words', () => {
    expect(infoProblems('Out_of_Auto', { title: 'x', department: 'x', summary: 'x', lessons: 'x', icon: 'x', save: 'x', order: 1 })[0]).toMatch(/lowercase/);
    expect(infoProblems('soil', { title: 'Soil' }).join('\n')).toMatch(/"summary" should be words/);
  });

  it('gives every course a version and a stage, a beta 0.x and a released course 1.0 or more', () => {
    for (const c of all) expect(c.release.stage === 'beta' ? /^0\.\d+$/ : /^[1-9]\d*\.\d+$/, c.folder).toSatisfy((re: RegExp) => re.test(c.release.version));
    const info = { title: 'x', department: 'x', summary: 'x', lessons: 'x', icon: 'x', save: 'x', order: 1 };
    expect(infoProblems('soil', info).join('\n')).toMatch(/"release" should be/);
    expect(infoProblems('soil', { ...info, release: { version: '1.0', stage: 'beta', date: '2026-11-04' } }).join('\n')).toMatch(/a beta is 0.x/);
    expect(infoProblems('soil', { ...info, release: BETA })).toEqual([]);
  });

  it('describes each course in its own words, without the stock phrases they once shared', () => {
    const stock = [/each lesson (opens|starts)/i, /live (figures|diagrams|models)/i, /you can push/i, /follows? the evidence/i, /[—–]/, /\b(delve|tapestry|crucial|vital|fascinating|remarkable|incredible|journey|unlock|harness|robust|seamless|realm|testament)\b/i, /!/];
    for (const c of all) for (const re of stock) expect(c.summary, `${c.folder}: ${re}`).not.toMatch(re);
    // No two open the same way.
    const openings = all.map((c) => c.summary.split(/\s+/).slice(0, 3).join(' ').toLowerCase());
    expect(new Set(openings).size).toBe(openings.length);
  });

  it('lists courses by their order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'catalog-'));
    for (const [folder, order] of [['zebra', 1], ['apple', 2]] as const) {
      mkdirSync(join(dir, folder, 'lessons'), { recursive: true });
      writeFileSync(join(dir, folder, 'lessons', 'one.json'), '{}');
      writeFileSync(join(dir, folder, 'icon.svg'), '<svg/>');
      writeFileSync(join(dir, folder, 'course.json'), JSON.stringify({ title: folder, department: 'D', order, summary: 'S', lessons: 'lessons', icon: 'icon.svg', save: `${folder}.save`, release: BETA }));
    }
    expect(readCatalog(dir).map((c) => c.folder)).toEqual(['zebra', 'apple']);
  });
});

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  folder: 'soil', title: 'Soil', department: 'Earth Sciences', order: 1, summary: 'About soil.', save: 'soil.save', lessonCount: 4, icon: 'data:image/svg+xml,%3Csvg%2F%3E', release: BETA,
  lessonList: [{ id: 'grit', n: 1, title: 'Grit', parts: 3 }, { id: 'water', n: 2, title: 'Water', parts: 5 }, { id: 'worms', n: 3, title: 'Worms', parts: 4 }, { id: 'side', n: 101, title: 'Side trip', parts: 2 }],
  ...over,
});

describe('the map page\'s listing', () => {
  it('lists each course under its department with its icon, summary and a link into its folder', () => {
    const page = catalogPage([entry(), entry({ folder: 'electronics', title: 'Electronics', department: 'Engineering', save: 'e.save' })], () => null);
    expect([...page.querySelectorAll('.department h2')].map((h) => h.textContent)).toEqual(['Earth Sciences', 'Engineering']);
    const soil = page.querySelector('.course')!;
    expect(soil.querySelector('h3 a')!.getAttribute('href')).toBe('./soil/');
    expect(soil.querySelector('.course-summary')!.textContent).toBe('About soil.');
    expect(soil.querySelector('img')!.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(soil.querySelector('.course-open')!.textContent).toBe('Open the course');
  });

  it('says how far the reader got, from the course\'s own save', () => {
    const save = (s: object) => (key: string) => (key === 'soil.save' ? JSON.stringify(s) : null);
    expect(standing(entry(), () => null)).toBeNull();
    expect(standing(entry(), () => 'not json')).toBeNull();
    expect(standing(entry(), save({ lessons: { a: { done: true }, b: { done: false } } }))).toBe('1 completed');
    expect(standing(entry(), save({ lessons: {}, resume: { a: {} } }))).toBe('in progress');
    expect(standing(entry({ lessonCount: 1 }), save({ lessons: { a: { done: true } } }))).toBe('all completed');
    const page = catalogPage([entry()], save({ lessons: { a: { done: true } } }));
    expect(page.querySelector('.course-open')!.textContent).toBe('Continue the course');
  });
});

describe('the map', () => {
  const all = readCatalog(courses);

  it('places every course, and its bridges join courses that are on it', () => {
    const map = readMap(resolve(__dirname, '../map.json'), all);
    for (const c of all) expect(map.courses[c.folder], c.folder).toBeDefined();
    expect(map.bridges.length).toBeGreaterThan(0);
  });

  it('draws each shelf as a region round its courses, and refuses two courses too close to label', () => {
    expect(regionBox([[300, 200], [500, 400]])).toEqual({ x: 200, y: 115, w: 400, h: 385 });
    expect(regionBox([[20, 20]]).x).toBe(0);
    expect(mapProblems({ courses: { soil: [100, 100], clouds: [150, 120] }, bridges: [] }, ['soil', 'clouds']).join('\n')).toMatch(/soil and clouds are closer/);
    const real = readMap(resolve(__dirname, '../map.json'), all);
    const page = catalogPage(all, () => null, real);
    expect(page.querySelectorAll('.map-region').length).toBe(real.shelves!.length);
  });

  it('refuses a bridge to a course not on the map, a place off the map, or a folder with no course', () => {
    const bad: CatalogMap = {
      courses: { soil: [100, 100], clouds: [2000, 100] },
      bridges: [
        { id: 'a', title: 'A', promise: 'P', between: ['soil', 'geology'] },
        { id: 'b', title: 'B', promise: 'P', between: ['soil', 'clouds'], folder: 'nowhere' },
      ],
    };
    const problems = mapProblems(bad, ['soil', 'clouds']).join('\n');
    expect(problems).toMatch(/clouds's place/);
    expect(problems).toMatch(/joins geology, which is not on the map/);
    expect(problems).toMatch(/courses\/nowhere/);
  });

  it('draws each course and bridge, and lists the bridges after the departments', () => {
    const map: CatalogMap = {
      courses: { soil: [100, 100], electronics: [800, 400] },
      bridges: [{ id: 'mud', title: 'Muddy circuits', promise: 'Soil sensors.', between: ['soil', 'electronics'] }],
    };
    const page = catalogPage([entry(), entry({ folder: 'electronics', title: 'Electronics', department: 'Engineering', save: 'e.save' })], () => null, map);
    expect(page.querySelectorAll('.map-course').length).toBe(2);
    const bridge = page.querySelector('.map-bridge')!;
    expect(bridge.tagName).toBe('BUTTON');
    expect(bridge.classList.contains('coming')).toBe(true);
    expect(page.querySelectorAll('line.edge.coming').length).toBe(1);
    expect(page.querySelector('#bridges .course h3')!.textContent).toMatch(/Muddy circuits.*between Soil and Electronics/);
    expect(page.querySelector('#course-soil .course-bridges')!.textContent).toBe('Bridges: Muddy circuits (with Electronics)');
    // A bridge is one icon, cut in two, each course's picture on its side of the cut.
    const split = bridge.querySelector('.split.coming')!;
    expect(split.getAttribute('aria-label')).toBe('Soil and Electronics');
    expect(split.querySelectorAll('img.split-a, img.split-b').length).toBe(2);
    expect(page.querySelector('#bridges .course .split')).not.toBeNull();
    // The panel starts on a course.
    expect(page.querySelector('.map-panel h3')!.textContent).toBe('Soil');
    // Nothing is dimmed until the reader points at something; then its line lights.
    expect(page.querySelectorAll('line.lit, .far').length).toBe(0);
    page.querySelector('.map-course')!.dispatchEvent(new Event('mouseenter'));
    expect(page.querySelectorAll('line.lit').length).toBe(1);
  });
});

describe('the shelves', () => {
  const electronics = entry({ folder: 'electronics', title: 'Electronics', save: 'e.save', lessonList: [{ id: 'volts', n: 1, title: 'Volts', parts: 6 }] });
  const map: CatalogMap = {
    courses: { soil: [100, 100], electronics: [800, 400] },
    bridges: [{ id: 'mud', title: 'Muddy circuits', promise: 'Soil sensors.', between: ['soil', 'electronics'] }],
    shelves: [{ title: 'Things', note: 'All of them', courses: ['electronics', 'soil'] }],
  };
  const saves = (s: Record<string, object>) => (key: string) => (s[key] ? JSON.stringify(s[key]) : null);

  it('puts every course on one shelf, and refuses a course on none or on two', () => {
    const real = readMap(resolve(__dirname, '../map.json'), readCatalog(courses));
    expect(real.shelves!.length).toBeGreaterThan(1);
    const shelf = (courses: string[]) => ({ ...map, shelves: [{ title: 'A', courses }, { title: 'B', courses: ['soil'] }] });
    expect(mapProblems(shelf(['soil', 'electronics']), ['soil', 'electronics']).join('\n')).toMatch(/soil is on two shelves/);
    expect(mapProblems(shelf([]), ['soil', 'electronics']).join('\n')).toMatch(/electronics is on no shelf/);
  });

  it('welcomes a new reader with a first lesson to open, and shows each book with where it begins', () => {
    const page = homePage([entry(), electronics], () => null, map, { pick: () => 0, installed: true });
    expect(page.querySelector('.welcome a.btn')!.getAttribute('href')).toBe('./electronics/#/lesson/volts');
    expect(page.querySelector('.desk')).toBeNull();
    expect([...page.querySelectorAll('.shelf:not(.bridges) .cover b')].map((b) => b.textContent)).toEqual(['Electronics', 'Soil']);
    expect(page.querySelector('.cover .begins')!.textContent).toBe('Begins: “Volts”');
    expect(page.querySelector('.bridges .cover')!.getAttribute('href')).toBe('#bridge-mud');
  });

  it('offers the install hint until the reader says not now, and not once installed', () => {
    expect(homePage([entry()], () => null, map, { installed: false }).querySelector('.install')).not.toBeNull();
    expect(homePage([entry()], (k) => (k === 'catalog.install' ? 'no' : null), map, { installed: false }).querySelector('.install')).toBeNull();
    expect(homePage([entry()], () => null, map, { installed: true }).querySelector('.install')).toBeNull();
  });

  it('continues the lesson the reader was last in, at its part, across courses', () => {
    const read = saves({
      'soil.save': { lessons: { grit: { done: true, finishedAt: '2026-11-01T10:00:00Z' } }, resume: { grit: { part: 0 }, water: { part: 2, seen: Date.parse('2026-11-01T09:00:00Z') } } },
      'e.save': { lessons: {}, resume: { volts: { part: 4, seen: Date.parse('2026-11-03T10:00:00Z') } } },
    });
    expect(begun([entry(), electronics], read)).toBe(true);
    const [first, second] = places([entry(), electronics], read);
    expect([first.course.folder, first.lesson.id, first.part]).toEqual(['electronics', 'volts', 4]);
    // Soil's finished lesson counts as when the reader was last there.
    expect([second.course.folder, second.lesson.id, second.part]).toEqual(['soil', 'water', 2]);
    const page = homePage([entry(), electronics], read, map, { now: Date.parse('2026-11-04T22:00:00Z') });
    const main = page.querySelector('.desk-main')!;
    expect(main.querySelector('a.btn')!.getAttribute('href')).toBe('./electronics/#/lesson/volts');
    expect(main.textContent).toMatch(/Where you left off · yesterday/);
    expect(main.textContent).toMatch(/part 5 of 6/);
    expect(page.querySelector('.desk-also')!.textContent).toMatch(/Under way: Water/);
    expect(page.querySelector('.welcome')).toBeNull();
    // The book under way has a ribbon.
    expect(page.querySelectorAll('.ribbon').length).toBe(2);
  });

  it('offers the next trunk lesson when nothing is under way', () => {
    const read = saves({ 'soil.save': { lessons: { grit: { done: true }, water: { done: true } } } });
    const [p] = places([entry()], read);
    expect([p.lesson.id, p.part]).toEqual(['worms', null]);
    expect(homePage([entry()], read, map).querySelector('.desk-main a.btn')!.textContent).toBe('Start');
  });
});
