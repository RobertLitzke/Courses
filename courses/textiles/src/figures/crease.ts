// Branch M2: how far a creased strip of cloth springs back. A strip is folded
// in half and pressed under a weight, then released; the angle it opens back
// to (out of 180 degrees, flat) is the textile test called crease recovery.
// Round, typical values for dry cloth: cellulose fibres recover poorly,
// because the hydrogen bonds between their chains re-form in the bent shape;
// wool and polyester spring back; a durable-press finish, which ties
// cellulose chains together, brings cotton close to them.
// Goal 'all': every cloth tried.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame } from './kit';

export const CLOTHS: readonly { name: string; angle: number; say: string }[] = [
  { name: 'Linen', angle: 60, say: 'Linen stays folded. Its long cellulose chains lie tightly packed, and when the fold bends them, the hydrogen bonds that hold neighbouring chains together break and re-form in the bent position.' },
  { name: 'Cotton', angle: 90, say: 'Cotton recovers only half way. It is cellulose like linen, with chains a little less tightly packed, so the bent shape is partly held by re-formed hydrogen bonds.' },
  { name: 'Durable-press cotton', angle: 135, say: 'A resin finish ties neighbouring cellulose chains together with chemical cross-links, which pull the fibre back to its first shape.' },
  { name: 'Wool', angle: 160, say: 'Wool springs back. Its protein chains are coiled like springs and tied by strong sulphur bonds that do not let go in a fold, at least while the wool is dry.' },
  { name: 'Polyester', angle: 165, say: 'Polyester springs back. At room temperature its chains are frozen in place, so a fold bends the fibre elastically and it straightens again. Only heat above about 80 °C lets the chains move and set a new shape.' },
];

const W = 480;
const H = 190;

export const creaseFigure = figure(['all'], (_ctx, t) => {
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  const seen = new Set<number>();

  const paint = (i: number) => {
    const c = CLOTHS[i];
    const cx = W / 2;
    const cy = 150;
    const len = 150;
    const a = (c.angle * Math.PI) / 180;
    // The strip: one arm lies flat to the right, the other opens by the recovery angle.
    const ex = cx + len;
    const parts: SVGElement[] = [
      svg('path', { d: `M${cx + 40} ${cy} A40 40 0 0 0 ${cx + 40 * Math.cos(a)} ${cy - 40 * Math.sin(a)}`, fill: 'none', stroke: COL.you, 'stroke-width': 1.5 }),
      svg('line', { x1: cx, y1: cy, x2: ex, y2: cy, stroke: COL.cloth, 'stroke-width': 6, 'stroke-linecap': 'round' }),
      svg('line', { x1: cx, y1: cy, x2: cx + len * Math.cos(a), y2: cy - len * Math.sin(a), stroke: COL.cloth, 'stroke-width': 6, 'stroke-linecap': 'round' }),
      label(cx + 48 * Math.cos(a / 2), cy - 48 * Math.sin(a / 2) - 2, `${c.angle}°`, { bold: true, fill: COL.you }),
      label(20, 24, `${c.name}: opens to ${c.angle}° of 180° after a pressed fold`, { bold: true }),
    ];
    redraw(g, ...parts);
    f.readout.textContent = c.say;
    seen.add(i);
    if (seen.size === CLOTHS.length) t.done();
  };

  const pick = choices(CLOTHS.map((c) => c.name), paint);
  f.controls.append(pick.node);
  pick.pick(0);
  return f.node;
});
