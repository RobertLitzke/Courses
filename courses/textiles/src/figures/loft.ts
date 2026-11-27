// Branch M3: what keeps you warm is a layer of still air. Heat flows from
// skin at about 34 °C through a layer of insulation and the thin film of
// still air outside it to the cold air beyond. A fibrous insulation conducts
// heat about as well as still air does once radiation is counted, an
// effective conductivity of about 0.04 W per metre per kelvin (the rule of
// thumb that a centimetre of loft gives about 1.6 clo). The outer air film
// adds about 0.12 m²K/W. Sitting still, a person makes about 58 W per square
// metre of skin (1 met). Skin temperature is held at 34 °C, a simplification.
// Goal 'warm': a guess first, then a layer that keeps a seated person warm at
// -10 °C or colder.

import { svg } from 'didactics/dom';
import { arrow, label, redraw } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider, tint } from './kit';

export const SKIN = 34;
export const K = 0.04;
export const FILM = 0.12;
export const MET = 58;

/** Heat lost in W/m² through a layer `mm` thick into air at `out` °C. */
export const heatLoss = (mm: number, out: number) => (SKIN - out) / (FILM + mm / 1000 / K);

const W = 520;
const H = 200;
const X0 = 40;
const PX = 5;
/** A fixed scatter in [0, 1), so the fibres stay put as the layer grows. */
const rnd = (i: number) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
const deg = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v)} °C`;

export const loftFigure = figure(['warm'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let mm = 5;
  let out = 0;
  let opened = false;

  const paint = () => {
    const q = heatLoss(mm, out);
    const ok = q <= MET;
    const top = 50;
    const bot = 170;
    const x1 = X0 + 20 + mm * PX;
    const parts: SVGElement[] = [
      svg('rect', { x: X0, y: top, width: 20, height: bot - top, fill: tint(COL.madder, 0.5) }),
      label(X0, top - 6, 'Skin 34 °C', { size: 'small', soft: true }),
      svg('rect', { x: X0 + 20, y: top, width: mm * PX, height: bot - top, fill: tint(COL.fibre, 0.25) }),
    ];
    // Fibres in the layer: loose squiggles that hold the air still.
    const room = mm * PX - 16;
    for (let i = 0; room > 0 && i < mm * 1.5; i++) {
      const fx = X0 + 22 + rnd(i) * room;
      const fy = top + 8 + rnd(i + 500) * (bot - top - 16);
      parts.push(svg('path', { d: `M${fx} ${fy} q3 -4 6 0 t6 0`, fill: 'none', stroke: COL.fibre, 'stroke-width': 1.5 }));
    }
    if (mm > 0) parts.push(label(X0 + 20, bot + 16, `Layer ${mm} mm`, { size: 'small', soft: true }));
    const w = Math.max(1.5, Math.min(18, q / 12));
    parts.push(
      arrow(x1 + 6, (top + bot) / 2, Math.min(W - 20, x1 + 60 + q / 3), (top + bot) / 2, COL.madder, w),
      label(W - 20, top - 6, `Outside ${deg(out)}`, { size: 'small', anchor: 'end', soft: true }),
      label(X0, 22, `Heat lost ${Math.round(q)} W/m², heat made sitting still ${MET} W/m²`, { bold: true, fill: ok ? COL.good : COL.bad }),
    );
    redraw(g, ...parts);
    f.readout.textContent = ok
      ? `The layer holds the heat loss to what a seated body makes, so this person stays warm. Each extra millimetre of still air adds resistance to the flow of heat.`
      : `The body loses heat ${(q / MET).toFixed(1)} times as fast as it makes it sitting still. The person cools, and has to move, shiver or add a thicker layer.`;
    if (opened && ok && out <= -10) t.done();
  };

  const sT = slider('Thickness of the layer', { min: 0, max: 60, step: 1, value: mm, show: (v) => `${v} mm`, onInput: (v) => { mm = v; paint(); }, color: 'fibre' });
  const sO = slider('Outside air', { min: -30, max: 20, step: 1, value: out, show: deg, onInput: (v) => { out = v; paint(); }, color: 'cloth' });
  f.controls.append(sT.node, sO.node);
  paint();
  guessFirst(t, f, {
    ask: 'At 0 °C, sitting still, about how thick a layer of trapped still air keeps a person warm?',
    options: ['About 2 mm', 'About 2 cm', 'About 20 cm'],
    answer: 1,
    sliders: [sT, sO],
    after: () => { opened = true; paint(); },
  });
  return f.node;
});
