// Lesson D1, Saying no politely: four ways to count requests against a limit
// (fixed window, sliding log, sliding window counter, token bucket), the
// bucket's record in Redis, and a workbench where a noisy tenant floods a
// shared API with and without a limiter. Also the pieces the other studio
// lessons share: a worked estimate that asks for a guess first, and a board
// of boxes and wires whose labels and widths follow the reader's choices.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import type { FigureFactory } from 'didactics/figure';
import { liveDiagram, System as SystemClass, type PartSpec, type LinkSpec, type System } from './diagram';
import { COL, figure, frame, guessFirst, named, pick, slider, tint, type ColorKey } from './kit';

// ---------------------------------------------------------------------------
// Shared by the studio lessons: a board of boxes and wires.

export interface BoardBox {
  id: string;
  x: number;
  y: number;
  label: string;
  /** A second line under the box: a count, a rate. */
  sub?: string;
  w?: number;
  h?: number;
  color?: ColorKey;
  shape?: 'box' | 'store' | 'pill';
  /** Drawn pale: not in this design. */
  faded?: boolean;
  /** Drawn as a stack: many of these. */
  stack?: boolean;
}

export interface BoardWire {
  from: string;
  to: string;
  /** Words beside the wire: a rate, a size. */
  text?: string;
  /** How heavy the traffic is, 0 to 1: the line's width. */
  weight?: number;
  color?: ColorKey;
  dashed?: boolean;
  faded?: boolean;
  /** Move the words off the line, drawing units (positive is up). */
  lift?: number;
}

/** Where a line from the centre of a box toward (tx, ty) leaves it. */
function edge(b: Required<Pick<BoardBox, 'x' | 'y' | 'w' | 'h'>>, tx: number, ty: number): [number, number] {
  const dx = tx - b.x;
  const dy = ty - b.y;
  if (!dx && !dy) return [b.x, b.y];
  const s = Math.min(dx ? b.w / 2 / Math.abs(dx) : Infinity, dy ? b.h / 2 / Math.abs(dy) : Infinity);
  return [b.x + dx * s, b.y + dy * s];
}

/** Draw boxes and wires into `g`, replacing what was there. */
export function drawBoard(g: SVGElement, boxes: readonly BoardBox[], wires: readonly BoardWire[]): void {
  const full = new Map(boxes.map((b) => [b.id, { ...b, w: b.w ?? 86, h: b.h ?? 34 }]));
  const out: SVGElement[] = [];
  for (const w of wires) {
    const a = full.get(w.from);
    const b = full.get(w.to);
    if (!a || !b) continue;
    const [x1, y1] = edge(a, b.x, b.y);
    const [x2, y2] = edge(b, a.x, a.y);
    const col = COL[w.color ?? 'soft'];
    const width = 1.2 + 6 * Math.max(0, Math.min(1, w.weight ?? 0));
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = 5 + width;
    const op = w.faded ? 0.3 : 1;
    out.push(
      line(x1, y1, x2 - head * 0.8 * Math.cos(ang), y2 - head * 0.8 * Math.sin(ang), col, width, { opacity: op, ...(w.dashed ? { 'stroke-dasharray': '5 4' } : {}) }),
      svg('polygon', { points: `${x2},${y2} ${x2 - head * Math.cos(ang + 0.45)},${y2 - head * Math.sin(ang + 0.45)} ${x2 - head * Math.cos(ang - 0.45)},${y2 - head * Math.sin(ang - 0.45)}`, fill: col, opacity: op }),
    );
    if (w.text && !w.faded) {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - (w.lift ?? 6);
      out.push(small(mx, my, w.text, { anchor: 'middle', fill: col, halo: COL.paper, haloWidth: 3 }));
    }
  }
  for (const b of full.values()) {
    const col = COL[b.color ?? 'ink'];
    const op = b.faded ? 0.35 : 1;
    const x = b.x - b.w / 2;
    const y = b.y - b.h / 2;
    const fill = tint(col, 0.1);
    const shapeOf = (dx: number, dy: number): SVGElement => {
      if (b.shape === 'store') {
        const e = 5;
        return svg('path', { d: `M${x + dx},${y + dy + e} a${b.w / 2},${e} 0 0 0 ${b.w},0 a${b.w / 2},${e} 0 0 0 ${-b.w},0 v${b.h - 2 * e} a${b.w / 2},${e} 0 0 0 ${b.w},0 v${-(b.h - 2 * e)}`, fill: COL.paper, stroke: col, 'stroke-width': 1.4, opacity: op });
      }
      return svg('rect', { x: x + dx, y: y + dy, width: b.w, height: b.h, rx: b.shape === 'pill' ? b.h / 2 : 4, fill: COL.paper, stroke: col, 'stroke-width': 1.4, opacity: op });
    };
    if (b.stack) out.push(shapeOf(6, -6), shapeOf(3, -3));
    out.push(shapeOf(0, 0));
    out.push(svg('rect', { x: x + 1, y: y + 1, width: b.w - 2, height: b.h - 2, rx: 3, fill, opacity: b.shape === 'store' ? 0 : op }));
    out.push(label(b.x, b.y + (b.sub ? -1 : 4), b.label, { anchor: 'middle', size: 'note', bold: true, attrs: { opacity: op } }));
    if (b.sub) out.push(small(b.x, b.y + 11, b.sub, { anchor: 'middle', soft: true, attrs: { opacity: op } }));
  }
  redraw(g, ...out);
}

