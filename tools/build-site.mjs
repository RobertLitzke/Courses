// Builds the whole site into dist/: each course (courses/<folder>/, any
// folder with a course.json) with its own build, copied to dist/<folder>/,
// then the catalog into dist/ itself, whose service worker covers them all.
//
// A course's own build still writes a service worker and manifest for itself
// (Didactics' lessonApp with inSite); they are left out here, as the site has
// one of each, at its root.

import { execFile, execFileSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeHtml as writeStatus } from './status.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const OWN_WORKER = /^(sw\.js|workbox-[^/]*\.js|registerSW\.js|manifest\.webmanifest)$/;

// Run npm as the npm that ran this script (npm_execpath, set by `npm run`),
// through the same Node, so it works on Windows too, where there is no `npm`
// file to exec, only npm.cmd; a direct `node tools/build-site.mjs` falls back
// to the npm on the path, through a shell on Windows.
const npm = process.env.npm_execpath;
const win = process.platform === 'win32';
const run = (args, cwd = root) =>
  npm
    ? execFileSync(process.execPath, [npm, ...args], { cwd, stdio: 'inherit' })
    : execFileSync(win ? 'npm.cmd' : 'npm', args, { cwd, stdio: 'inherit', shell: win });
// The same, in the background, with its output kept to print in one piece, so
// that courses building side by side do not interleave their logs.
const runQuiet = (args, cwd) =>
  new Promise((done, fail) => {
    const [file, argv, opts] = npm
      ? [process.execPath, [npm, ...args], { cwd }]
      : [win ? 'npm.cmd' : 'npm', args, { cwd, shell: win }];
    execFile(file, argv, { ...opts, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = `${stdout}${stderr}`;
      if (err) fail(Object.assign(err, { out }));
      else done(out);
    });
  });

// The live site's address, the one place it is written: `homepage` in package.json.
// Every path on the site is relative; only a course's one-file copy, opened from
// disk, fetches its photos and links its catalog from here (VITE_SITE_URL, read in
// each course's asset.ts). Hosting the site elsewhere means changing that field.
const homepage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).homepage;
if (homepage) process.env.VITE_SITE_URL = homepage.endsWith('/') ? homepage : `${homepage}/`;

rmSync(dist, { recursive: true, force: true });
const courses = readdirSync(join(root, 'courses')).filter((f) => existsSync(join(root, 'courses', f, 'course.json'))).sort();
// Courses build side by side, as many at once as the machine has cores
// (BUILD_JOBS overrides it; BUILD_JOBS=1 builds one at a time). Each writes
// only its own dist/, and the catalog, which reads them all, comes after.
const jobs = Math.max(1, Number(process.env.BUILD_JOBS) || availableParallelism());
const queue = [...courses];
let failed = null;
const buildCourse = async (folder) => {
  const dir = join(root, 'courses', folder);
  const started = Date.now();
  try {
    const out = await runQuiet(['run', 'build'], dir);
    console.log(`\n== ${folder} (${((Date.now() - started) / 1000).toFixed(1)} s)\n${out.trimEnd()}`);
  } catch (e) {
    console.error(`\n== ${folder} FAILED\n${(e.out ?? e.message).trimEnd()}`);
    failed ??= folder;
    return;
  }
  cpSync(join(dir, 'dist'), join(dist, folder), {
    recursive: true,
    filter: (src) => !OWN_WORKER.test(src.slice(join(dir, 'dist').length + 1)),
  });
};
await Promise.all(
  Array.from({ length: Math.min(jobs, courses.length) }, async () => {
    while (queue.length && !failed) await buildCourse(queue.shift());
  }),
);
if (failed) {
  console.error(`\nThe ${failed} build failed; the site was not built.`);
  process.exit(1);
}
console.log('\n== catalog');
run(['run', 'build'], join(root, 'catalog'));
// The course status table (tools/status.mjs) at /status.html, unlinked: a page for whoever writes the courses.
try {
  writeStatus(join(dist, 'status.html'));
} catch (e) {
  console.warn(`status.html left out: ${e.message}`);
}
console.log(`\nBuilt ${courses.length} courses and the catalog into dist/.`);
