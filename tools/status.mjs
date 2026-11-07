// The course status table: every lesson of every course, planned or written,
// with where it stands (student read-through, Gemini copy edit, fact check,
// photos) and a line on what it covers.
//
//   npm run status            writes docs/status.md and docs/status.html
//   npm run status -- --print  the overview table on the terminal as well
//
// What can be read from the repository is read, so it stays true without
// anyone remembering to update it:
//   - written lessons: the JSON files in the folder each course.json names
//   - planned lessons: the `coming(...)` entries in a course's lessons.ts
//   - branches and lesson codes ("5", "P2"): BRANCHES in lessons.ts, as
//     didactics/tree's lessonCodes numbers them
//   - awaiting Gemini: the lesson is in courses/<c>/tools/review-queue.json
//   - awaiting photos: the lesson has blocks parked in tools/pending-photos.json,
//     or (for a course marked expectsPhotos) no photo at all
//   - no student read-through: its queue entry says "no student review"
// The rest is kept by hand in tools/lesson-status.json (see its $comment):
// fact checks, read-throughs the queue doesn't mention, images that are
// stand-ins, lessons planned in an outline but not yet in lessons.ts, and a
// plainer one-line summary where a lesson's `teaches` is long. A course that
// is only an outline so far (no folder) is listed there with a title and its
// planned lessons.
//
// tools/build-site.mjs also calls this, so the live site carries the table at
// /status.html, current with whatever was last deployed.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

/** The steps a lesson goes through after it is written, in order. */
export const STEPS = [
  { key: 'student', label: 'needs student read-through', short: 'Student read-through', gap: 'to read through' },
  { key: 'gemini', label: 'awaiting Gemini review', short: 'Gemini', gap: 'to copy-edit' },
  { key: 'facts', label: 'awaiting fact check', short: 'Fact check', gap: 'to fact-check' },
  { key: 'images', label: 'awaiting photos/images', short: 'Photos', gap: 'awaiting photos' },
];

const STR = String.raw`'((?:[^'\\]|\\.)*)'`;
const unq = (s) => s.replace(/\\'/g, "'");

/** Lessons listed as `coming(id, n, title, teaches, { branch })` in a course's source. */
function comingLessons(src) {
  const re = new RegExp(String.raw`coming\(\s*${STR},\s*(\d+),\s*${STR},\s*${STR}\s*(?:,\s*\{([^}]*)\})?\s*\)`, 'g');
  const out = [];
  for (const m of src.matchAll(re)) {
    if (/=>/.test(src.slice(Math.max(0, m.index - 30), m.index))) continue;
    const branch = /branch:\s*'([^']+)'/.exec(m[5] ?? '')?.[1];
    out.push({ id: unq(m[1]), n: Number(m[2]), title: unq(m[3]), teaches: unq(m[4]), branch, coming: true });
  }
  return out.filter((l) => l.id !== 'id');
}

/** The tree's branches: `{ id, title, ..., prefix }`, and Circuitry's tracks. */
function branches(src) {
  const out = [];
  const re = new RegExp(String.raw`\{\s*id:\s*${STR},\s*title:\s*${STR}[^}]*?prefix:\s*'([A-Z]+)'`, 'g');
  for (const m of src.matchAll(re)) out.push({ id: unq(m[1]), title: unq(m[2]), prefix: m[3] });
  const tr = new RegExp(String.raw`\{\s*id:\s*${STR},\s*title:\s*${STR},\s*blurb:`, 'g');
  for (const m of src.matchAll(tr)) if (m[1] !== 'core') out.push({ id: m[1], title: unq(m[2]) });
  return out;
}

/** Branches set in code rather than in the lesson's JSON (Clouds: `fromJson(fog, [], { branch: 'coast' })`). */
function codeBranches(src) {
  const files = new Map();
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'[^']*\/([\w-]+)\.json'/g)) files.set(m[1], m[2]);
  const out = new Map();
  for (const m of src.matchAll(/fromJson\((\w+),[^\n]*?branch:\s*'([\w-]+)'/g)) if (files.has(m[1])) out.set(files.get(m[1]), m[2]);
  return out;
}

