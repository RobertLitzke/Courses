// The verdict: a question the reader answers before reading the argument
// (and, with "again", once more after it). The answer is saved (store.ts) and
// read back on the Verdicts page. Once locked in, the figure says who holds
// each view and, where the 2020 PhilPapers Survey asked the same question,
// how professional philosophers answered. There is no right answer, so
// nothing is marked right or wrong.
//
// { "type": "interactive_diagram", "id": "verdict", "goal": "answer",
//   "task": "Give your verdict",
//   "options": { "key": "euthyphro", "ask": "…", "choices": ["…", "…"],
//     "who": ["Said after locking in, for each choice", "…"],
//     "poll": { "shares": [62, 26], "source": "PhilPapers Survey 2020, …" },
//     "again": false } }

import { el } from 'didactics/dom';
import { choices as chipRow, figure, frame, lockIn, type Options } from './kit';
import { giveVerdict, store } from '../store';

export interface VerdictOptions {
  /** Its name in the save; unique across the course. */
  key: string;
  ask: string;
  choices: string[];
  /** For each choice, who holds it, said once the verdict is in. */
  who?: string[];
  /** Said once the verdict is in, after `who`. */
  then?: string;
  /** The share of professional philosophers for each choice, in percent (null where not asked). */
  poll?: { shares: (number | null)[]; source: string };
  /** Asked after the argument: shows the earlier answer, and saves as `after`. */
  again?: boolean;
}

export function verdictProblems(o: Options | undefined): string[] {
  const v = o as Partial<VerdictOptions> | undefined;
  if (!v) return ['has no options'];
  const out: string[] = [];
  if (!v.key || !/^[a-z0-9-]+$/.test(v.key)) out.push('needs a "key" of lower-case letters, digits and hyphens');
  if (!v.ask) out.push('needs an "ask"');
  if (!Array.isArray(v.choices) || v.choices.length < 2 || v.choices.length > 5) out.push('needs two to five "choices"');
  if (v.who && v.who.length !== v.choices?.length) out.push('"who" needs one line for each choice');
  if (v.poll && v.poll.shares.length !== v.choices?.length) out.push('"poll.shares" needs one share (or null) for each choice');
  if (v.poll && !v.poll.source) out.push('"poll" needs a "source"');
  return out;
}

/** The poll's bars, with the reader's choice picked out. */
function bars(o: VerdictOptions, mine: number): HTMLElement | null {
  if (!o.poll) return null;
  const rows = o.choices.map((c, i) => {
    const s = o.poll!.shares[i];
    if (s === null || s === undefined) return null;
    return el(`div.verdict-bar${i === mine ? '.mine' : ''}`, {},
      el('span', {}, c),
      el('span.track', {}, el('span.fill', { style: `width: ${Math.max(0, Math.min(100, s))}%` })),
      el('span', {}, `${Math.round(s)}%`));
  });
  return el('div', {},
    el('div.verdict-bars', { role: 'list', 'aria-label': 'How professional philosophers answered' }, ...rows.filter((r): r is HTMLElement => !!r)),
    el('p.verdict-source', {}, o.poll.source));
}

export const verdictFigure = figure<VerdictOptions & Options>(['answer'], (_ctx, t, o) => {
  const opts = o as VerdictOptions;
  const when = opts.again ? 'after' : 'before';
  const drawing = el('div');
  const f = frame({ drawing, lines: 4 });
  const saved = store.get().verdicts[opts.key];
  const earlier = opts.again && saved?.before !== undefined ? opts.choices[saved.before] : undefined;
  const after = el('div');
  drawing.append(
    el('p.verdict-ask', {}, opts.ask),
    ...(earlier ? [el('p.verdict-earlier', {}, `Before the argument you said: ${earlier}`)] : []),
  );

  const kept = t.kept as { pick?: number } | undefined;
  const start = kept?.pick ?? saved?.[when];
  const row = chipRow(opts.choices, () => (lock.disabled = false));
  const lock = lockIn('Lock it in', () => settle(row.picked(), true));
  lock.disabled = true;
  const change = el('button.btn.btn-small', { type: 'button', onclick: () => reopen() }, 'Change my answer') as HTMLButtonElement;
  change.hidden = true;
  row.node.classList.add('verdict-row');
  drawing.append(row.node, after);
  f.controls.append(lock, change);
  f.readout.textContent = opts.again ? 'Answer again, now that you have read the argument.' : 'Pick the answer closest to yours. There is no wrong one.';

  function settle(i: number, fresh: boolean) {
    if (i < 0) return;
    if (fresh) giveVerdict(opts.key, when, i);
    t.keep({ pick: i });
    row.freeze(true);
    lock.hidden = true;
    change.hidden = false;
    const said = [opts.who?.[i], opts.then].filter(Boolean).join(' ');
    f.readout.textContent = said || 'Your answer is kept on the Verdicts page.';
    after.replaceChildren(...[bars(opts, i)].filter((n): n is HTMLElement => !!n));
    t.done();
  }

  function reopen() {
    row.freeze(false);
    lock.hidden = false;
    lock.disabled = row.picked() < 0;
    change.hidden = true;
  }

  if (start !== undefined && start >= 0 && start < opts.choices.length) {
    row.pick(start);
    settle(start, false);
  }
  return f.node;
}, { options: verdictProblems });
