// Lesson 2: the four old fibres as a microscope shows them, side by side,
// each drawn along its length with its cross-section beside it. Cotton is a
// flattened, twisted ribbon with a collapsed hollow; flax a straight rod with
// cross-marks at its nodes and a many-sided section; wool a rod covered in
// overlapping scales, round in section and thicker; silk a smooth rod with a
// rounded triangle for a section. A still: nothing here changes.

import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL, tint } from './kit';

const W = 400;
const H = 312;

/** Draw one fibre panel at row y: its name, a length view between x0 and x1, a cross-section at cx, and a note. */
function panel(y: number, name: string, note: string, body: SVGElement[], section: SVGElement): SVGElement[] {
  return [
    label(12, y - 36, name, { bold: true }),
    label(12, y - 22, note, { size: 'small', soft: true }),
    ...body,
    section,
  ];
}

export function fibresStill(): { node: HTMLElement } {
  const s = still(W, H);
  const x0 = 12;
  const x1 = 310;
  const cx = 360;
  const rows = [62, 138, 214, 292];
  const parts: SVGElement[] = [label(cx, 16, 'section', { size: 'small', anchor: 'middle', soft: true })];

  // Cotton: a flat ribbon that turns over every so often (the convolutions).
  {
    const y = rows[0];
    let d = `M${x0} ${y}`;
    const top: string[] = [];
    const bottom: string[] = [];
    for (let x = x0; x <= x1; x += 4) {
      const w = 7 * Math.abs(Math.cos((x - x0) / 22));
      top.push(`${x} ${y - w - 1}`);
      bottom.unshift(`${x} ${y + w + 1}`);
    }
    d = `M${top.join(' L')} L${bottom.join(' L')} Z`;
    parts.push(...panel(y, 'Cotton', 'a flattened, twisted ribbon; one cell, about 3 cm long',
      [svg('path', { d, fill: tint(COL.fibre, 0.55), stroke: COL.fibre, 'stroke-width': 1 })],
      svg('g', {}, svg('ellipse', { cx, cy: y, rx: 14, ry: 6, fill: tint(COL.fibre, 0.55), stroke: COL.fibre }), svg('ellipse', { cx, cy: y, rx: 7, ry: 1.5, fill: COL.paper }))));
  }
  // Flax: a straight rod with nodes (cross-marks) along it.
  {
    const y = rows[1];
    const nodes = [];
    for (let x = x0 + 20; x < x1; x += 37) nodes.push(line(x, y - 6, x + 5, y + 6, COL.soft, 1.2));
    parts.push(...panel(y, 'Flax (linen)', 'straight bundles from the stem, with nodes; 25 to 120 cm',
      [svg('rect', { x: x0, y: y - 6, width: x1 - x0, height: 12, rx: 2, fill: tint('#a89a6a', 0.45), stroke: '#a89a6a' }), ...nodes],
      svg('polygon', { points: `${cx - 12},${y - 4} ${cx - 4},${y - 11} ${cx + 9},${y - 8} ${cx + 13},${y + 3} ${cx + 3},${y + 11} ${cx - 10},${y + 7}`, fill: tint('#a89a6a', 0.45), stroke: '#a89a6a' })));
  }
  // Wool: a thicker rod covered in overlapping scales, with a gentle crimp.
  {
    const y = rows[2];
    const wave = (x: number) => y + 4 * Math.sin((x - x0) / 30);
    const scales: SVGElement[] = [];
    for (let x = x0 + 4; x < x1; x += 11) {
      const yy = wave(x);
      scales.push(svg('path', { d: `M${x} ${yy - 9} Q${x + 8} ${yy} ${x} ${yy + 9}`, fill: 'none', stroke: COL.soft, 'stroke-width': 1 }));
    }
    const pts: string[] = [];
    for (let x = x0; x <= x1; x += 4) pts.push(`${x} ${wave(x) - 9}`);
    for (let x = x1; x >= x0; x -= 4) pts.push(`${x} ${wave(x) + 9}`);
    parts.push(...panel(y, 'Wool', 'protein hair covered in scales, crimped; 5 to 15 cm',
      [svg('path', { d: `M${pts.join(' L')} Z`, fill: tint('#d9c7a3', 0.7), stroke: '#b8a27a' }), ...scales],
      svg('circle', { cx, cy: y, r: 10, fill: tint('#d9c7a3', 0.7), stroke: '#b8a27a' })));
  }
  // Silk: a smooth, even rod with a rounded triangle for a section, and a highlight.
  {
    const y = rows[3];
    parts.push(...panel(y, 'Silk', 'one smooth filament, several hundred metres long',
      [svg('rect', { x: x0, y: y - 4, width: x1 - x0, height: 8, rx: 4, fill: tint('#e8e0d0', 0.9), stroke: '#c8bca8' }),
        line(x0 + 4, y - 1.5, x1 - 4, y - 1.5, '#ffffff', 2)],
      svg('path', { d: `M${cx} ${y - 8} Q${cx + 2} ${y - 8} ${cx + 9} ${y + 5} Q${cx + 9} ${y + 7} ${cx + 6} ${y + 7} L${cx - 6} ${y + 7} Q${cx - 9} ${y + 7} ${cx - 9} ${y + 5} Q${cx - 2} ${y - 8} ${cx} ${y - 8} Z`, fill: tint('#e8e0d0', 0.9), stroke: '#c8bca8' })));
  }
  s.svg.append(...parts);
  return { node: s.node };
}
