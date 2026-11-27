// Lesson 17: where upland cotton can grow in the American South. Each cell of
// the map is coloured by whether it has enough frost-free days (about 200)
// and enough rain (about 500 mm a year) to grow cotton without irrigation.
// The climate here is a smooth model, not station data: frost-free days fall
// with latitude and with height (the Appalachians and the high plains), and
// rain falls off westward from the Gulf. Overlays show, roughly, where cotton
// was grown in 1860 and where it is grown today.
// Goal 'overlay': the reader has seen both overlays.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import land from '../data/land110.json';
import { COL, choices, figure, frame, guessFirst, tint } from './kit';
import { worldMap, type LonLat } from './world';

const CROP = { lon: [-104, -74] as const, lat: [25, 40] as const };
const W = 540;
const MAP = worldMap(CROP, W);
const STEP = 0.5;

/** Frost-free days a year, from a smooth model of the South's climate. */
export function frostFree(lon: number, lat: number): number {
  let d = 290 - 15 * (lat - 30);
  if (lon > -85 && lon < -79 && lat > 34 && lat < 38.5) d -= 35; // the Appalachians
  if (lon < -100) d -= 15 * Math.min(1, (-100 - lon) / 3); // the high plains
  if (lon > -82 && lat < 36) d += 10; // Atlantic coastal plain
  return d;
}

/** Rain in mm a year: wet along the Gulf, drier to the west. */
export const rain = (lon: number, lat: number) => 1400 - Math.max(0, -95 - lon) * 180 - Math.max(0, lat - 35) * 30;

export const COTTON_DAYS = 200;
export const COTTON_RAIN = 500;
export const grows = (lon: number, lat: number) => frostFree(lon, lat) >= COTTON_DAYS && rain(lon, lat) >= COTTON_RAIN;

const SOUTH_1860: LonLat[] = [[-80.5, 34.8], [-82.5, 34.8], [-85, 34.5], [-87.5, 35], [-89, 36.6], [-90.5, 36.5], [-91.5, 35], [-93.5, 33.8], [-96.5, 33.6], [-97.5, 31], [-96, 29.5], [-93, 30.4], [-91, 30.6], [-89, 31], [-86, 31.2], [-84, 30.9], [-82, 31.6], [-80.5, 32.8]];
const TODAY: LonLat[][] = [
  [[-103, 35], [-100, 35], [-100, 31.8], [-103, 31.8]],
  [[-91.6, 36.6], [-89.6, 36.6], [-90.4, 32.4], [-91.6, 32.4]],
  [[-85.2, 32.6], [-81.8, 32.6], [-81.8, 31], [-85.2, 31]],
  [[-98.6, 28.4], [-97, 28.4], [-97, 26.4], [-98.6, 26.4]],
];

