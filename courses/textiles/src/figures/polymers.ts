// Lesson 23: three ways to get a long-chain fibre, as a still. Cotton grows its
// cellulose chains in the plant. Rayon takes cellulose from wood pulp,
// dissolves it and pushes it through a spinneret, so the chains are natural
// but the fibre is made. Nylon and polyester build their chains from small
// molecules made from oil, then melt the polymer and push it through a
// spinneret. Repeat units are drawn as beads: one kind of bead for cellulose,
// two alternating kinds for nylon, which is built from two building blocks.

import { svg } from 'didactics/dom';
import { arrow, label, still } from 'didactics/draw';
import { COL } from './kit';

const W = 560;
const H = 290;

const hexagon = (cx: number, cy: number, r: number, fill: string) =>
  svg('polygon', { points: Array.from({ length: 6 }, (_, k) => `${(cx + r * Math.cos((Math.PI / 3) * k + Math.PI / 6)).toFixed(1)},${(cy + r * Math.sin((Math.PI / 3) * k + Math.PI / 6)).toFixed(1)}`).join(' '), fill, stroke: COL.soft, 'stroke-width': 0.8 });

const chain = (x: number, y: number, kinds: string[], n = 9) => {
  const parts: SVGElement[] = [svg('line', { x1: x, y1: y, x2: x + (n - 1) * 20, y2: y, stroke: COL.soft, 'stroke-width': 1.5 })];
  for (let i = 0; i < n; i++) parts.push(hexagon(x + i * 20, y, 8, kinds[i % kinds.length]));
  parts.push(label(x + (n - 1) * 20 + 14, y + 4, '…', { soft: true }));
  return parts;
};

const spinneret = (x: number, y: number) => [
  svg('rect', { x, y: y - 16, width: 26, height: 32, rx: 3, fill: COL.paper, stroke: COL.soft }),
  ...[-10, -3, 4, 11].map((d) => svg('line', { x1: x + 26, y1: y + d, x2: x + 70, y2: y + d * 0.4, stroke: COL.yarn, 'stroke-width': 1.4 })),
];

export function polymersStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const rows: [string, string, string, number][] = [
    ['Cotton', 'The plant grows cellulose chains', 'as fibres in the boll.', 50],
    ['Rayon', 'Cellulose from wood pulp, dissolved,', 'then pushed through a spinneret.', 140],
    ['Nylon, polyester', 'Chains built from small molecules', 'made from oil, melted and spun.', 230],
  ];
  for (const [name, a, b, y] of rows) {
    s.append(label(16, y - 8, name, { bold: true }), label(16, y + 8, a, { size: 'small', soft: true }), label(16, y + 21, b, { size: 'small', soft: true }));
  }
  // Cotton: cellulose chains, already a fibre.
  s.append(...chain(240, 44, [COL.fibre]), ...chain(250, 62, [COL.fibre], 8));
  // Rayon: the same cellulose chains, dissolved, then spun.
  s.append(...chain(240, 140, [COL.fibre], 6), arrow(372, 140, 402, 140, COL.soft, 1.5), ...spinneret(408, 140));
  // Nylon: two alternating building blocks.
  s.append(...chain(240, 230, [COL.unitA, COL.unitB], 6), arrow(372, 230, 402, 230, COL.soft, 1.5), ...spinneret(408, 230));
  s.append(label(240, 98, 'Each bead is one repeat unit; real chains have thousands.', { size: 'small', soft: true }));
  s.append(label(240, 188, 'Same chains as cotton, new shape.', { size: 'small', soft: true }));
  s.append(label(240, 270, 'Nylon: two building blocks, alternating.', { size: 'small', soft: true }));
  return { node };
}
