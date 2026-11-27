// Lesson 22: how many looms one weaver can mind. Every loom needs the
// weaver's attention for some minutes of each hour it runs: on a plain power
// loom, to put in a fresh shuttle whenever the weft runs out (about every four
// minutes) and to mend broken threads; on an automatic loom such as Toyoda's
// Type G, the loom changes its own shuttle and the weaver only mends breaks
// and refills the magazine. When the looms need more minutes than the hour
// has, they stand waiting for the weaver. Round, illustrative numbers.
// Goal 'auto': twenty or more automatic looms kept running by one weaver.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

/** Minutes of the weaver's attention each loom needs per hour of running. */
export const ATTENTION = { plain: 12, automatic: 2.25 } as const;
export type LoomKind = keyof typeof ATTENTION;

/** How busy the weaver would need to be: 1 means every minute of the hour. */
export const load = (n: number, kind: LoomKind) => (n * ATTENTION[kind]) / 60;

/** Share of the hour each loom spends weaving: stopped while tended, and waiting when the weaver is overloaded. */
export const running = (n: number, kind: LoomKind) => (1 - ATTENTION[kind] / 60) * Math.min(1, 1 / load(n, kind));

/** Loom-hours of weaving in an hour from n looms. */
export const output = (n: number, kind: LoomKind) => n * running(n, kind);

const W = 520;
const H = 230;
const MAX = 40;

export const loomsFigure = figure(['auto'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let n = 4;
  let kind: LoomKind = 'plain';

  const paint = () => {
    const rho = load(n, kind);
    const r = running(n, kind);
    const waiting = rho > 1 ? Math.round(n * (1 - 1 / rho)) : 0;
    const parts: SVGElement[] = [label(20, 20, `${n} ${kind === 'plain' ? 'plain power' : 'automatic'} looms, one weaver`, { bold: true })];
    for (let i = 0; i < n; i++) {
      const x = 20 + (i % 20) * 24;
      const y = 34 + Math.floor(i / 20) * 40;
      const idle = i >= n - waiting;
      parts.push(svg('rect', { x, y, width: 18, height: 28, rx: 2, fill: idle ? COL.paper : COL.cloth, stroke: idle ? COL.bad : COL.cloth, 'stroke-width': 1.5, 'stroke-dasharray': idle ? '3 2' : '' }));
    }
    parts.push(label(20, 132, 'Blue: weaving.  Dashed red: stopped, waiting for the weaver.', { size: 'small', soft: true }));
    // The weaver's hour.
    const busy = Math.min(60, n * ATTENTION[kind]);
    parts.push(label(20, 162, "The weaver's hour", { size: 'note' }));
    parts.push(svg('rect', { x: 140, y: 150, width: 360, height: 16, fill: COL.grid }));
    parts.push(svg('rect', { x: 140, y: 150, width: (busy / 60) * 360, height: 16, fill: rho > 1 ? COL.bad : COL.waged }));
    parts.push(label(140, 184, rho > 1 ? `Needed: ${Math.round(n * ATTENTION[kind])} minutes in every 60` : `Busy ${Math.round(busy)} of 60 minutes`, { size: 'small', fill: rho > 1 ? COL.bad : COL.ink }));
    parts.push(label(20, 212, `Cloth woven: ${output(n, kind).toFixed(1)} loom-hours an hour (${Math.round(r * 100)}% per loom)`, { bold: true }));
    redraw(g, ...parts);
    f.readout.textContent = kind === 'plain'
      ? `Each plain loom needs about ${ATTENTION.plain} minutes of attention an hour, mostly to change the shuttle. ${rho > 1 ? `${n} looms need more minutes than the hour has, so ${waiting} stand idle at any moment and adding looms adds no cloth.` : 'The weaver keeps up, with time to spare.'}`
      : `An automatic loom changes its own shuttle, so it needs only about ${ATTENTION.automatic} minutes an hour for broken threads and refilling. ${rho > 1 ? `Even so, ${n} looms are too many: ${waiting} stand waiting.` : `One weaver can keep ${n} looms running.`}`;
    if (kind === 'automatic' && n >= 20 && rho <= 1) t.done();
  };

  const s = slider('Looms per weaver', { min: 1, max: MAX, step: 1, value: n, show: (v) => `${v}`, onInput: (v) => { n = v; paint(); }, color: 'waged' });
  const kinds = choices(['Plain power loom', 'Automatic loom'], (i) => { kind = i === 0 ? 'plain' : 'automatic'; paint(); });
  kinds.pick(0);
  f.controls.append(kinds.node, s.node);
  paint();
  return f.node;
});
