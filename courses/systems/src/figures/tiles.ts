// Lesson M1, A map of the world in squares: the pyramid of tiles and how
// many each zoom needs; how far down to draw tiles ahead of time; and the
// versioned tile address that lets every cache keep a tile for ever.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, named, pick, slider, tint } from './kit';

/** Pixels on a tile's side. */
export const TILE_PX = 256;
/** The equator, m. */
export const EQUATOR = 40_075_016;

/** Tiles at zoom z: 2^z across and 2^z down. */
export const tilesAt = (z: number) => 4 ** z;

/** Tiles in every zoom from 0 to z. */
export const tilesTo = (z: number) => (4 ** (z + 1) - 1) / 3;

/** Metres one pixel covers at the equator at zoom z. */
export const metresPerPixel = (z: number) => EQUATOR / (TILE_PX * 2 ** z);

/** A count in words: 69 billion. */
export function say(n: number): string {
  const r = (v: number) => (v >= 100 ? Math.round(v).toString() : v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));
  if (n >= 1e12) return `${r(n / 1e12)} trillion`;
  if (n >= 1e9) return `${r(n / 1e9)} billion`;
  if (n >= 1e6) return `${r(n / 1e6)} million`;
  return Math.round(n).toLocaleString('en-US');
}

/** Bytes in words: 1.4 PB. */
export function sayBytes(b: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let i = 0;
  while (b >= 1000 && i < units.length - 1) { b /= 1000; i++; }
  return `${b >= 100 ? Math.round(b) : Number(b.toPrecision(2))} ${units[i]}`;
}

const sayMetres = (m: number) => (m >= 1000 ? `${Number((m / 1000).toPrecision(3))} km` : m >= 1 ? `${Number(m.toPrecision(2))} m` : `${Math.round(m * 100)} cm`);

/** The tile holding a point: Web Mercator, as Google Maps and OpenStreetMap number them. */
export function tileOf(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

// ---------------------------------------------------------------------------
// The pyramid.

const pyramidFigure = figure(['deep'], (_ctx, t) => {
  const W = 480;
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let z = 2;
  const A = axes({ x: 262, y: 24, w: 200, h: 180, xmin: -0.5, xmax: 20.5, ymin: 1, ymax: 2e12, ylog: true, xticks: [0, 5, 10, 15, 20], yticks: [1, 1e3, 1e6, 1e9, 1e12], yfmt: (v) => (v === 1 ? '1' : v === 1e3 ? '1,000' : v === 1e6 ? '1 M' : v === 1e9 ? '1 B' : '1 T'), xlabel: 'zoom', ylabel: 'Tiles at each zoom (log)', ink: COL.ink, grid: COL.grid });
  // Seattle, to show which tile holds a place.
  const SEA = { lat: 47.6, lon: -122.33 };
  const paint = () => {
    const parts: SVGElement[] = [];
    const S = 200;
    const x0 = 20;
    const y0 = 24;
    parts.push(svg('rect', { x: x0, y: y0, width: S, height: S, fill: tint(COL.request, 0.06), stroke: COL.ink, 'stroke-width': 1.2 }));
    const shown = Math.min(z, 6);
    const n = 2 ** shown;
    for (let i = 1; i < n; i++) {
      const p = (i / n) * S;
      parts.push(line(x0 + p, y0, x0 + p, y0 + S, COL.soft, shown > 4 ? 0.4 : 0.8), line(x0, y0 + p, x0 + S, y0 + p, COL.soft, shown > 4 ? 0.4 : 0.8));
    }
    const tile = tileOf(SEA.lat, SEA.lon, shown);
    parts.push(svg('rect', { x: x0 + (tile.x / n) * S, y: y0 + (tile.y / n) * S, width: S / n, height: S / n, fill: tint(COL.data, 0.45), stroke: COL.data, 'stroke-width': 1.2 }));
    const real = tileOf(SEA.lat, SEA.lon, z);
    parts.push(small(x0, y0 + S + 16, `Seattle is in tile ${z}/${real.x}/${real.y}`, { fill: COL.data }));
    if (z > 6) parts.push(small(x0, y0 + S + 30, `drawn at zoom 6; each square here holds ${say(4 ** (z - 6))} tiles`, { soft: true }));
    parts.push(small(x0, y0 - 8, 'The world, squared off at 85° N and S', { soft: true }));
    parts.push(...A.parts);
    for (let k = 0; k <= 20; k++) {
      const on = k === z;
      parts.push(svg('rect', { x: A.X(k) - 3.5, y: A.Y(tilesAt(k)), width: 7, height: A.Y(1) - A.Y(tilesAt(k)), fill: on ? COL.data : tint(COL.data, 0.3) }));
    }
    redraw(g, ...parts);
    f.readout.textContent = `Zoom ${z}: ${2 ** z} × ${2 ** z} = ${say(tilesAt(z))} tiles. One pixel covers ${sayMetres(metresPerPixel(z))} at the equator. Every tile from zoom 0 to ${z} at 20 KB each would take ${sayBytes(tilesTo(z) * 20_000)}.`;
    if (z >= 18) t.done();
  };
  const zoom = slider('Zoom', 0, 20, 1, z, (v) => `${v}`, (v) => { z = v; paint(); }, 'data');
  f.controls.append(zoom.node);
  paint();
  guessFirst(t, f, {
    ask: 'At zoom 18 one pixel covers about 60 cm, enough to see lanes on a road. How many tiles cover the world at that zoom?',
    options: ['About 69 million', 'About 69 billion', 'About 69 trillion'],
    answer: 1,
    sliders: [zoom],
    after: () => paint(),
  });
  return f.node;
});

// ---------------------------------------------------------------------------
// How far down to draw ahead of time.

/** Share of tile requests at each zoom, 0 to 20: an illustrative mix with most views at street and neighbourhood zooms. */
export const REQUEST_MIX: readonly number[] = (() => {
  const w = Array.from({ length: 21 }, (_, z) => Math.exp(-((z - 14.5) ** 2) / (2 * 2.8 ** 2)) + 0.02);
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / s);
})();