/** Every photo id a lesson's blocks name. */
function photoRefs(lesson) {
  let n = 0;
  const walk = (o) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) {
        if (/^photos?$/.test(k)) n += Array.isArray(v) ? v.length : 1;
        walk(v);
      }
  };
  walk(lesson.parts);
  return n;
}

const sentence = (s) => {
  const t = s.trim().replace(/\s+/g, ' ');
  return t ? t[0].toUpperCase() + t.slice(1) + (/[.?!]$/.test(t) ? '' : '.') : '';
};

/** Every course with its lessons and each lesson's state. */
export function collect() {
  const meta = readJson(join(root, 'tools/lesson-status.json'), { courses: {} });
  const warnings = [];
  const courses = [];
  const folders = readdirSync(join(root, 'courses')).filter((f) => existsSync(join(root, 'courses', f, 'course.json')));
  for (const folder of folders) {
    const dir = join(root, 'courses', folder);
    const course = readJson(join(dir, 'course.json'));
    const m = meta.courses?.[folder] ?? {};
    const src = ['src/lessons.ts', 'src/core/lessons.ts'].map((f) => read(join(dir, f))).join('\n');
    const tree = branches(src);
    const inCode = codeBranches(src);
    const lessonDir = join(dir, course.lessons);
    const written = readdirSync(lessonDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(join(lessonDir, f)));
    const done = new Set(written.map((l) => l.id));
    const planned = [...comingLessons(src), ...(m.planned ?? []).map((p) => ({ ...p, coming: true, fromOutline: true }))].filter((l) => !done.has(l.id));
    const queue = readJson(join(dir, 'tools/review-queue.json'), []);
    const queued = new Map();
    for (const q of queue) if (q.lesson) queued.set(q.lesson, [...(queued.get(q.lesson) ?? []), q]);
    // The course's catalog description, when it waits for its Gemini pass (tools/copyedit.mjs --description).
    const described = queue.find((q) => q.description);
    const parked = new Map();
    for (const p of readJson(join(dir, 'tools/pending-photos.json'), [])) parked.set(p.lesson, (parked.get(p.lesson) ?? 0) + 1);

    const all = [
      ...written.map((l) => ({ ...l, branch: l.branch ?? inCode.get(l.id) ?? (l.track && l.track !== 'core' ? l.track : undefined) })),
      ...planned,
    ].sort((a, b) => a.n - b.n);
    // Codes as didactics/tree's lessonCodes gives them: the trunk by n, a branch by its prefix and place.
    const count = new Map();
    for (const l of all) {
      const prefix = tree.find((b) => b.id === l.branch)?.prefix;
      if (!prefix) l.code = l.code ?? String(l.n);
      else {
        count.set(prefix, (count.get(prefix) ?? 0) + 1);
        l.code = l.code ?? `${prefix}${count.get(prefix)}`;
      }
    }

    for (const id of Object.keys(m.lessons ?? {})) if (!all.some((l) => l.id === id)) warnings.push(`${folder}: tools/lesson-status.json names a lesson "${id}" the course doesn't have`);

    const lessons = all.map((l) => {
      const own = m.lessons?.[l.id] ?? {};
      const row = {
        id: l.id,
        code: l.code,
        title: l.title,
        branch: l.branch ? tree.find((b) => b.id === l.branch)?.title ?? l.branch : '',
        about: sentence(own.about ?? l.teaches ?? ''),
        note: own.note ?? '',
        waiting: [],
      };
      if (l.coming) {
        row.status = 'planned';
        row.where = l.fromOutline ? 'outline only' : 'listed as coming';
        return row;
      }
      const q = queued.get(l.id) ?? [];
      // Student read-through
      const student = own.student ?? (q.some((e) => /no student review/i.test(e.what ?? '')) ? 'pending' : m.student ?? 'done');
      if (student !== 'done') row.waiting.push({ step: 'student', why: own.studentNote ?? '' });
      // Gemini copy edit
      if (q.length) row.waiting.push({ step: 'gemini', why: `queued ${q[0].added ?? ''}`.trim() });
      else if ((own.gemini ?? m.gemini) === 'never') row.waiting.push({ step: 'gemini', why: m.geminiNote ?? 'never copy-edited; not queued' });
      // Fact check
      const facts = own.facts ?? m.facts ?? 'pending';
      if (!/^done/.test(facts)) row.waiting.push({ step: 'facts', why: facts === 'pending' ? '' : facts });
      // Photos and images
      const images = [];
      if (parked.has(l.id)) images.push(`${parked.get(l.id)} photo${parked.get(l.id) > 1 ? 's' : ''} parked in pending-photos.json`);
      if (m.expectsPhotos && !own.images && photoRefs(l) === 0 && !parked.has(l.id) && !own.noPhotos) images.push('no photos chosen yet');
      if (own.images) images.push(own.images);
      if (images.length) row.waiting.push({ step: 'images', why: images.join('; ') });
      row.status = row.waiting.length ? STEPS.find((s) => s.key === row.waiting[0].step).label : 'done';
      return row;
    });
    // Trunk first, then each branch in the order the tree lists them.
    const order = (r) => (r.branch ? 1 + tree.findIndex((b) => b.title === r.branch || b.id === r.branch) : 0);
    lessons.sort((a, b) => order(a) - order(b));
    const note = [m.note, described ? `Its catalog description waits for Gemini (queued ${described.added ?? ''}).`.replace(' ()', '') : ''].filter(Boolean).join(' ');
    courses.push({ folder, title: course.title, order: course.order ?? 99, note, release: course.release, lessons });
  }
  // Courses planned in an outline with no folder yet: a title and planned lessons in tools/lesson-status.json.
  for (const [folder, m] of Object.entries(meta.courses ?? {})) {
    if (folders.includes(folder)) continue;
    if (!m.title || !m.planned?.length) {
      warnings.push(`${folder}: tools/lesson-status.json has a course with no folder, so it needs a title and planned lessons`);
      continue;
    }
    for (const id of Object.keys(m.lessons ?? {})) if (!m.planned.some((l) => l.id === id)) warnings.push(`${folder}: tools/lesson-status.json names a lesson "${id}" the course doesn't have`);
    const lessons = [...m.planned]
      .sort((a, b) => a.n - b.n)
      .map((l) => ({
        id: l.id,
        code: l.code ?? String(l.n),
        title: l.title,
        branch: l.branch ?? '',
        about: sentence(m.lessons?.[l.id]?.about ?? l.teaches ?? ''),
        note: m.lessons?.[l.id]?.note ?? '',
        waiting: [],
        status: 'planned',
        where: 'outline only',
      }));
    courses.push({ folder, title: m.title, order: m.order ?? 99, note: m.note ?? '', outlineOnly: true, lessons });
  }
  courses.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const map = readJson(join(root, 'catalog/map.json'), {});
  const titleOf = (f) => courses.find((c) => c.folder === f)?.title ?? f;
  const notStarted = [
    ...(map.bridges ?? []).filter((b) => !b.folder).map((b) => ({ title: b.title, kind: `bridge: ${b.between.map(titleOf).join(' + ')}`, about: b.promise })),
    ...Object.values(map.candidates ?? {}).map((c) => ({ title: c.title, kind: 'candidate course (icon only)', about: '' })),
    ...(meta.notStarted ?? []),
  ];
  const encQueue = readJson(join(root, 'tools/encyclopedia-review-queue.json'), []);
  return { courses, notStarted, encQueue, warnings };
}

