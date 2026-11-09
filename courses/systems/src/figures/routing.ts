// Lesson M3, Across a continent in a millisecond: a small road network and
// the junctions each search settles (Dijkstra, A*, from both ends, and a
// contraction hierarchy); how contracting a junction adds a shortcut; and a
// jam on a road, which a contraction hierarchy must preprocess again for
// while customisable route planning recomputes one cell.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { button, COL, figure, frame, named, pick, player, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// The road graph.

export interface Node { x: number; y: number; col: number; row: number }
export interface Edge { a: number; b: number; len: number; fast: boolean }
export interface Graph { nodes: Node[]; edges: Edge[]; adj: { to: number; e: number }[][] }

export const COLS = 16;
export const ROWS = 10;
/** Drawing units to metres. */
export const METRES = 60;
/** Speeds, m/s: town roads 40 km/h, the motorway 100 km/h. */
export const SLOW = 40 / 3.6;
export const FAST = 100 / 3.6;
const MOTOR_ROW = 4;
const MOTOR_COL = 9;

/** A grid of junctions, jittered, with a few roads missing and one motorway each way across. */
export function roadGraph(seed = 11): Graph {
  const rng = makeRng(seed);
  const nodes: Node[] = [];
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const onMotor = row === MOTOR_ROW || col === MOTOR_COL;
    const j = onMotor ? 3 : 9;
    nodes.push({ x: 20 + col * 29 + (rng() - 0.5) * j, y: 18 + row * 28 + (rng() - 0.5) * j, col, row });
  }
  const id = (c: number, r: number) => r * COLS + c;
  const edges: Edge[] = [];
  const add = (a: number, b: number, fast: boolean) => edges.push({ a, b, len: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) * METRES, fast });
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    if (col + 1 < COLS) {
      const fast = row === MOTOR_ROW;
      if (fast || rng() > 0.12) add(id(col, row), id(col + 1, row), fast);
    }
    if (row + 1 < ROWS) {
      const fast = col === MOTOR_COL;
      if (fast || rng() > 0.12) add(id(col, row), id(col, row + 1), fast);
    }
  }
  const adj: { to: number; e: number }[][] = nodes.map(() => []);
  edges.forEach((e, i) => {
    adj[e.a].push({ to: e.b, e: i });
    adj[e.b].push({ to: e.a, e: i });
  });
  return { nodes, edges, adj };
}

/** Travel time of each edge in seconds; `jam` multiplies the named edges. */
export function weights(g: Graph, jams: ReadonlySet<number> = new Set(), factor = 8): number[] {
  return g.edges.map((e, i) => (e.len / (e.fast ? FAST : SLOW)) * (jams.has(i) ? factor : 1));
}

