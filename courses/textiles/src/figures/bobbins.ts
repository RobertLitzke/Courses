// Branch K2: the two moves of bobbin lace. Four bobbins hang in two pairs.
// A cross puts the left middle bobbin over the right middle one; a twist
// puts the right bobbin of each pair over the left. Cross, twist, cross
// (a cloth stitch) carries the left pair right through the right pair, as a
// weft passes through the warp: so the travelling pair is drawn in weft
// colour and the hanging pair in warp colour.
// Goal 'cloth': a cloth stitch made, with the travelling pair ending on the right.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame } from './kit';

export type Move = 'cross' | 'twist';

/** Bobbin ids by position after a move. Ids 0 and 1 start as the left (travelling) pair. */
export const apply = (pos: readonly number[], m: Move): number[] =>
  m === 'cross' ? [pos[0], pos[2], pos[1], pos[3]] : [pos[1], pos[0], pos[3], pos[2]];

export const travelled = (pos: readonly number[]) => pos[2] < 2 && pos[3] < 2;

const W = 520;
const H = 230;
const ROWS = 7;
const X = [150, 200, 250, 300];
const DY = 26;

export const bobbinsFigure = figure(['cloth'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let moves: Move[] = [];

  const paint = () => {
    const parts: SVGElement[] = [];
    let pos = [0, 1, 2, 3];
    const y0 = 30;
    // Pins at the top, where the threads hang from.
    X.forEach((x) => parts.push(svg('circle', { cx: x, cy: y0 - 8, r: 2.5, fill: COL.soft })));
    const colour = (id: number) => (id < 2 ? COL.weft : COL.warp);
    moves.forEach((m, r) => {
      const next = apply(pos, m);
      const ya = y0 + r * DY;
      const yb = ya + DY;
      // Draw the thread that goes under first, so the one going over sits on top.
      const order = m === 'cross' ? [0, 3, 2, 1] : [0, 2, 1, 3];
      for (const p of order) {
        const id = pos[p];
        const q = next.indexOf(id);
        parts.push(svg('path', { d: `M${X[p]} ${ya} C${X[p]} ${ya + DY / 2} ${X[q]} ${yb - DY / 2} ${X[q]} ${yb}`, fill: 'none', stroke: COL.paper, 'stroke-width': 7 }));
        parts.push(svg('path', { d: `M${X[p]} ${ya} C${X[p]} ${ya + DY / 2} ${X[q]} ${yb - DY / 2} ${X[q]} ${yb}`, fill: 'none', stroke: colour(id), 'stroke-width': 3.5 }));
      }
      parts.push(label(X[0] - 24, ya + DY / 2 + 4, m === 'cross' ? 'Cross' : 'Twist', { size: 'small', anchor: 'end', soft: true }));
      pos = next;
    });
    const yEnd = y0 + moves.length * DY;
    X.forEach((x, p) => {
      parts.push(svg('line', { x1: x, y1: yEnd, x2: x, y2: yEnd + 12, stroke: colour(pos[p]), 'stroke-width': 3.5 }));
      parts.push(svg('rect', { x: x - 5, y: yEnd + 12, width: 10, height: 22, rx: 4, fill: '#c9a36a', stroke: COL.soft }));
    });
    const done = moves.length > 0 && travelled(pos);
    parts.push(label(340, 50, done ? 'The tan pair has passed' : 'Tan pair: travels', { size: 'small', bold: done, fill: done ? COL.good : COL.ink }));
    parts.push(label(340, 68, done ? 'through the blue pair' : 'Blue pair: hangs down', { size: 'small', bold: done, fill: done ? COL.good : COL.ink }));
    redraw(g, ...parts);
    const last = moves[moves.length - 1];
    f.readout.textContent = moves.length === 0
      ? 'Four bobbins in two pairs. Every bobbin lace stitch is made from just two moves.'
      : done
        ? 'Cross, twist, cross: a cloth stitch. The tan pair has gone through the blue pair, over and under, as a weft goes through the warp. Repeated across a row of pairs, it makes a woven-looking cloth.'
        : last === 'cross'
          ? 'Cross: the left middle bobbin passes over the right middle bobbin.'
          : 'Twist: in each pair, the right bobbin passes over the left.';
    if (done) t.done();
  };

  const add = (m: Move) => () => { if (moves.length < ROWS) { moves = [...moves, m]; paint(); } };
  f.controls.append(el('div.row', {},
    el('button.btn.btn-small', { type: 'button', onclick: add('cross') }, 'Cross'),
    el('button.btn.btn-small', { type: 'button', onclick: add('twist') }, 'Twist'),
    el('button.btn.btn-small', { type: 'button', onclick: () => { moves = []; paint(); } }, 'Start again'),
  ));
  paint();
  return f.node;
});
