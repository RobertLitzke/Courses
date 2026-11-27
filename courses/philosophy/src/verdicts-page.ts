// The Verdicts page: every verdict the written lessons ask, in course order,
// with the reader's answer before the argument and after it, the pairs of
// answers that pull against each other (tensions.ts), and a button to start
// again. Everything is in the reader's own save, on their device.

import { el } from 'didactics/dom';
import { isDiagram } from 'didactics/blocks';
import type { View } from 'didactics/router';
import { WRITTEN } from './lessons';
import { clearVerdicts, store } from './store';
import { TENSIONS } from './tensions';
import type { VerdictOptions } from './figures/verdict';

export interface AskedVerdict {
  lesson: string;
  n: number;
  title: string;
  options: VerdictOptions;
}

/** Every verdict block in the written lessons, in order. */
export function askedVerdicts(): AskedVerdict[] {
  return WRITTEN.flatMap((l) => l.parts.flatMap((p) => p.blocks)
    .filter(isDiagram)
    .filter((b) => b.id === 'verdict' && b.options)
    .map((b) => ({ lesson: l.id, n: l.n, title: l.title, options: b.options as unknown as VerdictOptions })));
}

/** The tensions the reader's answers set off. A key's latest answer counts (after, else before). */
export function triggered(verdicts = store.get().verdicts) {
  const latest = (key: string) => {
    const v = verdicts[key];
    return v?.after ?? v?.before;
  };
  return TENSIONS.filter((t) => {
    const a = latest(t.a.key);
    const b = latest(t.b.key);
    return a !== undefined && b !== undefined && t.a.picks.includes(a) && t.b.picks.includes(b);
  });
}

export const verdictsView: View = (root) => {
  const draw = () => {
    const vs = store.get().verdicts;
    const asked = askedVerdicts();
    const answered = asked.filter((a) => vs[a.options.key]);
    const tensions = triggered(vs);
    const entries = answered.map((a) => {
      const v = vs[a.options.key];
      const c = a.options.choices;
      const pick = a.options.again ? v.after : v.before;
      // An "again" verdict shares its key with the first ask; show the change if there is one.
      if (a.options.again && v.before !== undefined && v.after !== undefined && v.before !== v.after) {
        return el('div.entry', {},
          el('div.lesson', {}, `Lesson ${a.n}`),
          el('p', {}, el('b', {}, a.options.ask)),
          el('p.changed', {}, `Before the argument: ${c[v.before]}. After it: ${c[v.after]}.`));
      }
      if (pick === undefined) return null;
      return el('div.entry', {},
        el('div.lesson', {}, `Lesson ${a.n}`),
        el('p', {}, el('b', {}, a.options.ask)),
        el('p', {}, c[pick]));
    }).filter((e): e is HTMLElement => !!e);
    root.replaceChildren(el('div.ledger', {},
      el('h2', {}, 'Your verdicts'),
      el('p', {}, answered.length
        ? `You have given ${answered.length} of the ${asked.length} verdicts in the lessons written so far. They are kept only on this device, in your save.`
        : 'Each lesson asks for your verdict before its argument. Your answers will be listed here, with any that pull against each other.'),
      ...(tensions.length ? [el('h2', {}, 'Answers that pull against each other'), ...tensions.map((t) => el('div.entry.tension', {}, el('p', {}, t.text)))] : []),
      ...(entries.length ? [el('h2', {}, 'Lesson by lesson'), ...entries] : []),
      ...(answered.length ? [el('p', {}, el('button.btn.btn-small', { type: 'button', onclick: () => { clearVerdicts(); draw(); } }, 'Forget all my verdicts'))] : []),
    ));
  };
  draw();
};