/** Share of tiles with land on them at zoom z (at low zooms nearly every tile touches some). */
export const landShare = (z: number) => (z <= 3 ? 1 : Math.max(0.3, 1 - (z - 3) * 0.14));

export interface Plan {
  /** Tiles drawn ahead of time, and those that show land. */
  tiles: number;
  land: number;
  /** Bytes stored: land tiles at 20 KB; ocean tiles at 0.3 KB each, or one copy of the plain blue square. */
  bytes: number;
  /** Days to draw them on 1,000 cores at 50 ms a tile. */
  days: number;
  /** Share of requests for zooms drawn on demand. */
  onDemand: number;
}

/** Draw every tile from zoom 0 to `upTo` in advance; `dedupe` stores the plain ocean tile once. */
export function plan(upTo: number, dedupe: boolean): Plan {
  let tiles = 0;
  let land = 0;
  for (let z = 0; z <= upTo; z++) {
    tiles += tilesAt(z);
    land += tilesAt(z) * landShare(z);
  }
  const ocean = tiles - land;
  const bytes = land * 20_000 + (dedupe ? 300 : ocean * 300);
  const drawn = dedupe ? land : tiles;
  const days = (drawn * 0.05) / 1000 / 86_400;
  const onDemand = REQUEST_MIX.slice(upTo + 1).reduce((a, b) => a + b, 0);
  return { tiles, land, bytes, days, onDemand };
}

const sayDays = (d: number) => (d < 1 / 24 ? `${Math.max(1, Math.round(d * 1440))} minutes` : d < 2 ? `${Number((d * 24).toPrecision(2))} hours` : d < 730 ? `${Math.round(d)} days` : `${Math.round(d / 365)} years`);