// ---------------------------------------------------------------------------
// Shared by the studio lessons: a worked estimate, guessed first.

export interface EstimateInput {
  key: string;
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  log?: boolean;
  show: (v: number) => string;
  color?: ColorKey;
}

export interface EstimateRow {
  label: string;
  /** The answer, in words: "290,000 a second". */
  say: string;
  /** How it was worked: "25 billion ÷ 86,400 s". */
  how: string;
  color?: ColorKey;
}

export interface EstimateSpec {
  inputs: readonly EstimateInput[];
  rows: (v: Record<string, number>) => EstimateRow[];
  ask: string;
  options: readonly string[];
  answer: number;
  /** The readout once the guess is in. */
  after: (v: Record<string, number>) => string;
  lines?: number;
}

/**
 * An estimate worked line by line. The inputs' sliders stay locked and the
 * answers read "?" until the reader has guessed; then every line shows its
 * working, and moving a slider works it again. Goal `guess`: the guess is in.
 */
export function estimateFigure(spec: EstimateSpec): FigureFactory {
  return figure(['guess'], (_ctx, t) => {
    const W = 560;
    const rowH = 36;
    const n = spec.rows(Object.fromEntries(spec.inputs.map((i) => [i.key, i.value]))).length;
    const H = 18 + n * rowH;
    const f = frame(W, H, spec.lines ?? 2);
    const g = svg('g');
    f.svg.append(g);
    const v: Record<string, number> = Object.fromEntries(spec.inputs.map((i) => [i.key, i.value]));
    let open = false;
    const paint = () => {
      const rows = spec.rows(v);
      const parts: SVGElement[] = [];
      rows.forEach((r, i) => {
        const y = 10 + i * rowH;
        const col = COL[r.color ?? 'ink'];
        parts.push(svg('rect', { x: 4, y, width: W - 8, height: rowH - 6, rx: 4, fill: tint(col, i === rows.length - 1 ? 0.12 : 0.05) }));
        parts.push(label(14, y + 13, r.label, { size: 'note', bold: true }));
        parts.push(label(W - 14, y + 13, open ? r.say : '?', { anchor: 'end', bold: true, fill: col }));
        parts.push(small(14, y + 25, open ? r.how : 'worked once you have guessed', { soft: true }));
      });
      redraw(g, ...parts);
      if (open) f.readout.textContent = spec.after(v);
    };
    const sliders = spec.inputs.map((i) =>
      slider(i.label, i.log ? { min: i.min, max: i.max, scale: 'log', step: i.step, value: i.value, show: i.show, onInput: (x) => { v[i.key] = x; paint(); }, color: i.color } : { min: i.min, max: i.max, step: i.step ?? 1, value: i.value, show: i.show, onInput: (x) => { v[i.key] = x; paint(); }, color: i.color }),
    );
    for (const s of sliders) f.controls.append(s.node);
    guessFirst(t, f, {
      ask: spec.ask,
      options: spec.options,
      answer: spec.answer,
      sliders,
      after: () => {
        open = true;
        paint();
        t.done();
      },
    });
    paint();
    return f.node;
  });
}

