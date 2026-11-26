// Runs the tests of one share of the workspaces, so CI can run the suite on
// several runners at once: `node tools/test-shard.mjs 1/2` runs the first of
// two shares. Workspaces with no test script are skipped, like
// `npm test --workspaces --if-present`.
//
// The shares are fixed by a cost table (seconds per workspace on the CI
// runner, from its logs); a workspace not in the table counts as 3 s. Each
// workspace goes to whichever share is lightest so far, heaviest first.
// Every workspace lands in exactly one share whatever the table says, so the
// table only affects balance, never what is tested.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COST = { 'courses/clouds': 31, 'courses/systems': 18, 'courses/rivers': 17, 'courses/synthesizers': 11 };

const m = /^(\d+)\/(\d+)$/.exec(process.argv[2] ?? '');
if (!m || +m[1] < 1 || +m[1] > +m[2]) {
  console.error('usage: node tools/test-shard.mjs <share>/<shares>, e.g. 1/2');
  process.exit(2);
}
const [share, shares] = [+m[1], +m[2]];

const npm = process.env.npm_execpath;
const win = process.platform === 'win32';
const run = (args, opts) =>
  npm
    ? execFileSync(process.execPath, [npm, ...args], { cwd: root, ...opts })
    : execFileSync(win ? 'npm.cmd' : 'npm', args, { cwd: root, shell: win, ...opts });

const workspaces = JSON.parse(run(['query', '.workspace'], { encoding: 'utf8' }))
  .map((w) => w.location.replaceAll('\\', '/'))
  .filter((loc) => JSON.parse(readFileSync(join(root, loc, 'package.json'), 'utf8')).scripts?.test)
  .sort();

const cost = (w) => COST[w] ?? 3;
const load = Array.from({ length: shares }, () => ({ total: 0, list: [] }));
for (const w of [...workspaces].sort((a, b) => cost(b) - cost(a) || a.localeCompare(b))) {
  const lightest = load.reduce((a, b) => (b.total < a.total ? b : a));
  lightest.total += cost(w);
  lightest.list.push(w);
}
const mine = load[share - 1].list.sort();

console.log(`Share ${share} of ${shares}: ${mine.join(', ') || '(none)'}`);
for (const w of mine) {
  console.log(`\n== ${w}`);
  run(['test', '-w', w], { stdio: 'inherit' });
}
