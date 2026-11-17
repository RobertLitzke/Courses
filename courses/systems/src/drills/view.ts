// The drills page: an index of the design drills at /drills, and one drill at
// /drills/:id. A drill is worked, not read: the reader writes a design in the
// notes box, opens the questions one at a time, moves the estimate's sliders,
// and ticks what their design covered. Notes and ticks stay in this browser.

import { el } from 'didactics/dom';
import type { View } from 'didactics/router';
import { slider } from '../figures/kit';
import { LESSONS } from '../lessons';
import { DRILLS, type Drill } from './drills';

// ---------------------------------------------------------------------------
// What the reader wrote and ticked, per drill. Storage can be missing or full
// (a private window); the page works without it.

const key = (id: string, what: string) => `systems.drills.${id}.${what}`;

function read(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function write(k: string, v: string): void {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    // Not saved; the page still works.
  }
}

/** The indices of the covers points the reader ticked for a drill. */
export function ticked(id: string): Set<number> {
  try {
    const v: unknown = JSON.parse(read(key(id, 'covered')) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []);
  } catch {
    return new Set();
  }
}

function saveTicked(id: string, s: Set<number>): void {
  write(key(id, 'covered'), s.size ? JSON.stringify([...s].sort((a, b) => a - b)) : '');
}

// ---------------------------------------------------------------------------
// Lessons named by a drill.

function lessonLink(id: string): HTMLElement {
  const l = LESSONS.find((x) => x.id === id);
  if (!l) return el('li', {}, id);
  const code = l.code ?? `Lesson ${l.n}`;
  return el('li', {}, el('a', { href: `#/lesson/${l.id}` }, el('span.drill-code', {}, code), ` ${l.title}`));
}

// ---------------------------------------------------------------------------
// The index.

function indexPage(): HTMLElement {
  return el('div.page.drills', {},
    el('h1', {}, 'Design drills'),
    el('p.drill-lead', {},
      'Each drill is an open problem of the kind the studio lessons work through, with no lesson around it. Read the problem and write a design in the notes box before opening anything else. Then open the questions worth asking first, set the estimate to the answers you assumed, and tick what your design covered. The follow-ups test the design under failure and growth, and the last list names the lessons to reread.'),
    el('ol.drill-list', {},
      ...DRILLS.map((d, i) => {
        const done = ticked(d.id).size;
        return el('li', {},
          el('a.drill-card', { href: `#/drills/${d.id}` },
            el('span.drill-num', {}, String(i + 1)),
            el('span.drill-card-body', {},
              el('strong', {}, d.title),
              el('span.drill-card-prompt', {}, firstSentence(d.prompt)),
              done ? el('span.drill-card-done', {}, `${done} of ${d.covers.length} points covered`) : null)));
      })));
}

const firstSentence = (s: string) => s.match(/^.*?[.?](?=\s|$)/)?.[0] ?? s;

// ---------------------------------------------------------------------------
// One drill.

function section(title: string, note: string | null, ...body: (Node | null)[]): HTMLElement {
  return el('section.drill-part', {}, el('h2', {}, title), note ? el('p.drill-note', {}, note) : null, ...body);
}

function estimate(d: Drill): HTMLElement {
  const values: Record<string, number> = {};
  for (const i of d.inputs) values[i.key] = i.value;
  const lines = el('ul.drill-lines', { 'aria-live': 'polite' });
  const draw = () => lines.replaceChildren(...d.estimate(values).map((t) => el('li', {}, t)));
  const sliders = d.inputs.map((i) =>
    slider(i.label, {
      steps: i.steps,
      value: i.value,
      show: i.show,
      color: i.color,
      onInput: (v) => {
        values[i.key] = v;
        draw();
      },
    }).node);
  draw();
  return el('div.drill-estimate', {}, el('div.drill-sliders', {}, ...sliders), lines);
}

function covers(d: Drill): HTMLElement {
  const s = ticked(d.id);
  const count = el('p.drill-count', {});
  const show = () => { count.textContent = `${s.size} of ${d.covers.length} covered`; };
  show();
  return el('div', {},
    el('ul.drill-covers', {},
      ...d.covers.map((c, i) => {
        const box = el('input', { type: 'checkbox' }) as HTMLInputElement;
        box.checked = s.has(i);
        box.addEventListener('change', () => {
          if (box.checked) s.add(i);
          else s.delete(i);
          saveTicked(d.id, s);
          show();
        });
        return el('li', {}, el('label', {}, box, el('span', {}, c)));
      })),
    count);
}

function notes(d: Drill): HTMLElement {
  const box = el('textarea.drill-notes', {
    rows: 8,
    placeholder: 'Components, data flow, the numbers you assumed, and what happens when each part fails.',
    'aria-label': 'Your design',
  }) as HTMLTextAreaElement;
  box.value = read(key(d.id, 'notes')) ?? '';
  box.addEventListener('input', () => write(key(d.id, 'notes'), box.value));
  return box;
}

function drillPage(d: Drill): HTMLElement {
  const i = DRILLS.indexOf(d);
  const next = DRILLS[i + 1];
  return el('div.page.drills', {},
    el('p.drill-back', {}, el('a', { href: '#/drills' }, 'All drills')),
    el('h1', {}, el('span.drill-num', {}, String(i + 1)), d.title),
    el('div.drill-prompt', {}, el('p', {}, d.prompt), notes(d)),
    section('Questions to ask first', 'Each answer changes the design. Decide what you would assume before opening it.',
      el('div.drill-asks', {},
        ...d.asks.map((a) => el('details', {}, el('summary', {}, a.ask), el('p', {}, a.changes))))),
    section('The numbers', 'Set the sliders to the answers you assumed. The figures below follow them.', estimate(d)),
    section('What a complete design covers', 'Tick the points your design already had. The ticks stay in this browser.', covers(d)),
    section('Follow-ups', 'Work out your answer first, then open the note.',
      el('div.drill-asks', {},
        ...d.followUps.map((f) => el('details', {}, el('summary', {}, f.ask), el('p', {}, f.hint))))),
    section('Lessons it draws on', null, el('ul.drill-lessons', {}, ...d.lessons.map(lessonLink))),
    next ? el('p.drill-next', {}, el('a.btn', { href: `#/drills/${next.id}` }, `Next: ${next.title}`)) : null);
}

/** /drills and /drills/:id. */
export const drillsView: View = (root, ctx) => {
  const id = ctx.params.id;
  if (!id) {
    root.append(indexPage());
    return;
  }
  const d = DRILLS.find((x) => x.id === id);
  if (!d) {
    ctx.replace('/drills');
    return;
  }
  root.append(drillPage(d));
};
