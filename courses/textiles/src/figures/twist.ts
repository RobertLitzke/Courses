// Lesson 1: why twist holds a yarn together. A yarn hangs from a hook with a
// weight on it. With no twist its fibres lie side by side and slide apart;
// twist makes them spiral, the load squeezes them together, and friction
// holds. Too much twist turns the fibres across the yarn, so less of their
// strength lies along it, and a slack single yarn snarls back on itself. Two
// singles plied the other way balance each other and do not snarl.
// Goal 'holds': a single yarn that holds the weight and does not snarl.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, guessFirst, slider, tint } from './kit';

/** The weight, as a share of the best yarn's strength. */
export const LOAD = 0.6;
/** Above this twist (turns per cm) a slack single yarn snarls. */
export const SNARL = 9;

/** A yarn's strength, as a share of the best it can be, at `t` turns per cm. Plied: two singles, so nearly twice as strong. */
export function strength(t: number, plied = false): number {
  const grip = 1 - Math.exp(-t / 2.5);
  const tilt = t <= 7 ? 1 : Math.max(0, 1 - (t - 7) * 0.06);
  return grip * tilt * (plied ? 1.8 : 1);
}

/** What happens to the yarn: it holds, it holds but snarls when slack, or it pulls apart. */
export function outcome(t: number, plied = false): 'holds' | 'snarls' | 'parts' {
  if (strength(t, plied) < LOAD) return 'parts';
  return !plied && t > SNARL ? 'snarls' : 'holds';
}

const W = 400;
const H = 240;
const X = 120; // the yarn's centre line
const TOP = 26;
const BOTTOM = 186;

