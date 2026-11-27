// Lesson 5: why colour washes out, and how indigo dyes. Two figures.
//
// 'wash': wool or cotton dyed with madder, with no mordant, with alum or with
// iron, washed again and again. Without a mordant most of the dye washes
// out; alum gives a fast red and iron a fast purple-brown. Goal 'fast': the
// reader has washed an unmordanted and a mordanted sample at least five times.
//
// 'vat': indigo does not dissolve in water. In a vat made alkaline and
// stripped of oxygen it turns into a soluble yellow-green form, which soaks
// into the fibre; in the air it turns back into blue indigo, locked inside.
// The reader dips cloth, watches it turn from yellow-green to blue over a few
// seconds, and dips again for a deeper blue. In an unreduced vat the indigo
// stays as blue specks that rinse off. Goal 'deep': four dips in a reduced vat.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, animate, choices, figure, frame, slider } from './kit';

type Mordant = 'none' | 'alum' | 'iron';
const MORDANTS: Mordant[] = ['none', 'alum', 'iron'];
const MORDANT_NAMES: Record<Mordant, string> = { none: 'No mordant', alum: 'Alum', iron: 'Iron' };
/** The colour each gives with madder, at full strength. */
const SHADE: Record<Mordant, string> = { none: '#d9805f', alum: '#b8342e', iron: '#5a3d4a' };

/** How much colour is left after `washes` washes, as a share of the first. */
export function colourLeft(m: Mordant, washes: number): number {
  return m === 'none' ? 0.12 + 0.88 * Math.pow(0.55, washes) : Math.pow(0.985, washes);
}

/** Mix two hex colours: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const W = 400;
const H = 180;
const UNDYED = '#f4ecdc';

export const washFigure = figure(['fast'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let m: Mordant = 'none';
  let washes = 0;
  const tried = new Set<string>();

  const paint = () => {
    const parts: SVGElement[] = [label(14, 20, `Madder on wool, ${MORDANT_NAMES[m].toLowerCase()}`, { bold: true })];
    // A strip of samples after 0 to 10 washes, with the current one picked out.
    for (let k = 0; k <= 10; k++) {
      const x = 14 + k * 34;
      const fill = mix(UNDYED, SHADE[m], colourLeft(m, k));
      parts.push(svg('rect', { x, y: 40, width: 28, height: 70, rx: 3, fill, stroke: k === washes ? COL.ink : 'none', 'stroke-width': 2.5 }),
        label(x + 14, 126, `${k}`, { size: 'small', anchor: 'middle', bold: k === washes }));
    }
    parts.push(label(14, 146, 'washes', { size: 'small', soft: true }),
      label(W - 14, 166, `${Math.round(colourLeft(m, washes) * 100)}% of the colour left after ${washes} ${washes === 1 ? 'wash' : 'washes'}`, { size: 'small', anchor: 'end', bold: true }));
    redraw(g, ...parts);
    f.readout.textContent = m === 'none'
      ? washes === 0 ? 'Straight from the dye bath the wool is a soft orange-red. The dye is only lying in and on the fibre, held weakly.' : 'Each wash carries more of the dye away, because nothing binds it to the fibre. After a few washes only a pale stain is left.'
      : m === 'alum'
        ? 'The wool was first simmered in alum. Its aluminium binds to the fibre and to the dye molecule both, forming a bridge, so the red stays through wash after wash. Alum also shifts madder towards a clear red.'
        : 'An iron mordant binds the dye just as firmly but shifts it to a dark purple-brown. The same dye bath gives a different colour depending on the mordant.';
    if (washes >= 5) tried.add(m === 'none' ? 'none' : 'mordant');
    if (tried.size === 2) t.done();
  };

  const pick = choices(MORDANTS.map((x) => MORDANT_NAMES[x]), (i) => { m = MORDANTS[i]; paint(); });
  pick.pick(0);
  const s = slider('Washes', { min: 0, max: 10, step: 1, value: 0, show: (v) => `${v}`, onInput: (v) => { washes = v; paint(); }, color: 'madder' });
  f.controls.append(pick.node, s.node);
  paint();
  return f.node;
});

/** The cloth's colour after `dips` dips, `ox` (0 to 1) of the way from yellow-green to blue. */
export function vatColour(dips: number, ox: number): string {
  if (dips === 0) return UNDYED;
  const depth = 1 - Math.pow(0.62, dips);
  const reduced = mix(UNDYED, COL.leuco, Math.min(1, depth + 0.35));
  const blue = mix(UNDYED, COL.indigo, depth);
  return mix(reduced, blue, ox);
}

