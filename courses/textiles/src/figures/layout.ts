// Branch F1: how much of a length of cloth a garment uses. Pattern pieces
// laid on cloth 70 cm wide, in centimetres, for four kinds of garment: a
// draped peplos (one uncut rectangle), an early medieval tunic of rectangles
// and triangular gores cut so that nothing is left over, a fitted 14th
// century gown of shaped panels, and a 1930s dress cut on the bias (at 45
// degrees to the threads, so that it drapes and clings). The pieces are
// simplified, but the share of cloth wasted follows from their shapes.
// Goal 'all': every garment laid out.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, tint } from './kit';

type Pt = [number, number];
const WIDTH = 70;

const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
/** A panel narrow at the waist and flared at the hem, lying along the cloth; flipped panels nest head to toe. */
const panel = (x: number, flip: boolean): Pt[] => {
  const top = 30;
  const waist = 22;
  const hem = 34;
  const L = 130;
  const pts: Pt[] = [[0, 0], [40, 0], [L, 0], [L, hem], [40, waist], [0, top]];
  return pts.map(([u, v]) => [x + (flip ? L - u : u), flip ? WIDTH - v : v]);
};
const rotated = (cx: number, cy: number, w: number, h: number): Pt[] => {
  const c = Math.SQRT1_2;
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => [cx + (u - v) * c, cy + (u + v) * c]);
};

export const GARMENTS: readonly { name: string; when: string; pieces: Pt[][]; say: string }[] = [
  { name: 'Peplos', when: 'Greece, 5th century BC', pieces: [rect(0, 0, 180, WIDTH)], say: 'One rectangle straight from the loom, folded, pinned at the shoulders and belted. Nothing is cut, and the cloth can be reused for anything.' },
  {
    name: 'Tunic with gores',
    when: 'Europe, about 1000',
    pieces: [rect(0, 0, 110, 45), rect(110, 0, 110, 45), ...[0, 55, 110, 165].flatMap((x): Pt[][] => [[[x, 45], [x + 55, 45], [x, WIDTH]], [[x + 55, 45], [x + 55, WIDTH], [x, WIDTH]]])],
    say: 'Rectangles for the body and sleeves, and the leftover strip cut diagonally into triangular gores that widen the skirt. Almost nothing is wasted, but the fit is loose.',
  },
  {
    name: 'Fitted gown',
    when: 'Europe, about 1370',
    pieces: [panel(0, false), panel(0, true), panel(130, false), panel(130, true)],
    say: 'Shaped panels follow the chest, waist and hips. Their curves cannot nest perfectly, so offcuts are left between them. Fit costs cloth.',
  },
  {
    name: 'Bias-cut dress',
    when: 'Paris, 1930s',
    pieces: [rotated(36, 35, 30, 64), rotated(100, 35, 30, 64), rotated(164, 35, 30, 64)],
    say: 'Cut at 45 degrees to the threads, the cloth stretches and drapes over the body. But turned pieces leave large triangles of cloth at every edge.',
  },
];

const area = (p: Pt[]) => Math.abs(p.reduce((s, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x * y2 - x2 * y; }, 0)) / 2;
/** Share of the length of cloth that ends up in the garment. */
export const used = (g: (typeof GARMENTS)[number]) => {
  const len = Math.max(...g.pieces.flat().map(([x]) => x));
  return g.pieces.reduce((s, p) => s + area(p), 0) / (len * WIDTH);
};

const W = 520;
const H = 222;

export const layoutFigure = figure(['all'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let k = 0;
  const seen = new Set<number>();

  const paint = () => {
    const gm = GARMENTS[k];
    const len = Math.max(...gm.pieces.flat().map(([x]) => x));
    const sc = Math.min(480 / len, 2);
    const x0 = 20;
    const y0 = 50;
    const parts: SVGElement[] = [svg('rect', { x: x0, y: y0, width: len * sc, height: WIDTH * sc, fill: tint(COL.bad, 0.25), stroke: COL.soft })];
    for (const p of gm.pieces) parts.push(svg('polygon', { points: p.map(([x, y]) => `${x0 + x * sc},${y0 + y * sc}`).join(' '), fill: tint(COL.cloth, 0.55), stroke: COL.paper, 'stroke-width': 1.5 }));
    const u = used(gm);
    parts.push(
      label(x0, 22, `${gm.name}, ${gm.when}`, { bold: true }),
      label(x0, 40, `Uses ${Math.round(u * 100)}% of the cloth; ${Math.round((1 - u) * 100)}% cut away`, { size: 'small', fill: u > 0.97 ? COL.good : COL.bad }),
      label(x0, y0 + WIDTH * sc + 16, `Cloth 70 cm wide, ${(len / 100).toFixed(1)} m long. Red: offcuts`, { size: 'small', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = gm.say;
    seen.add(k);
    if (seen.size === GARMENTS.length) t.done();
  };

  const c = choices(GARMENTS.map((x) => x.name), (i) => { k = i; paint(); });
  c.pick(0);
  f.controls.append(c.node);
  paint();
  return f.node;
});
