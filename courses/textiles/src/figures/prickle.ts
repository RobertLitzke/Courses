// Branch M1: why some wool itches. A fleece holds fibres of many diameters,
// spread about its mean (here a coefficient of variation of 24 percent, a
// typical value). Fibre ends thicker than about 30 microns are stiff enough to
// press into the skin without bending, and people feel prickle once more than
// about 5 percent of the ends are that thick; the wool trade's "comfort
// factor" is the share of fibres finer than 30 microns.
// Goal 'soft': a guess first, then a mean diameter that passes (comfort 95
// percent or more) and one that fails.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, tint } from './kit';

export const PRICKLE = 30;
export const CV = 0.24;
export const COMFORT = 0.95;

const erf = (x: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};

/** Share of fibres finer than the prickle threshold, for a fleece of this mean diameter in microns. */
export const comfort = (mean: number) => 0.5 * (1 + erf((PRICKLE - mean) / (CV * mean * Math.SQRT2)));

export const FLEECES: readonly [string, number][] = [['Cashmere', 16], ['Fine merino', 19], ['Jumper wool', 27], ['Carpet wool', 36]];

const W = 520;
const H = 210;
const X0 = 30;
const X1 = 500;
const LO = 0;
const HI = 60;
const BASE = 150;

export const prickleFigure = figure(['soft'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let mean = 27;
  const seen = new Set<'pass' | 'fail'>();
  let opened = false;
  const x = (um: number) => X0 + ((um - LO) / (HI - LO)) * (X1 - X0);

  const paint = () => {
    const sd = CV * mean;
    const pdf = (u: number) => Math.exp(-((u - mean) ** 2) / (2 * sd * sd));
    const pts: string[] = [];
    const hot: string[] = [`${x(PRICKLE)},${BASE}`];
    for (let u = LO; u <= HI; u += 0.5) {
      const y = BASE - pdf(u) * 100;
      pts.push(`${x(u).toFixed(1)},${y.toFixed(1)}`);
      if (u >= PRICKLE) hot.push(`${x(u).toFixed(1)},${y.toFixed(1)}`);
    }
    hot.push(`${x(HI)},${BASE}`);
    const c = comfort(mean);
    const ok = c >= COMFORT;
    const parts: SVGElement[] = [
      svg('polygon', { points: `${x(LO)},${BASE} ${pts.join(' ')} ${x(HI)},${BASE}`, fill: tint(COL.fibre, 0.35), stroke: COL.fibre, 'stroke-width': 2 }),
      svg('polygon', { points: hot.join(' '), fill: tint(COL.bad, 0.55) }),
      line(X0, BASE, X1, BASE, COL.soft, 1),
      line(x(PRICKLE), 30, x(PRICKLE), BASE, COL.bad, 1.5),
      label(x(PRICKLE) + 4, 40, 'Thicker than 30 µm: pricks', { size: 'small', fill: COL.bad }),
    ];
    for (let u = 0; u <= HI; u += 10) parts.push(label(x(u), BASE + 14, u === HI ? `${u} µm` : `${u}`, { size: 'small', anchor: u === HI ? 'end' : 'middle', soft: true }));
    FLEECES.forEach(([name, um], i) => {
      parts.push(line(x(um), BASE + 20, x(um), BASE + 26, COL.soft, 1), label(x(um), BASE + 38 + (i % 2) * 12, name, { size: 'small', anchor: 'middle', soft: true }));
    });
    parts.push(label(X0, 20, `Mean fibre diameter ${mean} µm: ${Math.round(c * 100)}% of fibres finer than 30 µm`, { bold: true, fill: ok ? COL.good : COL.bad }));
    redraw(g, ...parts);
    f.readout.textContent = ok
      ? `Only ${Math.round((1 - c) * 100)}% of the fibre ends are thick enough to press into the skin without bending, below the 5% most people notice. This wool feels soft.`
      : `${Math.round((1 - c) * 100)}% of the fibre ends are thicker than 30 µm. They do not bend when they meet the skin, and most people feel them as prickle.`;
    if (opened) { seen.add(ok ? 'pass' : 'fail'); if (seen.size === 2) t.done(); }
  };

  const s = slider('Mean fibre diameter', { min: 14, max: 40, step: 1, value: mean, show: (v) => `${v} µm`, onInput: (v) => { mean = v; paint(); }, color: 'fibre' });
  f.controls.append(s.node);
  paint();
  guessFirst(t, f, {
    ask: 'Below about what average fibre diameter does a wool jumper stop feeling prickly to most people?',
    options: ['About 35 µm', 'About 21 µm', 'About 10 µm'],
    answer: 1,
    sliders: [s],
    after: () => { opened = true; paint(); },
  });
  return f.node;
});
