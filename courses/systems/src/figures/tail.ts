// Lesson 9, Why the slowest machine sets the pace: a query that waits for N
// leaves, each slow now and then (guess first), the same fan-out with hedged
// requests, a latency histogram with its percentiles marked, and an index
// split by document against one split by word.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng, type Rng } from 'didactics/rng';
import { duration } from 'sysdiagram/numbers';
import { animate, COL, figure, frame, guessFirst, named, slider, tint, toggles, type FigureContext, type Task } from './kit';

/** The chance a query that waits for n leaves meets at least one that is slow with chance p: 1 − (1 − p)ⁿ. */
export const slowShare = (n: number, p: number) => 1 - Math.pow(1 - p, n);

/** A value at quantile q (0 to 1) of a sorted list, nearest rank. */
export function percentile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

/** The model's leaf: usually 6 ms plus a little (mean 8 ms), and with chance `p` stuck behind something for 150 ms or more. */
export const LEAF = { base: 6, spread: 2, slowBase: 150, slowSpread: 150 };

export function leafTime(rng: Rng, p: number): number {
  const e = -Math.log(1 - rng());
  return rng() < p ? LEAF.slowBase + LEAF.slowSpread * e : LEAF.base + LEAF.spread * e;
}

export interface FanSetup {
  n: number;
  p: number;
  /** Send a second copy of a leaf request to another replica if no answer has come by this many ms; null for no hedging. */
  hedgeAfter: number | null;
  queries?: number;
  seed?: number;
}

export interface FanResult {
  /** Query latencies, sorted, ms. */
  times: number[];
  p50: number;
  p99: number;
  p999: number;
  mean: number;
  /** Share of queries that waited 50 ms or more. */
  slow: number;
  /** Extra leaf requests sent as hedges, as a share of the leaf requests a query needs. */
  extra: number;
}

/** One query's leaves: when each answers, and whether it was hedged. */
export function oneQuery(rng: Rng, n: number, p: number, hedgeAfter: number | null): { t: number; hedged: boolean; slow: boolean }[] {
  const out: { t: number; hedged: boolean; slow: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const a = leafTime(rng, p);
    if (hedgeAfter !== null && a > hedgeAfter) {
      const b = hedgeAfter + leafTime(rng, p);
      out.push({ t: Math.min(a, b), hedged: true, slow: a > 50 });
    } else out.push({ t: a, hedged: false, slow: a > 50 });
  }
  return out;
}

/** Many queries through the model, each waiting for all its leaves. */
export function simulateFan(o: FanSetup): FanResult {
  const rng = makeRng(o.seed ?? 7);
  const q = o.queries ?? 4000;
  const times: number[] = [];
  let hedges = 0;
  for (let k = 0; k < q; k++) {
    const leaves = oneQuery(rng, o.n, o.p, o.hedgeAfter);
    hedges += leaves.filter((l) => l.hedged).length;
    times.push(Math.max(...leaves.map((l) => l.t)));
  }
  times.sort((a, b) => a - b);
  return {
    times,
    p50: percentile(times, 0.5),
    p99: percentile(times, 0.99),
    p999: percentile(times, 0.999),
    mean: times.reduce((s, v) => s + v, 0) / times.length,
    slow: times.filter((t) => t >= 50).length / times.length,
    extra: hedges / (q * o.n),
  };
}

const W = 420;
const H = 300;
const pct = (v: number) => (v >= 0.995 ? `${Math.round(v * 1000) / 10}%` : v < 0.1 ? `${Math.round(v * 1000) / 10}%` : `${Math.round(v * 100)}%`);

interface FanState {
  n: number;
  p: number;
  hedgeAfter: number | null;
}

/**
 * The drawing both fan figures share: a root over a grid of leaves, one
 * query at a time played in slow motion (each leaf turns green when it
 * answers, amber while it is late), and a strip of the last queries' times.
 */