const COLS = ['written', 'planned', 'student', 'gemini', 'facts', 'images', 'done'];
function counts(c) {
  const w = c.lessons.filter((l) => l.status !== 'planned');
  const has = (k) => w.filter((l) => l.waiting.some((x) => x.step === k)).length;
  return {
    written: w.length,
    planned: c.lessons.length - w.length,
    student: has('student'),
    gemini: has('gemini'),
    facts: has('facts'),
    images: has('images'),
    done: w.filter((l) => l.status === 'done').length,
  };
}
/**
 * What stands between a course and its release, as short phrases; none when
 * it meets the bar. The bar: every planned lesson written, and every written
 * lesson through the student read-through, the Gemini copy edit, the fact
 * check and its photos. Meeting it does not release a course: Rob does, with
 * npm run release -- <course> --release (tools/release.mjs).
 */
export function releaseGaps(c) {
  const n = counts(c);
  const gaps = [];
  if (n.planned) gaps.push(`${n.planned} lesson${n.planned > 1 ? 's' : ''} to write`);
  for (const s of STEPS) if (n[s.key]) gaps.push(`${n[s.key]} ${s.gap}`);
  return gaps;
}
const versionText = (c) => (c.release ? `${c.release.version} ${c.release.stage}` : c.outlineOnly ? 'outline' : '');
const readyText = (c) => {
  if (c.outlineOnly) return '';
  const gaps = releaseGaps(c);
  if (c.release?.stage === 'released') return gaps.length ? `released; still to do: ${gaps.join(', ')}` : 'released';
  return gaps.length ? `no: ${gaps.join(', ')}` : 'yes, for Rob to release';
};

