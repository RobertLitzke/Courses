// The final copy edit and fact check of a course's lessons by a second model
// on OpenRouter (default Gemini Argon). Every piece of prose in a lesson's
// JSON (teaches, part titles, paragraphs, key ideas, captions, tasks, quiz
// questions, choices and explanations, summary or learned points, next,
// footnotes) goes in one request, numbered. What comes back is checked before
// it is used: markup (**bold**, *italic*, [[links]] with the same words,
// [^footnote] markers) must survive, and nothing may grow by more than a
// quarter. A piece that fails keeps its old words and is listed in the
// report, with the model's notes on facts it changed or doubts.
//
// The editor may add footnotes (an anecdote off the main line, or a term the
// text needn't stop to define): it returns each note and puts its marker in
// a paragraph (captions show no markers). A note goes in only if it is whole and new and an
// accepted piece marks it; the report lists every one added or dropped.
//
//   OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> <lesson-id …> [--write]
//   OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> --queue [--write]
//
// The model reasons at EFFORT (default medium).
//
// A course takes part by keeping courses/<course>/tools/copyedit.json, the
// part of the brief that is its own: { "course": "an illustrated online
// geology course", "intro": "what its lessons are like", "voice": optional,
// "spellings": ["metres", "sulphur"] }. The rules every course shares are
// below. Its lessons are read from the folder course.json names.
//
// --queue edits every lesson waiting in courses/<course>/tools/review-queue.json,
// where new prose is listed when it is written (lesson, date, what changed,
// and optionally notes: specific fixes for the editor to make), so the
// reviews can be run later as one batch (tools/review-queue.mjs runs
// every course's). With --write each lesson that comes back cleanly is taken
// off the queue.
//
// The course's catalog description (subtitle and summary in its course.json)
// takes the same pass with --description, or when its queue holds an entry
// { "description": true, added, what, notes? }. The editor gets it beside the
// whole lesson list (tools/lib/outline.mjs: every lesson's title and teaches
// line, written or planned) and the other courses' descriptions, and may
// rework it more freely than a lesson: it must match what the lessons cover
// and must not sound like the descriptions beside it. The report is
// tools/copyedit-out/description.md; with --write the words go back into
// course.json.
//
// Reports go to courses/<course>/tools/copyedit-out/<lesson>.md (not
// committed). With --write the new words go into the lesson's file, in the
// layout it had (didactics/course formatJson).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from 'didactics/course';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.MODEL ?? 'google/gemini-4-argon';
const KEY = process.env.OPENROUTER_API_KEY;
// Reasoning effort for the model (low, medium, high); medium unless EFFORT says otherwise.
const EFFORT = process.env.EFFORT ?? 'medium';
const args = process.argv.slice(2);
const write = args.includes('--write');
const [course, ...rest] = args.filter((a) => !a.startsWith('--'));
const usage = 'usage: OPENROUTER_API_KEY=… node tools/copyedit.mjs <course> <lesson-id …> | --queue | --description [--write]';

