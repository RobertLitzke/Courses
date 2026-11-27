// Lesson 2, the cave: Plato's picture in five steps, from the prisoners who
// see only shadows to the one who comes back down. The reader steps through;
// each step says what the freed prisoner sees and what Plato meant by it.

import { el, svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, tint } from './kit';

const W = 400;
const H = 230;

export interface CaveStep {
  /** Where the freed prisoner is: chained, turned to the fire, in the passage, outside, back in his seat. */
  at: 'chained' | 'turned' | 'passage' | 'outside' | 'back';
  title: string;
  text: string;
}

/** The steps, in order. */
export const CAVE_STEPS: readonly CaveStep[] = [
  { at: 'chained', title: 'The prisoners', text: 'Chained from childhood, they see only shadows on the wall in front of them, cast by things carried past a fire behind them. They take the shadows for the world.' },
  { at: 'turned', title: 'Turned round', text: 'One is freed and turned to the fire. The light hurts, and the carried objects seem less real to him than the shadows he knew.' },
  { at: 'passage', title: 'Dragged up', text: 'He is dragged up the steep way out. Dazzled, he can look at first only at shadows and reflections in water, then at things themselves.' },
  { at: 'outside', title: 'The sun', text: 'At last he can look at the sun, and understand that it gives the seasons and makes everything visible. For Plato the sun is the Form of the Good.' },
  { at: 'back', title: 'Back down', text: 'He goes back to his seat. Blinded by the dark, he does worse at the shadow game than before, and the others say the climb ruined his eyes. If he tried to free them, Plato says, they would kill him.' },
];

/** The freed prisoner's position in the drawing at each step. */
const SPOT: Record<CaveStep['at'], [number, number]> = {
  chained: [92, 168],
  turned: [104, 160],
  passage: [262, 92],
  outside: [350, 46],
  back: [92, 168],
};

function person(x: number, y: number, color: string, facing: -1 | 1, chained: boolean): SVGElement {
  const g = svg('g');
  g.append(
    svg('circle', { cx: x, cy: y - 16, r: 5, fill: color }),
    svg('path', { d: `M${x - 5},${y} Q${x},${y - 14} ${x + 5},${y} Z`, fill: color }),
    svg('line', { x1: x, y1: y - 11, x2: x + 7 * facing, y2: y - 6, stroke: color, 'stroke-width': 2 }),
  );
  if (chained) g.append(svg('line', { x1: x - 8, y1: y + 2, x2: x + 8, y2: y + 2, stroke: COL.rock, 'stroke-width': 2, 'stroke-dasharray': '2 2' }));
  return g;
}

export const caveFigure = figure(['out'], (_ctx, t) => {
  const f = frame(W, H, 4);
  const back = svg('g');
  const fore = svg('g');
  f.svg.append(back, fore);
  // Rock, the cave's back wall on the left, a low wall with figures carried along it, the fire, and the way up and out on the right.
  back.append(
    svg('path', { d: `M0,0 H${W} V${H} H0 Z`, fill: tint(COL.rock, 0.25) }),
    svg('rect', { x: 18, y: 60, width: 300, height: 145, fill: tint(COL.shadow, 0.35) }),
    svg('path', { d: 'M300,205 L330,150 L300,110 L340,60 L400,60 L400,205 Z', fill: tint(COL.rock, 0.5) }),
    svg('path', { d: 'M318,140 L300,110 L330,70', fill: 'none', stroke: COL.ink, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
    svg('rect', { x: 330, y: 0, width: 70, height: 60, fill: tint(COL.light, 0.35) }),
    svg('circle', { cx: 378, cy: 18, r: 9, fill: COL.light }),
    line(18, 60, 18, 205, COL.ink, 2),
    svg('rect', { x: 150, y: 172, width: 60, height: 14, fill: COL.rock }),
    svg('path', { d: 'M248,190 Q252,168 258,182 Q262,160 268,190 Z', fill: COL.light }),
    // Shadows on the back wall.
    svg('ellipse', { cx: 34, cy: 112, rx: 10, ry: 16, fill: COL.shadow, opacity: 0.8 }),
    svg('path', { d: 'M28,140 l8,-14 l8,14 z', fill: COL.shadow, opacity: 0.8 }),
    // The carried objects, held up above the low wall.
    svg('ellipse', { cx: 170, cy: 158, rx: 6, ry: 10, fill: COL.ink }),
    svg('path', { d: 'M186,170 l6,-12 l6,12 z', fill: COL.ink }),
    small(150, 200, 'low wall', { soft: true }),
    small(244, 200, 'fire', { soft: true }),
    small(24, 76, 'wall of shadows', { soft: true }),
    small(334, 74, 'outside', { soft: true }),
  );
  // The other prisoners, chained facing the wall.
  for (const x of [64, 78]) back.append(person(x, 170, COL.shadow, -1, true));
  let k = 0;
  const paint = () => {
    const s = CAVE_STEPS[k];
    const [x, y] = SPOT[s.at];
    const chained = s.at === 'chained' || s.at === 'back';
    redraw(fore,
      person(x, y, COL.other, s.at === 'turned' ? 1 : -1, s.at === 'chained'),
      label(x, y - 26, chained && s.at === 'back' ? 'back' : 'him', { size: 'small', anchor: 'middle', bold: true, fill: COL.other }),
    );
    f.readout.textContent = `${k + 1}. ${s.title}. ${s.text}`;
    prev.disabled = k === 0;
    next.disabled = k === CAVE_STEPS.length - 1;
    if (k === CAVE_STEPS.length - 1) t.done();
  };
  const prev = svgButton('Back', () => { k = Math.max(0, k - 1); paint(); });
  const next = svgButton('Next', () => { k = Math.min(CAVE_STEPS.length - 1, k + 1); paint(); });
  // In a .row so Back and Next sit side by side; .fig-controls stacks its children.
  f.controls.append(el('div.row', {}, prev, next));
  paint();
  return f.node;
});

function svgButton(text: string, onclick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-small';
  b.textContent = text;
  b.addEventListener('click', onclick);
  return b;
}
