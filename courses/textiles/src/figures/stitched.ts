// Branch K3: tapestry weaving against embroidery, as a still. In tapestry
// weaving, each coloured weft goes back and forth only across its own patch
// of the design, turning back where the colour changes, and is packed down so
// that it hides the warp: the picture is the cloth. In embroidery, a needle
// adds stitches on top of a cloth that already exists. The Bayeux hanging
// uses two stitches: stem stitch for outlines and letters, and laid and
// couched work, in which long threads are laid side by side and then tied
// down by threads crossing them, for filling.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL, tint } from './kit';

const W = 560;
const H = 220;

export function stitchedStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const parts: SVGElement[] = [];
  const top = 40;
  const size = 150;

  // 1. Tapestry weave: warp ends peek out at top and bottom; wefts turn back at a slanted colour boundary.
  const x1 = 15;
  for (let i = 0; i <= 10; i++) {
    const x = x1 + 5 + i * 14;
    parts.push(svg('line', { x1: x, y1: top - 6, x2: x, y2: top + size + 6, stroke: COL.warp, 'stroke-width': 1.2 }));
  }
  for (let r = 0; r < 15; r++) {
    const y = top + 5 + r * 10;
    const split = x1 + 40 + r * 5;
    parts.push(svg('path', { d: `M${x1 + 2} ${y - 3} H${split} a3 3 0 0 1 0 6 H${x1 + 2}`, fill: 'none', stroke: COL.madder, 'stroke-width': 4 }));
    parts.push(svg('path', { d: `M${x1 + size} ${y - 3} H${split + 6} a3 3 0 0 0 0 6 H${x1 + size}`, fill: 'none', stroke: COL.indigo, 'stroke-width': 4 }));
  }
  parts.push(label(x1, 22, 'Tapestry weaving', { bold: true }), label(x1, top + size + 26, 'Each weft turns back at its colour', { size: 'small', soft: true }));

  // 2. Embroidery, stem stitch: slanted overlapping stitches along a curve, on top of a plain linen weave.
  const x2 = 205;
  parts.push(svg('rect', { x: x2, y: top, width: size, height: size, fill: tint(COL.fibre, 0.18) }));
  for (let i = 0; i <= 15; i++) {
    parts.push(svg('line', { x1: x2 + i * 10, y1: top, x2: x2 + i * 10, y2: top + size, stroke: tint(COL.fibre, 0.5), 'stroke-width': 0.8 }));
    parts.push(svg('line', { x1: x2, y1: top + i * 10, x2: x2 + size, y2: top + i * 10, stroke: tint(COL.fibre, 0.5), 'stroke-width': 0.8 }));
  }
  // Points along an arch; each stitch runs forward 1.6 steps and the next starts one step on, so they overlap.
  const at = (u: number): [number, number] => [x2 + 20 + u * 110, top + 115 - Math.sin(u * Math.PI) * 75];
  for (let i = 0; i < 16; i++) {
    const [ax, ay] = at(i / 17);
    const [bx, by] = at((i + 1.6) / 17);
    parts.push(svg('line', { x1: ax, y1: ay + 2.5, x2: bx, y2: by - 2.5, stroke: COL.madder, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
  }
  parts.push(label(x2, 22, 'Embroidery: stem stitch', { bold: true }), label(x2, top + size + 26, 'Stitches on top of a finished cloth', { size: 'small', soft: true }));

  // 3. Laid and couched work: long laid threads, crossed by couching threads tied down at intervals.
  const x3 = 395;
  parts.push(svg('rect', { x: x3, y: top, width: size, height: size, fill: tint(COL.fibre, 0.18) }));
  for (let r = 0; r < 26; r++) {
    const y = top + 15 + r * 4.8;
    parts.push(svg('line', { x1: x3 + 15, y1: y, x2: x3 + size - 15, y2: y, stroke: COL.indigo, 'stroke-width': 3.4 }));
  }
  for (let c = 0; c < 5; c++) {
    const x = x3 + 30 + c * 23;
    parts.push(svg('line', { x1: x, y1: top + 12, x2: x, y2: top + size - 12, stroke: COL.gold, 'stroke-width': 2 }));
    for (let k = 0; k < 6; k++) parts.push(svg('line', { x1: x - 3, y1: top + 22 + k * 22, x2: x + 3, y2: top + 22 + k * 22, stroke: COL.madder, 'stroke-width': 1.6 }));
  }
  parts.push(label(x3, 22, 'Laid and couched work', { bold: true }), label(x3, top + size + 26, 'Laid threads, tied down', { size: 'small', soft: true }));

  s.append(...parts);
  return { node };
}
