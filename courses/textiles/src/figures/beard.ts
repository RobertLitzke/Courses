// Branch K4: how William Lee's stocking frame makes a row of loops. Each
// needle is a bearded needle: a hook whose springy tip (the beard) can be
// pressed into a groove in the shank to close it. One cycle, on every needle
// of the frame at once: yarn is laid across the needles and pushed into
// loops between them by thin plates (sinkers); the new loops are drawn under
// the beards; a presser bar closes the beards; the old loops are pushed over
// the closed beards and off, over the new loops; the beards spring open.
// Three needles stand for the hundreds of a frame. The old loops belong to
// the knitted cloth (cloth colour); the new yarn is yarn colour.
// Goal 'cycle': every step seen.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame } from './kit';

export const STEPS: readonly string[] = [
  'Each needle holds the last loop of the cloth on its shank, behind the open beard.',
  'Yarn is laid across all the needles, and thin plates called sinkers push it down between them into a row of new loops.',
  'The needles draw back, so the new loops slide under the beards, into the hooks.',
  'A presser bar comes down and closes every beard at once, tucking its tip into a groove in the shank.',
  'The old loops are pushed forward over the closed beards and off the needles, over the new loops. The new loops now hold the old ones.',
  'The presser lifts and the beards spring open. The new loops are now the last row of the cloth, and the cycle starts again.',
];

const W = 520;
const H = 210;
const YS = [60, 115, 170];

export const beardFigure = figure(['cycle'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let step = 0;
  let max = 0;

  const paint = () => {
    const parts: SVGElement[] = [];
    const closed = step === 3 || step === 4;
    for (const y of YS) {
      // Shank and hook; the beard runs back above the shank from the tip.
      parts.push(svg('line', { x1: 60, y1: y, x2: 380, y2: y, stroke: COL.soft, 'stroke-width': 3 }));
      parts.push(svg('path', { d: `M380 ${y} q14 0 14 -10 q0 -8 -12 -8 L${closed ? 330 : 322} ${closed ? y - 2 : y - 14}`, fill: 'none', stroke: COL.soft, 'stroke-width': 2.5 }));
      parts.push(svg('rect', { x: 326, y: y - 1.5, width: 10, height: 3, fill: COL.paper }));
      // Old loop: on the shank, then over the beard and off, sitting behind the new loop.
      const oldX = step <= 3 ? 200 : step === 4 ? 410 : -999;
      if (oldX > 0) parts.push(svg('ellipse', { cx: oldX, cy: y, rx: 6, ry: 16, fill: 'none', stroke: COL.cloth, 'stroke-width': 3 }));
      // New loop: laid, sunk, drawn under the beard.
      if (step === 1) parts.push(svg('path', { d: `M270 ${y - 22} L270 ${y + 18}`, stroke: COL.yarn, 'stroke-width': 3 }));
      if (step >= 2) {
        const nx = step === 5 ? 200 : 352;
        parts.push(svg('ellipse', { cx: nx, cy: y, rx: 6, ry: step === 5 ? 16 : 12, fill: 'none', stroke: step === 5 ? COL.cloth : COL.yarn, 'stroke-width': 3 }));
      }
    }
    if (step === 1) parts.push(svg('line', { x1: 270, y1: 30, x2: 270, y2: 192, stroke: COL.yarn, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
    if (step === 3 || step === 4) parts.push(svg('rect', { x: 318, y: 22, width: 26, height: 170, fill: COL.soft, opacity: 0.25 }));
    parts.push(
      label(20, 24, `Step ${step + 1} of ${STEPS.length}`, { bold: true }),
      label(380, 24, 'Beard', { size: 'small', anchor: 'end', soft: true }),
      label(70, 200, 'Shank', { size: 'small', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = STEPS[step] + (step === 1 ? ' Every needle across the frame works at once.' : '');
    max = Math.max(max, step);
    if (max === STEPS.length - 1) t.done();
  };

  f.controls.append(el('div.row', {},
    el('button.btn.btn-small', { type: 'button', onclick: () => { step = Math.max(0, step - 1); paint(); } }, 'Back'),
    el('button.btn.btn-small', { type: 'button', onclick: () => { step = (step + 1) % STEPS.length; paint(); } }, 'Next step'),
  ));
  paint();
  return f.node;
});
