// Lesson 12: sailing on the monsoon. A ship leaves Gujarat for the Red Sea or
// for Malacca in a month the reader chooses. Each leg can only be sailed in
// the months when the wind blows that way (a simplified calendar: westward
// across the Arabian Sea from November to March, eastward back in August and
// September once the worst storms of the southwest monsoon have passed;
// eastward across the Bay of Bengal in April, May, August and September, and
// back in December to February). A ship waits in port for its wind, so the
// departure month decides how many months the merchant's money is tied up.
// Goal 'quick': both routes tried, and a Red Sea voyage home within 8 months.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, guessFirst, slider } from './kit';
import { route, worldMap, type LonLat } from './world';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Route {
  name: string;
  /** Months (1 to 12) when the outward and return legs can be sailed. */
  out: readonly number[];
  back: readonly number[];
  /** Months at sea for each leg. */
  sail: number;
  path: readonly LonLat[];
}

const GUJARAT: LonLat = [72.6, 21.2];
export const ROUTES: Record<'red' | 'malacca', Route> = {
  red: { name: 'Red Sea', out: [11, 12, 1, 2, 3], back: [8, 9], sail: 1, path: [GUJARAT, [66, 18], [56, 14], [48, 12.5], [43.3, 13.3]] },
  malacca: { name: 'Malacca', out: [4, 5, 8, 9], back: [12, 1, 2], sail: 2, path: [GUJARAT, [72, 15], [75, 9], [79.5, 5.6], [88, 5.5], [96, 5.5], [100.5, 3.5], [102.2, 2.2]] },
};

export type Phase = 'wait' | 'sail' | 'trade';

/** The voyage month by month from departure: what the ship is doing in each. */
export function voyage(r: Route, start: number): Phase[] {
  const month = (i: number) => ((start - 1 + i) % 12) + 1;
  const out: Phase[] = [];
  while (!r.out.includes(month(out.length))) out.push('wait');
  for (let k = 0; k < r.sail; k++) out.push('sail');
  out.push('trade');
  while (!r.back.includes(month(out.length))) out.push('wait');
  for (let k = 0; k < r.sail; k++) out.push('sail');
  return out;
}

/** Wind over each sea in a month: degrees the wind blows toward (0 = east, 90 = north in screen terms reversed) and strength 0 to 1. */
export function wind(m: number): { arabian: [number, number]; bengal: [number, number] } {
  if ([11, 12, 1, 2, 3].includes(m)) return { arabian: [215, 0.7], bengal: [215, 0.6] }; // northeast monsoon, blowing toward the southwest
  if ([6, 7, 8, 9].includes(m)) return { arabian: [30, m <= 7 ? 1 : 0.8], bengal: [40, 0.8] }; // southwest monsoon, blowing toward the northeast
  return { arabian: [0, 0.2], bengal: [0, 0.2] }; // changing over: light and variable
}

const W = 520;
const MAP = worldMap({ lon: [36, 106], lat: [-6, 28] }, W);
const BAR_Y = MAP.h + 18;
const H = MAP.h + 74;