function fanDrawing(ctx: FigureContext, st: () => FanState, onQuery: (ms: number) => void) {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const rng = makeRng(11);
  let leaves = oneQuery(rng, st().n, st().p, st().hedgeAfter);
  let clock = 0;
  let pause = 0;
  const recent: number[] = [];
  const restart = () => {
    leaves = oneQuery(rng, st().n, st().p, st().hedgeAfter);
    clock = 0;
    pause = 0;
  };
  const rootX = W / 2;
  const rootY = 22;
  const gridTop = 64;
  // Slow motion: 60 ms of the model per second on screen, faster once only slow leaves are left.
  animate(f.svg, ctx, (dt) => {
    const done = Math.max(...leaves.map((l) => l.t));
    if (clock >= done) {
      pause += dt;
      if (pause > 0.9) {
        recent.push(done);
        if (recent.length > 40) recent.shift();
        onQuery(done);
        restart();
      }
    } else {
      const left = leaves.filter((l) => l.t > clock).length;
      const fastLeft = leaves.some((l) => l.t > clock && l.t < 40);
      clock = Math.min(done, clock + dt * (fastLeft || left === 0 ? 60 : 400));
    }
    paint();
  });
  const paint = () => {
    const s = st();
    const n = leaves.length;
    const cols = Math.min(20, Math.max(1, Math.ceil(Math.sqrt(n * 2.2))));
    const rows = Math.ceil(n / cols);
    const cell = Math.min(18, 330 / cols, 150 / Math.max(rows, 1));
    const gx = W / 2 - (cols * cell) / 2;
    const parts: SVGElement[] = [];
    const done = Math.max(...leaves.map((l) => l.t));
    const finished = clock >= done;
    parts.push(svg('rect', { x: rootX - 46, y: rootY - 15, width: 92, height: 30, rx: 4, fill: finished ? tint(COL.answer, 0.2) : COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }));
    parts.push(label(rootX, rootY - 1, 'Root', { anchor: 'middle', size: 'small', bold: true }));
    parts.push(small(rootX, rootY + 10, finished ? `answered, ${duration(done)}` : `waiting, ${Math.round(clock)} ms`, { anchor: 'middle', fill: finished ? COL.answer : COL.ink }));
    parts.push(line(rootX, rootY + 15, rootX, gridTop - 8, COL.soft, 1.2), line(gx, gridTop - 8, gx + cols * cell, gridTop - 8, COL.soft, 1.2));
    leaves.forEach((l, i) => {
      const x = gx + (i % cols) * cell;
      const y = gridTop + Math.floor(i / cols) * cell;
      const answered = l.t <= clock;
      const late = !answered && clock > 15;
      parts.push(svg('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, rx: 1.5,
        fill: answered ? COL.answer : late ? COL.busy : tint(COL.request, 0.55), stroke: 'none' }));
      if (l.hedged && s.hedgeAfter !== null && clock >= s.hedgeAfter) parts.push(svg('circle', { cx: x + cell / 2, cy: y + cell / 2, r: Math.max(1.5, cell / 5), fill: COL.request, stroke: COL.paper, 'stroke-width': 0.8 }));
    });
    // The last queries' times on a log strip.
    const sy = 262;
    const sx0 = 40;
    const sx1 = W - 16;
    const LX = (ms: number) => sx0 + (Math.log10(Math.max(4, Math.min(1000, ms)) / 4) / Math.log10(250)) * (sx1 - sx0);
    parts.push(small(sx0, sy - 16, 'Each finished query:', { soft: true }));
    parts.push(line(sx0, sy, sx1, sy, COL.ink, 1));
    for (const v of [5, 10, 20, 50, 100, 200, 500, 1000]) parts.push(line(LX(v), sy, LX(v), sy + 3, COL.ink, 1), small(LX(v), sy + 13, v >= 1000 ? '1 s' : `${v}`, { anchor: 'middle', soft: true }));
    parts.push(small(sx1, sy + 25, 'ms, log scale', { anchor: 'end', soft: true }));
    recent.forEach((v, i) => parts.push(svg('circle', { cx: LX(v), cy: sy - 5, r: 3, fill: v >= 50 ? COL.busy : COL.answer, opacity: 0.35 + (0.65 * (i + 1)) / recent.length })));
    // Key.
    const ky = gridTop + Math.ceil(n / cols) * cell + 14;
    parts.push(
      svg('rect', { x: 40, y: ky - 7, width: 8, height: 8, fill: tint(COL.request, 0.55) }), small(52, ky, 'asked'),
      svg('rect', { x: 92, y: ky - 7, width: 8, height: 8, fill: COL.answer }), small(104, ky, 'answered'),
      svg('rect', { x: 162, y: ky - 7, width: 8, height: 8, fill: COL.busy }), small(174, ky, 'late'),
    );
    if (s.hedgeAfter !== null) parts.push(svg('circle', { cx: 214, cy: ky - 3, r: 3, fill: COL.request }), small(220, ky, 'second copy sent'));
    redraw(g, ...parts);
  };
  paint();
  return { f, restart, paint };
}

