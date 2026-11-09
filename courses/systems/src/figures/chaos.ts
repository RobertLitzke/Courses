// Lesson 18, chaos: one slow dependency and the guards around calls to it
// (timeouts, retries, a circuit breaker, a bulkhead); how retries multiply
// down a chain of services; and why retries need jitter.

import { svg } from 'didactics/dom';
import { makeRng } from 'didactics/rng';
import { label, line, redraw, small } from 'didactics/draw';
import { animate, axes, COL, figure, frame, guessFirst, legend, pick, slider, toggles, type FigureContext, type Task } from './kit';

// ---------------------------------------------------------------------------
// The API server: a pool of threads, each held for as long as its request
// takes. Half the requests (starting playback) call service A only; the other
// half (the home page) call A, then B, the recommendations service. A request
// holds its thread through every call it makes, so Little's law gives the
// threads needed: rate × time held.

export const POOL = 200;
export const BULKHEAD = 40;
export const A_MS = 20;
export const TIMEOUT_MS = 300;
export const CLIENT_MS = 1000;
/** Calls a second B can take before it slows further. */
export const B_CAP = 1000;

export interface Guards {
  /** Requests a second at the API. */
  rps: number;
  /** B's time per call when not overloaded, ms. */
  slowMs: number;
  timeout: boolean;
  retries: boolean;
  breaker: boolean;
  bulkhead: boolean;
}

export interface Steady {
  /** Share of playback requests answered. */
  play: number;
  /** Shares of home-page requests answered with recommendations, answered without them, and failed. */
  full: number;
  degraded: number;
  failed: number;
  /** Threads in use in the main pool, and in the bulkhead. */
  threads: number;
  bulk: number;
  /** Calls a second reaching B, and B's time per call. */
  callsB: number;
  latB: number;
  /** Share of calls to B that fail (time out, or are turned away by a full bulkhead). */
  failB: number;
}

/** The steady state for a set of guards, with the breaker open (B skipped) or closed. */
export function steady(o: Guards, open = false): Steady {
  const lp = o.rps / 2;
  const lh = o.rps / 2;
  if (open) {
    const N = (lp * A_MS + lh * A_MS) / 1000;
    const f = Math.min(1, POOL / N);
    return { play: f, full: 0, degraded: f, failed: 1 - f, threads: Math.min(N, POOL), bulk: 0, callsB: 0, latB: o.slowMs, failB: 1 };
  }
  // B's latency depends on the calls it gets, which depend on retries: settle it by iterating.
  let tries = 1;
  let lat = o.slowMs;
  let admitB = 1;
  let f = 1;
  let x = lh;
  let timedOut = false;
  let tB = lat;
  let backoff = 0;
  let homeMs = A_MS;
  let N = 0;
  let NB = 0;
  for (let i = 0; i < 30; i++) {
    lat = o.slowMs * Math.max(1, x / B_CAP) ** 2;
    timedOut = o.timeout && lat > TIMEOUT_MS;
    tries = timedOut && o.retries ? 3 : 1;
    tB = timedOut ? TIMEOUT_MS : lat;
    backoff = timedOut && o.retries ? 150 : 0;
    const callMs = tries * tB + backoff;
    if (o.bulkhead) {
      NB = (lh * f * tries * tB) / 1000;
      admitB = NB > BULKHEAD ? BULKHEAD / NB : 1;
      NB = Math.min(NB, BULKHEAD);
    } else {
      admitB = 1;
      NB = 0;
    }
    homeMs = A_MS + admitB * callMs;
    N = (lp * A_MS + lh * homeMs) / 1000;
    f = Math.min(1, POOL / N);
    const nx = lh * f * tries * admitB;
    x = (x + nx) / 2;
  }
  // Of the home pages let in: those whose B call was turned away by the bulkhead are answered at once, without recommendations.
  const slowHome = A_MS + tries * tB + backoff;
  const tooSlow = slowHome > CLIENT_MS;
  const bOk = !timedOut && !tooSlow;
  const full = f * admitB * (bOk ? 1 : 0);
  const degraded = f * (1 - admitB) + f * admitB * (timedOut && !tooSlow ? 1 : 0);
  const failed = Math.max(0, 1 - full - degraded);
  const failB = 1 - admitB * (bOk ? 1 : 0);
  return { play: f, full, degraded, failed, threads: Math.min(N, POOL), bulk: NB, callsB: x, latB: lat, failB };
}