export const vatFigure = figure(['deep'], (ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let reduced = true;
  let dips = 0;
  let ox = 1;
  let wasted = false;

  const paint = () => {
    const vat = reduced ? '#8f9a3a' : '#2b3f6e';
    const cloth = wasted ? mix(UNDYED, COL.indigo, 0.08) : vatColour(dips, ox);
    const parts: SVGElement[] = [
      svg('path', { d: 'M40 90 L60 180 L180 180 L200 90 Z', fill: '#6b5a48' }),
      svg('rect', { x: 46, y: 96, width: 148, height: 18, rx: 4, fill: vat }),
      label(120, 130, reduced ? 'reduced vat: yellow-green' : 'unreduced: blue specks', { size: 'small', anchor: 'middle', fill: COL.paper, bold: true }),
      label(120, 146, reduced ? 'alkaline, no oxygen' : 'indigo will not dissolve', { size: 'small', anchor: 'middle', fill: COL.paper }),
      // The cloth hanging in the air to the right.
      svg('line', { x1: 230, y1: 30, x2: 370, y2: 30, stroke: COL.soft, 'stroke-width': 3 }),
      svg('rect', { x: 250, y: 34, width: 100, height: 130, rx: 3, fill: cloth, stroke: COL.grid }),
      label(300, 184, dips === 0 ? 'undyed cotton' : `${dips} ${dips === 1 ? 'dip' : 'dips'}`, { size: 'small', anchor: 'middle', bold: true }),
    ];
    redraw(g, ...parts);
    f.readout.textContent = wasted
      ? 'In an ordinary vat the indigo stays as tiny blue particles. They sit on the surface of the fibre and rinse straight off: indigo does not dissolve in water.'
      : dips === 0
        ? 'Indigo will not dissolve in water. In a reduced vat, kept alkaline and starved of oxygen, it changes to a soluble yellow-green form that soaks into the fibre.'
        : ox < 0.98
          ? 'Out of the vat the cloth is yellow-green. As oxygen in the air reaches it, the dye turns back into insoluble blue indigo, now trapped in the fibre.'
          : dips < 4
            ? `Blue after ${dips} ${dips === 1 ? 'dip' : 'dips'}. Each dip and airing adds another layer of indigo, so the blue deepens. Dip again.`
            : 'A deep blue after several dips. Indigo needs no mordant, because the colour is locked in as solid indigo rather than bound to the fibre, which is why denim fades by wearing away rather than washing out.';
  };

  animate(f.node, ctx, (dt) => {
    if (ox < 1) {
      ox = Math.min(1, ox + dt / 3);
      paint();
    }
  });

  const vatChoice = choices(['Reduced vat', 'Plain water and indigo'], (i) => { reduced = i === 0; paint(); });
  vatChoice.pick(0);
  const dip = document.createElement('button');
  dip.type = 'button';
  dip.className = 'btn btn-small';
  dip.textContent = 'Dip and lift out';
  dip.addEventListener('click', () => {
    if (!reduced) {
      wasted = true;
      paint();
      return;
    }
    wasted = false;
    dips = Math.min(dips + 1, 8);
    ox = 0;
    paint();
    if (dips >= 4) t.done();
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn-small';
  reset.textContent = 'New cloth';
  reset.addEventListener('click', () => { dips = 0; ox = 1; wasted = false; paint(); });
  // The two buttons share a .row, since .fig-controls stacks its children.
  f.controls.append(vatChoice.node, el('div.row', {}, dip, reset));
  paint();
  return f.node;
});