const HEAD = { written: 'Written', planned: 'Planned', student: 'Need read-through', gemini: 'Awaiting Gemini', facts: 'Awaiting fact check', images: 'Awaiting photos', done: 'Done' };

const RELEASE_TEXT = 'A course is in beta (version 0.x) until Rob releases it (1.0). The bar for asking him: every planned lesson written, and every lesson through the read-through, the Gemini copy edit, the fact check and its photos. Versions go up only when someone runs `npm run release` (tools/release.mjs), not with every change.';
const md = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const waitingText = (l) => l.waiting.slice(1).map((w) => STEPS.find((s) => s.key === w.step).short + (w.why ? ` (${w.why})` : '')).join('; ');
const statusText = (l) => (l.waiting[0]?.why ? `${l.status} (${l.waiting[0].why})` : l.status);

export function toMarkdown(data, when = new Date()) {
  const out = [];
  out.push('# Course status', '');
  out.push(`Made by \`npm run status\` on ${when.toISOString().slice(0, 10)}. Don't edit this file: change the lessons, the review queues or \`tools/lesson-status.json\` and run it again. How to keep it current: [CLAUDE.md](../CLAUDE.md#keeping-the-status-table-current).`, '');
  out.push('A lesson\'s status is the first step it still waits for, in the order: student read-through, Gemini copy edit, fact check, photos. "Also waiting on" lists the later ones.', '');
  out.push('| Course | Version | ' + COLS.map((k) => HEAD[k]).join(' | ') + ' |', '| --- | --- |' + COLS.map(() => ' ---: |').join(''));
  for (const c of data.courses) {
    const n = counts(c);
    out.push(`| [${md(c.title)}](#${c.folder}) | ${md(versionText(c))} | ` + COLS.map((k) => n[k]).join(' | ') + ' |');
  }
  out.push('');
  out.push(RELEASE_TEXT, '');
  out.push('| Course | Version | Since | Ready to release? |', '| --- | --- | --- | --- |');
  for (const c of data.courses) if (!c.outlineOnly) out.push(`| ${md(c.title)} | ${md(versionText(c))} | ${md(c.release?.date)} | ${md(readyText(c))} |`);
  out.push('');
  for (const c of data.courses) {
    out.push(`## ${c.title} <a id="${c.folder}"></a>`, '');
    out.push(`${c.outlineOnly ? `No course folder yet (\`courses/${c.folder}\` when built)` : `\`courses/${c.folder}\``}${c.release ? `, version ${c.release.version} (${c.release.stage}, ${c.release.date})` : ''}${c.note ? `. ${c.note}` : ''}`, '');
    out.push('| Code | Lesson | Branch | Status | Also waiting on | What it covers |', '| --- | --- | --- | --- | --- | --- |');
    for (const l of c.lessons) {
      const note = l.note ? ` *${md(l.note)}*` : '';
      out.push(`| ${md(l.code)} | ${md(l.title)} (\`${l.id}\`) | ${md(l.branch)} | ${md(l.status === 'planned' ? `planned, ${l.where}` : statusText(l))} | ${md(waitingText(l))} | ${md(l.about)}${note} |`);
    }
    out.push('');
  }
  if (data.encQueue.length) {
    out.push('## Encyclopedia', '', 'Waiting for the Gemini copy edit (`tools/encyclopedia-review-queue.json`):', '');
    for (const e of data.encQueue) out.push(`- \`encyclopedia/${e.file}.json\`: ${e.what} (queued ${e.added})`);
    out.push('');
  }
  if (data.notStarted.length) {
    out.push('## Not started', '', '| Course | What | Promise |', '| --- | --- | --- |');
    for (const s of data.notStarted) out.push(`| ${md(s.title)} | ${md(s.kind)} | ${md(s.about)} |`);
    out.push('');
  }
  return out.join('\n');
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/\[\[(?:[^\]|]*\|)?@?([^\]]+)\]\]/g, '$1');