/** A circuit breaker: opens when over half of calls fail for a second, stays open 5 s, then lets calls through for a second to try again. */
export class Breaker {
  state: 'closed' | 'open' | 'trying' = 'closed';
  private since = 0;
  private bad = 0;
  step(dt: number, failShare: number) {
    this.since += dt;
    if (this.state === 'open') {
      if (this.since >= 5000) [this.state, this.since, this.bad] = ['trying', 0, 0];
      return;
    }
    this.bad = failShare > 0.5 ? this.bad + dt : 0;
    if (this.bad >= (this.state === 'trying' ? 300 : 1000)) [this.state, this.since, this.bad] = ['open', 0, 0];
    else if (this.state === 'trying' && this.since >= 1000) [this.state, this.since] = ['closed', 0];
  }
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function chaosText(s: Steady, breaker: Breaker['state'] | null): string {
  const b = breaker === 'open' ? ' Breaker open: B is skipped.' : breaker === 'trying' ? ' Breaker letting a few calls through to test B.' : '';
  return `Playback started: ${pct(s.play)}. Home pages: ${pct(s.full)} with recommendations, ${pct(s.degraded)} without, ${pct(s.failed)} failed. Threads in use: ${Math.round(s.threads)} of ${POOL}; ${Math.round(s.callsB).toLocaleString('en-US')} calls a second to B.${b}`;
}

function faultFigure(ctx: FigureContext, t: Task) {
  const W = 540;
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  const o: Guards = { rps: 1000, slowMs: 30, timeout: false, retries: false, breaker: false, bulkhead: false };
  const br = new Breaker();
  let shown: Steady = steady(o);
  let clock = 0;
  const node = (x: number, y: number, w: number, h: number, name: string, sub: string, stroke: string, kind: 'pill' | 'box' = 'box') => [
    svg('rect', { x, y, width: w, height: h, rx: kind === 'pill' ? h / 2 : 4, fill: COL.paper, stroke, 'stroke-width': 1.5 }),
    label(x + w / 2, y + h / 2 - (sub ? 2 : -4), name, { anchor: 'middle' }),
    ...(sub ? [small(x + w / 2, y + h / 2 + 12, sub, { anchor: 'middle', fill: stroke === COL.error ? COL.error : COL.soft })] : []),
  ];
  const dots = (x1: number, y1: number, x2: number, y2: number, n: number, color: string, speed: number) => {
    const out: SVGElement[] = [];
    const k = Math.min(8, Math.round(n));
    for (let i = 0; i < k; i++) {
      const fr = ((clock * speed) / 1000 + i / k) % 1;
      out.push(svg('circle', { cx: x1 + (x2 - x1) * fr, cy: y1 + (y2 - y1) * fr, r: 2.8, fill: color }));
    }
    return out;
  };
  const paint = () => {
    const open = o.breaker && br.state === 'open';
    const target = steady(o, open);
    // Ease toward the steady state, so the pool visibly fills and drains.
    const a = 0.15;
    shown = {
      ...target,
      threads: shown.threads + (target.threads - shown.threads) * a,
      bulk: shown.bulk + (target.bulk - shown.bulk) * a,
      play: shown.play + (target.play - shown.play) * a,
      full: shown.full + (target.full - shown.full) * a,
      degraded: shown.degraded + (target.degraded - shown.degraded) * a,
      failed: shown.failed + (target.failed - shown.failed) * a,
      callsB: shown.callsB + (target.callsB - shown.callsB) * a,
    };
    const parts: SVGElement[] = [];
    const slow = target.latB > 100;
    parts.push(...node(10, 100, 80, 40, 'Users', `${o.rps.toLocaleString('en-US')} a second`, COL.ink, 'pill'));
    parts.push(...node(160, 60, 150, 120, '', '', COL.ink));
    parts.push(label(235, 78, 'API server', { anchor: 'middle' }));
    // The main pool: 200 threads as a bar of 20 cells.
    parts.push(small(172, 98, `threads ${Math.round(shown.threads)}/${POOL}`, { fill: shown.threads > POOL * 0.95 ? COL.error : COL.soft }));
    for (let i = 0; i < 20; i++) {
      const used = shown.threads / POOL > i / 20 + 0.001;
      parts.push(svg('rect', { x: 172 + i * 6.3, y: 104, width: 5.2, height: 14, fill: used ? COL.busy : COL.grid }));
    }
    if (o.bulkhead) {
      parts.push(small(172, 140, `B's own pool ${Math.round(shown.bulk)}/${BULKHEAD}`, { fill: shown.bulk > BULKHEAD * 0.95 ? COL.error : COL.soft }));
      for (let i = 0; i < 8; i++) {
        const used = shown.bulk / BULKHEAD > i / 8 + 0.001;
        parts.push(svg('rect', { x: 172 + i * 6.3, y: 146, width: 5.2, height: 14, fill: used ? COL.busy : COL.grid }));
      }
    }
    parts.push(...node(400, 30, 110, 44, 'A: catalogue', `${A_MS} ms`, COL.ink));
    parts.push(...node(400, 160, 110, 44, 'B: recommend', `${Math.round(target.latB).toLocaleString('en-US')} ms a call`, slow ? COL.error : COL.ink));
    parts.push(line(92, 120, 158, 120, COL.grid, 1.2), line(312, 90, 398, 55, COL.grid, 1.2));
    const bLine = line(312, 150, 398, 180, open ? COL.error : COL.grid, 1.2, open ? { 'stroke-dasharray': '4 3' } : {});
    parts.push(bLine);
    if (o.breaker) {
      // The breaker as a switch on the line to B.
      const cx = 355;
      const cy = 165;
      parts.push(svg('circle', { cx: cx - 10, cy: cy - 3, r: 2.5, fill: COL.ink }), svg('circle', { cx: cx + 10, cy: cy + 4, r: 2.5, fill: COL.ink }));
      parts.push(line(cx - 10, cy - 3, open ? cx + 6 : cx + 10, open ? cy - 14 : cy + 4, open ? COL.error : COL.answer, 2));
      parts.push(small(cx, cy + 22, br.state === 'open' ? 'breaker open' : br.state === 'trying' ? 'testing' : 'breaker closed', { anchor: 'middle', fill: open ? COL.error : COL.soft }));
    }
    parts.push(...dots(92, 120, 158, 120, o.rps / 120, COL.request, 1.2));
    parts.push(...dots(312, 90, 398, 55, (o.rps * shown.play) / 150, COL.request, 1.5));
    if (!open) parts.push(...dots(312, 150, 398, 180, shown.callsB / 150, COL.request, Math.max(0.15, Math.min(1.5, 60 / Math.max(1, target.latB)))));
    const answered = shown.play / 2 + (shown.full + shown.degraded) / 2;
    parts.push(...dots(158, 132, 92, 132, (answered * o.rps) / 120, COL.answer, 1.2));
    if (shown.failed > 0.05 || shown.play < 0.95) parts.push(...dots(158, 140, 92, 140, ((1 - answered) * o.rps) / 120, COL.error, 1.2));
    parts.push(...legend(160, 236, [{ text: 'calls', color: COL.request, dot: true }, { text: 'answers', color: COL.answer, dot: true }, { text: 'failures', color: COL.error, dot: true }, { text: 'threads busy', color: COL.busy }]));
    redraw(g, ...parts);
    f.readout.textContent = chaosText(shown, o.breaker ? br.state : null);
    if (t.goal === 'survive' && o.slowMs >= 1000 && target.play >= 0.99 && shown.play >= 0.98) t.done();
  };
  const slowS = slider('B takes', { min: 30, max: 3000, scale: 'log', step: 10, value: o.slowMs, color: 'error', show: (v) => `${Math.round(v).toLocaleString('en-US')} ms`, onInput: (v) => {
    o.slowMs = v;
    paint();
  } });
  const guards = toggles(['Timeout 300 ms', 'Retry ×3', 'Circuit breaker', 'Bulkhead'], [false, false, false, false], (on) => {
    [o.timeout, o.retries, o.breaker, o.bulkhead] = on;
    paint();
  });
  f.controls.append(slowS.node, guards.node);
  animate(f.svg, ctx, (dt) => {
    const ms = dt * 1000;
    clock += ms;
    const s = steady(o, o.breaker && br.state === 'open');
    if (o.breaker) br.step(ms, s.failB);
    paint();
  });
  paint();
  return f.node;
}

// ---------------------------------------------------------------------------
// Retries multiply down a chain: with r tries at each of d layers, one call at
// the top can become r^d at the bottom.

export const amplification = (tries: number, depth: number, everyLayer: boolean) => (everyLayer ? tries ** depth : tries);

function amplifyFigure(t: Task) {
  const W = 540;
  const H = 260;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let tries = 3;
  const ax = axes({
    x: 70, y: 36, w: 430, h: 180, xmin: 1, xmax: 6, ymin: 1, ymax: 20000, ylog: true,
    xticks: [1, 2, 3, 4, 5, 6], yticks: [1, 10, 100, 1000, 10000],
    yfmt: (v) => v.toLocaleString('en-US'), xlabel: 'layers of services in the chain', ylabel: 'calls reaching the bottom, for one at the top', ink: COL.ink, grid: COL.grid,
  });
  let open = () => false;
  const paint = () => {
    const ds = [1, 2, 3, 4, 5, 6];
    const every = ds.map((d) => [d, amplification(tries, d, true)] as [number, number]);
    const top = ds.map((d) => [d, amplification(tries, d, false)] as [number, number]);
    const parts: SVGElement[] = [...ax.parts];
    if (open()) {
      parts.push(ax.path(every, COL.error, 2.4), ...ax.dots(every, COL.error), ax.path(top, COL.answer, 2.4), ...ax.dots(top, COL.answer));
      parts.push(...legend(90, 62, [{ text: 'retries at every layer', color: COL.error }, { text: 'retries only at the top', color: COL.answer }]));
      const v = amplification(tries, 5, true);
      parts.push(small(ax.X(5) + 6, ax.Y(v) - 6, v.toLocaleString('en-US'), { fill: COL.error, bold: true }));
      f.readout.textContent = `${tries} tries at each of 5 layers: up to ${v.toLocaleString('en-US')} calls at the bottom for one request. Retrying only at the top: ${tries}. A bottom service that is struggling sees its load multiplied by ${v.toLocaleString('en-US')} at the worst moment.`;
    } else parts.push(small(285, 130, 'Lock in a guess to see the chart.', { anchor: 'middle', fill: COL.soft }));
    redraw(g, ...parts);
  };
  const s = slider('Tries at each layer', 1, 5, 1, tries, (v) => String(v), (v) => {
    tries = v;
    paint();
    if (t.goal === 'multiply') t.done();
  }, 'error');
  f.controls.append(s.node);
  paint();
  open = guessFirst(t, f, {
    ask: 'A request passes through five layers of services, and each layer tries every call up to 3 times. If the bottom service is failing, how many calls can reach it for one request at the top?',
    options: ['3', '15', '243'],
    answer: 2,
    sliders: [s],
    after: () => paint(),
  });
  return f.node;
}

// ---------------------------------------------------------------------------
// A hundred clients all fail at once and retry. An overloaded server answers
// fewer the more it is sent. With no backoff they come back together; with
// backoff but no jitter they still come back together, only later; with full
// jitter each waits a random time up to its backoff, and the load spreads.

export type RetryMode = 'none' | 'backoff' | 'jitter';
export const BIN_MS = 100;
export const CAPACITY = 20;

export interface RetryRun {
  /** Calls arriving in each 100 ms bin, and how many of them were served. */
  calls: number[];
  served: number[];
  /** Total calls, and when the last client got through, ms. */
  total: number;
  lastMs: number;
}

export function retryRun(mode: RetryMode, clients = 100, seed = 11, horizonMs = 8000): RetryRun {
  const rng = makeRng(seed);
  const bins = Math.ceil(horizonMs / BIN_MS);
  const calls = Array(bins).fill(0);
  const served = Array(bins).fill(0);
  // Each client: when it next calls, and how many times it has tried.
  let waiting = Array.from({ length: clients }, () => ({ at: 0, tries: 0 }));
  let total = 0;
  let lastMs = Infinity;
  for (let b = 0; b < bins && waiting.length; b++) {
    const now = waiting.filter((c) => Math.floor(c.at / BIN_MS) === b);
    const rest = waiting.filter((c) => Math.floor(c.at / BIN_MS) !== b);
    calls[b] = now.length;
    total += now.length;
    const ok = now.length <= CAPACITY ? now.length : Math.floor((CAPACITY * CAPACITY) / now.length);
    served[b] = ok;
    const order = now.slice().sort(() => rng() - 0.5);
    const failed = order.slice(ok);
    for (const c of failed) {
      c.tries++;
      const cap = Math.min(3200, 100 * 2 ** (c.tries - 1));
      const wait = mode === 'none' ? 100 : mode === 'backoff' ? cap : rng() * cap;
      c.at = (b + 1) * BIN_MS + Math.floor(wait / BIN_MS) * BIN_MS + (mode === 'jitter' ? wait % BIN_MS : 0);
    }
    waiting = [...rest, ...failed];
    if (!waiting.length) lastMs = (b + 1) * BIN_MS;
  }
  return { calls, served, total, lastMs };
}

function jitterFigure(t: Task) {
  const W = 540;
  const H = 230;
  const f = frame(W, H, 2);
  const g = svg('g');
  f.svg.append(g);
  let mode: RetryMode = 'none';
  const ax = axes({
    x: 50, y: 30, w: 470, h: 160, xmin: 0, xmax: 8000, ymin: 0, ymax: 100,
    xticks: [0, 2000, 4000, 6000, 8000], yticks: [0, 20, 50, 100], xfmt: (v) => `${v / 1000} s`,
    xlabel: 'time after the blip', ylabel: 'calls in each tenth of a second', ink: COL.ink, grid: COL.grid,
  });
  const paint = () => {
    const r = retryRun(mode);
    const parts: SVGElement[] = [...ax.parts];
    const bw = ax.X(BIN_MS) - ax.X(0);
    r.calls.forEach((c, b) => {
      if (!c) return;
      const x = ax.X(b * BIN_MS);
      parts.push(svg('rect', { x: x + 0.5, y: ax.Y(c), width: Math.max(1, bw - 1), height: ax.Y(0) - ax.Y(c), fill: COL.error, opacity: 0.75 }));
      const s = r.served[b];
      parts.push(svg('rect', { x: x + 0.5, y: ax.Y(s), width: Math.max(1, bw - 1), height: ax.Y(0) - ax.Y(s), fill: COL.answer }));
    });
    parts.push(line(50, ax.Y(CAPACITY), 520, ax.Y(CAPACITY), COL.busy, 1.4, { 'stroke-dasharray': '5 3' }), small(518, ax.Y(CAPACITY) - 4, 'what the server can take', { anchor: 'end', fill: COL.busy }));
    parts.push(...legend(330, 62, [{ text: 'served', color: COL.answer }, { text: 'failed, will retry', color: COL.error }]));
    redraw(g, ...parts);
    const end = Number.isFinite(r.lastMs) ? `all 100 through after ${(r.lastMs / 1000).toFixed(1)} s` : 'some still failing after 8 s';
    f.readout.textContent = `${mode === 'none' ? 'Retrying every 100 ms' : mode === 'backoff' ? 'Doubling the wait each time, the same wait for everyone' : 'Doubling the longest wait each time, each client waiting a random time up to it'}: ${end}, ${r.total.toLocaleString('en-US')} calls in all.`;
    if (t.goal === 'jitter' && mode === 'jitter') t.done();
  };
  const m = pick(['Retry at once', 'Back off', 'Back off with jitter'], 0, (i) => {
    mode = (['none', 'backoff', 'jitter'] as const)[i];
    paint();
  });
  f.controls.append(m.node);
  paint();
  return f.node;
}

export const FIGS = {
  'chaos-fault': figure(['survive'], (ctx, t) => faultFigure(ctx, t)),
  'chaos-amplify': figure(['multiply'], (_ctx, t) => amplifyFigure(t)),
  'chaos-jitter': figure(['jitter'], (_ctx, t) => jitterFigure(t)),
};