// ---------------------------------------------------------------------------
// Counting requests against a limit.

export type Algo = 'fixed' | 'log' | 'counter' | 'bucket';
export const ALGOS: readonly Algo[] = ['fixed', 'log', 'counter', 'bucket'];
export const ALGO_NAMES = ['Fixed window', 'Sliding log', 'Sliding counter', 'Token bucket'];

/** The limit in the figure: 100 a minute. */
export const LIMIT = 100;
export const WINDOW = 60;

/**
 * The requests a client sends in the figure, seconds from the start: one
 * every 3 s for three minutes, and two bursts of 90 that straddle the end of
 * the first minute, the pattern that gets twice the limit past fixed windows.
 */
export function burstyClient(): number[] {
  const out: number[] = [];
  for (let s = 0; s < 180; s += 3) out.push(s + 0.5);
  for (let i = 0; i < 90; i++) out.push(52 + (8 * i) / 90);
  for (let i = 0; i < 90; i++) out.push(60 + (8 * i) / 90);
  return out.sort((a, b) => a - b);
}

/**
 * Which requests (times in seconds, sorted) each algorithm lets through, for
 * a limit of `limit` per `window` seconds. The token bucket refills at
 * limit/window a second and holds at most `burst` tokens.
 */
export function admit(algo: Algo, times: readonly number[], limit = LIMIT, window = WINDOW, burst = 20): boolean[] {
  const out: boolean[] = [];
  if (algo === 'fixed') {
    const count = new Map<number, number>();
    for (const t of times) {
      const k = Math.floor(t / window);
      const c = count.get(k) ?? 0;
      out.push(c < limit);
      if (c < limit) count.set(k, c + 1);
    }
  } else if (algo === 'log') {
    const kept: number[] = [];
    for (const t of times) {
      while (kept.length && kept[0] <= t - window) kept.shift();
      const ok = kept.length < limit;
      if (ok) kept.push(t);
      out.push(ok);
    }
  } else if (algo === 'counter') {
    const count = new Map<number, number>();
    for (const t of times) {
      const k = Math.floor(t / window);
      const into = (t - k * window) / window;
      const est = (count.get(k - 1) ?? 0) * (1 - into) + (count.get(k) ?? 0);
      const ok = est < limit;
      if (ok) count.set(k, (count.get(k) ?? 0) + 1);
      out.push(ok);
    }
  } else {
    const rate = limit / window;
    let tokens = burst;
    let last = 0;
    for (const t of times) {
      tokens = Math.min(burst, tokens + (t - last) * rate);
      last = t;
      const ok = tokens >= 1;
      if (ok) tokens -= 1;
      out.push(ok);
    }
  }
  return out;
}

/** The most of `times` (sorted) that fall in any span of `span` seconds, and where that span starts. */
export function busiest(times: readonly number[], span = WINDOW): { count: number; from: number } {
  let best = { count: 0, from: 0 };
  let j = 0;
  for (let i = 0; i < times.length; i++) {
    while (times[i] - times[j] >= span) j++;
    if (i - j + 1 > best.count) best = { count: i - j + 1, from: times[j] };
  }
  return best;
}

