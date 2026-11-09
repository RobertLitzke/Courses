// Lesson 17, streams: clicks in one-minute windows by event time, with a
// watermark and late clicks; a click delivered twice and counted once; and a
// count-min sketch.

import { svg } from 'didactics/dom';
import { makeRng } from 'didactics/rng';
import { label, line, redraw, small } from 'didactics/draw';
import type { Mark } from 'sysdiagram/sequence';
import { msg, seqFigure, type Script } from './leases';
import { axes, COL, figure, frame, pick, player, slider, type FigureContext, type Task } from './kit';

// ---------------------------------------------------------------------------
// Clicks with an event time (when the reader tapped) and an arrival time
// (when the pipeline saw it). Most arrive within seconds; a few phones were
// offline and send theirs minutes later.

export interface Click {
  id: number;
  /** When it happened, seconds. */
  event: number;
  /** When the pipeline received it, seconds. */
  arrive: number;
}

/** The figure's clicks: five minutes of them, a few arriving minutes late. Same every time. */
export function clicks(): Click[] {
  const rng = makeRng(17);
  const out: Click[] = [];
  let id = 0;
  for (let e = 3; e < 300; e += 4 + rng() * 6) {
    const late = rng() < 0.12;
    const delay = late ? 70 + rng() * 150 : 1 + rng() * 9;
    out.push({ id: id++, event: Math.round(e), arrive: Math.round(e + delay) });
  }
  return out;
}

export const WINDOW = 60;
export const NOW_MAX = 600;

export interface WindowResult {
  /** Window start, seconds. */
  start: number;
  /** Clicks that really happened in it. */
  truth: number;
  /** When the first answer was given (the watermark passed its end), or null if not yet. */
  firstAt: number | null;
  /** The count in that first answer. */
  first: number;
  /** The count now: the first answer plus late clicks added (revise) or not (drop). */
  now: number;
  /** Late clicks received so far: added to the count, or dropped. */
  late: number;
}

/**
 * Fixed one-minute windows by event time. The watermark at processing time
 * `now` is `now - wait`: the pipeline assumes no click is more than `wait`
 * seconds late. A window answers once the watermark passes its end; a click
 * that arrives later is late, and is added to a revised answer or dropped.
 */