function inside(p: readonly number[], ring: readonly (readonly number[])[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const RINGS = (land.rings as number[][][]).filter((r) => r.some(([lon, lat]) => lon > -110 && lon < -70 && lat > 20 && lat < 45));
const onLand = (lon: number, lat: number) => RINGS.some((r) => inside([lon, lat], r));

const poly = (pts: readonly LonLat[], attrs: Record<string, string | number>) => svg('polygon', { points: pts.map((p) => MAP.xy(p).map((v) => v.toFixed(1)).join(',')).join(' '), ...attrs });

export const cottonBeltFigure = figure(['overlay'], (_ctx, t) => {
  const f = frame(W, MAP.h + 30, 3);
  const cells = svg('g');
  const top = svg('g');
  f.svg.append(MAP.base, cells, top);
  const [x0, y0] = MAP.xy([CROP.lon[0], CROP.lat[1]]);
  const [x1, y1] = MAP.xy([CROP.lon[0] + STEP, CROP.lat[1] - STEP]);
  const cw = x1 - x0;
  const ch = y1 - y0;
  for (let lon = CROP.lon[0]; lon < CROP.lon[1]; lon += STEP) {
    for (let lat = CROP.lat[0]; lat < CROP.lat[1]; lat += STEP) {
      const c = [lon + STEP / 2, lat + STEP / 2] as const;
      if (!onLand(c[0], c[1])) continue;
      const [x, y] = MAP.xy([lon, lat + STEP]);
      const ok = grows(c[0], c[1]);
      const dry = frostFree(c[0], c[1]) >= COTTON_DAYS && !ok;
      cells.append(svg('rect', { x, y, width: cw + 0.3, height: ch + 0.3, fill: ok ? tint(COL.good, 0.45) : dry ? tint(COL.gold, 0.35) : tint(COL.soft, 0.12) }));
    }
  }
  let view = 0;
  const seen = new Set<number>();
  const states: [LonLat, string][] = [[[-99, 31.5], 'Texas'], [[-92.5, 31], 'Louisiana'], [[-89.7, 32.8], 'Miss.'], [[-86.8, 32.8], 'Ala.'], [[-83.4, 32.8], 'Ga.'], [[-81, 34], 'S.C.'], [[-79, 35.6], 'N.C.'], [[-86.5, 35.8], 'Tennessee'], [[-85.5, 37.6], 'Kentucky'], [[-92.5, 34.8], 'Ark.'], [[-92.5, 38.3], 'Missouri'], [[-78.6, 37.6], 'Virginia']];

  const paint = () => {
    const parts: SVGElement[] = states.map(([p, n]) => { const [x, y] = MAP.xy(p); return label(x, y, n, { size: 'small', anchor: 'middle', soft: true }); });
    if (view === 1) parts.push(poly(SOUTH_1860, { fill: 'none', stroke: COL.enslaved, 'stroke-width': 2.5, 'stroke-dasharray': '5 3' }));
    if (view === 2) for (const r of TODAY) parts.push(poly(r, { fill: tint(COL.cloth, 0.35), stroke: COL.cloth, 'stroke-width': 1.5 }));
    const ky = MAP.h + 18;
    parts.push(
      svg('rect', { x: 10, y: ky - 9, width: 12, height: 10, fill: tint(COL.good, 0.45) }), label(26, ky, `${COTTON_DAYS}+ frost-free days and enough rain`, { size: 'small' }),
      svg('rect', { x: 250, y: ky - 9, width: 12, height: 10, fill: tint(COL.gold, 0.35) }), label(266, ky, 'warm enough but too dry', { size: 'small' }),
    );
    if (view === 1) parts.push(label(W - 8, 16, 'Cotton South, 1860 (rough outline)', { size: 'note', bold: true, anchor: 'end', fill: COL.enslaved, halo: COL.sea }));
    if (view === 2) parts.push(label(W - 8, 16, 'Main cotton areas today (rough)', { size: 'note', bold: true, anchor: 'end', fill: COL.cloth, halo: COL.sea }));
    redraw(top, ...parts);
    f.readout.textContent = [
      'Green cells have the long warm season and the rain upland cotton needs. Climate sets where it can grow; it does not decide who grows it.',
      "In 1860 cotton filled most of the land the climate allowed, from the Carolinas to east Texas, on land taken from Native nations and worked by about four million enslaved people.",
      'Today much of the crop grows in places the climate model calls too dry, on the high plains of west Texas, using irrigation from groundwater. The old cotton South grows far less.',
    ][view];
    seen.add(view);
    if (seen.has(1) && seen.has(2)) t.done();
  };
  const views = choices(['Climate', 'Add 1860', 'Add today'], (i) => { view = i; paint(); });
  views.pick(0);
  f.controls.append(views.node);
  guessFirst(t, f, {
    ask: 'Upland cotton needs about 200 days without frost. How far north in the eastern United States can it be grown?',
    options: ['Only near the Gulf coast', 'To about the Tennessee and Kentucky border', 'To about the Great Lakes'],
    answer: 1,
    sliders: [],
    hidden: [views.node],
    after: () => paint(),
  });
  return f.node;
});
