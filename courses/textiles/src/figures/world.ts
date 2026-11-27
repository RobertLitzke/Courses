// A plain world map for the trade figures: Natural Earth's 1:110m land
// outlines (public domain) in an equirectangular projection, cropped to the
// region a figure needs. No relief and no borders: the map is a backdrop for
// routes and places, so it stays quiet. Horizontal distances are stretched by
// cos(mid-latitude) so shapes look right in the middle of the crop.

import { svg } from 'didactics/dom';
import { label } from 'didactics/draw';
import land from '../data/land110.json';
import { COL } from './kit';

export type LonLat = readonly [number, number];

export interface Crop {
  /** West and east edges, in degrees of longitude. */
  lon: readonly [number, number];
  /** South and north edges, in degrees of latitude. */
  lat: readonly [number, number];
}

export interface WorldMap {
  w: number;
  h: number;
  /** A longitude and latitude to drawing units. */
  xy: (p: LonLat) => [number, number];
  /** Sea and land, ready to append first. */
  base: SVGElement;
}

/** The height a crop needs at width `w` so its shapes are not squashed. */
export function cropHeight(c: Crop, w: number): number {
  const mid = ((c.lat[0] + c.lat[1]) / 2) * (Math.PI / 180);
  return Math.round((w * (c.lat[1] - c.lat[0])) / ((c.lon[1] - c.lon[0]) * Math.cos(mid)));
}

export function worldMap(c: Crop, w: number, h = cropHeight(c, w)): WorldMap {
  const xy = ([lon, lat]: LonLat): [number, number] => [
    ((lon - c.lon[0]) / (c.lon[1] - c.lon[0])) * w,
    ((c.lat[1] - lat) / (c.lat[1] - c.lat[0])) * h,
  ];
  const near = (r: number[][]) => r.some(([lon, lat]) => lon >= c.lon[0] - 30 && lon <= c.lon[1] + 30 && lat >= c.lat[0] - 30 && lat <= c.lat[1] + 30);
  const rings = (land.rings as number[][][]).filter(near);
  const d = rings.map((r) => `M${r.map((p) => xy(p as unknown as LonLat).map((v) => v.toFixed(1)).join(' ')).join('L')}Z`).join('');
  const base = svg('g', { class: 'world' },
    svg('rect', { x: 0, y: 0, width: w, height: h, fill: COL.sea }),
    svg('path', { d, fill: COL.land, stroke: COL.coast, 'stroke-width': 0.6, 'stroke-linejoin': 'round' }));
  return { w, h, xy, base };
}

/** A route along a list of places, as a smooth line. */
export function route(m: WorldMap, pts: readonly LonLat[], stroke: string, width = 2.5, dashed = false): SVGElement {
  const xy = pts.map(m.xy);
  let d = `M${xy[0][0].toFixed(1)} ${xy[0][1].toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) {
    // Through the midpoints, so corners at each place are rounded.
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    d += i === xy.length - 1 ? ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}` : ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  return svg('path', { d, fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...(dashed ? { 'stroke-dasharray': '6 4' } : {}) });
}

/** A place: a dot and its name, placed to the right unless `left`, above if `up`. */
export function place(m: WorldMap, p: LonLat, name: string, o: { left?: boolean; up?: boolean; fill?: string; r?: number } = {}): SVGElement {
  const [x, y] = m.xy(p);
  const dx = o.left ? -6 : 6;
  return svg('g', {},
    svg('circle', { cx: x, cy: y, r: o.r ?? 3, fill: o.fill ?? COL.ink, stroke: COL.paper, 'stroke-width': 1 }),
    label(x + dx, y + (o.up ? -5 : 4), name, { size: 'small', anchor: o.left ? 'end' : undefined, halo: COL.land, haloWidth: 3 }));
}
