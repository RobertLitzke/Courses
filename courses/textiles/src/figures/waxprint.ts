// Branch F3: how a wax print is made, as a still in four panels. A resist
// (wax by hand in Java, resin by roller in the Dutch factories) covers the
// parts of the cloth that should stay pale. The cloth is dyed in indigo; the
// resist cracks as the cloth is handled, and dye seeps into the cracks as fine
// veins, the "crackle"; the resist is washed out; then further colours are
// added in blocks, slightly out of register with the first.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL, tint } from './kit';

const W = 560;
const H = 210;
const S = 120;
const WAX = '#f2dd8c';
const CLOTH = '#f6f1e4';

const rnd = (i: number) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };

const motif = (cx: number, cy: number, fill: string, stroke = 'none'): SVGElement[] => {
  const out: SVGElement[] = [svg('circle', { cx, cy, r: 13, fill, stroke })];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    out.push(svg('ellipse', { cx: cx + Math.cos(a) * 30, cy: cy + Math.sin(a) * 30, rx: 11, ry: 6, transform: `rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * 30} ${cy + Math.sin(a) * 30})`, fill, stroke }));
  }
  return out;
};

export function waxprintStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const parts: SVGElement[] = [];
  const top = 40;
  const xs = [10, 150, 290, 430];
  const titles = ['1. Resist applied', '2. Dyed in indigo', '3. Resist washed out', '4. Colour blocks added'];
  const notes = ['Wax by hand, or resin by roller', 'Cracks in the resist let dye in', 'Fine blue veins: the crackle', 'Slightly out of register'];
  xs.forEach((x, i) => {
    const cx = x + S / 2;
    const cy = top + S / 2;
    parts.push(svg('rect', { x, y: top, width: S, height: S, fill: i === 0 ? CLOTH : COL.indigo }));
    if (i === 0) parts.push(...motif(cx, cy, WAX, tint(COL.gold, 0.8)));
    if (i === 1) parts.push(...motif(cx, cy, tint(WAX, 0.75)));
    if (i >= 2) parts.push(...motif(cx, cy, CLOTH));
    if (i === 3) parts.push(svg('circle', { cx: cx + 4, cy: cy + 3, r: 12, fill: COL.gold, opacity: 0.85 }), svg('rect', { x: x + 6, y: top + 92, width: 40, height: 20, fill: COL.madder, opacity: 0.8 }));
    if (i >= 1) {
      // Crackle: thin dark veins across the resisted areas.
      for (let k = 0; k < 60; k++) {
        const a = rnd(k) * Math.PI * 2;
        const r = rnd(k + 200) * 40;
        const x1 = cx + Math.cos(a) * r;
        const y1 = cy + Math.sin(a) * r;
        const x2 = x1 + (rnd(k + 80) - 0.5) * 12;
        const y2 = y1 + (rnd(k + 120) - 0.5) * 12;
        parts.push(svg('line', { x1, y1, x2, y2, stroke: COL.indigo, 'stroke-width': 0.9, opacity: 0.85 }));
      }
    }
    parts.push(label(x, 24, titles[i], { size: 'small', bold: true }), label(x, top + S + 18, notes[i], { size: 'small', soft: true }));
  });
  s.append(...parts);
  return { node };
}
