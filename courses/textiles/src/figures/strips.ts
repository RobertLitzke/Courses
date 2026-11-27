// Branch W1: how strip weaving builds a large pattern. A narrow loom weaves a
// long strip in which plain, warp-striped stretches alternate with blocks of
// patterned weft. Sewn edge to edge with alternate strips shifted by one
// block length, the blocks fall into a checkerboard across the whole cloth,
// the classic layout of Asante kente. Gold, red and black stand for kente's
// colours; the stripes run along the warp, the bars across it.
// Goal 'checker': alternate strips shifted by one block (or three).

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

export const BLOCK = 30;
const W = 520;
const H = 230;
const STRIPS = 9;
const SW = 34;
const TOP = 30;
const LEN = 180;

/** Whether this shift (in block lengths) puts each weft block beside a striped stretch. */
export const checkered = (shift: number) => Math.abs(shift % 2) === 1;

export const stripsFigure = figure(['checker'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let shift = 0;

  const paint = () => {
    const parts: SVGElement[] = [];
    const clip = svg('clipPath', { id: 'strips-clip' }, svg('rect', { x: 0, y: TOP, width: W, height: LEN }));
    parts.push(clip);
    const x0 = 20;
    for (let s = 0; s < STRIPS; s++) {
      const x = x0 + s * SW;
      const off = s % 2 ? shift * BLOCK : 0;
      const gs = svg('g', { 'clip-path': 'url(#strips-clip)' });
      for (let b = -3; b < LEN / BLOCK + 3; b++) {
        const y = TOP + b * BLOCK - off;
        if (b % 2 === 0) {
          // Weft block: bars across the strip.
          gs.append(svg('rect', { x, y, width: SW, height: BLOCK, fill: COL.gold }));
          for (let k = 0; k < 4; k++) gs.append(svg('rect', { x, y: y + 4 + k * 7, width: SW, height: 3, fill: k % 2 ? COL.ink : COL.madder }));
        } else {
          // Plain stretch: thin stripes along the warp.
          gs.append(svg('rect', { x, y, width: SW, height: BLOCK, fill: COL.gold }));
          for (let k = 0; k < 4; k++) gs.append(svg('rect', { x: x + 5 + k * 8, y, width: 2.5, height: BLOCK, fill: k % 2 ? COL.madder : COL.ink }));
        }
      }
      parts.push(gs, svg('line', { x1: x, y1: TOP, x2: x, y2: TOP + LEN, stroke: COL.paper, 'stroke-width': 1.5 }));
    }
    const ok = checkered(shift);
    parts.push(
      label(x0 + STRIPS * SW + 16, TOP + 14, `${STRIPS} strips sewn`, { bold: true }),
      label(x0 + STRIPS * SW + 16, TOP + 32, 'edge to edge', { bold: true }),
      label(x0 + STRIPS * SW + 16, TOP + 60, `Every other strip`, { size: 'small' }),
      label(x0 + STRIPS * SW + 16, TOP + 76, `shifted ${shift} block${shift === 1 ? '' : 's'}`, { size: 'small', fill: ok ? COL.good : COL.ink, bold: ok }),
      label(x0, TOP + LEN + 18, 'Each strip is about a hand wide', { size: 'small', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = ok
      ? 'Each patterned block now sits beside a plain striped stretch, and the blocks form a checkerboard across the whole cloth. No single strip holds the design.'
      : shift === 0
        ? 'Sewn level, the patterned blocks line up in bands across the cloth.'
        : 'Shifted part of a block, the blocks overlap their neighbours unevenly. Weavers plan the block lengths so that the strips fit.';
    if (ok) t.done();
  };

  const s = slider('Shift of every other strip', { min: 0, max: 2, step: 0.25, value: shift, show: (v) => `${v} block${v === 1 ? '' : 's'}`, onInput: (v) => { shift = v; paint(); }, color: 'gold' });
  f.controls.append(s.node);
  paint();
  return f.node;
});