export function windows(cs: readonly Click[], now: number, wait: number, revise: boolean): WindowResult[] {
  const out: WindowResult[] = [];
  for (let start = 0; start < 300; start += WINDOW) {
    const mine = cs.filter((c) => c.event >= start && c.event < start + WINDOW);
    const closeAt = start + WINDOW + wait;
    const firstAt = now >= closeAt ? closeAt : null;
    const onTime = mine.filter((c) => c.arrive <= closeAt).length;
    const lateSeen = firstAt === null ? 0 : mine.filter((c) => c.arrive > closeAt && c.arrive <= now).length;
    out.push({ start, truth: mine.length, firstAt, first: onTime, now: firstAt === null ? 0 : onTime + (revise ? lateSeen : 0), late: lateSeen });
  }
  return out;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function windowFigure(ctx: FigureContext, t: Task) {
  const W = 540;
  const H = 360;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  const cs = clicks();
  let now = 0;
  let wait = 20;
  let revise = false;
  const ax = axes({
    x: 60, y: 20, w: 450, h: 230, xmin: 0, xmax: 300, ymin: 0, ymax: NOW_MAX,
    xticks: [0, 60, 120, 180, 240, 300], yticks: [0, 120, 240, 360, 480, 600],
    xfmt: (v) => mmss(v), yfmt: (v) => mmss(v),
    xlabel: 'event time: when the click happened', ylabel: 'processing time: when it arrived', ink: COL.ink, grid: COL.grid,
  });
  const paint = () => {
    const res = windows(cs, now, wait, revise);
    const parts: SVGElement[] = [];
    // Window bands.
    for (let k = 0; k < 5; k++) {
      if (k % 2 === 0) parts.push(svg('rect', { x: ax.X(k * 60), y: 20, width: ax.X(60) - ax.X(0), height: 230, fill: COL.data, opacity: 0.07 }));
    }
    parts.push(...ax.parts);
    // No delay at all: arrival = event.
    parts.push(line(ax.X(0), ax.Y(0), ax.X(300), ax.Y(300), COL.soft, 1, { 'stroke-dasharray': '2 3' }));
    // The watermark rule: a click is on time if it arrives within `wait` of happening.
    parts.push(line(ax.X(0), ax.Y(wait), ax.X(300), ax.Y(300 + wait), COL.clock, 1.6));
    parts.push(small(ax.X(300) - 4, ax.Y(300 + wait) - 6, `watermark: ${wait} s behind`, { anchor: 'end', fill: COL.clock }));
    // Now.
    parts.push(line(60, ax.Y(now), 510, ax.Y(now), COL.request, 1.2, { 'stroke-dasharray': '4 3' }));
    const wm = Math.max(0, now - wait);
    if (now > 0) parts.push(svg('path', { d: `M${ax.X(Math.min(300, wm))},${ax.Y(now) - 6} l-4,-7 h8 z`, fill: COL.clock }));
    for (const c of cs) {
      const seen = c.arrive <= now;
      const late = c.arrive > c.event + WINDOW - (c.event % WINDOW) + wait;
      const col = !late ? COL.write : revise ? COL.busy : COL.error;
      parts.push(svg('circle', { cx: ax.X(c.event), cy: ax.Y(c.arrive), r: 3.4, fill: seen ? col : 'none', stroke: seen ? COL.paper : COL.grid, 'stroke-width': seen ? 0.8 : 1 }));
    }
    // The answers, one box per window.
    res.forEach((r, k) => {
      const x = ax.X(r.start) + 3;
      const w = ax.X(60) - ax.X(0) - 6;
      const y = 290;
      const exact = r.firstAt !== null && r.now === r.truth;
      parts.push(svg('rect', { x, y, width: w, height: 52, rx: 4, fill: COL.paper, stroke: r.firstAt === null ? COL.grid : exact ? COL.answer : COL.busy, 'stroke-width': 1.5 }));
      parts.push(small(x + w / 2, y + 13, `${mmss(r.start)} to ${mmss(r.start + 60)}`, { anchor: 'middle', soft: true }));
      if (r.firstAt === null) parts.push(small(x + w / 2, y + 32, 'waiting', { anchor: 'middle', soft: true }));
      else {
        parts.push(label(x + w / 2, y + 32, r.now === r.first ? String(r.first) : `${r.first} → ${r.now}`, { anchor: 'middle', fill: exact ? COL.answer : COL.busy, bold: true }));
        parts.push(small(x + w / 2, y + 46, `true ${r.truth}${r.late && !revise ? `, ${r.late} dropped` : ''}`, { anchor: 'middle', soft: true }));
      }
      if (k === 0) parts.push(small(60, y - 6, 'Clicks a minute, as answered (first → revised):', { soft: true }));
    });
    redraw(g, ...parts);
    const done = res.filter((r) => r.firstAt !== null);
    const lateAll = done.reduce((s, r) => s + r.late, 0);
    const wrong = done.filter((r) => r.now !== r.truth).length;
    f.readout.textContent = now === 0
      ? `Clicks arrive over ten minutes. Each minute's count is given once the watermark, ${wait} s behind the clock, passes the end of that minute.`
      : `${mmss(now)} by the pipeline's clock; the watermark says every click up to ${mmss(wm)} is in. ${done.length} of 5 minutes answered, each ${wait} s after it ended. ${lateAll} late click${lateAll === 1 ? '' : 's'} ${revise ? 'added in revisions' : 'dropped'}; ${wrong ? `${wrong} answer${wrong === 1 ? '' : 's'} short of the true count.` : 'every answer so far matches the true count.'}`;
    if (t.goal === 'complete' && now >= NOW_MAX && res.every((r) => r.now === r.truth)) t.done();
  };
  const time = slider('Pipeline clock', 0, NOW_MAX, 5, 0, (v) => mmss(v), (v) => {
    now = v;
    paint();
  }, 'clock');
  const play = player(time, ctx, { seconds: 16 });
  const waitS = slider('Watermark waits', 0, 240, 5, wait, (v) => `${v} s`, (v) => {
    wait = v;
    paint();
  }, 'clock');
  const mode = pick(['Late clicks: drop', 'Late clicks: revise the count'], 0, (i) => {
    revise = i === 1;
    paint();
  });
  f.controls.append(mode.node, play.node, time.node, waitS.node);
  paint();
  return f.node;
}

// ---------------------------------------------------------------------------
// A click delivered twice, counted once. Lanes: a phone, the click log, the
// joiners in two datacentres, the ID registry, the advertiser's counts.

export function dedupScript(registry: boolean): Script {
  const lanes = [
    { id: 'phone', label: 'Phone' },
    { id: 'log', label: 'Click log' },
    { id: 'j1', label: 'Joiner, DC 1' },
    { id: 'j2', label: 'Joiner, DC 2' },
    { id: 'reg', label: 'ID registry' },
    { id: 'n', label: 'Counts' },
  ];
  const Wr = COL.write;
  const messages = [
    msg('phone', 'log', 2, 8, 'click 42', Wr),
    msg('log', 'phone', 10, 12, 'ok', COL.answer, true),
    msg('phone', 'log', 34, 8, 'click 42', Wr),
    msg('log', 'phone', 42, 8, 'ok', COL.answer),
    msg('log', 'j1', 14, 8, 'click 42', COL.request),
    msg('log', 'j2', 56, 8, 'click 42', COL.request),
  ];
  const marks: Mark[] = [
    { lane: 'phone', at: 28, text: 'no ack: resend', color: COL.error },
  ];
  if (registry) {
    messages.push(
      msg('j1', 'reg', 24, 10, 'claim 42', COL.request),
      msg('reg', 'j1', 36, 10, 'yours', COL.answer),
      msg('j1', 'n', 48, 8, 'ad 7 +1', Wr),
      msg('j2', 'reg', 66, 8, 'claim 42', COL.request),
      msg('reg', 'j2', 76, 8, 'taken', COL.error),
    );
    marks.push({ lane: 'reg', at: 33, text: 'agreed (Paxos)', color: COL.leader });
    marks.push({ lane: 'j2', at: 86, text: 'dropped', color: COL.soft });
    marks.push({ lane: 'n', at: 56, text: 'ad 7: 1', color: COL.answer });
  } else {
    messages.push(msg('j1', 'n', 26, 8, 'ad 7 +1', Wr), msg('j2', 'n', 66, 8, 'ad 7 +1', Wr));
    marks.push({ lane: 'n', at: 34, text: 'ad 7: 1', color: COL.soft });
    marks.push({ lane: 'n', at: 74, text: 'ad 7: 2', color: COL.error });
  }
  const story = [
    { at: 0, text: 'A phone reports click 42 on ad 7 to the click log. The log stores it, but the acknowledgement is lost on the way back.' },
    { at: 28, text: 'Hearing nothing, the phone sends click 42 again, as it should: from where the phone sits, the first may never have arrived. The log now holds two copies.' },
    {
      at: 24,
      text: registry
        ? 'The joiner in datacentre 1 reads the first copy and, before counting it, claims ID 42 in the registry. The registry agrees the claim with its replicas in other datacentres (Paxos) and says yours.'
        : 'The joiner in datacentre 1 reads the first copy and adds one to ad 7.',
    },
    {
      at: 56,
      text: registry
        ? 'The joiner in datacentre 2 reads the second copy and tries to claim ID 42. The registry says it is taken, so the joiner drops it. Ad 7 is counted once.'
        : 'The joiner in datacentre 2 reads the second copy and adds one too. The advertiser is billed twice for one click.',
    },
  ].sort((a, b) => a.at - b.at);
  return { lanes, messages, marks, tMax: 95, story };
}

// ---------------------------------------------------------------------------
// A count-min sketch: d rows of w counters. Each item adds to one counter in
// each row, chosen by that row's hash; its estimate is the smallest of its d
// counters, which can be too high (other items share the counters) but never
// too low.

export function zipfCounts(pages: number, views: number, s: number, seed: number): Int32Array {
  const rng = makeRng(seed);
  const cdf = new Float64Array(pages);
  let sum = 0;
  for (let k = 0; k < pages; k++) cdf[k] = sum += 1 / Math.pow(k + 1, s);
  const out = new Int32Array(pages);
  for (let i = 0; i < views; i++) {
    const u = rng() * sum;
    let lo = 0;
    let hi = pages - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    out[lo]++;
  }
  return out;
}

/** Row `r`'s column for item `k`, of `w`. */
export function cell(r: number, k: number, w: number): number {
  let h = Math.imul(k + 1, 0x9e3779b1) ^ Math.imul(r + 1, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) % w;
}

export class CountMin {
  readonly rows: Int32Array[];
  constructor(readonly w: number, readonly d: number) {
    this.rows = Array.from({ length: d }, () => new Int32Array(w));
  }
  add(k: number, n = 1) {
    for (let r = 0; r < this.d; r++) this.rows[r][cell(r, k, this.w)] += n;
  }
  estimate(k: number): number {
    let m = Infinity;
    for (let r = 0; r < this.d; r++) m = Math.min(m, this.rows[r][cell(r, k, this.w)]);
    return m;
  }
}

export interface SketchReport {
  counters: number;
  /** The true top ten, and how many of the sketch's top ten are among them. */
  topRight: number;
  /** Largest overestimate among the true top 100, and for page 1. */
  worstTop: number;
  top1: { truth: number; est: number };
  sketch: CountMin;
}

export function sketchReport(counts: Int32Array, w: number, d: number): SketchReport {
  const cm = new CountMin(w, d);
  for (let k = 0; k < counts.length; k++) if (counts[k]) cm.add(k, counts[k]);
  // Candidates: heavy hitters are among pages the sketch thinks are heavy; check the true top 300 and a sample.
  const order = Array.from(counts.keys()).sort((a, b) => counts[b] - counts[a]);
  const trueTop = new Set(order.slice(0, 10));
  const est = order.map((k) => ({ k, e: cm.estimate(k) }));
  const sketchTop = est.slice().sort((a, b) => b.e - a.e).slice(0, 10);
  const topRight = sketchTop.filter((x) => trueTop.has(x.k)).length;
  let worstTop = 0;
  for (const k of order.slice(0, 100)) worstTop = Math.max(worstTop, cm.estimate(k) - counts[k]);
  return { counters: w * d, topRight, worstTop, top1: { truth: counts[order[0]], est: cm.estimate(order[0]) }, sketch: cm };
}

export const PAGES = 50_000;
export const VIEWS = 200_000;

function sketchFigure(t: Task) {
  const W = 540;
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const counts = zipfCounts(PAGES, VIEWS, 1.1, 5);
  let w = 64;
  let d = 2;
  const paint = () => {
    const r = sketchReport(counts, w, d);
    const parts: SVGElement[] = [];
    parts.push(small(10, 16, `${VIEWS.toLocaleString('en-US')} page views over ${PAGES.toLocaleString('en-US')} pages; the sketch holds ${d} × ${w} = ${(w * d).toLocaleString('en-US')} counters`, { fill: COL.soft }));
    const shown = Math.min(w, 64);
    const cw = 470 / shown;
    const max = Math.max(...r.sketch.rows.map((row) => Math.max(...row)));
    const top = 0; // the most viewed page
    for (let row = 0; row < d; row++) {
      const y = 30 + row * 26;
      parts.push(small(52, y + 15, `hash ${row + 1}`, { anchor: 'end', soft: true }));
      for (let c = 0; c < shown; c++) {
        const v = r.sketch.rows[row][c];
        parts.push(svg('rect', { x: 60 + c * cw, y, width: Math.max(1, cw - 1), height: 22, fill: COL.data, opacity: 0.08 + 0.85 * Math.sqrt(v / max) }));
      }
      const col = cell(row, top, w);
      if (col < shown) parts.push(svg('rect', { x: 60 + col * cw - 1, y: y - 1, width: Math.max(2, cw + 1), height: 24, fill: 'none', stroke: COL.cache, 'stroke-width': 2 }));
    }
    if (w > shown) parts.push(small(530, 30 + d * 26 + 10, `first 64 of ${w} columns shown`, { anchor: 'end', soft: true }));
    const y0 = 30 + 5 * 26 + 6;
    const err = r.worstTop / VIEWS;
    parts.push(label(10, y0 + 14, `Busiest page: ${r.top1.truth.toLocaleString('en-US')} views, estimate ${r.top1.est.toLocaleString('en-US')} (its counters ringed; the estimate is the smallest)`, { size: 'small', fill: COL.cache }));
    parts.push(label(10, y0 + 32, `Top ten by the sketch: ${r.topRight} of 10 right. Largest overestimate among the top 100: ${r.worstTop.toLocaleString('en-US')} (${(err * 100).toFixed(2)}% of all views).`, { size: 'small', fill: r.topRight === 10 ? COL.answer : COL.error }));
    parts.push(label(10, y0 + 50, `Memory: ${(w * d * 4).toLocaleString('en-US')} bytes, against about ${(PAGES * 12).toLocaleString('en-US')} for an exact count of every page.`, { size: 'small', fill: COL.cost }));
    redraw(g, ...parts);
    f.readout.textContent = r.topRight === 10
      ? `With ${(w * d).toLocaleString('en-US')} counters the sketch names the top ten pages correctly. Each counter is shared by about ${Math.round(PAGES / w).toLocaleString('en-US')} pages, and the smallest of an item's counters is the one least crowded by heavy neighbours.`
      : `With ${(w * d).toLocaleString('en-US')} counters, each counter is shared by about ${Math.round(PAGES / w).toLocaleString('en-US')} pages, and the noise from them pushes rare pages into the top ten. Widen the rows or add a row.`;
    if (t.goal === 'top10' && r.topRight === 10 && w * d <= 2500) t.done();
  };
  const width = slider('Counters a row', { min: 16, max: 2048, scale: 'log', value: w, color: 'data', show: (v) => String(Math.round(v)), onInput: (v) => {
    w = Math.round(v);
    paint();
  } });
  const depth = slider('Rows (hashes)', 1, 5, 1, d, (v) => String(v), (v) => {
    d = v;
    paint();
  }, 'data');
  f.controls.append(width.node, depth.node);
  paint();
  return f.node;
}

export const FIGS = {
  'streams-window': figure(['complete'], (ctx, t) => windowFigure(ctx, t)),
  'streams-dedup': figure(['once'], (ctx, t) => {
    let registry = false;
    const s = seqFigure(ctx, {
      w: 540, h: 260, lines: 3, seconds: 12,
      script: () => dedupScript(registry),
      onTime: (now) => {
        if (t.goal === 'once' && registry && now >= 88) t.done();
      },
    });
    const mode = pick(['No registry', 'ID registry'], 0, (i) => {
      registry = i === 1;
      s.redo();
    });
    s.f.controls.prepend(mode.node);
    return s.f.node;
  }),
  'streams-sketch': figure(['top10'], (_ctx, t) => sketchFigure(t)),
};