export const twistFigure = figure(['holds'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let twist = 0;
  let dir: 'Z' | 'S' = 'Z';
  let plied = false;

  /** The yarn between y0 and y1: fibre strokes slanting with the twist. */
  const yarn = (y0: number, y1: number, ply: boolean): SVGElement[] => {
    const w = ply ? 30 : 20;
    const out: SVGElement[] = [svg('rect', { x: X - w / 2, y: y0, width: w, height: y1 - y0, rx: 4, fill: tint(COL.fibre, 0.35) })];
    if (twist === 0) {
      for (let k = 0; k < 5; k++) out.push(line(X - w / 2 + 2 + (k * (w - 4)) / 4, y0, X - w / 2 + 2 + (k * (w - 4)) / 4, y1, COL.fibre, 1.4));
      return out;
    }
    // The angle of the fibres to the yarn's length grows with twist.
    const angle = Math.atan(twist / 3);
    const rise = w / Math.tan(angle);
    // A Z yarn's fibres slant like the middle of a Z (/), an S yarn's like the middle of an S (\). Plied, the ply runs the other way.
    const slant = (ply ? (dir === 'Z' ? 'S' : 'Z') : dir) === 'Z' ? 1 : -1;
    const color = ply ? COL.yarn : COL.fibre;
    const step = ply ? 9 : 5;
    const clip = `clip${Math.round(y0)}${ply ? 'p' : 's'}`;
    out.push(svg('clipPath', { id: clip }, svg('rect', { x: X - w / 2, y: y0, width: w, height: y1 - y0, rx: 4 })));
    const strokes = svg('g', { 'clip-path': `url(#${clip})` });
    for (let y = y0 - rise; y < y1 + rise; y += step) {
      strokes.append(line(X - w / 2, y + (slant * rise) / 2, X + w / 2, y - (slant * rise) / 2, color, ply ? 3 : 1.4));
    }
    out.push(strokes);
    return out;
  };

  const paint = () => {
    const what = outcome(twist, plied);
    const s = strength(twist, plied);
    const parts: SVGElement[] = [
      line(X - 30, TOP - 8, X + 30, TOP - 8, COL.ink, 4),
      label(X + 36, TOP - 4, 'hook', { size: 'small', soft: true }),
    ];
    // The weight: hanging under the yarn, or fallen with the lower half when it parts.
    const drop = what === 'parts' ? 26 : 0;
    if (what === 'parts') {
      parts.push(...yarn(TOP, 98, plied), ...yarn(110 + drop, BOTTOM + drop - 18, plied),
        label(X + 26, 106, 'fibres slide apart', { size: 'small', fill: COL.bad, bold: true }));
    } else {
      parts.push(...yarn(TOP, BOTTOM, plied));
    }
    const wy = BOTTOM + drop - (what === 'parts' ? 18 : 0);
    parts.push(svg('rect', { x: X - 22, y: wy, width: 44, height: 30, rx: 4, fill: COL.soft }), label(X, wy + 19, 'weight', { size: 'small', anchor: 'middle', fill: COL.paper }));
    // The gauge: the yarn's strength against the weight.
    const gx = 250;
    const gy = (v: number) => BOTTOM - (BOTTOM - TOP) * Math.min(v, 1.9) / 1.9;
    parts.push(svg('rect', { x: gx, y: TOP, width: 22, height: BOTTOM - TOP, fill: tint(COL.ink, 0.06), rx: 3 }),
      svg('rect', { x: gx, y: gy(s), width: 22, height: BOTTOM - gy(s), fill: what === 'parts' ? COL.bad : COL.good, rx: 3 }),
      line(gx - 6, gy(LOAD), gx + 28, gy(LOAD), COL.ink, 1.5, { 'stroke-dasharray': '4 3' }),
      label(gx + 32, gy(LOAD) + 4, 'the weight', { size: 'small' }),
      label(gx + 11, BOTTOM + 16, 'strength', { size: 'small', anchor: 'middle', soft: true }));
    // A slack length of the same yarn: straight, or snarled back on itself.
    const sx = 345;
    const sy = 150;
    parts.push(label(sx, sy - 34, 'slack', { size: 'small', anchor: 'middle', soft: true }));
    if (what === 'snarls') {
      parts.push(svg('path', { d: `M${sx} ${sy - 26} L${sx} ${sy - 6} C${sx - 18} ${sy + 4} ${sx - 10} ${sy + 22} ${sx} ${sy + 12} C${sx + 10} ${sy + 2} ${sx + 16} ${sy + 18} ${sx} ${sy + 22} L${sx} ${sy + 34}`, fill: 'none', stroke: COL.bad, 'stroke-width': 3 }),
        label(sx, sy + 50, 'snarls', { size: 'small', anchor: 'middle', fill: COL.bad, bold: true }));
    } else {
      parts.push(line(sx, sy - 26, sx, sy + 34, plied ? COL.yarn : COL.fibre, 3));
    }
    redraw(g, ...parts);
    const turns = `${twist} ${twist === 1 ? 'turn' : 'turns'} per centimetre`;
    f.readout.textContent = twist === 0
      ? 'No twist: the fibres lie side by side, nothing presses them together, and they slide past each other as soon as the weight pulls.'
      : what === 'parts' && twist < 5
        ? `${turns}: the fibres spiral a little, but the weight does not squeeze them together hard enough for friction to hold. They slide apart.`
        : what === 'parts'
          ? `${turns}: the fibres now run so far across the yarn that little of their strength lies along it. The yarn is weaker than at a moderate twist and parts.`
          : what === 'snarls'
            ? `${turns}: it holds the weight, but a slack length snarls back on itself, because the twisted fibres pull to untwist. Plying two of these the other way would balance them.`
            : plied
              ? `Two ${dir} singles plied ${dir === 'Z' ? 'S' : 'Z'}: each single tries to untwist and the ply twists them back, so the pair is balanced, about twice as strong, and lies straight when slack.`
              : `${turns}: the load pulls the spiralling fibres inward against each other, and friction stops them sliding. The yarn holds and lies straight when slack.`;
    if (!plied && what === 'holds') t.done();
  };

  const turns = slider('Twist', { min: 0, max: 15, step: 0.5, value: 0, show: (v) => `${v} per cm`, onInput: (v) => { twist = v; paint(); }, color: 'yarn' });
  const way = choices(['Z twist', 'S twist'], (i) => { dir = i === 0 ? 'Z' : 'S'; paint(); });
  const ply = choices(['Single', 'Two plied together'], (i) => { plied = i === 1; paint(); });
  way.pick(0);
  ply.pick(0);
  f.controls.append(turns.node, way.node, ply.node);
  guessFirst(t, f, {
    ask: 'A bundle of loose cotton fibres hangs from a hook with a weight on it. How much twist does it need to hold the weight?',
    options: ['None: fibres cling on their own', 'A moderate amount', 'As much as it will take'],
    answer: 1,
    sliders: [turns],
    hidden: [way.node, ply.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
