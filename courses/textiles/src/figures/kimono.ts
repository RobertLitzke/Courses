// Branch W2: how a kimono uses a whole bolt with no waste, as a still. A bolt
// (tan) about 38 cm wide and 13 m long is cut straight across into eight
// pieces: two body panels running over the shoulders from front hem to back
// hem, two sleeves (each folded at the top), two half-width front overlaps
// cut from one length split down the middle, a collar and a collar cover.
// Lengths are typical for an adult and rounded.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL, tint } from './kit';

export const PIECES: readonly { name: string; cm: number; half?: boolean; shade: number }[] = [
  { name: 'Body', cm: 320, shade: 0.9 },
  { name: 'Body', cm: 320, shade: 0.9 },
  { name: 'Sleeve', cm: 100, shade: 0.65 },
  { name: 'Sleeve', cm: 100, shade: 0.65 },
  { name: 'Front overlaps', cm: 300, half: true, shade: 0.45 },
  { name: 'Collar', cm: 180, half: true, shade: 0.3 },
];

const W = 560;
const H = 300;

export function kimonoStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const parts: SVGElement[] = [];
  const total = PIECES.reduce((a, p) => a + p.cm, 0);
  const x0 = 15;
  const sc = (W - 30) / total;
  const bh = 22;
  const y0 = 40;
  let x = x0;
  parts.push(label(x0, 24, `One bolt, about 38 cm wide and ${(total / 100).toFixed(1)} m long, cut straight across`, { bold: true }));
  PIECES.forEach((p) => {
    const w = p.cm * sc;
    const fill = tint(COL.indigo, p.shade);
    if (p.half) {
      parts.push(svg('rect', { x, y: y0, width: w, height: bh / 2, fill, stroke: COL.paper }), svg('rect', { x, y: y0 + bh / 2, width: w, height: bh / 2, fill, stroke: COL.paper }));
    } else parts.push(svg('rect', { x, y: y0, width: w, height: bh, fill, stroke: COL.paper, 'stroke-width': 1.5 }));
    parts.push(label(x + w / 2, y0 + bh + 14, p.name, { size: 'small', anchor: 'middle', soft: true }));
    x += w;
  });

  // The assembled kimono, front view, with each piece in its bolt shade.
  const cx = 280;
  const top = 100;
  const bw = 52;
  const bodyH = 170;
  const fill = (n: string) => tint(COL.indigo, PIECES.find((p) => p.name === n)!.shade);
  parts.push(
    svg('rect', { x: cx - bw, y: top, width: bw, height: bodyH, fill: fill('Body'), stroke: COL.paper, 'stroke-width': 1.5 }),
    svg('rect', { x: cx, y: top, width: bw, height: bodyH, fill: fill('Body'), stroke: COL.paper, 'stroke-width': 1.5 }),
    svg('rect', { x: cx - bw - 70, y: top, width: 70, height: 80, fill: fill('Sleeve'), stroke: COL.paper, 'stroke-width': 1.5 }),
    svg('rect', { x: cx + bw, y: top, width: 70, height: 80, fill: fill('Sleeve'), stroke: COL.paper, 'stroke-width': 1.5 }),
    svg('rect', { x: cx - bw, y: top + 40, width: 26, height: bodyH - 40, fill: COL.paper }),
    svg('rect', { x: cx - bw, y: top + 40, width: 26, height: bodyH - 40, fill: fill('Front overlaps'), stroke: COL.paper, 'stroke-width': 1.5 }),
    svg('path', { d: `M${cx + 12} ${top} L${cx - bw + 26} ${top + 44} L${cx - bw + 26} ${top + bodyH}`, fill: 'none', stroke: COL.paper, 'stroke-width': 10, 'stroke-linejoin': 'round' }),
    svg('path', { d: `M${cx + 12} ${top} L${cx - bw + 26} ${top + 44} L${cx - bw + 26} ${top + bodyH}`, fill: 'none', stroke: fill('Collar'), 'stroke-width': 8, 'stroke-linejoin': 'round' }),
  );
  parts.push(
    label(cx - bw - 80, top + 40, 'Sleeve', { size: 'small', anchor: 'end', soft: true }),
    label(cx - bw - 10, top + 140, 'Front overlap', { size: 'small', anchor: 'end', soft: true }),
    label(cx - bw - 10, top + 156, 'and collar', { size: 'small', anchor: 'end', soft: true }),
    label(cx + bw + 80, top + 40, 'Every seam runs', { size: 'small', soft: true }),
    label(cx + bw + 80, top + 56, 'along a selvedge or', { size: 'small', soft: true }),
    label(cx + bw + 80, top + 72, 'a straight cut', { size: 'small', soft: true }),
    label(cx + bw + 80, top + 110, 'Nothing is thrown away;', { size: 'small', soft: true }),
    label(cx + bw + 80, top + 126, 'spare width is folded', { size: 'small', soft: true }),
    label(cx + bw + 80, top + 142, 'into the seams', { size: 'small', soft: true }),
  );
  s.append(...parts);
  return { node };
}