export const monsoonFigure = figure(['quick'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  // The paper below the map, over any land the outline draws past its edge.
  f.svg.append(MAP.base, svg('rect', { x: 0, y: MAP.h, width: W, height: H - MAP.h, fill: COL.paper }), g);
  let dest: 'red' | 'malacca' = 'red';
  let start = 4;
  const tried = new Set<string>();
  let quick = false;

  const arrowField = (lonLat: LonLat[], [dir, k]: [number, number]) => lonLat.flatMap((p) => {
    const [x, y] = MAP.xy(p);
    const a = (dir * Math.PI) / 180;
    const len = 6 + 16 * k;
    const dx = Math.cos(a) * len;
    const dy = -Math.sin(a) * len;
    const head = svg('polygon', { points: `${x + dx},${y + dy} ${x + dx - Math.cos(a - 0.5) * 6},${y + dy + Math.sin(a - 0.5) * 6} ${x + dx - Math.cos(a + 0.5) * 6},${y + dy + Math.sin(a + 0.5) * 6}`, fill: COL.soft, opacity: 0.3 + 0.6 * k });
    return [svg('line', { x1: x - dx / 2, y1: y - dy / 2, x2: x + dx, y2: y + dy, stroke: COL.soft, 'stroke-width': 1.5, opacity: 0.3 + 0.6 * k }), head];
  });

  const paint = () => {
    const r = ROUTES[dest];
    const v = voyage(r, start);
    const w = wind(start);
    const parts: SVGElement[] = [
      ...arrowField([[60, 16], [66, 10], [58, 6], [64, 2], [54, 10]], w.arabian),
      ...arrowField([[86, 15], [90, 9], [84, 4], [93, 2]], w.bengal),
      route(MAP, r.path, COL.bysea, 3),
      label(W - 8, 16, `Winds in ${MONTHS[start - 1]}`, { bold: true, anchor: 'end', halo: COL.sea, haloWidth: 4 }),
    ];
    const [gx, gy] = MAP.xy(GUJARAT);
    parts.push(svg('circle', { cx: gx, cy: gy, r: 4, fill: COL.ink }), label(gx + 6, gy - 4, 'Gujarat', { size: 'small', halo: COL.land }));
    const [ex, ey] = MAP.xy(r.path.at(-1)!);
    parts.push(svg('circle', { cx: ex, cy: ey, r: 4, fill: COL.ink }), label(ex - 6, ey + 14, r.name, { size: 'small', anchor: 'end', halo: COL.land }));
    // The voyage as a bar of months.
    const cell = (W - 20) / 24;
    const fill: Record<Phase, string> = { wait: COL.grid, sail: COL.bysea, trade: COL.gold };
    v.forEach((p, i) => {
      if (i < 24) parts.push(svg('rect', { x: 10 + i * cell, y: BAR_Y, width: cell - 1.5, height: 14, fill: fill[p] }));
    });
    for (let i = 0; i < 24; i += 3) parts.push(label(10 + i * cell, BAR_Y + 28, MONTHS[(start - 1 + i) % 12], { size: 'small', soft: true }));
    const key: [Phase, string][] = [['sail', 'at sea'], ['trade', 'trading'], ['wait', 'waiting for the wind']];
    key.forEach(([p, text], i) => parts.push(svg('rect', { x: 10 + i * 120, y: BAR_Y + 40, width: 12, height: 10, fill: fill[p] }), label(26 + i * 120, BAR_Y + 49, text, { size: 'small' })));
    redraw(g, ...parts);
    const waits = v.filter((p) => p === 'wait').length;
    f.readout.textContent = `Leaving in ${MONTHS[start - 1]}, the ship is home after ${v.length} months: ${v.filter((p) => p === 'sail').length} at sea, 1 trading, and ${waits} waiting for the wind. The merchant's money is tied up in the cargo all that time.`;
    tried.add(dest);
    if (dest === 'red' && v.length <= 8) quick = true;
    if (quick && tried.size === 2) t.done();
  };

  const s = slider('Leave Gujarat in', { min: 1, max: 12, step: 1, value: start, show: (m) => MONTHS[m - 1], onInput: (m) => { start = m; paint(); }, color: 'bysea' });
  const where = choices(['Red Sea', 'Malacca'], (i) => { dest = i === 0 ? 'red' : 'malacca'; paint(); });
  where.pick(0);
  f.controls.append(s.node, where.node);
  guessFirst(t, f, {
    ask: 'A Gujarati merchant sends a ship to the Red Sea and wants it back as soon as possible. When should it leave?',
    options: ['January', 'April', 'July', 'October'],
    answer: 0,
    sliders: [s],
    hidden: [where.node],
    after: () => paint(),
  });
  return f.node;
});