const dir = course && join(root, 'courses', course);
if (!course || !existsSync(join(dir, 'course.json'))) {
  console.error(course ? `no course "${course}" in courses/` : usage);
  process.exit(1);
}
const briefFile = join(dir, 'tools/copyedit.json');
const OUT = join(dir, 'tools/copyedit-out');
const QUEUE = join(dir, 'tools/review-queue.json');
const LESSONS = join(dir, JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8')).lessons);
const queued = args.includes('--queue') && existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf8')) : [];
const ids = [...new Set([...rest, ...queued.flatMap((q) => (q.lesson ? [q.lesson] : []))])];
const describe = args.includes('--description') || queued.some((q) => q.description);
if (!KEY || (!ids.length && !describe)) {
  console.error(KEY ? 'nothing to edit: name lessons, or the queue is empty' : usage);
  process.exit(1);
}

// A course with no brief of its own can still have its description edited, under its title.
if (!existsSync(briefFile) && ids.length) {
  console.error(`${course} has no tools/copyedit.json: write one ({ course, intro, voice?, spellings }) for its lessons to take the copy edit`);
  process.exit(1);
}
const own = existsSync(briefFile) ? JSON.parse(readFileSync(briefFile, 'utf8')) : { course: `the illustrated online course "${JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8')).title}"`, intro: '' };
const BRIEF = `You are the final copy editor and fact checker for ${own.course}. Readers are smart high schoolers and curious adults: don't talk down to them, and don't swing academic (say "underwater", not "subaqueous"). ${own.intro}
${own.voice ? `\n${own.voice}\n` : ''}
The most important thing is that nothing reads as if a language model wrote it. Rob, who reads every lesson, notices the tells of machine-written text at once and finds them grating: the list under "Avoid" gives specific examples, but avoid any habit of LLM prose, listed or not.

You get one lesson as numbered pieces of prose, each with a note of where it sits. For each piece:
1. Check every factual assertion and fix errors: names, dates, numbers, places, who did what, and the science. Correct them in the text. Do not add new facts or examples beyond a correction, except in a new footnote (rule 6).
2. Copy edit for an interested layperson: clear, concrete, natural sentences. Rewrite any sentence whose framing is awkward (a backwards order, a buried subject, a clumsy hedge, a joke that doesn't land), and spell out jargon the reader hasn't met. Write in British-leaning spelling as the source uses (${(own.spellings ?? ['metres', 'colour', 'recognised']).map((w) => `"${w}"`).join(', ')}). Keep the meaning, the order of ideas and the paragraph's role. Pieces that are already good can come back unchanged.
3. Keep markup exactly: **bold** and *italic* spans stay, around the same words, and so do [[links]] to the encyclopedia (keep the words inside the brackets, and anything after a |, as they are), and footnote markers like [^id] (same id, after the same words).
4. Keep the length: the same or shorter, never more than a quarter longer.
5. Quiz pieces: the choice marked (correct) must stay correct and the others wrong.
6. Footnotes: you may add new ones. A footnote holds either an interesting anecdote off the main line (kind "digression": a person, an episode, a surprising detail) or an important term or detail that the main text doesn't need to stop and define (kind "technical"). If a paragraph halts to define a term the reader can follow without, you may move the definition into a new technical footnote. To add one, put a marker [^new-id] in the piece's text straight after the word or sentence it belongs to, with no space before it, and list the note under "footnotes" in your reply. Use a short lowercase id with hyphens that the lesson doesn't use yet. Add one only where it earns its place: lessons carry about four to six, and the count already in this lesson is given with it. Notes follow the same rules as the pieces, with no [[links]]. Put markers only in paragraphs: never in a caption, a quiz piece, a title or a summary point.

Avoid the habits of machine-written text. Specific examples:
- No em dashes or en dashes as punctuation; use commas, colons, full stops or parentheses. (En dashes in number ranges like 1857–1936 are fine.)
- No "It's not just X, it's Y", "not only... but also", "Here's the thing", "Let's", "Imagine", "In short", "Ultimately", "In conclusion".
- No groups of three adjectives or three parallel clauses for rhythm's sake.
- No "delve", "tapestry", "crucial", "vital", "key" as an adjective, "fascinating", "remarkable", "incredible", "journey", "unlock", "harness", "robust", "seamless", "landscape" (as a metaphor), "realm", "testament".
- No exclamation marks (except inside a quotation), no rhetorical questions that the next sentence answers, no sign-off summaries or one-line aphorisms closing a paragraph, no sentence that only announces what the next will say.

Reply with JSON only:
{"pieces": [{"n": 1, "text": "..."}, ...], "footnotes": [{"id": "new-id", "kind": "technical" or "digression", "title": "...", "text": "..."}], "facts": ["one line per factual change you made or doubt you have, naming the piece number"]}
Include every piece, same numbers. "footnotes" lists only the notes you add (an empty list if none).`;

/** Every prose string in the lesson, with a path to put it back. */
function pieces(lesson) {
  const out = [];
  const add = (where, get, set, mark = false) => typeof get() === 'string' && out.push({ where, text: get(), set, mark });
  const list = (where, arr) => (arr ?? []).forEach((_, i) => add(where, () => arr[i], (v) => (arr[i] = v)));
  add('teaches', () => lesson.teaches, (v) => (lesson.teaches = v));
  lesson.parts.forEach((p, i) => {
    add(`part ${i + 1} title`, () => p.title, (v) => (p.title = v));
    p.blocks.forEach((b, j) => {
      const at = `part ${i + 1} "${p.title}", block ${j + 1}`;
      if (b.type === 'text') add(`${at}, paragraph`, () => b.text, (v) => (b.text = v), true);
      if (b.type === 'key_ideas') list(`${at}, key idea`, b.points);
      if (b.type === 'diagram' || b.type === 'interactive_diagram') {
        add(`${at}, caption of ${b.id === 'photo' ? `photo "${b.options?.photo}"` : `figure "${b.id}"`}`, () => b.caption, (v) => (b.caption = v));
        add(`${at}, task for the reader`, () => b.task, (v) => (b.task = v));
      }
      if (b.type === 'quiz') (b.options?.items ?? []).forEach((q, k) => {
        // Two spellings of a question: { ask, choices } and the older { question, options }.
        const ask = 'ask' in q ? 'ask' : 'question';
        const choices = q.choices ?? q.options ?? [];
        add(`quiz ${k + 1}, question`, () => q[ask], (v) => (q[ask] = v));
        choices.forEach((_, c) => add(`quiz ${k + 1}, choice ${c + 1}${c === q.answer ? ' (correct)' : ' (wrong)'}`, () => choices[c], (v) => (choices[c] = v)));
        add(`quiz ${k + 1}, explanation`, () => q.why, (v) => (q.why = v));
      });
    });
  });
  list('summary point', lesson.summary);
  list('learned', lesson.learned);
  add('next', () => lesson.next, (v) => (lesson.next = v));
  for (const [id, n] of Object.entries(lesson.footnotes ?? {})) {
    add(`footnote "${id}" (${n.kind}), title`, () => n.title, (v) => (n.title = v));
    add(`footnote "${id}" (${n.kind}), text`, () => n.text, (v) => (n.text = v));
  }
  return out;
}

const MARKUP = /\*\*.+?\*\*|\*[^*]+?\*|\[\[.+?\]\]/g;
const MARK = /\[\^([\w-]+)\]/g;
const marks = (t) => [...t.matchAll(MARK)].map((m) => m[1]);
/** Why an edited piece can't be used, or null. `added` is the ids of the new footnotes it may mark. */
function problem(before, after, added = new Set(), canMark = false) {
  if (typeof after !== 'string' || !after.trim()) return 'empty';
  const m0 = before.match(MARKUP) ?? [];
  const m1 = after.match(MARKUP) ?? [];
  if (m0.length !== m1.length) return `markup changed (${m0.length} spans to ${m1.length})`;
  const links = (xs) => xs.filter((x) => x.startsWith('[[')).join(' ');
  if (links(m0) !== links(m1)) return 'a link changed';
  const f0 = marks(before);
  const f1 = marks(after);
  const lost = f0.filter((id) => !f1.includes(id));
  if (lost.length) return `footnote marker lost (${lost.join(', ')})`;
  const extra = f1.filter((id) => !f0.includes(id));
  if (extra.some((id) => !canMark || !added.has(id))) return `marks a footnote it can't (${extra.join(', ')})`;
  // A new marker and a definition moved into its note are not growth.
  const len = (t) => t.replace(MARK, '').length;
  if (len(after) > len(before) * 1.25 + 25) return `grew from ${before.length} to ${after.length} characters`;
  if (/—/.test(after) && !/—/.test(before)) return 'uses an em dash';
  return null;
}

/** Every footnote id the lesson's prose marks. */
const lessonMarks = (lesson) => pieces(lesson).flatMap((p) => marks(p.text));

/**
 * One request. The brief goes first as the system message and is the same for
 * every lesson of a course, so the provider's prompt cache can reuse it.
 */
const request = (system, user, schema) => ({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_schema', json_schema: { name: 'copyedit', strict: true, schema } }, temperature: 0.3, reasoning: { effort: EFFORT } });

// The reply's shape, enforced by the provider, so pieces come back as objects and not as strings.
const str = { type: 'string' };
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const LESSON_SCHEMA = obj({
  pieces: { type: 'array', items: obj({ n: { type: 'integer' }, text: str }) },
  footnotes: { type: 'array', items: obj({ id: str, kind: { type: 'string', enum: ['technical', 'digression'] }, title: str, text: str }) },
  facts: { type: 'array', items: str },
});
const DESCRIPTION_SCHEMA = obj({ subtitle: str, summary: str, facts: { type: 'array', items: str }, why: str });

/** Asks the model for one JSON reply; `id` names the lesson in messages. */
async function ask(id, system, user, schema) {
  const body = request(system, user, schema);
  const key = `${course}/${id}`;
  let d;
  // A dropped connection or a reply that isn't JSON is tried again, up to three times.
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      d = await r.json();
      JSON.parse(d.choices?.[0]?.message?.content ?? '');
      break;
    } catch (e) {
      if (attempt >= 3) { d ??= { error: String(e) }; break; }
      console.error(`${key}: ${e.message ?? e}, trying again`);
      d = undefined;
    }
  }
  const raw = d.choices?.[0]?.message?.content ?? '';
  try {
    return { reply: JSON.parse(raw.replace(/^```json\s*|```\s*$/g, '')), tokens: d.usage?.total_tokens };
  } catch {
    return { error: `${raw.slice(0, 400)} ${JSON.stringify(d.error ?? '')}` };
  }
}

/** The catalog description: subtitle and summary, edited beside the lesson list and the other courses' descriptions. */
async function editDescription() {
  const { courseOutline, outlineMarkdown } = await import('./lib/outline.mjs');
  const infoFile = join(dir, 'course.json');
  const source = readFileSync(infoFile, 'utf8');
  const info = JSON.parse(source);
  const outline = courseOutline(course);
  const others = outline.others.map((f) => JSON.parse(readFileSync(join(root, 'courses', f, 'course.json'), 'utf8'))).map((o) => `- ${o.title}: ${o.summary}`);
  const notes = queued.filter((q) => q.description).flatMap((q) => q.notes ?? []);
  const system = `You revise the catalog description of ${own.course}: the paragraph a reader sees on the site's list of courses before opening it, and the course's subtitle. Readers are smart high schoolers and curious adults.

The description should tell a reader what the course is about and who it is for, in concrete terms taken from its lessons: real names, places, numbers, puzzles. It must not promise anything the lesson list doesn't cover, and it should mention lessons marked "not written yet" only as branches or as still being written, if at all. Its length suits the course: a small course can take two sentences, a large one a paragraph; never more than half again as long as it is now.

It must not sound like the other courses' descriptions, which you are given. Don't reuse their openings, their sentence shapes or their stock phrases. In particular avoid formulas about how lessons are built ("Each lesson opens on...", "follows the evidence", "live figures you can push", "with real photos to test yourself on") and closing disclaimers that are there for rhythm.

${own.voice ?? ''}

Rob, who reads every word, notices the tells of machine-written text at once. No em or en dashes as punctuation; no "not just X, it's Y"; no triplets for rhythm; no rhetorical questions; no aphoristic closing line; none of: delve, tapestry, crucial, vital, key (as an adjective), fascinating, remarkable, incredible, journey, unlock, harness, robust, seamless, landscape (as a metaphor), realm, testament. No exclamation marks. British-leaning spelling (${(own.spellings ?? ['metres', 'colour']).join(', ')}). Fix any fact that is wrong.

If the description is already good, return it unchanged.

Reply with JSON only: {"subtitle": "...", "summary": "...", "facts": ["one line per fact you changed or doubt"], "why": "a sentence on what you changed and why"}`;
  const user = `${notes.length ? `Notes from the course's writers, to act on:\n${notes.map((n) => `- ${n}`).join('\n')}\n\n` : ''}${outlineMarkdown(outline, info)}\n## The other courses' descriptions\n\n${others.join('\n')}\n`;
  const { reply, tokens, error } = await ask('(description)', system, user, DESCRIPTION_SCHEMA);
  if (error) {
    console.error(`description: no JSON back`, error);
    process.exitCode = 1;
    return;
  }
  const report = [`# ${info.title}: description`, '', reply.why ?? '', '', '## Facts', ...(reply.facts ?? []).map((f) => `- ${f}`), '', '## Changes', ''];
  let changed = 0;
  for (const [key, limit] of [['subtitle', 2], ['summary', 1.5]]) {
    const before = info[key] ?? '';
    const after = reply[key];
    if (typeof after !== 'string' || after === before) continue;
    const bad = !after.trim() ? 'empty' : /[—–]/.test(after) ? 'uses a dash' : before && after.length > before.length * limit + 25 ? `grew from ${before.length} to ${after.length} characters` : null;
    report.push(`### ${key}${bad ? ` (KEPT: ${bad})` : ''}`, '', `- ${before}`, `+ ${after}`, '');
    if (!bad) {
      info[key] = after;
      changed++;
    }
  }
  writeFileSync(join(OUT, 'description.md'), report.join('\n'));
  if (write) {
    writeFileSync(infoFile, formatJson(info, source));
    if (queued.some((q) => q.description)) {
      const left = JSON.parse(readFileSync(QUEUE, 'utf8')).filter((q) => !q.description);
      writeFileSync(QUEUE, `${JSON.stringify(left, null, 1)}\n`);
    }
  }
  console.log(`description: ${changed} of 2 changed, ${(reply.facts ?? []).length} fact notes${write ? ', written' : ''} (${tokens ?? '?'} tokens)`);
}

mkdirSync(OUT, { recursive: true });
if (describe) await editDescription();
for (const id of ids) {
  const file = join(LESSONS, `${id}.json`);
  if (!existsSync(file)) { console.error(`${id}: no such lesson in ${LESSONS}`); process.exitCode = 1; continue; }
  const source = readFileSync(file, 'utf8');
  const lesson = JSON.parse(source);
  const ps = pieces(lesson);
  // A queue entry may carry reviewers' notes: specific fixes the editor should make in this lesson.
  const notes = queued.filter((q) => q.lesson === id).flatMap((q) => q.notes ?? []);
  const reviewerNotes = notes.length ? `Reviewers' notes for this lesson. Make these changes where they fall, within the rules above (same pieces, same markup, length limit):\n${notes.map((n) => `- ${n}`).join('\n')}\n\n` : '';
  const noteCount = Object.keys(lesson.footnotes ?? {}).length;
  const prompt = `${reviewerNotes}Lesson: "${lesson.title}" (${noteCount} footnote${noteCount === 1 ? '' : 's'} now)\n\n${ps.map((p, i) => `[${i + 1}] (${p.where})\n${p.text}`).join('\n\n')}`;
  const { reply, tokens, error } = await ask(id, BRIEF, prompt, LESSON_SCHEMA);
  if (error) { console.error(`${id}: no JSON back`, error); process.exitCode = 1; continue; }
  const report = [`# ${lesson.title}`, '', '## Facts', ...(reply.facts ?? []).map((f) => `- ${f}`), '', '## Changes', ''];
  // New footnotes: each must be whole, new and clean before a piece may mark it.
  const notes0 = lesson.footnotes ?? {};
  const offered = new Map();
  const noteReport = [];
  for (const n of Array.isArray(reply.footnotes) ? reply.footnotes : []) {
    const why = typeof n?.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id) ? 'bad id'
      : notes0[n.id] || offered.has(n.id) ? 'id already used'
      : n.kind !== 'technical' && n.kind !== 'digression' ? `kind "${n.kind}"`
      : typeof n.title !== 'string' || !n.title.trim() || typeof n.text !== 'string' || !n.text.trim() ? 'needs a title and text'
      : marks(n.text).length ? 'has a marker inside it'
      : /—/.test(n.text + n.title) ? 'uses an em dash'
      : null;
    if (why) noteReport.push(`### [^${n?.id}] ${n?.kind ?? ''} "${n?.title ?? ''}" (DROPPED: ${why})`, '', `${n?.text ?? ''}`, '');
    // A new note may not name an entry the encyclopedia lacks, so its [[links]] go back to plain words.
    else offered.set(n.id, { kind: n.kind, title: n.title.trim(), text: n.text.trim().replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1') });
  }
  const ids0 = new Set(offered.keys());
  let changed = 0;
  ps.forEach((p, i) => {
    const after = reply.pieces?.find((x) => x.n === i + 1)?.text;
    if (after === undefined || after === p.text) return;
    const bad = problem(p.text, after, ids0, p.mark);
    report.push(`### [${i + 1}] ${p.where}${bad ? ` (KEPT: ${bad})` : ''}`, '', `- ${p.text}`, `+ ${after}`, '');
    if (!bad) { p.set(after); changed++; }
  });
  // Only notes an accepted piece now marks go in.
  const marked = new Set(lessonMarks(lesson));
  let addedNotes = 0;
  for (const [nid, n] of offered) {
    if (!marked.has(nid)) { noteReport.push(`### [^${nid}] ${n.kind} "${n.title}" (DROPPED: no accepted piece marks it)`, '', n.text, ''); continue; }
    lesson.footnotes = { ...(lesson.footnotes ?? {}), [nid]: n };
    noteReport.push(`### [^${nid}] ${n.kind} "${n.title}" (added)`, '', n.text, '');
    addedNotes++;
  }
  if (noteReport.length) report.push('## New footnotes', '', ...noteReport);
  writeFileSync(join(OUT, `${id}.md`), report.join('\n'));
  if (write) writeFileSync(file, formatJson(lesson, source));
  if (write && queued.some((q) => q.lesson === id)) {
    const left = JSON.parse(readFileSync(QUEUE, 'utf8')).filter((q) => q.lesson !== id);
    writeFileSync(QUEUE, `${JSON.stringify(left, null, 1)}\n`);
  }
  console.log(`${id}: ${changed} of ${ps.length} pieces changed, ${addedNotes} footnotes added, ${(reply.facts ?? []).length} fact notes${write ? ', written' : ''} (${tokens ?? '?'} tokens)`);
}
