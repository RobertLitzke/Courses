// Lesson 18: what happens in a Jacquard head on one pick, as a still. Six
// hooks stand in for the hundreds of a real head. The card is pressed against
// a row of needles, one per hook. Where the card has a hole the needle passes
// through and its hook stays over the rising griffe (the lifting bar), which
// raises the hook, its cord and the warp thread tied to it. Where the card is
// blank the needle is pushed back, it pushes its hook off the griffe, and that
// thread stays down. The raised and lowered threads open the shed.

import { svg } from 'didactics/dom';
import { arrow, label, still } from 'didactics/draw';
import { COL } from './kit';

const W = 560;
const H = 312;
/** Which of the six threads this card lifts. */
export const CARD = [true, false, true, true, false, true];

export function jacquardStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const x0 = 200;
  const dx = 46;
  const xs = CARD.map((_, i) => x0 + i * dx);
  const parts: SVGElement[] = [];

  // The card, with a hole wherever a thread is to rise.
  parts.push(svg('rect', { x: x0 - 26, y: 30, width: dx * 5 + 52, height: 26, rx: 3, fill: '#efe3c4', stroke: COL.coast }));
  CARD.forEach((up, i) => parts.push(svg('circle', { cx: xs[i], cy: 43, r: 6, fill: up ? COL.ink : 'none', stroke: up ? 'none' : COL.coast, 'stroke-dasharray': up ? '' : '2 2' })));
  parts.push(label(x0 - 36, 47, 'Card for this pick', { anchor: 'end', size: 'note', bold: true }));

  // The griffe: one bar that rises on every pick.
  parts.push(svg('rect', { x: x0 - 30, y: 92, width: dx * 5 + 60, height: 6, fill: COL.soft }));
  parts.push(arrow(x0 + dx * 5 + 44, 112, x0 + dx * 5 + 44, 84, COL.soft));
  parts.push(label(x0 - 36, 99, 'Griffe (rises)', { anchor: 'end', size: 'note' }));

  // Hooks, cords, heddles and warp threads.
  CARD.forEach((up, i) => {
    const x = xs[i];
    const lift = up ? 0 : 24;
    const off = up ? 0 : 9;
    const top = 86 + lift;
    // A needle runs from the card to the hook; a blank pushes it, and the hook, aside.
    parts.push(svg('line', { x1: x, y1: 58, x2: x + off, y2: 74, stroke: COL.soft, 'stroke-width': 1.2 }));
    parts.push(svg('path', { d: `M${x + off} ${top + 70} L${x + off} ${top} Q${x + off} ${top - 8} ${x + off - 7} ${top - 4}`, fill: 'none', stroke: up ? COL.warp : COL.soft, 'stroke-width': 2.4 }));
    parts.push(svg('line', { x1: x + off, y1: top + 70, x2: x, y2: 214 + lift - 0, stroke: COL.soft, 'stroke-width': 0.8 }));
    parts.push(svg('ellipse', { cx: x, cy: 218 + lift, rx: 4, ry: 3, fill: 'none', stroke: COL.soft }));
    parts.push(svg('circle', { cx: x, cy: 218 + lift, r: 2.2, fill: COL.warp }));
  });
  parts.push(label(x0 - 36, 160, 'Hooks', { anchor: 'end', size: 'note' }));
  parts.push(label(x0 - 36, 226, 'Warp threads, end on', { anchor: 'end', size: 'note' }));

  // The shed between the raised and lowered threads, where the shuttle passes.
  parts.push(svg('line', { x1: x0 - 24, y1: 230, x2: x0 + dx * 5 + 24, y2: 230, stroke: COL.weft, 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
  parts.push(label(x0 + dx * 5 + 32, 234, 'Shed: the shuttle', { size: 'small' }));
  parts.push(label(x0 + dx * 5 + 32, 246, 'passes here', { size: 'small' }));

  parts.push(label(W / 2, 270, 'Hole: the hook stays on the griffe and its thread rises (blue).', { anchor: 'middle', size: 'small' }));
  parts.push(label(W / 2, 284, 'No hole: the needle pushes the hook off the griffe and its thread stays down.', { anchor: 'middle', size: 'small', soft: true }));

  s.append(...parts);
  return { node };
}
