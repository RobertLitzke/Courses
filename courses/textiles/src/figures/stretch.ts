// Branch M5: how far a cloth stretches and how much of the stretch it keeps
// once let go. Round, illustrative numbers. A plain woven cotton gives only a
// few percent along its threads before they take the load. A cotton jersey
// stretches easily as its loops change shape, but cotton has little elastic
// recovery, so part of a big stretch stays (a baggy knee). A knit with a
// little elastane springs back almost fully; worn elastane, broken down by
// heat, chlorine and age, behaves like plain cotton again.
// Goal 'compare': jersey and the elastane knit each stretched 30 percent or more.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider, tint } from './kit';

export const CLOTHS: readonly { name: string; max: number; keep: (s: number) => number }[] = [
  { name: 'Woven cotton', max: 3, keep: () => 0 },
  { name: 'Cotton jersey', max: 60, keep: (s) => Math.max(0, s - 8) * 0.3 },
  { name: 'Jersey with 5% elastane', max: 60, keep: (s) => s * 0.03 },
  { name: 'Worn elastane', max: 60, keep: (s) => Math.max(0, s - 8) * 0.25 },
];

const W = 520;
const H = 190;
const L = 200;

export const stretchFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let k = 1;
  let pull = 20;
  const seen = new Set<number>();

  const strip = (x: number, y: number, len: number, col: string) => {
    const parts: SVGElement[] = [svg('rect', { x, y, width: len, height: 34, fill: tint(col, 0.3), stroke: col, 'stroke-width': 1.5 })];
    // Loops (or threads) spaced along the strip, so the stretch shows as wider spacing.
    const n = 12;
    for (let i = 0; i < n; i++) {
      const cx = x + (len / n) * (i + 0.5);
      const rx = len / n / 2.4;
      parts.push(svg('ellipse', { cx, cy: y + 17, rx, ry: 10, fill: 'none', stroke: col, 'stroke-width': 1.2 }));
    }
    return parts;
  };

  const paint = () => {
    const c = CLOTHS[k];
    const s = Math.min(pull, c.max);
    const kept = c.keep(s);
    const col = k === 0 ? COL.cloth : COL.yarn;
    const parts: SVGElement[] = [
      label(20, 22, c.name, { bold: true }),
      label(20, 58, 'Pulled', { size: 'small', soft: true }),
      ...strip(90, 40, L * (1 + s / 100), col),
      label(20, 128, 'Let go', { size: 'small', soft: true }),
      ...strip(90, 110, L * (1 + kept / 100), col),
      svg('line', { x1: 90 + L, y1: 30, x2: 90 + L, y2: 160, stroke: COL.soft, 'stroke-dasharray': '3 3' }),
      label(90 + L, 176, 'Original length', { size: 'small', anchor: 'middle', soft: true }),
    ];
    redraw(g, ...parts);
    if (pull > c.max) {
      f.readout.textContent = `The woven threads lie straight along the pull, so they take the load directly. The cloth gives about ${c.max}% and then the threads would break before it stretched further.`;
    } else if (kept < 1) {
      f.readout.textContent = `Stretched ${s}%, it springs back to within ${kept.toFixed(1)}% of its length. ${k === 2 ? 'The elastane fibres pull the loops back into shape.' : 'The threads straighten slightly and then recover.'}`;
    } else {
      f.readout.textContent = `Stretched ${s}%, it keeps ${kept.toFixed(0)}% of extra length. The loops have been pulled out of shape, and ${k === 3 ? 'the damaged elastane no longer pulls them back.' : 'cotton has little elastic recovery to pull them back.'}`;
    }
    if (s >= 30) seen.add(k);
    if (seen.has(1) && seen.has(2)) t.done();
  };

  const sl = slider('Pull', { min: 0, max: 60, step: 1, value: pull, show: (v) => `${v}% longer`, onInput: (v) => { pull = v; paint(); }, color: 'yarn' });
  const c = choices(CLOTHS.map((x) => x.name), (i) => { k = i; paint(); });
  c.pick(k);
  f.controls.append(c.node, sl.node);
  paint();
  return f.node;
});
