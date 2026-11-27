// Branch F7: trickle-down fashion as a cycle. An elite wears a new style;
// the rest copy it at a speed that depends on how cheap clothes are (copying
// spreads like a rumour, logistically, at a rate inversely proportional to
// the relative price of clothes). Once half the population has copied it,
// the elite drops it and adopts a new one. A toy model in the spirit of
// Simmel (1904), not a fit to data.
// Goal 'pace': a dear and a cheap price both tried.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame, slider, tint } from './kit';

export const YEARS = 20;
const DT = 0.05;
const START = 0.02;

/** Style worn by the elite and by most people at each step, and the number of new styles. */
export const simulate = (price: number) => {
  const r = 1.2 / price;
  let e = 0;
  let a = START;
  const elite: number[] = [];
  const mass: number[] = [];
  for (let t = 0; t < YEARS; t += DT) {
    a += r * a * (1 - a) * DT;
    if (a >= 0.5) { e += 1; a = START; }
    elite.push(e);
    mass.push(a > 0.5 ? e : e - 1);
  }
  return { elite, mass, styles: e };
};

const W = 520;
const H = 180;
const SHADES = [0.95, 0.6, 0.3];

export const trickleFigure = figure(['pace'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let price = 1;
  const seen = new Set<'dear' | 'cheap'>();

  const paint = () => {
    const sim = simulate(price);
    const x0 = 90;
    const w = 410;
    const step = w / sim.elite.length;
    const parts: SVGElement[] = [];
    const row = (vals: number[], y: number) => vals.forEach((v, i) => {
      if (v < 0) return;
      parts.push(svg('rect', { x: x0 + i * step, y, width: step + 0.4, height: 30, fill: tint(COL.cloth, SHADES[v % 3]) }));
    });
    row(sim.elite, 40);
    row(sim.mass, 90);
    parts.push(
      label(x0 - 8, 60, 'Elite', { size: 'small', anchor: 'end' }),
      label(x0 - 8, 110, 'Most people', { size: 'small', anchor: 'end' }),
      label(x0, 24, `${sim.styles} new styles in ${YEARS} years, one every ${(YEARS / Math.max(1, sim.styles)).toFixed(1)} years`, { bold: true }),
    );
    for (let y = 0; y <= YEARS; y += 5) parts.push(label(x0 + (y / YEARS) * w, 140, `${y}${y === YEARS ? ' years' : ''}`, { size: 'small', anchor: y === YEARS ? 'end' : 'middle', soft: true }));
    redraw(g, ...parts);
    f.readout.textContent = price >= 1.5
      ? 'When clothes are dear, copying is slow, and an elite style stays distinctive for years.'
      : price <= 0.5
        ? 'When clothes are cheap, everyone can copy quickly, so the elite must move on again and again. Each change of shade is a new style.'
        : 'Each shade is a style. The elite adopts it, most people copy it, and when half have it the elite moves on.';
    if (price >= 1.5) seen.add('dear');
    if (price <= 0.5) seen.add('cheap');
    if (seen.size === 2) t.done();
  };

  const s = slider('Relative price of clothes', { min: 0.25, max: 2, step: 0.25, value: price, show: (v) => `${v} ×`, onInput: (v) => { price = v; paint(); }, color: 'cloth' });
  f.controls.append(s.node);
  paint();
  return f.node;
});
