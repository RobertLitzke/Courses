// Lesson 2, A hand with skin between the fingers: a bat's wing beside a
// human hand, bone for bone (a still), and how a wing's shape (aspect ratio
// and wing loading) sets how slowly and tightly a bat can fly, what it costs,
// and so where it can hunt. The family trees and the clue board are live
// charts and charts from the lesson's JSON.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, slider, tint, wrapped, type FigureFactory } from './kit';

const W = 400;

// ---- A bat's wing and a human hand (still) --------------------------------------------------------

type P = [number, number];

/** A finger as a chain of bones from the wrist: thick lines with joints. */
const finger = (pts: P[], width: number): SVGElement[] => {
  const out: SVGElement[] = [];
  for (let i = 1; i < pts.length; i++) out.push(line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], COL.ink, width, { 'stroke-linecap': 'round' }));
  for (const p of pts.slice(1, -1)) out.push(svg('circle', { cx: p[0], cy: p[1], r: width * 0.55, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1 }));
  return out;
};

export const handWingStill = () => {
  const s = still(W, 250);
  const parts: SVGElement[] = [];
  // The human hand, palm up, wrist at the bottom.
  const hw: P = [72, 200];
  const human: P[][] = [
    [hw, [44, 178], [30, 156], [22, 138]],
    [hw, [58, 140], [54, 112], [52, 94], [51, 80]],
    [hw, [70, 136], [70, 104], [70, 84], [70, 70]],
    [hw, [82, 138], [86, 108], [88, 90], [89, 77]],
    [hw, [94, 144], [102, 122], [106, 108], [108, 97]],
  ];
  parts.push(svg('path', { d: 'M48,214 C24,190 10,150 20,132 C30,128 40,150 46,160 L48,90 C48,70 56,70 58,90 L62,80 C62,58 78,58 78,80 L82,86 C82,66 96,66 96,90 L100,100 C102,86 116,90 112,110 L108,160 C106,190 100,210 96,214 Z', fill: tint(COL.heat, 0.08), stroke: COL.grid }));
  human.forEach((f) => parts.push(...finger(f, 3)));
  human.forEach((f, i) => parts.push(small(f[f.length - 1][0], f[f.length - 1][1] - 6, String(i + 1), { anchor: 'middle', bold: true })));
  parts.push(line(72, 200, 72, 240, COL.ink, 4), line(62, 202, 62, 240, COL.ink, 3), small(70, 248, 'a human hand', { anchor: 'middle', bold: true }));

  // The bat's wing, spread, seen from below: upper arm, forearm, wrist, then the fingers.
  const sh: P = [140, 210];
  const el: P = [186, 168];
  const wr: P = [252, 104];
  const bat: P[][] = [
    [wr, [248, 92], [242, 80]],
    [wr, [308, 66], [340, 52]],
    [wr, [312, 60], [356, 34], [384, 20]],
    [wr, [320, 110], [358, 126], [380, 140]],
    [wr, [296, 150], [316, 186], [328, 208]],
  ];
  const tips = bat.map((f) => f[f.length - 1]);
  // The membrane: from the body to the leg and out between the fingers, and the narrow web in front of the arm.
  parts.push(
    svg('path', {
      d: `M${sh[0]},${sh[1]} L${el[0]},${el[1]} L${wr[0]},${wr[1]} L${tips[1][0]},${tips[1][1]} L${tips[2][0]},${tips[2][1]} Q356,96 ${tips[3][0]},${tips[3][1]} Q340,170 ${tips[4][0]},${tips[4][1]} Q250,214 180,240 L140,226 Z`,
      fill: tint(COL.wing, 0.45), stroke: COL.wing, 'stroke-width': 1,
    }),
    svg('path', { d: `M${sh[0]},${sh[1] - 8} Q190,140 ${wr[0]},${wr[1] - 4} L${el[0]},${el[1]} Z`, fill: tint(COL.wing, 0.3) }),
    svg('ellipse', { cx: 130, cy: 222, rx: 14, ry: 24, fill: COL.bat }),
  );
  parts.push(...finger([sh, el, wr], 3.5));
  bat.forEach((f) => parts.push(...finger(f, 2.4)));
  parts.push(svg('path', { d: 'M242,80 q-6,-4 -4,-10', fill: 'none', stroke: COL.ink, 'stroke-width': 2 }));
  bat.forEach((f, i) => {
    const [x, y] = f[f.length - 1];
    parts.push(small(x + (i === 0 ? -6 : i === 2 ? -4 : 6), y + (i === 0 ? -6 : i === 2 ? 12 : 3), String(i + 1), { anchor: i === 0 || i === 2 ? 'end' : undefined, bold: true }));
  });
  parts.push(
    small(186, 196, 'upper arm', { soft: true, anchor: 'middle' }),
    small(204, 126, 'forearm', { soft: true, anchor: 'end' }),
    small(234, 64, 'thumb, free,', { soft: true, anchor: 'end' }),
    small(234, 74, 'with a claw', { soft: true, anchor: 'end' }),
    small(290, 232, 'skin with muscles,', { soft: true }),
    small(290, 243, 'nerves and hairs', { soft: true }),
    label(240, 16, "a bat's wing", { bold: true, anchor: 'middle' }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

// ---- Wing shape ---------------------------------------------------------------------------------

const RHO = 1.2;
const G = 9.81;
/** The most lift a flapping bat's wing gives at slow speed, as a lift coefficient: a model's round number. */
const CL = 3;
/** The drag of the body and the wing's skin, as a coefficient, and the span efficiency. */
const CD0 = 0.04;
const E = 0.9;

/** The slowest a bat with this wing loading (newtons per square metre) can fly, in metres a second. */
export const slowest = (wl: number): number => Math.sqrt((2 * wl) / (RHO * CL));

/** The tightest turn, as the radius of the circle in metres: it depends only on wing loading. */
export const turnRadius = (wl: number): number => (2 * (wl / G)) / (RHO * CL);

/** The most lift for the least drag: a long, narrow wing does better. */
export const liftToDrag = (ar: number): number => 0.5 * Math.sqrt((Math.PI * E * ar) / CD0);

/** The speed that covers most ground for the energy, in metres a second. */
export const cruise = (ar: number, wl: number): number => Math.sqrt((2 * wl) / RHO) * Math.pow(1 / (Math.PI * E * ar * CD0), 0.25);

/** Energy to fly a kilometre, compared with a wing of aspect ratio 10 (1 = the same). */
export const costPerKm = (ar: number): number => liftToDrag(10) / liftToDrag(ar);

export type Niche = 'clutter' | 'edge' | 'open';

/** Where a wing lets a bat hunt: among branches, along edges and over water, or in open sky. */
export function niche(ar: number, wl: number): Niche {
  if (wl <= 8 && ar <= 6.6) return 'clutter';
  if (wl >= 12 && ar >= 7.5) return 'open';
  return 'edge';
}

/** Some of Washington's bats on the map: rough values from published wing measurements. */
export const BATS = [
  { name: "Townsend's big-eared", ar: 5.9, wl: 6.8 },
  { name: 'Long-eared myotis', ar: 6.1, wl: 6.4 },
  { name: 'Little brown', ar: 6.8, wl: 7.6 },
  { name: 'Big brown', ar: 6.9, wl: 10.5 },
  { name: 'Hoary', ar: 8.1, wl: 15.5 },
] as const;

const NICHE = {
  clutter: 'Among branches and leaves, gleaning insects off them',
  edge: 'Along tree lines and over water, catching insects in the air',
  open: 'High in open sky, fast and far',
};

/** A bat of 12 grams: its wing area and span for a wing loading and aspect ratio, in square metres and metres. */
export const wingSize = (ar: number, wl: number) => {
  const area = (0.012 * G) / wl;
  return { area, span: Math.sqrt(ar * area) };
};

export const wingShapeFigure = figure(['clutter', 'open', 'both'], (_ctx, t) => {
  const f = frame(W, 250, 4);
  const g = svg('g');
  f.svg.append(g);
  let ar = 7;
  let wl = 10;
  const seen = new Set<Niche>();
  // The map: aspect ratio across, wing loading up.
  const mx = 228, my = 16, mw = 160, mh = 176;
  const X = (a: number) => mx + ((a - 5) / 5) * mw;
  const Y = (w: number) => my + mh - ((w - 5) / 13) * mh;

  const paint = () => {
    const n = niche(ar, wl);
    seen.add(n);
    const { span, area } = wingSize(ar, wl);
    // The bat from below, at 360 px a metre.
    const cx = 105, cy = 52;
    const half = (span / 2) * 360;
    const chord = (area / span) * 360;
    const wing = (sgn: number) => {
      const x = (k: number) => cx + sgn * k;
      return svg('path', {
        d: `M${x(5)},${cy - 5} L${x(half * 0.45)},${cy - 9} L${x(half)},${cy - 3} Q${x(half * 0.85)},${cy + chord * 0.6} ${x(half * 0.7)},${cy + chord * 0.55} Q${x(half * 0.55)},${cy + chord * 1.1} ${x(half * 0.35)},${cy + chord * 1.05} Q${x(half * 0.2)},${cy + chord * 1.6} ${x(5)},${cy + chord * 1.5} Z`,
        fill: tint(COL.wing, 0.6), stroke: COL.wing,
      });
    };
    // Turning: the circle it can fly round, between trunks a metre apart, at 60 px a metre.
    const r = turnRadius(wl);
    const tx = 105, ty = 178, px = 60;
    const fits = 2 * r <= 1;
    const parts: SVGElement[] = [
      wing(-1), wing(1),
      svg('ellipse', { cx, cy: cy + 4, rx: 5, ry: 11, fill: COL.bat }),
      small(cx, 14, `span ${Math.round(span * 100)} cm for a 12 g bat`, { anchor: 'middle', soft: true }),
      line(tx - px / 2, 118, tx - px / 2, 238, COL.plant, 4),
      line(tx + px / 2, 118, tx + px / 2, 238, COL.plant, 4),
      svg('circle', { cx: tx, cy: ty, r: r * px, fill: 'none', stroke: fits ? COL.bat : COL.bad, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }),
      small(tx, 248, `tightest turn: ${(2 * r).toFixed(1)} m across`, { anchor: 'middle', bold: true, fill: fits ? COL.ink : COL.bad }),
      small(tx, 114, 'trunks 1 m apart', { anchor: 'middle', soft: true }),
    ];
    // The map and its zones.
    parts.push(
      svg('rect', { x: X(5), y: Y(8), width: X(6.6) - X(5), height: Y(5) - Y(8), fill: tint(COL.plant, 0.22) }),
      svg('rect', { x: X(7.5), y: Y(18), width: X(10) - X(7.5), height: Y(12) - Y(18), fill: tint(COL.water, 0.14) }),
      line(mx, my + mh, mx + mw, my + mh, COL.ink, 1.2),
      line(mx, my, mx, my + mh, COL.ink, 1.2),
      small(X(5) + 3, Y(8) - 4, seen.has('clutter') ? 'clutter ✓' : 'clutter', { bold: true, fill: COL.plant }),
      small(X(10) - 3, Y(18) + 11, seen.has('open') ? 'open sky ✓' : 'open sky', { bold: true, fill: COL.water, anchor: 'end' }),
      small(X(8.7), Y(9), 'edges', { soft: true, anchor: 'middle' }),
      small(mx + mw, my + mh + 14, 'aspect ratio: long, narrow →', { anchor: 'end', soft: true }),
      small(mx - 4, my - 4, 'wing loading ↑', { soft: true }),
    );
    for (const b of BATS) {
      parts.push(svg('circle', { cx: X(b.ar), cy: Y(b.wl), r: 3, fill: COL.data }));
    }
    parts.push(
      small(X(BATS[1].ar) + 5, Y(BATS[1].wl) + 9, 'long-eared myotis', { soft: true }),
      small(X(BATS[4].ar) - 5, Y(BATS[4].wl) + 3, 'hoary', { soft: true, anchor: 'end' }),
      small(X(BATS[3].ar) + 5, Y(BATS[3].wl) + 3, 'big brown', { soft: true }),
      svg('circle', { cx: X(ar), cy: Y(wl), r: 6, fill: 'none', stroke: COL.bat, 'stroke-width': 2.5 }),
      svg('circle', { cx: X(ar), cy: Y(wl), r: 2, fill: COL.bat }),
      ...wrapped(mx, my + mh + 30, `Your wing hunts: ${NICHE[n].toLowerCase()}.`, 32, { bold: true }),
    );
    redraw(g, ...parts);
    const c = costPerKm(ar);
    const next = !seen.has('clutter')
      ? 'Lower both sliders to move the ring into the green clutter box. '
      : !seen.has('open')
        ? `${n === 'clutter' ? 'That wing can hunt among branches. ' : ''}Now raise both to reach the blue open-sky box. `
        : n === 'open' ? 'That wing is built for open sky. ' : '';
    f.readout.textContent = `${next}Slowest flight ${slowest(wl).toFixed(1)} m/s, best cruising ${cruise(ar, wl).toFixed(1)} m/s. A kilometre costs ${c <= 1.005 ? 'the least energy of any wing here' : `${Math.round((c - 1) * 100)}% more energy than the longest, narrowest wing`}.`;
    if (t.goal === 'clutter' && n === 'clutter') t.done();
    if (t.goal === 'open' && n === 'open') t.done();
    if (t.goal === 'both' && seen.has('clutter') && seen.has('open')) t.done();
  };
  const a = slider('Aspect ratio', 5, 10, 0.1, ar, (v) => v.toFixed(1), (v) => { ar = v; paint(); }, 'wing');
  const w = slider('Wing loading', 5, 18, 0.5, wl, (v) => `${v.toFixed(1)} N/m²`, (v) => { wl = v; paint(); }, 'bat');
  f.controls.append(a.node, w.node);
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'hand-wing': handWingStill,
  'wing-shape': wingShapeFigure,
};