export const FIGS = {
  'tail-fan': figure(['guess'], (ctx, t: Task) => {
    const s: FanState = { n: 100, p: 0.01, hedgeAfter: null };
    const d = fanDrawing(ctx, () => s, () => {});
    let guessed = false;
    const tell = () => {
      if (!guessed) return;
      const share = slowShare(s.n, s.p);
      d.f.readout.textContent = `${s.n} leaves, each slow ${pct(s.p)} of the time: ${pct(share)} of queries wait for at least one slow leaf (1 − ${(1 - s.p).toFixed(3)} to the power ${s.n}).`;
    };
    const n = slider('Leaves per query', { min: 1, max: 200, step: 1, value: s.n, show: (x) => `${x}`, color: 'request', onInput: (v) => { s.n = v; d.restart(); tell(); } });
    const p = slider('Chance a leaf is slow', { steps: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05], value: s.p, show: (x) => pct(x), color: 'busy', onInput: (v) => { s.p = v; d.restart(); tell(); } });
    d.f.controls.append(n.node, p.node);
    guessFirst(t, d.f, {
      ask: 'A query waits for 100 leaves, and each leaf is slow one time in a hundred. What share of queries wait for at least one slow leaf?',
      options: ['About 1%', 'About 10%', 'About 63%', 'About 99%'],
      answer: 2,
      sliders: [n, p],
      after: () => {
        guessed = true;
        tell();
        t.done();
      },
    });
    return d.f.node;
  }),

  'tail-hedge': figure(['hedge'], (ctx, t) => {
    const s: FanState = { n: 100, p: 0.01, hedgeAfter: null };
    let after = 12;
    let stats = simulateFan({ ...s });
    const tell = () => {
      const base = s.hedgeAfter === null ? stats : simulateFan({ ...s, hedgeAfter: null });
      d.f.readout.textContent = s.hedgeAfter === null
        ? `No hedging: 99th percentile ${duration(stats.p99)}, and ${pct(stats.slow)} of queries take 50 ms or more.`
        : `Second copy after ${after} ms: 99th percentile ${duration(stats.p99)} (${duration(base.p99)} without), ${pct(stats.slow)} of queries take 50 ms or more, for ${pct(stats.extra)} more leaf requests.`;
      if (t.goal === 'hedge' && s.hedgeAfter !== null && stats.p99 < 50 && stats.extra < 0.05) t.done();
    };
    const d = fanDrawing(ctx, () => s, () => {});
    const recompute = () => {
      s.hedgeAfter = chips.state()[0] ? after : null;
      stats = simulateFan({ ...s });
      d.restart();
      tell();
    };
    const chips = named(toggles(['Hedged requests'], [false], () => recompute()), 'Send:');
    const delay = slider('Second copy after', { min: 0, max: 60, step: 1, value: after, show: (x) => `${x} ms`, color: 'clock', onInput: (v) => { after = v; recompute(); } });
    d.f.controls.append(chips.node, delay.node);
    tell();
    return d.f.node;
  }),

  'tail-curve': () => {
    const w = 420;
    const h = 220;
    const s = still(w, h);
    const rng = makeRng(3);
    const times = Array.from({ length: 20000 }, () => {
      const e = -Math.log(1 - rng());
      const r = rng();
      return r < 0.985 ? 4 + 6 * Math.exp(0.45 * (rng() + rng() + rng() - 1.5)) * (0.6 + 0.4 * e) : r < 0.998 ? 40 + 60 * e : 300 + 400 * e;
    }).sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const x0 = 34;
    const x1 = w - 12;
    const y0 = 30;
    const y1 = 170;
    const lo = 2;
    const hi = 2000;
    const X = (ms: number) => x0 + (Math.log10(Math.max(lo, Math.min(hi, ms)) / lo) / Math.log10(hi / lo)) * (x1 - x0);
    const bins = 60;
    const counts = Array(bins).fill(0);
    for (const v of times) counts[Math.min(bins - 1, Math.max(0, Math.floor(((X(v) - x0) / (x1 - x0)) * bins)))]++;
    const top = Math.max(...counts);
    const bw = (x1 - x0) / bins;
    const p99 = percentile(times, 0.99);
    const parts: SVGElement[] = [];
    counts.forEach((c, i) => {
      if (!c) return;
      const hh = Math.max(1, (c / top) * (y1 - y0));
      const x = x0 + i * bw;
      parts.push(svg('rect', { x: x + 0.5, y: y1 - hh, width: bw - 1, height: hh, fill: x + bw / 2 > X(p99) ? COL.busy : tint(COL.request, 0.7) }));
    });
    parts.push(line(x0, y1, x1, y1, COL.ink, 1));
    for (const v of [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]) parts.push(line(X(v), y1, X(v), y1 + 3, COL.ink, 1), small(X(v), y1 + 13, v >= 1000 ? `${v / 1000} s` : `${v}`, { anchor: 'middle', soft: true }));
    parts.push(small(x1, y1 + 26, 'latency of one request, ms (log scale)', { anchor: 'end', soft: true }));
    const marks: [string, number, number][] = [
      ['median', percentile(times, 0.5), 0],
      ['mean', mean, 1],
      ['99th', p99, 0],
      ['99.9th', percentile(times, 0.999), 1],
    ];
    for (const [name, v, row] of marks) {
      const x = X(v);
      parts.push(line(x, y0 - 4 + row * 14, x, y1, name === 'mean' ? COL.soft : COL.ink, 1.2, { 'stroke-dasharray': name === 'mean' ? '3 3' : '' }));
      parts.push(small(x + 3, y0 + row * 14, `${name} ${duration(v)}`, { fill: name === 'mean' ? COL.soft : COL.ink }));
    }
    parts.push(small(X(170), y1 - 40, 'slowest 1%,', { anchor: 'middle', fill: COL.busy }), small(X(170), y1 - 28, 'too thin to see', { anchor: 'middle', fill: COL.busy }));
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'tail-partition': () => {
    const w = 420;
    const h = 210;
    const s = still(w, h);
    const parts: SVGElement[] = [];
    const panel = (x: number, title: string, asked: boolean[], notes: string[], items: string[]) => {
      parts.push(label(x + 100, 14, title, { bold: true, anchor: 'middle' }));
      parts.push(svg('rect', { x: x + 60, y: 26, width: 80, height: 26, rx: 4, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }), small(x + 100, 43, 'rain coffee', { anchor: 'middle' }));
      for (let i = 0; i < 4; i++) {
        const sx = x + 8 + i * 48;
        const on = asked[i];
        parts.push(line(x + 100, 52, sx + 20, 92, on ? COL.request : COL.grid, on ? 1.4 : 1));
        parts.push(svg('rect', { x: sx, y: 92, width: 40, height: 46, rx: 3, fill: on ? tint(COL.data, 0.14) : COL.paper, stroke: on ? COL.data : COL.soft }));
        parts.push(small(sx + 20, 105, `shard ${i + 1}`, { anchor: 'middle', bold: true }));
        parts.push(small(sx + 20, 119, items[i * 2], { anchor: 'middle', soft: true }), small(sx + 20, 131, items[i * 2 + 1], { anchor: 'middle', soft: true }));
      }
      notes.forEach((n, k) => parts.push(small(x + 100, 160 + k * 13, n, { anchor: 'middle' })));
    };
    panel(4, 'Split by document', [true, true, true, true],
      ['Every shard gets the query,', 'searches its quarter of the pages', 'and sends back its best few.', 'Small answers; fan-out to all.'],
      ['25M', 'pages', '25M', 'pages', '25M', 'pages', '25M', 'pages']);
    parts.push(line(212, 20, 212, h - 6, COL.grid, 1));
    panel(216, 'Split by word', [true, false, true, false],
      ['Two shards get the query, but', 'each sends a whole posting list', 'to be intersected, and a common', 'word makes its shard hot.'],
      ['words', 'a to e', 'words', 'f to m', 'words', 'n to r', 'words', 's to z']);
    redraw(s.svg, ...parts);
    return { node: s.node };
  },
};
