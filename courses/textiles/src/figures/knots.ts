// Branch W4: knot density as resolution. Every knot in a pile carpet is one
// square of colour, so the number of knots per square centimetre decides how
// smooth a curve can be, much as pixels do on a screen. The figure draws a
// rosette 6 cm across at the chosen density, and counts knots and working
// days for a carpet 2 by 3 metres, at about 10,000 knots a day for one
// skilled weaver (a commonly quoted rate; real rates vary).
// Goal 'fine': a coarse density (16 or fewer) and a fine one (49 or more) both tried.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';

export const PER_DAY = 10000;
export const AREA_CM2 = 200 * 300;
export const knots = (density: number) => density * AREA_CM2;
export const days = (density: number) => knots(density) / PER_DAY;

const W = 520;
const H = 220;
const BOX = 180;
const CM = 6;

const colourAt = (x: number, y: number) => {
  const r = Math.hypot(x, y);
  const th = Math.atan2(y, x);
  if (r > 0.62 && r < 0.8) return COL.madder;
  if (r < 0.55 && r > 0.12 && Math.cos(6 * th) > -0.1 + 1.1 * (r - 0.12)) return COL.indigo;
  if (r <= 0.12) return COL.gold;
  return '#efe6cf';
};

export const knotsFigure = figure(['fine'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let density = 9;
  const seen = new Set<'coarse' | 'fine'>();

  const paint = () => {
    const per = Math.sqrt(density);
    const n = Math.round(per * CM);
    const cell = BOX / n;
    const parts: SVGElement[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = ((i + 0.5) / n) * 2 - 1;
        const y = ((j + 0.5) / n) * 2 - 1;
        parts.push(svg('rect', { x: 20 + i * cell, y: 20 + j * cell, width: cell + 0.3, height: cell + 0.3, fill: colourAt(x, y) }));
      }
    }
    const k = knots(density);
    const d = days(density);
    parts.push(
      label(20, BOX + 38, `A rosette ${CM} cm across: ${n} knots wide`, { size: 'small', soft: true }),
      label(230, 50, `${density} knots per cm²`, { bold: true }),
      label(230, 76, 'A carpet 2 by 3 metres:', { size: 'small' }),
      label(230, 96, `${(k / 1e6).toFixed(k < 1e6 ? 2 : 1)} million knots`, { size: 'small' }),
      label(230, 116, `about ${Math.round(d)} working days for one weaver`, { size: 'small', bold: true }),
      label(230, 136, `or about ${Math.round(d / 4)} days for four weavers side by side`, { size: 'small', soft: true }),
    );
    redraw(g, ...parts);
    f.readout.textContent = density <= 16
      ? 'At this density each knot is a large square, so curves turn into steps. Nomadic and village rugs are often this coarse, with bold, angular designs.'
      : density >= 49
        ? 'Fine enough for smooth curves, flowing tendrils and lettering. Court workshops wove carpets this fine, and a large one could take a team of weavers years.'
        : 'Curves begin to read as curves. Each doubling of density doubles the knots, and the time.';
    if (density <= 16) seen.add('coarse');
    if (density >= 49) seen.add('fine');
    if (seen.size === 2) t.done();
  };

  const s = slider('Knot density', { min: 4, max: 100, step: 1, value: density, show: (v) => `${v} per cm²`, onInput: (v) => { density = v; paint(); }, color: 'madder' });
  f.controls.append(s.node);
  paint();
  return f.node;
});
