// Lesson 25 reads the reader's verdicts back: how many they gave, where they
// sided with the majority of philosophers in the 2020 survey and where not,
// where they changed their mind on a question asked twice, and the pairs of
// answers that pull against each other (tensions.ts). A still: it shows the
// save as it is when the lesson opens.
//
// { "type": "diagram", "id": "ledger" }

import { el } from 'didactics/dom';
import type { FigureFactory } from './kit';
import { store, type Verdict } from '../store';
import { askedVerdicts, triggered, type AskedVerdict } from '../verdicts-page';

export interface LedgerReading {
  asked: number;
  answered: number;
  /** Verdicts with a poll, and whether the reader's answer was the one most philosophers gave. */
  polled: { v: AskedVerdict; pick: number; withMost: boolean }[];
  changed: { v: AskedVerdict; before: number; after: number }[];
}

/** What the ledger shows, from a set of saved verdicts. */
export function readLedger(verdicts: Record<string, Verdict>): LedgerReading {
  const asked = askedVerdicts();
  const latest = (a: AskedVerdict) => (a.options.again ? verdicts[a.options.key]?.after : verdicts[a.options.key]?.before);
  const answered = asked.filter((a) => latest(a) !== undefined);
  const polled = answered.filter((a) => a.options.poll).map((v) => {
    const shares = v.options.poll!.shares;
    const top = shares.reduce<number>((b, s, i) => ((s ?? -1) > (shares[b] ?? -1) ? i : b), 0);
    const pick = latest(v)!;
    return { v, pick, withMost: pick === top };
  });
  const changed = asked.filter((a) => a.options.again).flatMap((v) => {
    const s = verdicts[v.options.key];
    return s?.before !== undefined && s.after !== undefined && s.before !== s.after ? [{ v, before: s.before, after: s.after }] : [];
  });
  return { asked: asked.length, answered: answered.length, polled, changed };
}

export const ledgerFigure: FigureFactory = Object.assign(
  () => {
    const verdicts = store.get().verdicts;
    const r = readLedger(verdicts);
    const tensions = triggered(verdicts);
    if (!r.answered) {
      return { node: el('div.ledger-fig', {}, el('p', {}, 'You have not given any verdicts yet, so there is nothing to read back. Each lesson asks for one before its argument; the Verdicts page in the menu collects them.')) };
    }
    const most = r.polled.filter((p) => p.withMost).length;
    const against = r.polled.filter((p) => !p.withMost);
    const share = (p: { v: AskedVerdict; pick: number }) => p.v.options.poll!.shares[p.pick];
    return {
      node: el('div.ledger-fig', {},
        el('p', {}, `You gave ${r.answered} of the ${r.asked} verdicts in the course. On ${r.polled.length} of them the 2020 survey asked philosophers a similar question, and you gave the answer most of them gave ${most} ${most === 1 ? 'time' : 'times'}.`),
        ...(against.length ? [el('h4', {}, 'Where you differed from most philosophers'),
          ...against.map((p) => el('div.ledger-row', {},
            el('span.ledger-lesson', {}, `Lesson ${p.v.n}`),
            el('span', {}, `${p.v.options.ask} You said: ${p.v.options.choices[p.pick]}${share(p) != null ? ` (${share(p)}% of philosophers)` : ''}.`)))] : []),
        ...(r.changed.length ? [el('h4', {}, 'Where you changed your mind'),
          ...r.changed.map((c) => el('div.ledger-row', {},
            el('span.ledger-lesson', {}, `Lesson ${c.v.n}`),
            el('span', {}, `${c.v.options.ask} First: ${c.v.options.choices[c.before]}. Later: ${c.v.options.choices[c.after]}.`)))] : []),
        el('h4', {}, 'Answers that pull against each other'),
        ...(tensions.length
          ? tensions.map((t) => el('div.ledger-row.ledger-tension', {}, el('span', {}, t.text)))
          : [el('p', {}, 'None of the pairs the course watches for came up in your answers.')]),
      ),
    };
  },
  { each: true as const },
) as FigureFactory;
