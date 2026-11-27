// An argument map as a still: numbered premises, the conclusion they lead to,
// and, where the lesson gives one, the objection set against a step. Claims are
// drawn in the claim colour and objections in the objection colour, as in the
// prose ([[words|claim]], [[words|objection]]).
//
// { "type": "diagram", "id": "argument", "caption": "…",
//   "options": { "steps": [ { "text": "A premise" }, { "text": "The conclusion", "kind": "conclusion" },
//                           { "text": "An objection", "kind": "objection", "against": 2 } ] } }

import { el } from 'didactics/dom';
import type { FigureFactory, Options } from './kit';

export interface ArgumentStep {
  text: string;
  /** premise (the default), conclusion, or objection. */
  kind?: 'premise' | 'conclusion' | 'objection';
  /** For an objection: the number of the step it attacks, from 1. */
  against?: number;
  /** Who makes the objection, shown as its label. */
  who?: string;
}

export interface ArgumentOptions {
  steps: ArgumentStep[];
}

export function argumentProblems(o: Options | undefined): string[] {
  const a = o as Partial<ArgumentOptions> | undefined;
  if (!a || !Array.isArray(a.steps) || a.steps.length < 2) return ['needs two or more "steps"'];
  const out: string[] = [];
  const n = a.steps.length;
  for (const [i, s] of a.steps.entries()) {
    if (!s.text) out.push(`step ${i + 1} needs "text"`);
    if (s.kind && !['premise', 'conclusion', 'objection'].includes(s.kind)) out.push(`step ${i + 1}: unknown kind "${s.kind}"`);
    if (s.kind === 'objection' && (!s.against || s.against < 1 || s.against > n)) out.push(`step ${i + 1}: an objection needs "against", a step number`);
  }
  if (!a.steps.some((s) => s.kind === 'conclusion')) out.push('needs a step with "kind": "conclusion"');
  return out;
}

export const argumentFigure: FigureFactory = Object.assign(
  (_ctx: unknown, _goal?: string, options?: Options) => {
    const o = options as unknown as ArgumentOptions;
    const rows = o.steps.map((s, i) => {
      const kind = s.kind ?? 'premise';
      const tag = kind === 'conclusion' ? 'So' : kind === 'objection' ? `Against ${s.against}` : `${i + 1}`;
      return el(`div.arg-step.arg-${kind}`, {},
        el('span.arg-tag', {}, tag),
        el('span.arg-text', {}, s.text, s.who ? el('span.arg-who', {}, ` (${s.who})`) : ''));
    });
    return { node: el('div.argument', { role: 'list' }, ...rows) };
  },
  { options: argumentProblems, each: true as const },
) as FigureFactory;
