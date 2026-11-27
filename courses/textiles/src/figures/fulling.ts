// Branch K1: felting a mat of loose wool. Each rub jostles the fibres; wet
// and warm, with soap, the scales let each fibre creep root-first and not
// back, so the mat draws in on itself and thickens. Cold water felts slowly;
// dry wool hardly at all, because dry scales do not slide. Round,
// illustrative rates: the mat's area falls towards 45 percent of the start
// in hot soapy water, 80 percent in cold.
// Goal 'felt': the mat felted to 70 percent of its area or less in hot soapy
// water, after dry rubbing has been tried.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, tint } from './kit';

export const BATHS: readonly { name: string; floor: number; rate: number; say: string }[] = [
  { name: 'Dry', floor: 1, rate: 0, say: 'Dry fibres are stiff and their scales grip, so rubbing just pushes the mat around. Nothing locks.' },
  { name: 'Cold water', floor: 0.8, rate: 40, say: 'Wet fibres soften and swell, and the scales begin to ratchet them together, but slowly in the cold.' },
  { name: 'Hot soapy water', floor: 0.45, rate: 25, say: 'Heat softens the fibres, soap lets them slide, and every rub carries them a little further root-first into the tangle.' },
];

/** The mat's area, as a share of the start, after this many rubs in this bath. */
export const area = (bath: number, rubs: number) => {
  const b = BATHS[bath];
  return b.rate === 0 ? 1 : b.floor + (1 - b.floor) * Math.exp(-rubs / b.rate);
};

const W = 520;
const H = 214;
const N = 70;

const rnd = (i: number) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };

export const fullingFigure = figure(['felt'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let bath = 2;
  let rubs = 0;
  let a = 1;
  let triedDry = false;

  const paint = () => {
    const sc = Math.sqrt(a);
    const cx = 150;
    const cy = 105;
    const side = 160;
    const parts: SVGElement[] = [
      svg('rect', { x: cx - side / 2, y: cy - side / 2, width: side, height: side, fill: 'none', stroke: COL.soft, 'stroke-dasharray': '4 3' }),
      svg('rect', { x: cx - (side * sc) / 2, y: cy - (side * sc) / 2, width: side * sc, height: side * sc, fill: tint(COL.fibre, 0.15 + 0.6 * (1 - a)) }),
    ];
    for (let i = 0; i < N; i++) {
      const x = cx + (rnd(i) - 0.5) * side * 0.9 * sc;
      const y = cy + (rnd(i + 300) - 0.5) * side * 0.9 * sc;
      const ang = rnd(i + 600) * Math.PI;
      const len = 26 * (0.7 + 0.3 * sc);
      // Fibres curl more tightly as they lock together.
      const bend = 6 + 10 * (1 - a);
      const dx = (Math.cos(ang) * len) / 2;
      const dy = (Math.sin(ang) * len) / 2;
      parts.push(svg('path', { d: `M${x - dx} ${y - dy} Q${x + dy * bend / 10} ${y - dx * bend / 10} ${x + dx} ${y + dy}`, fill: 'none', stroke: COL.fibre, 'stroke-width': 1.6 }));
    }
    parts.push(
      label(cx, cy + side / 2 + 16, 'Dashed: the mat before rubbing', { size: 'small', anchor: 'middle', soft: true }),
      label(270, 60, `${rubs} rubs`, { bold: true }),
      label(270, 86, `Area ${Math.round(a * 100)}% of the start`, { fill: a <= 0.7 ? COL.good : COL.ink }),
      label(270, 108, `Thickness about ${(1 / a).toFixed(1)} times`, { size: 'small', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = rubs === 0 ? 'A loose mat of carded wool. Choose a bath and rub it.' : BATHS[bath].say;
    if (bath === 0 && rubs >= 10) triedDry = true;
    if (triedDry && bath === 2 && a <= 0.7) t.done();
  };

  const c = choices(BATHS.map((b) => b.name), (i) => { bath = i; rubs = 0; a = 1; paint(); });
  c.pick(bath);
  const rub = el('button.btn.btn-small', { type: 'button', onclick: () => { rubs += 10; a = area(bath, rubs); paint(); } }, 'Rub ten times');
  const fresh = el('button.btn.btn-small', { type: 'button', onclick: () => { rubs = 0; a = 1; paint(); } }, 'New mat');
  f.controls.append(c.node, el('div.row', {}, rub, fresh));
  paint();
  return f.node;
});
