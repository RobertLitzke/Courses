// Lesson 24: why one number cannot size a body, as a still. Illustrative
// points, not the 1939 to 1940 survey's data: bust and hip girths for 160
// adult women, drawn from a fixed pseudo-random sequence with a realistic
// spread (bust around 90 cm, hips rising with bust but scattered). A band of
// one bust size is shaded, and the range of hips inside it is marked, which
// is what O'Brien's survey found: a single measurement left the rest of the
// body unpredictable.

import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL, tint } from './kit';

/** A fixed sequence of points so the picture is the same on every load. */
export function bodies(n = 160): [number, number][] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  return Array.from({ length: n }, () => {
    const bust = 90 + 8 * gauss();
    return [bust, 100 + 0.75 * (bust - 90) + 6 * gauss()];
  });
}

export const BAND: [number, number] = [88, 92];

const W = 520;
const H = 300;
const X0 = 60;
const X1 = 500;
const Y0 = 250;
const Y1 = 30;
const BX: [number, number] = [65, 120];
const HY: [number, number] = [75, 130];

export function bodiesStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, H);
  const x = (v: number) => X0 + ((v - BX[0]) / (BX[1] - BX[0])) * (X1 - X0);
  const y = (v: number) => Y0 - ((v - HY[0]) / (HY[1] - HY[0])) * (Y0 - Y1);
  const pts = bodies().filter(([b, h]) => b > BX[0] && b < BX[1] && h > HY[0] && h < HY[1]);
  const inBand = pts.filter(([b]) => b >= BAND[0] && b <= BAND[1]).map(([, h]) => h);
  const lo = Math.min(...inBand);
  const hi = Math.max(...inBand);
  s.append(svg('rect', { x: x(BAND[0]), y: Y1, width: x(BAND[1]) - x(BAND[0]), height: Y0 - Y1, fill: tint(COL.you, 0.15) }));
  for (let v = 70; v <= 120; v += 10) s.append(line(x(v), Y0, x(v), Y0 + 4, COL.soft, 1), label(x(v), Y0 + 16, `${v}`, { size: 'small', anchor: 'middle', soft: true }));
  for (let v = 80; v <= 130; v += 10) s.append(line(X0 - 4, y(v), X0, y(v), COL.soft, 1), label(X0 - 8, y(v) + 4, `${v}`, { size: 'small', anchor: 'end', soft: true }));
  s.append(line(X0, Y0, X1, Y0, COL.soft, 1), line(X0, Y0, X0, Y1, COL.soft, 1));
  for (const [b, h] of pts) {
    const inside = b >= BAND[0] && b <= BAND[1];
    s.append(svg('circle', { cx: x(b), cy: y(h), r: 3, fill: inside ? COL.you : COL.soft, opacity: inside ? 0.95 : 0.45 }));
  }
  s.append(line(x(BAND[1]) + 6, y(lo), x(BAND[1]) + 6, y(hi), COL.you, 2));
  s.append(label(X0 + 10, Y1 + 12, `Shaded: one bust size, ${BAND[0]} to ${BAND[1]} cm.`, { size: 'small', fill: COL.you }));
  s.append(label(X0 + 10, Y1 + 26, `Hips in that size: ${Math.round(lo)} to ${Math.round(hi)} cm.`, { size: 'small', fill: COL.you }));
  s.append(label((X0 + X1) / 2, Y0 + 36, 'Bust (cm)', { size: 'note', anchor: 'middle' }));
  s.append(label(X0, 18, 'Hips (cm)', { size: 'note' }));
  return { node };
}