export function toHtml(data, when = new Date()) {
  const statusClass = (s) => (s === 'done' ? 'done' : s === 'planned' ? 'planned' : STEPS.find((x) => x.label === s)?.key ?? '');
  const rows = (c) =>
    c.lessons
      .map(
        (l) => `<tr data-status="${statusClass(l.status)}"><td class="code">${esc(l.code)}</td><td><b>${esc(l.title)}</b><span class="id">${esc(l.id)}</span>${l.branch ? `<span class="br">${esc(l.branch)}</span>` : ''}</td><td><span class="pill ${statusClass(l.status)}">${esc(l.status === 'planned' ? 'planned' : l.status)}</span>${l.waiting[0]?.why ? `<span class="why">${esc(l.waiting[0].why)}</span>` : ''}${l.waiting.length > 1 ? `<span class="also">then: ${esc(waitingText(l))}</span>` : ''}</td><td>${inline(l.about)}${l.note ? ` <i class="note">${esc(l.note)}</i>` : ''}</td></tr>`,
      )
      .join('\n');
  const overview = data.courses
    .map((c) => {
      const n = counts(c);
      return `<tr><td><a href="#${c.folder}">${esc(c.title)}</a></td><td>${c.release ? `<span class="pill ${c.release.stage === 'released' ? 'done' : 'planned'}">${esc(versionText(c))}</span>` : esc(versionText(c))}</td>${COLS.map((k) => `<td class="num">${n[k]}</td>`).join('')}</tr>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Course status</title>
<meta name="robots" content="noindex">
<style>
:root { --bg: #f7f3ea; --panel: #fffdf8; --ink: #2a2522; --soft: #6f665e; --line: #e2d9c8; --done: #3f8f5a; --planned: #8a8178; --student: #b0543c; --gemini: #7a4fa0; --facts: #b07a1c; --images: #2f7f8f; }
@media (prefers-color-scheme: dark) { :root { --bg: #1d1a18; --panel: #27231f; --ink: #efe7da; --soft: #a99f93; --line: #3d3630; --done: #6cc08a; --planned: #9a9087; --student: #e08a70; --gemini: #b892e0; --facts: #e0b45a; --images: #6cc0cf; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { font: 600 28px/1.2 Georgia, serif; margin: 0 0 4px; }
h2 { font: 600 21px/1.2 Georgia, serif; margin: 36px 0 8px; }
p.lede, .sub { color: var(--soft); }
table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--line); }
th, td { text-align: left; vertical-align: top; padding: 7px 9px; border-bottom: 1px solid var(--line); }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--soft); font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.code { font-weight: 600; white-space: nowrap; }
.id, .br, .why, .also { display: block; font-size: 12px; color: var(--soft); }
.id { font-family: ui-monospace, monospace; }
.pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 99px; border: 1px solid currentColor; white-space: nowrap; }
.pill.done { color: var(--done); } .pill.planned { color: var(--planned); border-style: dashed; } .pill.student { color: var(--student); } .pill.gemini { color: var(--gemini); } .pill.facts { color: var(--facts); } .pill.images { color: var(--images); }
.note { color: var(--soft); }
a { color: inherit; text-decoration-color: var(--soft); }
.filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0 0; }
.filters button { font: inherit; font-size: 13px; padding: 4px 10px; border-radius: 99px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; }
.filters button[aria-pressed="true"] { border-color: var(--ink); font-weight: 600; }
.wrap { overflow-x: auto; }
@media (max-width: 640px) { th:nth-child(4), td:nth-child(4) { display: none; } }
</style></head>
<body><main>
<h1>Course status</h1>
<p class="lede">Every lesson of every course and where it stands. Made by <code>npm run status</code> on ${when.toISOString().slice(0, 10)}. A status is the first step a lesson still waits for: student read-through, Gemini copy edit, fact check, photos.</p>
<div class="wrap"><table><thead><tr><th>Course</th><th>Version</th>${COLS.map((k) => `<th>${HEAD[k]}</th>`).join('')}</tr></thead><tbody>
${overview}
</tbody></table></div>
<h2>Releases</h2>
<p class="sub">${inline(RELEASE_TEXT.replace(/`([^`]+)`/g, '$1'))}</p>
<div class="wrap"><table><thead><tr><th>Course</th><th>Version</th><th>Since</th><th>Ready to release?</th></tr></thead><tbody>
${data.courses.filter((c) => !c.outlineOnly).map((c) => `<tr><td><a href="#${c.folder}">${esc(c.title)}</a></td><td>${esc(versionText(c))}</td><td>${esc(c.release?.date)}</td><td>${esc(readyText(c))}</td></tr>`).join('\n')}
</tbody></table></div>
<div class="filters" role="group" aria-label="Show">
<button aria-pressed="true" data-f="">All</button><button aria-pressed="false" data-f="planned">Planned</button>${STEPS.map((s) => `<button aria-pressed="false" data-f="${s.key}">${esc(s.short)}</button>`).join('')}<button aria-pressed="false" data-f="done">Done</button>
</div>
${data.courses
  .map((c) => `<section><h2 id="${c.folder}">${esc(c.title)}${c.release ? ` <span class="pill ${c.release.stage === 'released' ? 'done' : 'planned'}">${esc(versionText(c))}</span>` : ''}</h2>${c.note ? `<p class="sub">${inline(c.note)}</p>` : ''}
<div class="wrap"><table><thead><tr><th>Code</th><th>Lesson</th><th>Status</th><th>What it covers</th></tr></thead><tbody>
${rows(c)}
</tbody></table></div></section>`)
  .join('\n')}
${data.encQueue.length ? `<h2>Encyclopedia</h2><p class="sub">Waiting for the Gemini copy edit:</p><ul>${data.encQueue.map((e) => `<li><code>${esc(e.file)}</code>: ${esc(e.what)} (queued ${esc(e.added)})</li>`).join('')}</ul>` : ''}
${data.notStarted.length ? `<h2>Not started</h2><div class="wrap"><table><thead><tr><th>Course</th><th>What</th><th>Promise</th></tr></thead><tbody>${data.notStarted.map((s) => `<tr><td><b>${esc(s.title)}</b></td><td>${esc(s.kind)}</td><td>${esc(s.about)}</td></tr>`).join('')}</tbody></table></div>` : ''}
</main>
<script>
const buttons = document.querySelectorAll('.filters button');
buttons.forEach((b) => b.addEventListener('click', () => {
  buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.f;
  document.querySelectorAll('tr[data-status]').forEach((tr) => {
    const also = tr.querySelector('.also')?.textContent ?? '';
    const step = { student: 'Student', gemini: 'Gemini', facts: 'Fact check', images: 'Photos' }[f];
    tr.hidden = !!f && tr.dataset.status !== f && !(step && also.includes(step));
  });
  document.querySelectorAll('section').forEach((sec) => { sec.hidden = !sec.querySelector('tr[data-status]:not([hidden])'); });
}));
</script>
</body></html>
`;
}

/** Writes the HTML to `file` (the site build's copy). */
export function writeHtml(file) {
  const data = collect();
  for (const w of data.warnings) console.warn(`status: ${w}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, toHtml(data));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const data = collect();
  for (const w of data.warnings) console.error(`warning: ${w}`);
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs/status.md'), toMarkdown(data));
  writeFileSync(join(root, 'docs/status.html'), toHtml(data));
  const total = data.courses.reduce((n, c) => n + c.lessons.length, 0);
  console.log(`Wrote docs/status.md and docs/status.html: ${data.courses.length} courses, ${total} lessons.`);
  if (process.argv.includes('--print')) for (const c of data.courses) console.log(`  ${c.title.padEnd(28)} ${COLS.map((k) => `${HEAD[k]} ${counts(c)[k]}`).join(', ')}`);
  if (data.warnings.length) process.exitCode = 1;
}
