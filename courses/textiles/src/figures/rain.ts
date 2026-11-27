// Branch M6: a waterproof jacket has to keep rain out and let sweat out as
// vapour. Each shell lets out some amount of water vapour per hour; when the
// wearer sweats faster than that, the excess condenses inside and they get
// wet from within. Round, illustrative numbers for a whole jacket in the
// field (lab ratings are several times higher): a rubberised coat lets out
// almost nothing, a polyurethane-coated nylon a little, a microporous
// membrane far more, and a windproof shell more still but not the rain.
// Sweat rates are for an adult in cool weather.
// Goal 'limits': the membrane keeping up at one effort and failing at another.

import { svg } from 'didactics/dom';
import { arrow, label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, tint } from './kit';

export const SHELLS: readonly { name: string; out: number; dry: boolean }[] = [
  { name: 'Rubberised cotton', out: 0, dry: true },
  { name: 'Coated nylon', out: 80, dry: true },
  { name: 'Membrane', out: 350, dry: true },
  { name: 'Windproof only', out: 900, dry: false },
];

export const EFFORTS: readonly [string, number][] = [['Standing', 60], ['Walking', 250], ['Climbing a hill', 650]];

const W = 520;
const H = 200;
const BAND = 104;

export const rainFigure = figure(['limits'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let k = 2;
  let e = 1;
  const seen = new Set<'ok' | 'wet'>();

  const paint = () => {
    const sh = SHELLS[k];
    const [, sweat] = EFFORTS[e];
    const out = Math.min(sweat, sh.out);
    const left = sweat - out;
    const parts: SVGElement[] = [
      svg('rect', { x: 100, y: BAND, width: 240, height: 14, fill: tint(COL.cloth, 0.6), stroke: COL.cloth }),
      label(20, BAND - 26, 'Outside', { size: 'small', soft: true }),
      label(20, BAND + 8, 'Shell', { size: 'small', soft: true }),
      label(20, BAND + 46, 'Inside', { size: 'small', soft: true }),
    ];
    // Rain: stopped at the shell, or getting through.
    for (let i = 0; i < 7; i++) {
      const x = 115 + i * 34;
      const y = sh.dry ? BAND - 20 - (i % 3) * 14 : BAND + 30 + (i % 3) * 8;
      parts.push(svg('path', { d: `M${x} ${y - 8} q-5 8 0 10 q5 -2 0 -10`, fill: COL.water }));
    }
    // Vapour: arrows through the shell in proportion to what gets out.
    const nOut = Math.round((out / 900) * 7);
    for (let i = 0; i < nOut; i++) parts.push(arrow(124 + i * 34, BAND + 50, 124 + i * 34, BAND - 30, tint(COL.soft, 0.7), 1.5));
    if (left > 0) parts.push(svg('rect', { x: 100, y: BAND + 14, width: 240, height: Math.min(18, 4 + left / 50), fill: tint(COL.water, 0.45) }));
    // Bars: sweat made against vapour let out, grams per hour.
    const sc = 120 / 900;
    const bx = 380;
    const base = 170;
    parts.push(
      svg('rect', { x: bx, y: base - sweat * sc, width: 40, height: sweat * sc, fill: COL.yarn }),
      svg('rect', { x: bx + 60, y: base - sh.out * sc, width: 40, height: Math.max(1, sh.out * sc), fill: COL.cloth }),
      label(bx + 20, base + 14, 'Sweat', { size: 'small', anchor: 'middle' }),
      label(bx + 80, base + 14, 'Can let out', { size: 'small', anchor: 'middle' }),
      label(bx + 20, base - sweat * sc - 6, `${sweat}`, { size: 'small', anchor: 'middle' }),
      label(bx + 80, base - sh.out * sc - 6, `${sh.out}`, { size: 'small', anchor: 'middle' }),
      label(bx + 50, 22, 'grams per hour', { size: 'small', anchor: 'middle', soft: true }),
    );
    const wet = !sh.dry || left > 0;
    parts.push(label(20, 22, `${sh.name}, ${EFFORTS[e][0].toLowerCase()}: ${wet ? 'wet' : 'dry'}`, { bold: true, fill: wet ? COL.bad : COL.good }));
    redraw(g, ...parts);
    f.readout.textContent = !sh.dry
      ? 'Sweat escapes easily, but the rain soaks straight through. A windproof shell is only for dry days.'
      : left > 0
        ? `The rain stays out, but the body makes ${left} g more sweat an hour than the shell lets out. It condenses inside, and the wearer gets wet from within.`
        : 'The rain stays out and the shell lets out the sweat as fast as the body makes it. The wearer stays dry.';
    if (k === 2) { seen.add(wet ? 'wet' : 'ok'); if (seen.size === 2) t.done(); }
  };

  const cs = choices(SHELLS.map((s) => s.name), (i) => { k = i; paint(); });
  const ce = choices(EFFORTS.map(([n]) => n), (i) => { e = i; paint(); });
  cs.pick(k);
  ce.pick(e);
  f.controls.append(cs.node, ce.node);
  paint();
  return f.node;
});