/** A token bucket: `rate` tokens a second, at most `burst` held. Time in ms. */
export class Bucket {
  tokens: number;
  last = 0;
  constructor(public rate: number, public burst: number) {
    this.tokens = burst;
  }
  take(nowMs: number): boolean {
    this.tokens = Math.min(this.burst, this.tokens + ((nowMs - this.last) / 1000) * this.rate);
    this.last = nowMs;
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// The bench: two tenants share one API.

/** The noisy tenant's requests all use key 0, so a limiter can tell the tenants apart. */
export const TENANT_LIMIT = 80;
export const API_CAPACITY = 200;
export const MODES = ['No limiter', 'A bucket in each gateway', 'Shared buckets in Redis'] as const;

function benchSpec(mode: number, failOpen: boolean, aRate: number, hot: { g1?: (k: number) => boolean; g2?: (k: number) => boolean; redis?: (k: number) => boolean }): { parts: PartSpec[]; links: LinkSpec[]; seed: number } {
  const parts: PartSpec[] = [
    { id: 'A', kind: 'client', label: 'Tenant A', x: 52, y: 60, rps: aRate, keys: 1, timeoutMs: 2000 },
    { id: 'B', kind: 'client', label: 'Tenant B', x: 52, y: 200, rps: 40, keys: 1000, timeoutMs: 2000 },
    { id: 'lb', kind: 'lb', label: 'Balancer', x: 150, y: 130, serviceMs: 0.2, servers: 8 },
    { id: 'g1', kind: 'server', label: 'Gateway 1', x: 255, y: 70, serviceMs: 0.5, servers: 8, health: true, policy: mode === 1 ? { type: 'cache', hot: hot.g1 } : mode === 2 ? { type: 'failover' } : { type: 'spread' } },
    { id: 'g2', kind: 'server', label: 'Gateway 2', x: 255, y: 190, serviceMs: 0.5, servers: 8, health: true, policy: mode === 1 ? { type: 'cache', hot: hot.g2 } : mode === 2 ? { type: 'failover' } : { type: 'spread' } },
    { id: 'api', kind: 'server', label: 'API', x: 470, y: 130, serviceMs: 40, servers: 8, queue: 100 },
    { id: 'db', kind: 'db', label: 'Database', x: 560, y: 220, serviceMs: 4, servers: 8 },
  ];
  if (mode === 2) parts.push({ id: 'redis', kind: 'cache', label: 'Redis', x: 360, y: 130, serviceMs: 0.3, servers: 4, policy: { type: 'cache', hot: hot.redis } });
  const links: LinkSpec[] = [
    { from: 'A', to: 'lb', ms: 25 },
    { from: 'B', to: 'lb', ms: 25 },
    { from: 'lb', to: 'g1', ms: 12 },
    { from: 'lb', to: 'g2', ms: 12 },
  ];
  if (mode === 2) {
    links.push({ from: 'g1', to: 'redis', ms: 10 }, { from: 'g2', to: 'redis', ms: 10 }, { from: 'redis', to: 'api', ms: 10 });
    if (failOpen) links.push({ from: 'g1', to: 'api', ms: 18, bend: 30 }, { from: 'g2', to: 'api', ms: 18, bend: -30 });
  } else {
    links.push({ from: 'g1', to: 'api', ms: 18 }, { from: 'g2', to: 'api', ms: 18 });
  }
  links.push({ from: 'api', to: 'db', ms: 10 });
  return { parts, links, seed: 7 };
}

interface Tally {
  t: number;
  client: string;
  what: 'ok' | 'limited' | 'failed';
  ms: number;
}

/** "99th percentile 48 ms" from a list of latencies. */
const p99 = (ms: number[]) => {
  if (!ms.length) return NaN;
  const s = [...ms].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.99 * s.length) - 1)];
};

export interface BenchSummary {
  /** Tenant B's 99th percentile of good answers, ms, and the share of its requests that failed or were refused. */
  bP99: number;
  bBad: number;
  /** Tenant A's requests a second: served, refused with 429, failed. */
  aOk: number;
  aLimited: number;
  aFailed: number;
}

/**
 * The bench's system and its bookkeeping: which answers were a limiter's
 * 429s, kept apart from real answers and failures, per tenant.
 */
