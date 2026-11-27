// Branch F2: why denim fades. Indigo dyes a yarn from the outside in and
// barely penetrates, so a denim warp yarn is a blue ring around a white core.
// Wear flattens and abrades the top of each yarn; once the abrasion is deeper
// than the ring, the white core shows. A yarn dyed right through (as with
// some other dyes) only lightens a little. The cloth is a 3/1 warp-faced
// twill, so the blue warp covers three quarters of the face. Round,
// illustrative depths: the ring is a fifth of the yarn's radius, and full
// wear grinds away 40 percent of it.
// Goal 'fade': ring-dyed yarn worn until the core shows over half the face.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

export const RING = 0.2;
export const MAX_DEPTH = 0.4;

/** Share of a warp yarn's visible top that has been worn through to the white core. */
export const whiteShare = (wear: number, ring: boolean) => {
  if (!ring) return 0;
  const d = (wear / 100) * MAX_DEPTH;
  if (d <= RING) return 0;
  // The worn flat is a chord at depth d into a yarn of radius 1; the white part is the chord through the core.
  const core = 1 - RING;
  const into = d - RING;
  const flat = Math.sqrt(2 * d - d * d);
  return Math.sqrt(Math.max(0, 2 * core * into - into * into)) / flat;
};

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};

const W = 520;
const H = 200;
const WHITE = '#f3efe6';

export const fadeFigure = figure(['fade'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let wear = 0;
  let ring = true;

  const paint = () => {
    const ws = whiteShare(wear, ring);
    const lighten = ring ? 0.15 * (wear / 100) : 0.12 * (wear / 100);
    const warpCol = mix(COL.indigo, WHITE, Math.min(1, lighten + 0.75 * ws));
    const parts: SVGElement[] = [];
    // Twill face: each warp floats over three wefts and under one, the step moving by one each row.
    const n = 12;
    const c = 14;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const up = (i - j + 48) % 4 !== 0;
        parts.push(svg('rect', { x: 20 + i * c, y: 30 + j * c, width: c - 1, height: c - 1, fill: up ? warpCol : WHITE, rx: 2 }));
      }
    }
    parts.push(label(20, 22, 'Face of the cloth, magnified', { size: 'small', soft: true }));
    // Cross-section of one warp yarn, worn flat on top.
    const cx = 330;
    const cy = 110;
    const r = 60;
    const d = (wear / 100) * MAX_DEPTH * r;
    const clipId = 'fade-cut';
    parts.push(svg('clipPath', { id: clipId }, svg('rect', { x: cx - r - 2, y: cy - r + d, width: 2 * r + 4, height: 2 * r })));
    const gy = svg('g', { 'clip-path': `url(#${clipId})` });
    gy.append(svg('circle', { cx, cy, r, fill: COL.indigo }));
    if (ring) gy.append(svg('circle', { cx, cy, r: r * (1 - RING), fill: WHITE }));
    parts.push(gy);
    if (d > 0) parts.push(svg('line', { x1: cx - r, y1: cy - r + d, x2: cx + r, y2: cy - r + d, stroke: COL.soft, 'stroke-dasharray': '3 3' }));
    parts.push(
      label(cx, 32, 'One warp yarn, end on', { size: 'small', anchor: 'middle', soft: true }),
      label(cx + r + 12, cy - r + d + 4, d > 0 ? 'Worn flat' : '', { size: 'small', soft: true }),
      label(cx, cy + r + 20, ring ? 'Indigo ring, white core' : 'Dyed right through', { size: 'small', anchor: 'middle' }),
    );
    redraw(g, ...parts);
    f.readout.textContent = !ring
      ? 'Dyed right through, the yarn stays dark however much is worn away. Only the surface roughens a little.'
      : ws === 0
        ? (wear === 0 ? 'New denim: only the blue outside of each warp yarn shows on the face.' : 'The wear is still inside the blue ring, so the cloth only softens and lightens slightly.')
        : `The wear has cut through the ring into the white core, which now shows across ${Math.round(ws * 100)}% of each worn yarn. This is how knees and creases fade first.`;
    if (ring && ws >= 0.5) t.done();
  };

  const s = slider('Wear', { min: 0, max: 100, step: 1, value: wear, show: (v) => `${v}%`, onInput: (v) => { wear = v; paint(); }, color: 'indigo' });
  const c = choices(['Indigo, ring-dyed', 'Dyed right through'], (i) => { ring = i === 0; paint(); });
  c.pick(0);
  f.controls.append(c.node, s.node);
  paint();
  return f.node;
});