/** A binary heap of [key, value]. */
class Heap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  push(k: number, v: number) {
    const a = this.a;
    a.push([k, v]);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  peek(): number { return this.a.length ? this.a[0][0] : Infinity; }
  pop(): [number, number] {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export interface Route {
  /** Travel time, s. */
  time: number;
  /** Junctions on the route, in order. */
  path: number[];
  /** Junctions settled, in order, and which end's search settled each (0 from the start, 1 from the end). */
  settled: number[];
  side: number[];
}

const walk = (prev: number[], t: number) => {
  const p: number[] = [];
  for (let v = t; v >= 0; v = prev[v]) p.unshift(v);
  return p;
};

/** Dijkstra's algorithm, or A* with `h` a lower bound on the time left. */
export function dijkstra(g: Graph, w: readonly number[], s: number, t: number, h: (v: number) => number = () => 0): Route {
  const n = g.nodes.length;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  const settled: number[] = [];
  const q = new Heap();
  dist[s] = 0;
  q.push(h(s), s);
  while (q.size) {
    const [, u] = q.pop();
    if (done[u]) continue;
    done[u] = true;
    settled.push(u);
    if (u === t) break;
    for (const { to, e } of g.adj[u]) {
      const d = dist[u] + w[e];
      if (d < dist[to]) {
        dist[to] = d;
        prev[to] = u;
        q.push(d + h(to), to);
      }
    }
  }
  return { time: dist[t], path: walk(prev, t), settled, side: settled.map(() => 0) };
}

/** The A* bound: straight-line distance at motorway speed. */
export const straightLine = (g: Graph, t: number) => (v: number) => (Math.hypot(g.nodes[v].x - g.nodes[t].x, g.nodes[v].y - g.nodes[t].y) * METRES) / FAST;

/** Dijkstra from both ends at once, stopping when the two searches can no longer improve the best meeting. */
export function bidirectional(g: Graph, w: readonly number[], s: number, t: number): Route {
  const n = g.nodes.length;
  const dist = [new Array(n).fill(Infinity), new Array(n).fill(Infinity)];
  const prev = [new Array(n).fill(-1), new Array(n).fill(-1)];
  const done = [new Array(n).fill(false), new Array(n).fill(false)];
  const q = [new Heap(), new Heap()];
  const settled: number[] = [];
  const side: number[] = [];
  dist[0][s] = 0;
  dist[1][t] = 0;
  q[0].push(0, s);
  q[1].push(0, t);
  let best = Infinity;
  let meet = -1;
  while (q[0].size || q[1].size) {
    if (q[0].peek() + q[1].peek() >= best) break;
    const k = q[0].peek() <= q[1].peek() ? 0 : 1;
    const [, u] = q[k].pop();
    if (done[k][u]) continue;
    done[k][u] = true;
    settled.push(u);
    side.push(k);
    for (const { to, e } of g.adj[u]) {
      const d = dist[k][u] + w[e];
      if (d < dist[k][to]) {
        dist[k][to] = d;
        prev[k][to] = u;
        q[k].push(d, to);
      }
      if (dist[k][to] + dist[1 - k][to] < best) {
        best = dist[k][to] + dist[1 - k][to];
        meet = to;
      }
    }
  }
  const path = meet < 0 ? [] : [...walk(prev[0], meet), ...walk(prev[1], meet).reverse().slice(1)];
  return { time: best, path, settled, side };
}

// ---------------------------------------------------------------------------
// A contraction hierarchy.

export interface Arc { to: number; w: number; mid: number }
export interface Hierarchy { rank: number[]; up: Arc[][]; shortcuts: number }

/**
 * Contract junctions from least to most important. Removing a junction adds a
 * shortcut between two of its neighbours whenever the way through it is the
 * only shortest path between them (no witness path avoids it). Importance is
 * the edge difference (shortcuts added less edges removed) plus how many
 * neighbours are already contracted, updated lazily.
 */
export function contract(g: Graph, w: readonly number[]): Hierarchy {
  const n = g.nodes.length;
  const arcs: Map<number, { w: number; mid: number }>[] = g.nodes.map(() => new Map());
  g.edges.forEach((e, i) => {
    const put = (a: number, b: number) => {
      const old = arcs[a].get(b);
      if (!old || w[i] < old.w) arcs[a].set(b, { w: w[i], mid: -1 });
    };
    put(e.a, e.b);
    put(e.b, e.a);
  });
  const contracted = new Array(n).fill(false);
  const rank = new Array(n).fill(-1);
  const deleted = new Array(n).fill(0);
  const up: Arc[][] = g.nodes.map(() => []);
  let shortcuts = 0;

  /** Shortest distance from u to x avoiding v, looking no further than `limit`. */
  const witness = (u: number, v: number, limit: number, targets: Set<number>): Map<number, number> => {
    const dist = new Map<number, number>([[u, 0]]);
    const q = new Heap();
    q.push(0, u);
    let left = targets.size;
    let steps = 0;
    const seen = new Set<number>();
    while (q.size && left > 0 && steps < 200) {
      const [d, x] = q.pop();
      if (seen.has(x)) continue;
      seen.add(x);
      steps++;
      if (d > limit) break;
      if (targets.has(x)) left--;
      for (const [y, a] of arcs[x]) {
        if (y === v || contracted[y]) continue;
        const nd = d + a.w;
        if (nd < (dist.get(y) ?? Infinity)) {
          dist.set(y, nd);
          q.push(nd, y);
        }
      }
    }
    return dist;
  };

  const needed = (v: number): [number, number, number][] => {
    const nb = [...arcs[v].entries()].filter(([x]) => !contracted[x]);
    const out: [number, number, number][] = [];
    for (const [u, au] of nb) {
      const targets = new Set(nb.map(([x]) => x).filter((x) => x !== u));
      const maxW = Math.max(0, ...nb.map(([, a]) => a.w));
      const dist = witness(u, v, au.w + maxW, targets);
      for (const [x, ax] of nb) {
        if (x <= u) continue;
        const via = au.w + ax.w;
        if ((dist.get(x) ?? Infinity) > via) out.push([u, x, via]);
      }
    }
    return out;
  };
  const priority = (v: number) => {
    const live = [...arcs[v].keys()].filter((x) => !contracted[x]).length;
    return needed(v).length - live + deleted[v];
  };

  const q = new Heap();
  for (let v = 0; v < n; v++) q.push(priority(v), v);
  let order = 0;
  while (q.size) {
    const [p, v] = q.pop();
    if (contracted[v]) continue;
    const now = priority(v);
    if (now > p && q.size && now > q.peek()) {
      q.push(now, v);
      continue;
    }
    for (const [u, x, via] of needed(v)) {
      for (const [a, b] of [[u, x], [x, u]]) {
        const old = arcs[a].get(b);
        if (!old || via < old.w) arcs[a].set(b, { w: via, mid: v });
      }
      shortcuts++;
    }
    for (const [x, a] of arcs[v]) {
      if (!contracted[x]) {
        up[v].push({ to: x, w: a.w, mid: a.mid });
        deleted[x]++;
      }
    }
    contracted[v] = true;
    rank[v] = order++;
  }
  // Each upward arc points to a junction contracted later; keep the shortcut midpoints to unpack routes.
  const midOf = new Map<string, number>();
  for (let v = 0; v < n; v++) for (const a of up[v]) midOf.set(`${v}>${a.to}`, a.mid);
  (up as Arc[][] & { mids?: Map<string, number> }).mids = midOf;
  return { rank, up, shortcuts };
}

/** A query on the hierarchy: from each end, follow only arcs to more important junctions. */
export function hierarchyRoute(g: Graph, h: Hierarchy, s: number, t: number): Route {
  const n = g.nodes.length;
  const dist = [new Array(n).fill(Infinity), new Array(n).fill(Infinity)];
  const prev = [new Array(n).fill(-1), new Array(n).fill(-1)];
  const done = [new Array(n).fill(false), new Array(n).fill(false)];
  const q = [new Heap(), new Heap()];
  const settled: number[] = [];
  const side: number[] = [];
  dist[0][s] = 0;
  dist[1][t] = 0;
  q[0].push(0, s);
  q[1].push(0, t);
  let best = Infinity;
  let meet = -1;
  while (q[0].size || q[1].size) {
    const k = q[0].size && (!q[1].size || q[0].peek() <= q[1].peek()) ? 0 : 1;
    if (q[k].peek() >= best) {
      q[k] = new Heap();
      continue;
    }
    const [, u] = q[k].pop();
    if (done[k][u]) continue;
    done[k][u] = true;
    settled.push(u);
    side.push(k);
    if (dist[0][u] + dist[1][u] < best) {
      best = dist[0][u] + dist[1][u];
      meet = u;
    }
    for (const a of h.up[u]) {
      const d = dist[k][u] + a.w;
      if (d < dist[k][a.to]) {
        dist[k][a.to] = d;
        prev[k][a.to] = u;
        q[k].push(d, a.to);
      }
    }
  }
  const mids = (h.up as Arc[][] & { mids?: Map<string, number> }).mids!;
  const unpack = (a: number, b: number): number[] => {
    const lo = h.rank[a] < h.rank[b] ? a : b;
    const hi = lo === a ? b : a;
    const m = mids.get(`${lo}>${hi}`) ?? -1;
    if (m < 0) return [a, b];
    return [...unpack(a, m), ...unpack(m, b).slice(1)];
  };
  let path: number[] = [];
  if (meet >= 0) {
    const coarse = [...walk(prev[0], meet), ...walk(prev[1], meet).reverse().slice(1)];
    path = [coarse[0]];
    for (let i = 1; i < coarse.length; i++) path.push(...unpack(coarse[i - 1], coarse[i]).slice(1));
  }
  return { time: best, path, settled, side };
}

// ---------------------------------------------------------------------------
// Customisable route planning: cells, and shortcuts between their boundary junctions.

/** Cells of 4 columns by 5 rows: 8 cells. */
export const cellOf = (nd: Node) => Math.floor(nd.col / 4) + 4 * Math.floor(nd.row / 5);
export const CELLS = 8;

/** Junctions with a road leaving their cell. */
export function boundary(g: Graph): Set<number> {
  const out = new Set<number>();
  for (const e of g.edges) if (cellOf(g.nodes[e.a]) !== cellOf(g.nodes[e.b])) { out.add(e.a); out.add(e.b); }
  return out;
}

/** The customisation step for one cell: the travel time between each pair of its boundary junctions, using only roads inside the cell. */
export function customiseCell(g: Graph, w: readonly number[], cell: number): Map<string, number> {
  const b = [...boundary(g)].filter((v) => cellOf(g.nodes[v]) === cell);
  const out = new Map<string, number>();
  for (const s of b) {
    const dist = new Map<number, number>([[s, 0]]);
    const q = new Heap();
    q.push(0, s);
    const seen = new Set<number>();
    while (q.size) {
      const [d, u] = q.pop();
      if (seen.has(u)) continue;
      seen.add(u);
      for (const { to, e } of g.adj[u]) {
        if (cellOf(g.nodes[to]) !== cell) continue;
        const nd = d + w[e];
        if (nd < (dist.get(to) ?? Infinity)) {
          dist.set(to, nd);
          q.push(nd, to);
        }
      }
    }
    for (const x of b) if (x !== s && dist.has(x)) out.set(`${s}>${x}`, dist.get(x)!);
  }
  return out;
}

/**
 * A query over the overlay: roads inside the start's and the end's cells,
 * roads between cells, and elsewhere only the cells' boundary shortcuts.
 */
export function overlayRoute(g: Graph, w: readonly number[], cliques: readonly Map<string, number>[], s: number, t: number): { time: number; settled: number } {
  const n = g.nodes.length;
  const open = new Set([cellOf(g.nodes[s]), cellOf(g.nodes[t])]);
  const dist = new Array(n).fill(Infinity);
  const done = new Array(n).fill(false);
  const q = new Heap();
  dist[s] = 0;
  q.push(0, s);
  let settled = 0;
  const bnd = boundary(g);
  while (q.size) {
    const [, u] = q.pop();
    if (done[u]) continue;
    done[u] = true;
    settled++;
    if (u === t) break;
    const cu = cellOf(g.nodes[u]);
    const relax = (to: number, d: number) => {
      if (d < dist[to]) {
        dist[to] = d;
        q.push(d, to);
      }
    };
    for (const { to, e } of g.adj[u]) {
      const ct = cellOf(g.nodes[to]);
      if (ct !== cu || open.has(cu)) relax(to, dist[u] + w[e]);
    }
    if (bnd.has(u) && !open.has(cu)) {
      for (const [k, d] of cliques[cu]) {
        const [a, b] = k.split('>').map(Number);
        if (a === u) relax(b, dist[u] + d);
      }
    }
  }
  return { time: dist[t], settled };
}

// ---------------------------------------------------------------------------
// Drawing.

const W = 480;
const H = 300;

function drawRoads(g: Graph, jams: ReadonlySet<number> = new Set()): SVGElement[] {
  const out: SVGElement[] = [];
  g.edges.forEach((e, i) => {
    const a = g.nodes[e.a];
    const b = g.nodes[e.b];
    out.push(line(a.x, a.y, b.x, b.y, jams.has(i) ? COL.busy : e.fast ? COL.ink : COL.soft, jams.has(i) ? 4 : e.fast ? 3 : 1.2, { opacity: e.fast || jams.has(i) ? 0.9 : 0.55 }));
  });
  return out;
}

const routeLine = (g: Graph, path: readonly number[]) =>
  svg('polyline', { points: path.map((v) => `${g.nodes[v].x},${g.nodes[v].y}`).join(' '), fill: 'none', stroke: COL.answer, 'stroke-width': 4, 'stroke-linejoin': 'round', opacity: 0.85 });

const ends = (g: Graph, s: number, t: number): SVGElement[] => [
  svg('circle', { cx: g.nodes[s].x, cy: g.nodes[s].y, r: 6, fill: COL.paper, stroke: COL.ink, 'stroke-width': 2.5 }),
  svg('rect', { x: g.nodes[t].x - 6, y: g.nodes[t].y - 6, width: 12, height: 12, fill: COL.ink }),
];

const mins = (s: number) => `${Math.round(s / 6) / 10} min`;

export const TRIPS: readonly [number, number][] = [[3 * COLS + 1, 6 * COLS + 14], [8 * COLS + 2, 1 * COLS + 13], [0 * COLS + 6, 9 * COLS + 11], [5 * COLS + 0, 2 * COLS + 15]];

type Algo = 'dijkstra' | 'astar' | 'bidi' | 'ch';

const searchFigure = figure(['ch'], (ctx, t) => {
  const f = frame(W, H, 3);
  const g0 = svg('g');
  const g1 = svg('g');
  f.svg.append(g0, g1);
  const g = roadGraph();
  const w = weights(g);
  const ch = contract(g, w);
  let algo: Algo = 'dijkstra';
  let trip = 0;
  let step = 1;
  const run = (): Route => {
    const [s, e] = TRIPS[trip];
    if (algo === 'dijkstra') return dijkstra(g, w, s, e);
    if (algo === 'astar') return dijkstra(g, w, s, e, straightLine(g, e));
    if (algo === 'bidi') return bidirectional(g, w, s, e);
    return hierarchyRoute(g, ch, s, e);
  };
  let r = run();
  redraw(g0, ...drawRoads(g));
  const paint = () => {
    const [s, e] = TRIPS[trip];
    const k = Math.round(step * r.settled.length);
    const parts: SVGElement[] = [];
    for (let i = 0; i < k; i++) {
      const v = r.settled[i];
      parts.push(svg('circle', { cx: g.nodes[v].x, cy: g.nodes[v].y, r: 5, fill: r.side[i] ? tint(COL.busy, 0.55) : COL.busy, stroke: COL.paper, 'stroke-width': 0.8 }));
    }
    if (step >= 1) parts.push(routeLine(g, r.path));
    parts.push(...ends(g, s, e));
    redraw(g1, ...parts);
    const name = { dijkstra: 'Dijkstra', astar: 'A*', bidi: 'From both ends', ch: 'Contraction hierarchy' }[algo];
    const extra = algo === 'ch' ? ` Preprocessing added ${ch.shortcuts} shortcuts to the ${g.edges.length} roads.` : '';
    f.readout.textContent = step < 1
      ? `${name}: ${k} junctions settled so far.`
      : `${name} settled ${r.settled.length} of ${g.nodes.length} junctions. Fastest route: ${mins(r.time)}.${extra}`;
    if (algo === 'ch' && step >= 1) t.done();
  };
  const time = slider('Search', 0, 1, 0.01, 1, (v) => `${Math.round(v * 100)}%`, (v) => { step = v; paint(); }, 'busy');
  const play = player(time, ctx, { seconds: 5 });
  const algos = named(pick(['Dijkstra', 'A*', 'Both ends', 'Hierarchy'], 0, (i) => {
    algo = (['dijkstra', 'astar', 'bidi', 'ch'] as const)[i];
    r = run();
    time.set(0);
    play.play();
  }), 'Search:');
  const another = button('Another trip', () => { trip = (trip + 1) % TRIPS.length; r = run(); time.set(0); play.play(); });
  f.controls.append(algos.node, play.node, time.node, another);
  paint();
  return f.node;
});

const shortcutStill = () => {
  const s = still(W, 172);
  const g = svg('g');
  s.svg.append(g);
  const parts: SVGElement[] = [];
  const node = (x: number, y: number, name: string, color: string = COL.ink, dashed = false) => {
    parts.push(svg('circle', { cx: x, cy: y, r: 13, fill: COL.paper, stroke: color, 'stroke-width': 1.8, ...(dashed ? { 'stroke-dasharray': '3 2' } : {}) }), label(x, y + 4, name, { anchor: 'middle', fill: color }));
  };
  const road = (x1: number, y1: number, x2: number, y2: number, wlabel: string, color: string = COL.soft, dashed = false, side: 'left' | 'right' | 'below' | 'above' = 'above') => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const at = { left: [mx - 8, my - 4, 'end'], right: [mx + 8, my - 4, undefined], below: [mx, my + 16, 'middle'], above: [mx, my - 7, 'middle'] }[side] as [number, number, 'end' | 'middle' | undefined];
    parts.push(line(x1, y1, x2, y2, color, 2, dashed ? { 'stroke-dasharray': '6 4' } : {}), small(at[0], at[1], wlabel, { anchor: at[2], fill: color }));
  };
  // Left: v is on the only shortest path from u to w.
  parts.push(small(10, 16, 'Contract v: the only quick way from u to w', { bold: true }), small(10, 30, 'goes through it, so add a shortcut u–w of 3 + 4 = 7.', { soft: true }));
  road(40, 120, 120, 70, '3 min', COL.soft, false, 'left');
  road(120, 70, 200, 120, '4 min', COL.soft, false, 'right');
  road(40, 120, 200, 120, '7 min (shortcut)', COL.answer, true, 'below');
  node(40, 120, 'u');
  node(120, 70, 'v', COL.soft, true);
  node(200, 120, 'w');
  // Right: a witness path makes the shortcut unnecessary.
  parts.push(small(256, 16, 'Contract v: a witness path u–x–w of 6', { bold: true }), small(256, 30, 'beats 7 without v, so no shortcut is needed.', { soft: true }));
  road(286, 130, 366, 70, '3 min', COL.soft, false, 'left');
  road(366, 70, 446, 130, '4 min', COL.soft, false, 'right');
  road(286, 130, 366, 146, '3 min', COL.request, false, 'below');
  road(366, 146, 446, 130, '3 min', COL.request, false, 'below');
  node(286, 130, 'u');
  node(366, 70, 'v', COL.soft, true);
  node(446, 130, 'w');
  node(366, 146, 'x', COL.request);
  redraw(g, ...parts);
  return { node: s.node };
};

const crpFigure = figure(['jam'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const gRoads = svg('g');
  const gTop = svg('g');
  const gHit = svg('g');
  f.svg.append(gRoads, gTop, gHit);
  const g = roadGraph();
  const bnd = boundary(g);
  const [s, e] = TRIPS[0];
  const jams = new Set<number>();
  const base = dijkstra(g, weights(g), s, e);
  const baseEdges = new Set<number>();
  for (let i = 1; i < base.path.length; i++) {
    const a = base.path[i - 1];
    const b = base.path[i];
    const k = g.adj[a].find((x) => x.to === b);
    if (k) baseEdges.add(k.e);
  }
  // Cell outlines from the junction grid.
  const cellBox = (c: number) => {
    const cs = g.nodes.filter((nd) => cellOf(nd) === c);
    const xs = cs.map((nd) => nd.x);
    const ys = cs.map((nd) => nd.y);
    return { x: Math.min(...xs) - 9, y: Math.min(...ys) - 9, w: Math.max(...xs) - Math.min(...xs) + 18, h: Math.max(...ys) - Math.min(...ys) + 18 };
  };
  const paint = () => {
    const w = weights(g, jams);
    const r = dijkstra(g, w, s, e);
    const dirty = new Set([...jams].flatMap((i) => [cellOf(g.nodes[g.edges[i].a]), cellOf(g.nodes[g.edges[i].b])]));
    const parts: SVGElement[] = [];
    for (let c = 0; c < CELLS; c++) {
      const b = cellBox(c);
      parts.push(svg('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 6, fill: dirty.has(c) ? tint(COL.busy, 0.12) : 'none', stroke: COL.data, 'stroke-width': 1.2, 'stroke-dasharray': '5 3' }));
    }
    redraw(gRoads, ...parts, ...drawRoads(g, jams));
    const top: SVGElement[] = [];
    for (const v of bnd) top.push(svg('rect', { x: g.nodes[v].x - 3, y: g.nodes[v].y - 3, width: 6, height: 6, fill: COL.data }));
    top.push(routeLine(g, r.path), ...ends(g, s, e));
    redraw(gTop, ...top);
    const cliques = Array.from({ length: CELLS }, (_, c) => customiseCell(g, w, c));
    const o = overlayRoute(g, w, cliques, s, e);
    f.readout.textContent = !jams.size
      ? `Tap a road to put a jam on it. Squares mark the ${bnd.size} junctions on cell boundaries; the route takes ${mins(r.time)}.`
      : `Route now ${mins(r.time)} (found over the overlay, settling ${o.settled} junctions). A contraction hierarchy would preprocess all ${g.nodes.length} junctions again; route planning by cells recomputes the shortcuts of ${dirty.size} cell${dirty.size > 1 ? 's' : ''} of ${CELLS}.`;
  };
  g.edges.forEach((ed, i) => {
    const a = g.nodes[ed.a];
    const b = g.nodes[ed.b];
    const hit = svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'transparent', 'stroke-width': 12, style: 'cursor:pointer', 'data-edge': i });
    hit.addEventListener('click', () => {
      if (jams.has(i)) jams.delete(i);
      else jams.add(i);
      paint();
      if ([...jams].some((j) => baseEdges.has(j))) t.done();
    });
    gHit.append(hit);
  });
  const clear = button('Clear jams', () => { jams.clear(); paint(); });
  f.controls.append(clear);
  paint();
  return f.node;
});

export const FIGS = {
  'routing-search': searchFigure,
  'routing-shortcut': shortcutStill,
  'routing-crp': crpFigure,
};
