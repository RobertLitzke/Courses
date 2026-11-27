// Lesson 4: why a knit stretches and a weave does not. The reader pulls a
// sample sideways. In a plain weave the threads already run straight across,
// so only the slight waviness (crimp) where they pass over and under can be
// pulled out: a few per cent. In a knit the yarn runs in loops, and pulling
// bends the loops wider and shorter, so the cloth stretches by half or more,
// and springs back when the loops are let go. Goal 'both': each pulled hard.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

/** How far each stretches, as a share of its width, at a full pull. */
export const STRETCH = { woven: 0.03, knitted: 0.6 } as const;

const W = 400;
const H = 210;
const CY = 100;

export const knitFigure = figure(['both'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let kind: 'woven' | 'knitted' = 'woven';
  let pull = 0;
  const pulled = new Set<string>();

  const paint = () => {
    const strain = STRETCH[kind] * pull;
    const w0 = 180;
    const w = w0 * (1 + strain);
    const h = kind === 'knitted' ? 110 * (1 - strain * 0.35) : 110;
    const x0 = W / 2 - w / 2;
    const y0 = CY - h / 2;
    const parts: SVGElement[] = [];
    if (kind === 'woven') {
      for (let k = 0; k <= 12; k++) parts.push(line(x0 + (k * w) / 12, y0, x0 + (k * w) / 12, y0 + h, COL.warp, 4));
      for (let k = 0; k <= 8; k++) {
        const y = y0 + (k * h) / 8;
        // The weft's crimp: a small wave that flattens as it is pulled.
        const amp = 2.5 * (1 - pull);
        let d = `M${x0} ${y}`;
        for (let c = 0; c < 12; c++) {
          const xa = x0 + (c * w) / 12;
          const xb = x0 + ((c + 1) * w) / 12;
          d += ` Q${(xa + xb) / 2} ${y + ((c + k) % 2 ? amp : -amp) * 2} ${xb} ${y}`;
        }
        parts.push(svg('path', { d, fill: 'none', stroke: COL.weft, 'stroke-width': 4 }));
      }
    } else {
      const cols = 9;
      const rows = 5;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        let d = '';
        for (let c = 0; c < cols; c++) {
          // One loop: up from the row below, round the top, and down into the next stitch.
          const x = x0 + c * cw;
          const yb = y0 + (r + 1) * rh;
          const yt = y0 + r * rh - rh * 0.35;
          d += `${c === 0 ? `M${x} ${yb}` : ''} C${x + cw * 0.05} ${yt} ${x + cw * 0.95} ${yt} ${x + cw} ${yb} `;
        }
        parts.push(svg('path', { d, fill: 'none', stroke: COL.cloth, 'stroke-width': 3.5 }));
      }
    }
    // The hands pulling.
    const arrowAt = (x: number, dir: number) => svg('path', { d: `M${x} ${CY} l${-dir * 16} -8 l0 16 Z`, fill: COL.you });
    parts.push(line(x0 - 30, CY, x0 - 4, CY, COL.you, 2.5), line(x0 + w + 4, CY, x0 + w + 30, CY, COL.you, 2.5), arrowAt(x0 - 32, -1), arrowAt(x0 + w + 32, 1));
    parts.push(label(W / 2, H - 12, `${kind === 'woven' ? 'Plain weave' : 'Plain knit (jersey)'}: ${Math.round(strain * 100)}% longer`, { size: 'small', anchor: 'middle', bold: true }));
    redraw(g, ...parts);
    f.readout.textContent = pull === 0
      ? (kind === 'woven' ? 'A plain weave: warp threads up and down, weft threads across, each weft bending slightly over and under the warp.' : 'A knit: one yarn running across in a row of loops, each loop pulled through a loop of the row below.')
      : kind === 'woven'
        ? 'The weft is already nearly straight; pulling only flattens the small bends where it crosses the warp. A woven cloth gives a few per cent and then the yarn itself has to stretch, so it holds its shape.'
        : 'The loops bend wider and shorter and the whole row lengthens. Nothing in the yarn stretches; the shape of the loops does, so the cloth springs back when it is let go, as long as the yarn recovers.';
    if (pull >= 0.8) pulled.add(kind);
    if (pulled.size === 2) t.done();
  };

  const kinds = choices(['Woven', 'Knitted'], (i) => { kind = i === 0 ? 'woven' : 'knitted'; paint(); });
  kinds.pick(0);
  const s = slider('Pull', { min: 0, max: 100, step: 5, value: 0, show: (v) => (v === 0 ? 'none' : `${v}%`), onInput: (v) => { pull = v / 100; paint(); }, color: 'you' });
  f.controls.append(kinds.node, s.node);
  paint();
  return f.node;
});
