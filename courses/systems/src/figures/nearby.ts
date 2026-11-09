// Lesson M2, Finding the nearest car: cutting a map into cells (a fixed grid
// as geohash does, a quadtree, hexagons as H3 does) and how many drivers a
// search must look at in each; numbering cells along a Z-order or a Hilbert
// curve, and how many ranges of numbers a search becomes; and sharding the
// live positions by cell, with a busy city making one shard hot.

import { svg } from 'didactics/dom';
import { hexagon, label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { liveDiagram, statsLine, type LinkSpec, type PartSpec, type System } from './diagram';
import { COL, figure, frame, named, pick, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// Drivers on a 20 km square, and three ways to cut it into cells.

export interface Pt { x: number; y: number }

/** Side of the area, km. */
export const AREA = 20;

/** 320 drivers in a city centre and 80 spread over the country round it. */
export function drivers(seed = 4): Pt[] {
  const rng = makeRng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const out: Pt[] = [];
  while (out.length < 320) {
    const p = { x: 12.5 + gauss() * 1.6, y: 8 + gauss() * 1.6 };
    if (p.x > 0 && p.x < AREA && p.y > 0 && p.y < AREA) out.push(p);
  }
  for (let i = 0; i < 80; i++) out.push({ x: rng() * AREA, y: rng() * AREA });
  return out;
}

export interface Rect { x: number; y: number; w: number; h: number }

const circleHitsRect = (c: Pt, r: number, b: Rect) => {
  const dx = Math.max(b.x - c.x, 0, c.x - (b.x + b.w));
  const dy = Math.max(b.y - c.y, 0, c.y - (b.y + b.h));
  return dx * dx + dy * dy <= r * r;
};

/** The squares of a fixed grid of side `s` km that a circle touches. */
export function gridCells(c: Pt, r: number, s: number): Rect[] {
  const out: Rect[] = [];
  for (let i = Math.floor((c.x - r) / s); i <= Math.floor((c.x + r) / s); i++) {
    for (let j = Math.floor((c.y - r) / s); j <= Math.floor((c.y + r) / s); j++) {
      const b = { x: i * s, y: j * s, w: s, h: s };
      if (b.x >= 0 && b.y >= 0 && b.x < AREA && b.y < AREA && circleHitsRect(c, r, b)) out.push(b);
    }
  }
  return out;
}

/** The leaves of a quadtree over the area that splits any square holding more than `cap` drivers. */
export function quadtree(pts: readonly Pt[], cap: number): Rect[] {
  const leaves: Rect[] = [];
  const split = (b: Rect, inside: Pt[], depth: number) => {
    if (inside.length <= cap || depth >= 7) {
      leaves.push(b);
      return;
    }
    const h = b.w / 2;
    for (const [dx, dy] of [[0, 0], [h, 0], [0, h], [h, h]]) {
      const q = { x: b.x + dx, y: b.y + dy, w: h, h };
      split(q, inside.filter((p) => p.x >= q.x && p.x < q.x + h && p.y >= q.y && p.y < q.y + h), depth + 1);
    }
  };
  split({ x: 0, y: 0, w: AREA, h: AREA }, [...pts], 0);
  return leaves;
}

/** Centres of a pointy-topped hexagon grid with circumradius `R` km over the area. */
export function hexCentres(R: number): Pt[] {
  const out: Pt[] = [];
  const w = Math.sqrt(3) * R;
  const rowH = 1.5 * R;
  for (let row = 0; row * rowH <= AREA + R; row++) {
    for (let col = 0; col * w <= AREA + w; col++) out.push({ x: col * w + (row % 2 ? w / 2 : 0), y: row * rowH });
  }
  return out;
}

/** Which hexagon centre a point belongs to (the nearest). */
export const nearestCentre = (p: Pt, cs: readonly Pt[]) => cs.reduce((b, c, i) => ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (cs[b].x - p.x) ** 2 + (cs[b].y - p.y) ** 2 ? i : b), 0);

export type Scheme = 'grid' | 'quad' | 'hex';

export interface Search {
  cells: number;
  /** Drivers in the cells scanned, and those truly within the radius. */
  scanned: number;
  found: number;
  /** Most drivers in any one cell of the scheme. */
  fullest: number;
}

/** A search for drivers within `r` km of `c`, cell by cell. `size` is the grid's or hexagon's size in km, or the quadtree's capacity. */
export function search(pts: readonly Pt[], scheme: Scheme, size: number, c: Pt, r: number): Search {
  const found = pts.filter((p) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= r * r).length;
  const inRect = (b: Rect) => pts.filter((p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h).length;
  if (scheme === 'grid' || scheme === 'quad') {
    const all = scheme === 'grid' ? allGrid(size) : quadtree(pts, size);
    const hit = all.filter((b) => circleHitsRect(c, r, b));
    return { cells: hit.length, scanned: hit.reduce((s, b) => s + inRect(b), 0), found, fullest: Math.max(...all.map(inRect)) };
  }
  const cs = hexCentres(size);
  const owner = pts.map((p) => nearestCentre(p, cs));
  const counts = new Map<number, number>();
  for (const o of owner) counts.set(o, (counts.get(o) ?? 0) + 1);
  const hit = new Set(cs.map((h, i) => ((h.x - c.x) ** 2 + (h.y - c.y) ** 2 <= (r + size) ** 2 ? i : -1)).filter((i) => i >= 0));
  return { cells: hit.size, scanned: owner.filter((o) => hit.has(o)).length, found, fullest: Math.max(...counts.values()) };
}

const allGrid = (s: number): Rect[] => {
  const out: Rect[] = [];
  for (let i = 0; i * s < AREA - 1e-9; i++) for (let j = 0; j * s < AREA - 1e-9; j++) out.push({ x: i * s, y: j * s, w: s, h: s });
  return out;
};

const cellsFigure = figure(['all'], (_ctx, t) => {
  const W = 450;
  const PX = 19;
  const M = 10;
  const H = AREA * PX + 2 * M;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const pts = drivers();
  let scheme: Scheme = 'grid';
  let r = 1.5;
  let c: Pt = { x: 12.6, y: 8.2 };
  const tried = new Set<Scheme>();
  const X = (km: number) => M + km * PX;
  const sizeOf = () => (scheme === 'grid' ? 2.5 : scheme === 'quad' ? 12 : 1.4);
  const paint = () => {
    const parts: SVGElement[] = [svg('rect', { x: M, y: M, width: AREA * PX, height: AREA * PX, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1 })];
    const size = sizeOf();
    const s = search(pts, scheme, size, c, r);
    if (scheme === 'hex') {
      const cs = hexCentres(size);
      for (const h of cs) {
        const hit = (h.x - c.x) ** 2 + (h.y - c.y) ** 2 <= (r + size) ** 2;
        if (h.x < -size || h.y < -size || h.x > AREA + size || h.y > AREA + size) continue;
        parts.push(hexagon(X(h.x), X(h.y), size * PX, { fill: hit ? tint(COL.request, 0.16) : 'none', stroke: COL.soft, 'stroke-width': 0.6 }, Math.PI / 6));
      }
    } else {
      const cells = scheme === 'grid' ? allGrid(size) : quadtree(pts, size);
      for (const b of cells) {
        const hit = circleHitsRect(c, r, b);
        parts.push(svg('rect', { x: X(b.x), y: X(b.y), width: b.w * PX, height: b.h * PX, fill: hit ? tint(COL.request, 0.16) : 'none', stroke: COL.soft, 'stroke-width': 0.6 }));
      }
    }
    for (const p of pts) {
      const inside = (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= r * r;
      parts.push(svg('circle', { cx: X(p.x), cy: X(p.y), r: inside ? 2.6 : 1.8, fill: inside ? COL.answer : COL.ink, opacity: inside ? 1 : 0.6 }));
    }
    parts.push(svg('circle', { cx: X(c.x), cy: X(c.y), r: r * PX, fill: 'none', stroke: COL.request, 'stroke-width': 1.6 }));
    parts.push(svg('circle', { cx: X(c.x), cy: X(c.y), r: 4, fill: COL.request }));
    // Clip anything outside the area (hexagons at the edge).
    parts.push(svg('path', { d: `M0,0 H${W} V${H} H0 Z M${M},${M} V${M + AREA * PX} H${M + AREA * PX} V${M} Z`, fill: COL.paper, 'fill-rule': 'evenodd' }));
    parts.push(svg('rect', { x: M, y: M, width: AREA * PX, height: AREA * PX, fill: 'none', stroke: COL.ink, 'stroke-width': 1 }));
    parts.push(small(M + AREA * PX + 6, M + 12, '20 km', { soft: true }), small(M + AREA * PX + 6, M + 26, 'square', { soft: true }));
    parts.push(small(M + AREA * PX + 6, H - 30, 'tap the', { soft: true }), small(M + AREA * PX + 6, H - 16, 'map', { soft: true }));
    redraw(g, ...parts);
    const name = scheme === 'grid' ? 'Fixed 2.5 km squares' : scheme === 'quad' ? 'Quadtree, split above 12 drivers' : 'Hexagons 1.4 km across the corners';
    f.readout.textContent = `${name}: ${s.cells} cells scanned, holding ${s.scanned} drivers, to find the ${s.found} within ${r} km. The fullest cell holds ${s.fullest}.`;
  };
  f.svg.addEventListener('click', (e) => {
    const box = f.svg.getBoundingClientRect();
    if (!box.width) return;
    const scale = W / box.width;
    const x = ((e.clientX - box.left) * scale - M) / PX;
    const y = ((e.clientY - box.top) * scale - M) / PX;
    if (x >= 0 && x <= AREA && y >= 0 && y <= AREA) {
      c = { x, y };
      paint();
    }
  });
  f.svg.style.cursor = 'crosshair';
  const schemes = named(pick(['Fixed grid', 'Quadtree', 'Hexagons'], 0, (i) => {
    scheme = (['grid', 'quad', 'hex'] as const)[i];
    tried.add(scheme);
    paint();
    if (tried.size === 3) t.done();
  }), 'Cells:');
  tried.add('grid');
  const radius = slider('Search radius', 0.5, 4, 0.5, r, (v) => `${v} km`, (v) => { r = v; paint(); }, 'request');
  f.controls.append(schemes.node, radius.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Numbering cells along a curve.

/** The Z-order (Morton) number of cell (x, y): the bits of x and y interleaved, as geohash does. */
export function zOrder(x: number, y: number, bits: number): number {
  let d = 0;
  for (let i = bits - 1; i >= 0; i--) d = d * 4 + ((y >> i) & 1) * 2 + ((x >> i) & 1);
  return d;
}

/** The Hilbert curve number of cell (x, y) on an n × n grid (n a power of two). */
export function hilbert(n: number, x: number, y: number): number {
  let d = 0;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
  }
  return d;
}

/** How many runs of consecutive numbers a set of cell numbers makes: the range scans a sorted store needs. */
export function runs(ids: readonly number[]): number {
  const s = [...ids].sort((a, b) => a - b);
  let n = s.length ? 1 : 0;
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] + 1) n++;
  return n;
}

/** The ranges a k × k query at (qx, qy) needs on an n × n grid, for each curve. */
export function queryRanges(n: number, qx: number, qy: number, k: number): { z: number; hilbert: number } {
  const bits = Math.log2(n);
  const zs: number[] = [];
  const hs: number[] = [];
  for (let x = qx; x < qx + k; x++) for (let y = qy; y < qy + k; y++) {
    zs.push(zOrder(x, y, bits));
    hs.push(hilbert(n, x, y));
  }
  return { z: runs(zs), hilbert: runs(hs) };
}

const curveFigure = figure(['hilbert'], (_ctx, t) => {
  const N = 8;
  const K = 3;
  const C = 40;
  const W = 470;
  const H = N * C + 20;
  const f = frame(W, H, 2);
  const g = svg('g');
  f.svg.append(g);
  let curve: 'z' | 'h' = 'z';
  let qx = 2;
  let qy = 1;
  const x0 = 10;
  const y0 = 10;
  const paint = () => {
    const parts: SVGElement[] = [];
    const num = (x: number, y: number) => (curve === 'z' ? zOrder(x, y, 3) : hilbert(N, x, y));
    const at: Pt[] = new Array(N * N);
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) at[num(x, y)] = { x: x0 + x * C + C / 2, y: y0 + y * C + C / 2 };
    const inQ = (x: number, y: number) => x >= qx && x < qx + K && y >= qy && y < qy + K;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      parts.push(svg('rect', { x: x0 + x * C, y: y0 + y * C, width: C, height: C, fill: inQ(x, y) ? tint(COL.request, 0.2) : COL.paper, stroke: COL.grid, 'stroke-width': 1 }));
    }
    for (let i = 1; i < at.length; i++) parts.push(line(at[i - 1].x, at[i - 1].y, at[i].x, at[i].y, COL.data, 1.6));
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      parts.push(label(x0 + x * C + C / 2, y0 + y * C + C / 2 + 4, String(num(x, y)), { anchor: 'middle', size: 'note', fill: inQ(x, y) ? COL.request : COL.soft, halo: COL.paper }));
    }
    const ids: number[] = [];
    for (let x = qx; x < qx + K; x++) for (let y = qy; y < qy + K; y++) ids.push(num(x, y));
    const sorted = [...ids].sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const v of sorted) {
      const last = groups[groups.length - 1];
      if (last && v === last[last.length - 1] + 1) last.push(v);
      else groups.push([v]);
    }
    const sx = x0 + N * C + 16;
    parts.push(small(sx, 24, 'Range scans', { bold: true }));
    groups.slice(0, 9).forEach((gr, i) => parts.push(small(sx, 44 + i * 16, gr.length > 1 ? `${gr[0]} to ${gr[gr.length - 1]}` : `${gr[0]}`, { fill: COL.request })));
    if (groups.length > 9) parts.push(small(sx, 44 + 9 * 16, `and ${groups.length - 9} more`, { soft: true }));
    redraw(g, ...parts);
    f.readout.textContent = `${curve === 'z' ? 'Z-order (as geohash numbers its cells)' : 'Hilbert curve (as S2 numbers its cells)'}: the 9 cells around the search make ${groups.length} run${groups.length > 1 ? 's' : ''} of consecutive numbers, so a store sorted by cell number answers with ${groups.length} range scan${groups.length > 1 ? 's' : ''}.`;
    if (curve === 'h') t.done();
  };
  const curves = named(pick(['Z-order', 'Hilbert'], 0, (i) => { curve = i ? 'h' : 'z'; paint(); }), 'Curve:');
  const across = slider('Search across', 0, N - K, 1, qx, (v) => `${v}`, (v) => { qx = v; paint(); }, 'request');
  const down = slider('Search down', 0, N - K, 1, qy, (v) => `${v}`, (v) => { qy = v; paint(); }, 'request');
  f.controls.append(curves.node, across.node, down.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// Sharding the live positions by cell.

const SHARDS = 4;

const shardParts = (rps: number, fine: boolean): PartSpec[] => [
  { id: 'phones', kind: 'client', label: 'Driver apps', x: 60, y: 120, rps, keys: fine ? 400 : 40, skew: fine ? 0.5 : 1.3, timeoutMs: 1500 },
  { id: 'router', kind: 'lb', label: 'By cell', x: 190, y: 120, policy: { type: 'hash' } },
  ...Array.from({ length: SHARDS }, (_, i): PartSpec => ({ id: `s${i}`, kind: 'shard', label: `Shard ${i + 1}`, x: 360, y: 30 + i * 60, serviceMs: 8, servers: 2 })),
];

const shardLinks = (): LinkSpec[] => [
  { from: 'phones', to: 'router', ms: 30 },
  ...Array.from({ length: SHARDS }, (_, i): LinkSpec => ({ from: 'router', to: `s${i}`, ms: 25 })),
];

const shardsFigure = figure(['split'], (ctx, t) => {
  let rps = 300;
  let fine = false;
  const counts = new Map<string, number>();
  const spec = () => ({ parts: shardParts(rps, fine), links: shardLinks(), seed: 5 });
  let since = 0;
  let clock = 0;
  const hook = (sys: System) => {
    sys.hooks.serve = (p) => counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  };
  const d = liveDiagram(ctx, spec(), {
    w: 470, h: 240, lines: 3, speed: 150,
    sub: (p) => (p.id.startsWith('s') ? `${Math.round(((counts.get(p.id) ?? 0) / Math.max(1, clock - since)) * 1000)} a second` : undefined),
    onFrame: (sys) => {
      clock = sys.now;
      if (sys.now - since > 4000) { counts.clear(); since = sys.now; }
      d.f.readout.textContent = `${fine ? 'Smaller cells where drivers are dense' : 'One cell size everywhere: the city centre is a few cells'}. ${statsLine(sys.stats(2500))}`;
    },
  });
  hook(d.sys);
  const rebuild = () => { d.rebuild(spec()); hook(d.sys); counts.clear(); since = 0; clock = 0; };
  const check = () => { if (fine && rps >= 400) t.done(); };
  const load = slider('Updates a second', 100, 600, 50, rps, (v) => `${v}`, (v) => { rps = v; d.sys.setRate('phones', v); check(); }, 'write');
  const cells = named(pick(['One size', 'Smaller where busy'], 0, (i) => { fine = i === 1; rebuild(); check(); }), 'Cells:');
  d.f.controls.append(load.node, cells.node);
  return d.f.node;
});

export const FIGS = {
  'nearby-cells': cellsFigure,
  'nearby-curve': curveFigure,
  'nearby-shards': shardsFigure,
};