export class LimiterBench {
  mode = 0;
  failOpen = true;
  aRate = 60;
  tally: Tally[] = [];
  private flagged = false;
  private limited = new Set<string>();
  private buckets = {
    shared: [new Bucket(TENANT_LIMIT, 40), new Bucket(TENANT_LIMIT, 40)],
    g1: [new Bucket(TENANT_LIMIT / 2, 20), new Bucket(TENANT_LIMIT / 2, 20)],
    g2: [new Bucket(TENANT_LIMIT / 2, 20), new Bucket(TENANT_LIMIT / 2, 20)],
  };
  private sys?: System;
  private check = (set: Bucket[]) => (key: number) => {
    this.flagged = !set[key === 0 ? 0 : 1].take(this.sys?.now ?? 0);
    return this.flagged;
  };
  private hot = { g1: this.check(this.buckets.g1), g2: this.check(this.buckets.g2), redis: this.check(this.buckets.shared) };

  spec() {
    return benchSpec(this.mode, this.failOpen, this.aRate, this.hot);
  }

  /** Take charge of a newly built system. */
  wire(sys: System): void {
    this.sys = sys;
    for (const b of [...this.buckets.shared, ...this.buckets.g1, ...this.buckets.g2]) {
      b.tokens = b.burst;
      b.last = 0;
    }
    this.tally = [];
    this.limited.clear();
    sys.hooks.serve = (p, call) => {
      if ((p.id === 'redis' || ((p.id === 'g1' || p.id === 'g2') && this.mode === 1)) && this.flagged) this.limited.add(`${call.root.at}|${call.root.born}`);
      this.flagged = false;
    };
    sys.hooks.done = (o) => {
      const k = `${o.client}|${o.start}`;
      const what = !o.ok ? 'failed' : this.limited.has(k) ? 'limited' : 'ok';
      this.limited.delete(k);
      this.tally.push({ t: o.end, client: o.client, what, ms: o.end - o.start });
    };
  }

  /** How the last `windowMs` went. */
  summary(windowMs = 3000): BenchSummary {
    const now = this.sys?.now ?? 0;
    this.tally = this.tally.filter((x) => x.t > now - windowMs);
    const secs = Math.min(windowMs, Math.max(500, now)) / 1000;
    const of = (c: string, w: Tally['what']) => this.tally.filter((x) => x.client === c && x.what === w);
    const bAll = this.tally.filter((x) => x.client === 'B');
    return {
      bP99: p99(of('B', 'ok').map((x) => x.ms)),
      bBad: bAll.length ? bAll.filter((x) => x.what !== 'ok').length / bAll.length : 0,
      aOk: of('A', 'ok').length / secs,
      aLimited: of('A', 'limited').length / secs,
      aFailed: of('A', 'failed').length / secs,
    };
  }
}

/** Run the bench for `ms` with no drawing, for tests: optionally fail Redis first. */
export function runBench(mode: number, aRate: number, ms: number, o: { failOpen?: boolean; redisDown?: boolean } = {}): BenchSummary {
  const b = new LimiterBench();
  b.mode = mode;
  b.aRate = aRate;
  b.failOpen = o.failOpen ?? true;
  const sys = new SystemClass(b.spec());
  b.wire(sys);
  if (o.redisDown && mode === 2) sys.setUp('redis', false);
  sys.run(ms);
  return b.summary();
}

const say = (n: number) => (n >= 100 ? String(Math.round(n / 10) * 10) : String(Math.round(n)));

