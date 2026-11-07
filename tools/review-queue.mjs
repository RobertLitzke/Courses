// The Gemini copy edits waiting across the site. Each course that takes the
// copy edit (tools/copyedit.mjs, with the course's own brief in its
// tools/copyedit.json) keeps a tools/review-queue.json: lessons whose new
// prose (paragraphs, captions, footnotes) has not yet had the final copy edit,
// with the date and what was added, and { "description": true } when the
// course's catalog description waits for its pass (tools/copyedit.mjs
// --description). Writers append to it; this runs them as
// one batch. The encyclopedia's queue, tools/encyclopedia-review-queue.json,
// runs with them (tools/encyclopedia-copyedit.mjs).
//
//   node tools/review-queue.mjs                              list what is waiting
//   OPENROUTER_API_KEY=… node tools/review-queue.mjs --run   edit and write every queued lesson
//
// Each course's reports land in courses/<course>/tools/copyedit-out/. Read
// their "Facts" sections before committing: the model's fact changes are
// sometimes wrong.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = process.argv.includes('--run');
let total = 0;
for (const course of readdirSync(join(root, 'courses'))) {
  const dir = join(root, 'courses', course);
  const queueFile = join(dir, 'tools/review-queue.json');
  if (!existsSync(queueFile)) continue;
  // A course with no copy-edit brief takes only the description pass.
  const queue = JSON.parse(readFileSync(queueFile, 'utf8')).filter((q) => q.description || existsSync(join(dir, 'tools/copyedit.json')));
  if (!queue.length) continue;
  total += queue.length;
  console.log(`${course}: ${queue.length} waiting`);
  for (const q of queue) console.log(`  ${(q.description ? '(description)' : q.lesson).padEnd(16)} ${q.added ?? ''}  ${q.what ?? ''}`);
  if (run) {
    const r = spawnSync(process.execPath, ['tools/copyedit.mjs', course, '--queue', '--write'], { cwd: root, stdio: 'inherit' });
    if (r.status) process.exitCode = r.status;
  }
}
// The encyclopedia (encyclopedia/ at the root) keeps a queue of its own, by file.
const encQueue = join(root, 'tools/encyclopedia-review-queue.json');
if (existsSync(encQueue)) {
  const queue = JSON.parse(readFileSync(encQueue, 'utf8'));
  if (queue.length) {
    total += queue.length;
    console.log(`encyclopedia: ${queue.length} file${queue.length === 1 ? '' : 's'}`);
    for (const q of queue) console.log(`  ${q.file.padEnd(16)} ${q.added ?? ''}  ${q.what ?? ''}`);
    if (run) {
      const r = spawnSync(process.execPath, ['tools/encyclopedia-copyedit.mjs', '--queue', '--write'], { cwd: root, stdio: 'inherit' });
      if (r.status) process.exitCode = r.status;
    }
  }
}
if (!total) console.log('Nothing waiting for a copy edit.');
else if (!run) console.log(`\n${total} in all. Run with OPENROUTER_API_KEY=… and --run to edit them.`);
