// Numbers over time, as a still drawn from a lesson block's options: one or
// more panels stacked over a shared axis of years, each with one or more
// lines. Used for cotton output, enslaved population, imports by source,
// dye output, fibre production and prices. Every number lives in the
// lesson's JSON, with its source in the caption or a footnote.
//
//   "options": { "from": 1790, "to": 1860, "panels": [
//     { "title": "Cotton grown in the US", "unit": "million bales",
//       "lines": [{ "name": "bales", "color": "gold", "points": [[1790, 0.003], [1860, 4.5]] }] } ] }

import type { Options } from 'didactics/figure';
import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL } from './kit';

/** at: where to put the line's name, as [year, value]; the last point if left out. */
export interface SeriesLine { name: string; color: string; points: [number, number][]; dashed?: boolean; at?: [number, number] }
export interface SeriesPanel { title: string; unit: string; lines: SeriesLine[]; max?: number }
export interface SeriesOptions { from: number; to: number; panels: SeriesPanel[]; ticks?: number[] }

export function seriesProblems(o: Options | undefined): string[] {
  const s = o as Partial<SeriesOptions> | undefined;
  if (!s || typeof s.from !== 'number' || typeof s.to !== 'number' || !Array.isArray(s.panels) || !s.panels.length) return ['series needs from, to and panels'];
  return s.panels.flatMap((p, i) => (p.title && p.unit && Array.isArray(p.lines) && p.lines.length && p.lines.every((l) => l.name && l.color in COL && l.points?.length >= 2)
    ? []
    : [`series panel ${i} needs a title, a unit and lines with a palette colour and two or more points`]));
}

const W = 520;
const X0 = 56;
const X1 = 500;
const PH = 110;

const nice = (v: number) => {
  const e = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((k) => k * e).find((k) => k >= v)!;
};
const fmt = (v: number) => (v >= 1000 ? v.toLocaleString('en-GB') : String(Math.round(v * 100) / 100));

export function seriesStill(_ctx: unknown, _goal?: string, options?: Options): { node: HTMLElement } {
  const o = options as unknown as SeriesOptions;
  const x = (yr: number) => X0 + ((yr - o.from) / (o.to - o.from)) * (X1 - X0);
  const H = o.panels.length * (PH + 34) + 40;
  const { node, svg: s } = still(W, H);
  o.panels.forEach((p, i) => {
    const top = 22 + i * (PH + 34);
    const max = p.max ?? nice(Math.max(...p.lines.flatMap((l) => l.points.map((q) => q[1]))));
    const y = (v: number) => top + PH - (v / max) * PH;
    s.append(label(X0, top - 8, `${p.title} (${p.unit})`, { size: 'note', bold: true }));
    for (const f of [0, 0.5, 1]) {
      s.append(line(X0, y(max * f), X1, y(max * f), COL.grid, 1), label(X0 - 6, y(max * f) + 3, fmt(max * f), { size: 'small', anchor: 'end', soft: true }));
    }
    for (const l of p.lines) {
      const c = COL[l.color as keyof typeof COL];
      s.append(svg('polyline', { points: l.points.map(([a, b]) => `${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round', ...(l.dashed ? { 'stroke-dasharray': '5 3' } : {}) }));
      const [lx, ly] = l.at ?? l.points.at(-1)!;
      if (p.lines.length > 1) s.append(label(x(lx) - 4, y(ly) - 6, l.name, { size: 'small', anchor: 'end', fill: c, halo: COL.paper }));
    }
  });
  const ticks = o.ticks ?? Array.from({ length: 5 }, (_, k) => Math.round(o.from + ((o.to - o.from) * k) / 4));
  for (const t of ticks) s.append(label(x(t), H - 20, String(t), { size: 'small', anchor: 'middle', soft: true }));
  return { node };
}

export const seriesFigure = Object.assign(seriesStill, { options: seriesProblems, each: true as const });