const renderFigure = figure(['plan'], (_ctx, t) => {
  const W = 480;
  const H = 210;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let upTo = 12;
  let dedupe = true;
  const A = axes({ x: 46, y: 22, w: 410, h: 140, xmin: -0.5, xmax: 20.5, ymin: 0, ymax: 0.16, xticks: [0, 4, 8, 12, 16, 20], yticks: [0, 0.05, 0.1, 0.15], yfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'zoom', ylabel: 'Share of tile requests at each zoom (a model)', ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const parts: SVGElement[] = [...A.parts];
    REQUEST_MIX.forEach((v, z) => {
      const ahead = z <= upTo;
      parts.push(svg('rect', { x: A.X(z) - 7, y: A.Y(v), width: 14, height: A.Y(0) - A.Y(v), fill: ahead ? tint(COL.data, 0.7) : tint(COL.busy, 0.7) }));
    });
    const xl = A.X(upTo + 0.5);
    parts.push(line(xl, A.Y(0.16), xl, A.Y(0), COL.ink, 1.2, { 'stroke-dasharray': '4 3' }));
    parts.push(small(xl - 4, A.Y(0.15), 'drawn ahead', { anchor: 'end', fill: COL.data }), small(xl + 4, A.Y(0.15), 'drawn on first view', { fill: COL.busy }));
    redraw(g, ...parts);
    const p = plan(upTo, dedupe);
    f.readout.textContent = `Ahead of time, zooms 0 to ${upTo}: ${say(p.tiles)} tiles, ${sayBytes(p.bytes)} stored, ${sayDays(p.days)} to draw on 1,000 cores. ${Math.round(p.onDemand * 100)}% of requests are for deeper zooms, drawn the first time someone looks and then cached.`;
    if (upTo >= 18) t.done();
  };
  const cut = slider('Draw ahead to zoom', 6, 20, 1, upTo, (v) => `${v}`, (v) => { upTo = v; paint(); }, 'data');
  const ocean = named(pick(['Once', 'Every tile'], 0, (i) => { dedupe = i === 0; paint(); }), 'Store the plain ocean tile:');
  f.controls.append(cut.node, ocean.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The versioned address.

const versionStill = () => {
  const W = 480;
  const H = 230;
  const s = still(W, H);
  const g = svg('g');
  s.svg.append(g);
  const parts: SVGElement[] = [];
  const box = (x: number, y: number, w: number, name: string, color: string, dashed = false) => {
    parts.push(svg('rect', { x, y, width: w, height: 34, rx: 5, fill: tint(color, 0.1), stroke: color, 'stroke-width': 1.4, ...(dashed ? { 'stroke-dasharray': '5 2' } : {}) }));
    parts.push(label(x + w / 2, y + 21, name, { anchor: 'middle' }));
  };
  const arrow = (x1: number, y1: number, x2: number, color: string) => {
    parts.push(line(x1, y1, x2 - 6, y1, color, 1.5), svg('path', { d: `M${x2},${y1} l-7,-4 v8 Z`, fill: color }));
  };
  box(8, 30, 96, 'Browser', COL.ink);
  box(170, 30, 120, 'Edge cache', COL.cache, true);
  box(356, 30, 116, 'Tile store', COL.data);
  arrow(104, 47, 170, COL.request);
  arrow(290, 47, 356, COL.request);
  parts.push(small(108, 22, '/v812/14/2624/5722.png', { fill: COL.request, attrs: { 'font-family': 'ui-monospace, monospace' } }));
  parts.push(small(8, 84, '1. On start, the page asks which map version is current: 812. Every tile address it builds carries it.'));
  parts.push(small(8, 102, '2. A tile at a given version never changes, so every cache may keep it for as long as it likes.'));
  parts.push(line(8, 118, W - 8, 118, COL.grid, 1));
  parts.push(small(8, 138, 'Roads open and close all week. The pipeline marks the tiles each edit touches, about one per', { fill: COL.write }));
  parts.push(small(8, 154, 'zoom, draws them again in a batch, and publishes version 813: new tiles, the rest carried over.', { fill: COL.write }));
  parts.push(small(8, 176, '3. Pages now ask for /v813/…. Edges miss at first, so versions change every few days.'));
  parts.push(small(8, 194, '4. Nothing is purged. Tiles under /v812/ stop being asked for and age out of the caches.'));
  parts.push(small(8, 216, 'Every tile a page shows comes from one version, so roads meet at tile edges.', { soft: true }));
  redraw(g, ...parts);
  return { node: s.node };
};

export const FIGS = {
  'tiles-pyramid': pyramidFigure,
  'tiles-render': renderFigure,
  'tiles-version': versionStill,
};
