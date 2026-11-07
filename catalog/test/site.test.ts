// The site as a whole: what every workspace must agree on (one Didactics pin
// at the root, the shared tsconfig, the page head), and the root tools'
// agreements with the courses (photo picks keep their ids, queued copy edits
// name lessons that exist, Commons licences map onto the ids Didactics knows).

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { licenceFrom, paleoartFlags, pictureProblems, type PaleoartList } from 'didactics/pictures';

const root = resolve(__dirname, '../..');
const courses = readdirSync(join(root, 'courses')).filter((c) => existsSync(join(root, 'courses', c, 'course.json')));
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const workspaces = [...courses.map((c) => join(root, 'courses', c)), join(root, 'catalog')];

describe('every workspace', () => {
  it('leaves the Didactics pin to the root package.json', () => {
    expect(json(join(root, 'package.json')).dependencies?.didactics).toMatch(/^github:RobertLitzke\/Didactics#/);
    for (const w of workspaces) {
      const pkg = json(join(w, 'package.json'));
      expect({ ...pkg.dependencies, ...pkg.devDependencies }.didactics, w).toBeUndefined();
    }
  });

  it('extends the root tsconfig.base.json', () => {
    for (const w of workspaces) expect(json(join(w, 'tsconfig.json')).extends, w).toMatch(/tsconfig\.base\.json$/);
  });

  it('has the same page head: a theme colour, the icons the icons tool writes, and the app title', () => {
    for (const w of workspaces) {
      const head = readFileSync(join(w, 'index.html'), 'utf8').split('</head>')[0];
      for (const line of [
        '<meta name="theme-color"',
        '<link rel="icon" type="image/svg+xml" href="./icons/icon.svg" />',
        '<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png" />',
        '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png" />',
        '<meta name="apple-mobile-web-app-title"',
        '<meta name="mobile-web-app-capable" content="yes" />',
      ]) expect(head, `${w}: ${line}`).toContain(line);
      for (const f of ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
        expect(existsSync(join(w, 'public/icons', f)), `${w}: icons/${f}`).toBe(true);
      }
    }
  });
});

describe('the photo tools', () => {
  it('credit every picture fully, with its kind (didactics/pictures)', () => {
    for (const c of courses) {
      const file = join(root, 'courses', c, 'src/data/photos.json');
      if (!existsSync(file)) continue;
      for (const p of json(file) as { id: string }[]) expect(pictureProblems(p), `${c}: ${p.id}`).toEqual([]);
    }
  });

  it("show no picture on Commons' inaccurate-paleoart list (tools/inaccurate-paleoart.json)", () => {
    const listFile = join(root, 'tools/inaccurate-paleoart.json');
    if (!existsSync(listFile)) return; // made on Rob's computer: npm run pictures:paleoart
    const list: PaleoartList = json(listFile);
    for (const c of courses) {
      const file = join(root, 'courses', c, 'src/data/photos.json');
      if (existsSync(file)) expect(paleoartFlags(json(file), list).map((f) => f.problem), c).toEqual([]);
    }
  });

  it('read licences as Didactics does', () => {
    expect(licenceFrom('CC BY-SA 4.0')).toBe('CC-BY-SA-4.0');
    expect(licenceFrom('CC BY-NC 2.0')).toBeNull();
  });

  it('keep every photo id: each picked once, and every credited photo still picked', () => {
    for (const c of courses) {
      const picksFile = join(root, 'courses', c, 'tools/photo-picks.json');
      if (!existsSync(picksFile)) continue;
      const picks: ({ id: string } & Record<string, unknown>)[] = json(picksFile);
      const ids = picks.map((p) => p.id);
      expect(new Set(ids).size, `${c}: a pick id repeats`).toBe(ids.length);
      const sources = ['title', 'commons', 'phylopic', 'inaturalist', 'bhl', 'smithsonian', 'url'];
      for (const p of picks) expect(sources.some((k) => p[k]), `${c}: ${p.id} names no file`).toBe(true);
      const library: { id: string }[] = json(join(root, 'courses', c, 'src/data/photos.json'));
      for (const p of library) expect(ids, `${c}: ${p.id} is credited but no longer picked`).toContain(p.id);
    }
  });
});

describe('the copy edit', () => {
  it('finds every queued lesson in its course, which has a brief; a description entry needs no brief', () => {
    for (const c of courses) {
      const queueFile = join(root, 'courses', c, 'tools/review-queue.json');
      if (!existsSync(queueFile)) continue;
      const queue = json(queueFile) as { lesson?: string; description?: boolean }[];
      const lessonsQueued = queue.filter((q) => !q.description);
      for (const q of queue) expect(Boolean(q.lesson) !== Boolean(q.description), `${c}: a queue entry names a lesson or is { "description": true }`).toBe(true);
      if (lessonsQueued.length) expect(existsSync(join(root, 'courses', c, 'tools/copyedit.json')), `${c}: lessons queued without a copyedit.json`).toBe(true);
      const lessons = join(root, 'courses', c, json(join(root, 'courses', c, 'course.json')).lessons);
      for (const q of lessonsQueued) expect(existsSync(join(lessons, `${q.lesson}.json`)), `${c}: queued ${q.lesson}`).toBe(true);
    }
  });
});

describe('the status table', () => {
  it('reads every course, and tools/lesson-status.json names only lessons that exist', async () => {
    const { collect } = await import('../../tools/status.mjs');
    const data = collect();
    expect(data.warnings).toEqual([]);
    const courses = readdirSync(join(root, 'courses')).filter((c) => existsSync(join(root, 'courses', c, 'course.json')));
    expect(data.courses.filter((c: { outlineOnly?: boolean }) => !c.outlineOnly).map((c: { folder: string }) => c.folder).sort()).toEqual(courses.sort());
  });
});
