// Lesson 7: the silkworm's year as a farmer runs it, as a still. Eggs hatch
// in spring, the caterpillars eat mulberry leaves for about four weeks,
// spin a cocoon in two or three days, and most cocoons are heated to kill
// the pupa before it can break the filament; a few are left to hatch into
// moths that lay the next eggs.

import { svg } from 'didactics/dom';
import { arrow, label, still } from 'didactics/draw';
import { COL } from './kit';

const W = 560;
const H = 250;

export function sericultureStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const step = (x: number, title: string, lines: string[], pic: SVGElement) => svg('g', {},
    pic,
    label(x, 120, title, { bold: true, anchor: 'middle', size: 'note' }),
    ...lines.map((l, i) => label(x, 136 + i * 12, l, { size: 'small', anchor: 'middle', soft: true })));

  const eggs = svg('g', {}, ...[[-8, 0], [0, -6], [8, 0], [-4, 7], [5, 8], [0, 1]].map(([dx, dy]) => svg('circle', { cx: 60 + dx, cy: 70 + dy, r: 3, fill: COL.soft })));
  const leaf = (cx: number) => svg('path', { d: `M${cx - 34} 78 Q${cx} 36 ${cx + 34} 64 Q${cx + 4} 96 ${cx - 34} 78 Z`, fill: COL.good, opacity: 0.35 });
  const worm = svg('g', {}, leaf(175), ...Array.from({ length: 7 }, (_, i) => svg('circle', { cx: 152 + i * 7, cy: 66 + Math.sin(i) * 3, r: 5.5, fill: '#efe9df', stroke: COL.soft, 'stroke-width': 0.8 })));
  const cocoon = svg('ellipse', { cx: 290, cy: 70, rx: 26, ry: 15, fill: '#f6f0dc', stroke: COL.silk, 'stroke-width': 2 });
  const reel = svg('g', {},
    svg('rect', { x: 382, y: 72, width: 46, height: 22, rx: 3, fill: COL.sea, stroke: COL.soft }),
    ...[392, 405, 418].map((x) => svg('ellipse', { cx: x, cy: 76, rx: 6, ry: 4, fill: '#f6f0dc', stroke: COL.silk })),
    svg('path', { d: 'M392 72 Q400 40 418 34 M405 72 Q408 44 418 34 M418 72 Q418 46 418 34', fill: 'none', stroke: COL.silk, 'stroke-width': 1 }),
    svg('circle', { cx: 430, cy: 32, r: 12, fill: 'none', stroke: COL.soft, 'stroke-width': 2 }));
  const moth = svg('g', {},
    svg('ellipse', { cx: 505, cy: 70, rx: 5, ry: 13, fill: '#efe9df', stroke: COL.soft }),
    svg('path', { d: 'M505 62 Q482 48 478 70 Q490 80 505 72 Z M505 62 Q528 48 532 70 Q520 80 505 72 Z', fill: '#f6f0dc', stroke: COL.soft }));

  s.append(
    step(60, 'Eggs', ['laid in summer,', 'hatch next spring'], eggs),
    step(175, 'Caterpillar', ['eats mulberry leaves', 'day and night', 'for about 4 weeks'], worm),
    step(290, 'Cocoon', ['one filament,', 'spun in 2 to 3 days'], cocoon),
    step(405, 'Reeled', ['heated to kill the pupa,', 'then unwound in hot', 'water into thread'], reel),
    step(505, 'Moth', ['a few cocoons are', 'left to hatch and', 'lay the next eggs'], moth),
    arrow(92, 70, 132, 70, COL.soft, 1.5), arrow(214, 70, 258, 70, COL.soft, 1.5), arrow(320, 70, 372, 70, COL.soft, 1.5),
    svg('path', { d: 'M300 166 Q400 196 492 172', fill: 'none', stroke: COL.soft, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
    arrow(484, 175, 496, 170, COL.soft, 1.2),
    label(400, 178, 'a few kept for breeding', { size: 'small', anchor: 'middle', soft: true }),
    svg('path', { d: 'M505 178 Q290 262 72 172', fill: 'none', stroke: COL.soft, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }),
    arrow(80, 177, 70, 170, COL.soft, 1.2),
    label(250, 238, 'their eggs start the next year', { size: 'small', anchor: 'middle', soft: true }),
      );
  return { node };
}
