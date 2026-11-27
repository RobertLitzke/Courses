// Branch F5: how a 19th century corset is built, as a still. Shaped panels
// of strong cotton coutil are sewn edge to edge, with narrow channels holding
// strips of whalebone (baleen) or, later, steel; a steel busk at the front
// opens with studs and loops; metal eyelets at the back take the lacing.
// The front view and the back view are shown side by side.

import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL, tint } from './kit';

const W = 560;
const H = 260;

/** Outline of one half of the corset, from centre to side, top to bottom, in a box 100 wide. */
const half = (cx: number, top: number, dir: 1 | -1): string => {
  const pts: [number, number][] = [[0, 30], [40, 0], [85, 10], [95, 60], [62, 110], [95, 170], [60, 185], [0, 175]];
  return 'M' + pts.map(([x, y]) => `${cx + dir * x} ${top + y}`).join(' L') + ' Z';
};

export function corsetStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const parts: SVGElement[] = [];
  const top = 40;
  const fill = tint(COL.fibre, 0.35);
  const bone = COL.soft;
  // Front.
  const fx = 110;
  parts.push(svg('path', { d: half(fx, top, -1), fill, stroke: COL.ink, 'stroke-width': 1.2 }), svg('path', { d: half(fx, top, 1), fill, stroke: COL.ink, 'stroke-width': 1.2 }));
  for (const d of [-1, 1] as const) for (const x of [18, 36, 52]) parts.push(line(fx + d * x, top + 18 + x * 0.1, fx + d * x, top + 176 - x * 0.2, bone, 2));
  parts.push(svg('rect', { x: fx - 3, y: top + 28, width: 6, height: 148, fill: '#9aa3ad', stroke: COL.ink, 'stroke-width': 0.6 }));
  for (let k = 0; k < 6; k++) parts.push(svg('circle', { cx: fx, cy: top + 45 + k * 24, r: 2.5, fill: COL.ink }));
  parts.push(label(fx, 24, 'Front', { bold: true, anchor: 'middle' }));
  // Back.
  const bx = 450;
  parts.push(svg('path', { d: half(bx - 8, top, -1), fill, stroke: COL.ink, 'stroke-width': 1.2 }), svg('path', { d: half(bx + 8, top, 1), fill, stroke: COL.ink, 'stroke-width': 1.2 }));
  for (const d of [-1, 1] as const) for (const x of [20, 36, 50]) parts.push(line(bx + d * (8 + x), top + 18 + x * 0.1, bx + d * (8 + x), top + 176 - x * 0.2, bone, 2));
  const eyes = Array.from({ length: 12 }, (_, k) => top + 40 + k * 12);
  eyes.forEach((y, k) => {
    parts.push(svg('circle', { cx: bx - 12, cy: y, r: 2.4, fill: COL.paper, stroke: COL.ink }), svg('circle', { cx: bx + 12, cy: y, r: 2.4, fill: COL.paper, stroke: COL.ink }));
    if (k < eyes.length - 1) parts.push(line(bx + (k % 2 ? 12 : -12), y, bx + (k % 2 ? -12 : 12), eyes[k + 1], COL.yarn, 1.4));
  });
  parts.push(label(bx, 24, 'Back', { bold: true, anchor: 'middle' }));
  // Labels in the middle.
  const lx = 280;
  parts.push(
    label(lx, top + 30, 'Steel busk with studs:', { size: 'small', anchor: 'middle' }),
    label(lx, top + 46, 'opens at the front', { size: 'small', anchor: 'middle', soft: true }),
    label(lx, top + 82, 'Bones in channels:', { size: 'small', anchor: 'middle' }),
    label(lx, top + 98, 'baleen, later steel', { size: 'small', anchor: 'middle', soft: true }),
    label(lx, top + 134, 'Metal eyelets and lacing:', { size: 'small', anchor: 'middle' }),
    label(lx, top + 150, 'tightened at the back', { size: 'small', anchor: 'middle', soft: true }),
    label(lx, top + 196, 'Shaped panels of strong cotton', { size: 'small', anchor: 'middle', soft: true }),
  );
  s.append(...parts);
  return { node };
}
