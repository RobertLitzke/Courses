// The hours bar: how many hours of work went into one object, split by stage
// and coloured by who did the work (household, waged, enslaved, overseas), on
// a log scale so a T-shirt's minutes and a sail's thousands of hours can sit
// on the same axis. A still drawn from a lesson block's options:
//
//   "options": { "item": "10 m of chintz", "stages": [
//     { "stage": "Spinning", "hours": 1350, "who": "household" }, ... ],
//     "note": "Rough estimates ..." }

import type { Options } from 'didactics/figure';
import { label, line, still } from 'didactics/draw';
import { svg } from 'didactics/dom';
import { COL } from './kit';

export type Who = 'household' | 'waged' | 'enslaved' | 'overseas';
export interface Stage { stage: string; hours: number; who: Who }
export interface HoursOptions { item: string; stages: Stage[]; note?: string }

const WHO: Record<Who, string> = { household: 'household', waged: 'for wages', enslaved: 'enslaved', overseas: 'overseas' };

export function hoursProblems(o: Options | undefined): string[] {
  const h = o as Partial<HoursOptions> | undefined;
  if (!h?.item || !Array.isArray(h.stages) || h.stages.length === 0) return ['hours needs an item and stages'];
  return h.stages.flatMap((s, i) => (typeof s.hours === 'number' && s.hours > 0 && s.who in WHO && s.stage ? [] : [`hours stage ${i} needs a stage, hours > 0 and who`]));
}

const W = 520;
const X0 = 110;
const X1 = 490;
/** The axis runs from 0.1 hour (6 minutes) to 100,000 hours. */
const LO = -1;
const HI = 5;
const x = (h: number) => X0 + ((Math.log10(Math.max(h, 0.1)) - LO) / (HI - LO)) * (X1 - X0);
const fmt = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h).toLocaleString('en-GB')} h`);

export function hoursStill(_ctx: unknown, _goal?: string, options?: Options): { node: HTMLElement } {
  const o = options as unknown as HoursOptions;
  const rows = [...o.stages, { stage: 'Total', hours: o.stages.reduce((a, s) => a + s.hours, 0), who: undefined }];
  const H = 96 + rows.length * 26;
  const { node, svg: s } = still(W, H);
  s.append(label(W / 2, 16, o.item, { bold: true, anchor: 'middle' }));
  for (let p = LO; p <= HI; p++) {
    const xx = x(10 ** p);
    s.append(line(xx, 28, xx, 34 + rows.length * 26, COL.grid, 1),
      label(xx, 46 + rows.length * 26, p < 0 ? '6 min' : (10 ** p).toLocaleString('en-GB'), { size: 'small', anchor: 'middle', soft: true }));
  }
  rows.forEach((r, i) => {
    const y = 34 + i * 26;
    const total = r.who === undefined;
    s.append(
      label(X0 - 8, y + 13, r.stage, { size: 'note', anchor: 'end', bold: total }),
      svg('rect', { x: X0, y: y + 2, width: Math.max(2, x(r.hours) - X0), height: 16, rx: 2, fill: total ? COL.ink : COL[r.who!] }),
      label(x(r.hours) + 4, y + 14, fmt(r.hours), { size: 'small', bold: total }),
    );
  });
  // Key: only the kinds of work this object used.
  const used = [...new Set(o.stages.map((st) => st.who))];
  used.forEach((w, i) => s.append(
    svg('rect', { x: X0 + i * 110, y: H - 36, width: 12, height: 10, fill: COL[w] }),
    label(X0 + 16 + i * 110, H - 27, WHO[w], { size: 'small' })));
  s.append(label(X0 - 8, H - 27, 'hours, log scale', { size: 'small', anchor: 'end', soft: true }));
  return { node };
}

export const hoursFigure = Object.assign(hoursStill, { options: hoursProblems, each: true as const });
