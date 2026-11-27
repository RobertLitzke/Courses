// Branch M4: what a thread count counts. Thread count is the number of warp
// threads plus weft threads in a square inch of cloth. How many fit depends
// on how fine the yarn is: here threads lie at 1.15 times their own diameter
// apart, a close plain weave. Counting each ply of a plied yarn as a thread
// multiplies the number without changing the cloth.
// Goal 'ply': a count of 800 or more reached by counting plies.
// Also a still of pile cloths: towelling and velvet beside plain weave.

import { svg } from 'didactics/dom';
import { label, line, redraw, still } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

export const PACK = 1.15;
export const PLIES = 3;
/** Honest thread count (warp plus weft per square inch) for yarn of this diameter in mm. */
export const threadCount = (d: number) => 2 * Math.round(25.4 / (PACK * d));

const W = 520;
const H = 220;
const BOX = 170;
const MM = 2.5;

export const threadsFigure = figure(['ply'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let d = 0.15;
  let ply = false;

  const paint = () => {
    const per = threadCount(d) / 2;
    const count = threadCount(d) * (ply ? PLIES : 1);
    const px = BOX / MM;
    const pitch = PACK * d * px;
    const w = d * px;
    const x0 = 20;
    const y0 = 20;
    const parts: SVGElement[] = [svg('rect', { x: x0, y: y0, width: BOX, height: BOX, fill: '#f4efe4', stroke: COL.soft })];
    const n = Math.floor(BOX / pitch);
    for (let i = 0; i < n; i++) {
      const p = i * pitch + (pitch - w) / 2;
      parts.push(svg('rect', { x: x0, y: y0 + p, width: BOX, height: w, fill: COL.weft }));
    }
    for (let i = 0; i < n; i++) {
      const p = i * pitch + (pitch - w) / 2;
      // Each warp thread passes over every other weft thread.
      for (let j = 0; j < n; j++) {
        if ((i + j) % 2) continue;
        parts.push(svg('rect', { x: x0 + p, y: y0 + j * pitch, width: w, height: pitch, fill: COL.warp }));
      }
      if (ply) for (let k = 1; k < PLIES; k++) parts.push(line(x0 + p + (w * k) / PLIES, y0, x0 + p + (w * k) / PLIES, y0 + BOX, 'rgba(255,255,255,0.55)', 0.6));
    }
    parts.push(label(x0, y0 + BOX + 16, `A square ${MM} mm across, magnified`, { size: 'small', soft: true }));
    const big = svg('text', { x: 240, y: 90, 'font-size': 44, 'font-weight': 700, fill: ply ? COL.you : COL.cloth });
    big.textContent = String(count);
    parts.push(
      big,
      label(240, 116, 'Thread count on the label', { size: 'small', soft: true }),
      label(240, 140, `${per} warp and ${per} weft threads per inch`, { size: 'small' }),
      ...(ply ? [label(240, 158, `each counted ${PLIES} times, once per ply`, { size: 'small', fill: COL.you })] : []),
    );
    redraw(g, ...parts);
    f.readout.textContent = ply
      ? `The same cloth, with each yarn twisted from ${PLIES} finer plies and every ply counted. The number is ${PLIES} times bigger; the cloth is no denser and no softer.`
      : `Yarn ${d.toFixed(2)} mm across fits ${per} threads to the inch each way. Finer yarn packs more threads in, which is what a high count honestly means.`;
    if (ply && count >= 800) t.done();
  };

  const s = slider('Yarn diameter', { min: 0.08, max: 0.3, step: 0.01, value: d, show: (v) => `${v.toFixed(2)} mm`, onInput: (v) => { d = v; paint(); }, color: 'yarn' });
  const c = choices(['Count each yarn', `Count each of ${PLIES} plies`], (i) => { ply = i === 1; paint(); });
  c.pick(0);
  f.controls.append(s.node, c.node);
  paint();
  return f.node;
});

export function pileStill(): { node: HTMLElement } {
  const PW = 560;
  const PH = 170;
  const { node, svg: s } = still(PW, PH);
  const parts: SVGElement[] = [];
  const panel = (x: number, title: string, note: string, pile: 'none' | 'loops' | 'cut') => {
    const y = 95;
    // Ground cloth: weft ends seen as circles, a warp thread weaving over and under them.
    let d = `M${x} ${y}`;
    for (let i = 0; i < 8; i++) {
      const cx = x + 10 + i * 20;
      parts.push(svg('circle', { cx, cy: y, r: 6, fill: COL.weft }));
      d += ` Q${cx} ${y + (i % 2 ? 14 : -14)} ${cx + 10} ${y}`;
    }
    parts.push(svg('path', { d, fill: 'none', stroke: COL.warp, 'stroke-width': 3 }));
    if (pile === 'loops') {
      for (let i = 0; i < 7; i++) {
        const cx = x + 20 + i * 20;
        const up = i % 2 === 0;
        parts.push(svg('path', { d: `M${cx - 4} ${y} C${cx - 14} ${y + (up ? -42 : 42)} ${cx + 14} ${y + (up ? -42 : 42)} ${cx + 4} ${y}`, fill: 'none', stroke: COL.yarn, 'stroke-width': 2.5 }));
      }
    }
    if (pile === 'cut') {
      for (let i = 0; i < 8; i++) {
        const cx = x + 10 + i * 20;
        parts.push(svg('path', { d: `M${cx - 3} ${y - 36} L${cx} ${y - 4} L${cx + 3} ${y - 36}`, fill: 'none', stroke: COL.yarn, 'stroke-width': 2.5 }));
      }
    }
    parts.push(label(x, 22, title, { bold: true }), label(x, PH - 10, note, { size: 'small', soft: true }));
  };
  panel(10, 'Plain weave', 'Two sets of threads', 'none');
  panel(200, 'Towelling', 'Extra warp in loops, both faces', 'loops');
  panel(390, 'Velvet', 'Extra warp cut into tufts', 'cut');
  s.append(...parts);
  return { node };
}