export const FIGS = {
  'limiter-windows': figure(['compare'], (_ctx, t) => {
    const W = 560;
    const H = 220;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    const times = burstyClient();
    let algo = 0;
    let burst = 20;
    let open = false;
    const X = (s: number) => 40 + (s / 180) * (W - 60);
    const base = 170;
    const perBin = 4.2;
    const paint = () => {
      const ok = admit(ALGOS[algo], times, LIMIT, WINDOW, burst);
      const passed = times.filter((_, i) => ok[i]);
      const worst = busiest(passed);
      const parts: SVGElement[] = [];
      // The busiest minute.
      if (open) {
        parts.push(svg('rect', { x: X(worst.from), y: 24, width: X(worst.from + WINDOW) - X(worst.from), height: base - 24, fill: tint(COL.busy, 0.14) }));
        parts.push(small(X(worst.from) + 4, 34, `busiest 60 s: ${worst.count}`, { fill: COL.busy, bold: true }));
      }
      // Window edges.
      for (const m of [0, 60, 120, 180]) parts.push(line(X(m), 20, X(m), base, COL.clock, 1, { 'stroke-dasharray': '3 3' }));
      // Two-second bins: let through stacked under turned away.
      for (let b = 0; b < 90; b++) {
        const inBin = times.map((s, i) => [s, ok[i]] as const).filter(([s]) => s >= b * 2 && s < b * 2 + 2);
        const yes = inBin.filter(([, o]) => o).length;
        const no = inBin.length - yes;
        const x = X(b * 2) + 0.5;
        const w = X(2) - X(0) - 1;
        if (yes) parts.push(svg('rect', { x, y: base - yes * perBin, width: w, height: yes * perBin, fill: COL.answer }));
        if (no) parts.push(svg('rect', { x, y: base - (yes + no) * perBin, width: w, height: no * perBin, fill: COL.error, opacity: 0.75 }));
      }
      parts.push(line(40, base, W - 20, base, COL.ink, 1.2));
      for (const m of [0, 60, 120, 180]) parts.push(small(X(m), base + 14, m ? `${m / 60} min` : '0', { anchor: 'middle', soft: true }));
      parts.push(small(40, 14, 'Requests every 2 seconds:', { soft: true }));
      parts.push(small(170, 14, 'let through', { fill: COL.answer, bold: true }), small(230, 14, 'turned away', { fill: COL.error, bold: true }));
      parts.push(small(W - 20, base + 30, `${ALGO_NAMES[algo]}${ALGOS[algo] === 'bucket' ? `, ${burst} tokens at most` : ''}; limit 100 a minute`, { anchor: 'end' }));
      redraw(g, ...parts);
      if (open) {
        const total = passed.length;
        f.readout.textContent = `${ALGO_NAMES[algo]}: ${total} of ${times.length} let through in three minutes; the busiest 60 seconds held ${worst.count}, against a limit of ${LIMIT}.`;
        if (algo !== 0) t.done();
      }
    };
    const chips = named(pick(ALGO_NAMES, 0, (i) => { algo = i; paint(); }), 'Count by:');
    const size = slider('Bucket size', 5, 100, 5, 20, (v) => `${v} tokens`, (v) => { burst = v; paint(); }, 'busy');
    f.controls.append(chips.node, size.node);
    guessFirst(t, f, {
      ask: 'Limit: 100 a minute, counted in windows that start on the minute. At most, how many requests can one client get through in some 60 seconds?',
      options: ['100', 'About 150', 'Nearly 200', 'No limit at all'],
      answer: 2,
      sliders: [size],
      buttons: chips.buttons,
      after: () => { open = true; paint(); },
    });
    paint();
    return f.node;
  }),

  'limiter-record': () => {
    const W = 560;
    const H = 250;
    const s = still(W, H);
    const parts: SVGElement[] = [];
    // The record.
    parts.push(svg('rect', { x: 10, y: 20, width: 230, height: 92, rx: 6, fill: tint(COL.cache, 0.1), stroke: COL.cache, 'stroke-width': 1.4 }));
    parts.push(label(20, 38, 'In Redis, one hash per key', { size: 'note', bold: true, fill: COL.cache }));
    parts.push(small(20, 56, 'key     rl:{api key}:{route}'));
    parts.push(small(20, 72, 'tokens  37.5'));
    parts.push(small(20, 88, 'ts      1731150000.250  (seconds)'));
    parts.push(small(20, 104, 'TTL     a few minutes, renewed on use', { soft: true }));
    parts.push(small(10, 130, 'About 100 bytes with Redis\'s own overhead:', { soft: true }));
    parts.push(small(10, 144, 'a million keys fit in about 100 MB.', { soft: true }));
    // The script.
    const steps = [
      ['1', 'Read tokens and ts for the key.', 'request'],
      ['2', 'Add (now − ts) × rate tokens, up to the bucket size.', 'clock'],
      ['3', 'If at least one token: take it, answer "yes".', 'answer'],
      ['4', 'Else answer "no" and how long until the next token.', 'error'],
      ['5', 'Write tokens and ts back.', 'write'],
    ] as const;
    parts.push(label(268, 38, 'One Lua script, run whole by Redis', { size: 'note', bold: true }));
    steps.forEach(([n, text, col], i) => {
      const y = 58 + i * 22;
      parts.push(svg('circle', { cx: 276, cy: y - 4, r: 8, fill: tint(COL[col], 0.2), stroke: COL[col] }));
      parts.push(small(276, y - 1, n, { anchor: 'middle', bold: true }));
      parts.push(small(292, y, text));
    });
    parts.push(line(240, 66, 262, 66, COL.request, 1.5));
    // The wire.
    parts.push(svg('rect', { x: 10, y: 178, width: W - 20, height: 60, rx: 6, fill: tint(COL.error, 0.06), stroke: COL.error, 'stroke-width': 1 }));
    parts.push(label(20, 196, 'The answer a refused client gets', { size: 'note', bold: true, fill: COL.error }));
    parts.push(small(20, 213, 'HTTP/1.1 429 Too Many Requests'));
    parts.push(small(20, 228, 'Retry-After: 1        RateLimit-Remaining: 0'));
    parts.push(small(300, 213, 'Two round trips become one, and no other', { soft: true }));
    parts.push(small(300, 228, 'request can slip in between read and write.', { soft: true }));
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'limiter-bench': figure(['shield'], (ctx, t) => {
    const b = new LimiterBench();
    let busyEma = 0;
    const d = liveDiagram(ctx, b.spec(), {
      w: 620, h: 260, tap: 'parts', lines: 3, speed: 150, fixed: ['A', 'B', 'lb', 'db'],
      onFrame: (sys) => {
        const s = b.summary();
        const api = sys.part('api');
        busyEma += ((api.up ? api.busy / api.servers : 0) - busyEma) * 0.05;
        const lines = [
          `Tenant B (40 a second): ${Number.isFinite(s.bP99) ? `99th percentile ${Math.round(s.bP99)} ms` : 'no answers yet'}, ${Math.round(s.bBad * 100)}% failed or refused.`,
          `Tenant A (${b.aRate} a second): ${say(s.aOk)} a second served, ${say(s.aLimited)} refused with 429, ${say(s.aFailed)} failed.`,
          b.mode === 2
            ? `API ${Math.round(busyEma * 100)}% busy. Redis ${sys.part('redis').up ? 'up' : `down, failing ${b.failOpen ? 'open: no limits' : 'closed: everyone refused'}`}.`
            : `API ${Math.round(busyEma * 100)}% busy.${b.mode === 0 ? ' Nothing stops tenant A.' : ' Each gateway allows half of each tenant\'s limit.'}`,
        ];
        d.f.readout.textContent = lines.join('\n');
      },
    });
    d.f.readout.style.whiteSpace = 'pre-line';
    b.wire(d.sys);
    const rebuild = () => {
      d.rebuild(b.spec());
      b.wire(d.sys);
    };
    const goal = () => {
      if (b.mode !== 0 && b.aRate >= 300) t.done();
    };
    const modes = named(pick(MODES, 0, (i) => { b.mode = i; rebuild(); goal(); }), 'Limiter:');
    const fail = named(pick(['Fail open', 'Fail closed'], 0, (i) => { b.failOpen = i === 0; if (b.mode === 2) rebuild(); }), 'If Redis is down:');
    const rate = slider('Tenant A sends', 20, 600, 10, b.aRate, (v) => `${v} a second`, (v) => { b.aRate = v; d.sys.setRate('A', v); goal(); }, 'request');
    d.f.controls.append(modes.node, fail.node, rate.node);
    return d.f.node;
  }),
};
