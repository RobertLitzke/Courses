// Lesson 19, edge: how much of the viewing a cache of the most popular titles
// serves, and what crosses the backbone; and a video player's buffer when the
// bandwidth drops, with and without adaptive bitrate.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { animate, axes, COL, figure, frame, guessFirst, legend, pick, player, slider, type FigureContext, type Task } from './kit';

// ---------------------------------------------------------------------------
// Popularity: title k (from 1) is watched in proportion to 1/k^s (Zipf). A
// cache holding the k most popular titles serves their share of the viewing.

/** Share of views that go to the `k` most popular of `n` titles, with Zipf skew `s`. */
export function hitRate(n: number, s: number, k: number): number {
  let top = 0;
  let all = 0;
  for (let i = 1; i <= n; i++) {
    const v = 1 / Math.pow(i, s);
    all += v;
    if (i <= k) top += v;
  }
  return top / all;
}

export const TITLES = 10_000;
/** Evening peak in one country's providers: a million streams at 5 Mb/s, in Tb/s. */
export const PEAK_TBPS = 5;
/** An illustrative price for transit, dollars per Mb/s a month. */
export const TRANSIT = 0.5;

export function edgeNumbers(s: number, k: number) {
  const h = hitRate(TITLES, s, k);
  const backbone = PEAK_TBPS * (1 - h);
  return { h, backbone, cost: backbone * 1e6 * TRANSIT };
}

const money = (d: number) => (d >= 1e6 ? `$${(d / 1e6).toFixed(1)} million` : `$${Math.round(d / 1000).toLocaleString('en-US')},000`);

function cacheFigure(ctx: FigureContext, t: Task) {
  const W = 540;
  const H = 290;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let s = 1;
  let k = 1000;
  let clock = 0;
  let open = () => false;
  const ax = axes({
    x: 46, y: 30, w: 220, h: 200, xmin: 0, xmax: 4, ymin: 0, ymax: 1,
    xticks: [0, 1, 2, 3, 4], yticks: [0, 0.25, 0.5, 0.75, 1],
    xfmt: (v) => ['1', '10', '100', '1k', '10k'][v], yfmt: (v) => `${Math.round(v * 100)}%`,
    xlabel: 'titles held at the edge', ylabel: 'share of views served there', ink: COL.ink, grid: COL.grid,
  });
  const curveCache = new Map<number, [number, number][]>();
  const curve = (sk: number) => {
    let c = curveCache.get(sk);
    if (!c) {
      // One pass: cumulative shares at log-spaced sizes.
      const w: number[] = [];
      let all = 0;
      for (let i = 1; i <= TITLES; i++) all += (w[i] = 1 / Math.pow(i, sk));
      c = [];
      let acc = 0;
      let next = 0;
      for (let i = 1; i <= TITLES; i++) {
        acc += w[i];
        const x = Math.log10(i);
        if (x >= next || i === TITLES) {
          c.push([x, acc / all]);
          next = x + 0.05;
        }
      }
      curveCache.set(sk, c);
    }
    return c;
  };
  const paint = () => {
    const n = edgeNumbers(s, k);
    const parts: SVGElement[] = [...ax.parts];
    const x = Math.log10(k);
    if (open()) {
      parts.push(ax.path(curve(s), COL.cache, 2.4));
      parts.push(line(ax.X(x), ax.Y(0), ax.X(x), ax.Y(n.h), COL.cache, 1.2, { 'stroke-dasharray': '3 3' }), line(ax.X(0), ax.Y(n.h), ax.X(x), ax.Y(n.h), COL.cache, 1.2, { 'stroke-dasharray': '3 3' }));
      parts.push(svg('circle', { cx: ax.X(x), cy: ax.Y(n.h), r: 4.5, fill: COL.cache, stroke: COL.paper, 'stroke-width': 1 }));
      parts.push(small(ax.X(x) + 6, ax.Y(n.h) + 14, `${Math.round(n.h * 100)}%`, { fill: COL.cache, bold: true }));
    } else parts.push(small(156, 130, 'Lock in a guess to see', { anchor: 'middle', fill: COL.soft }), small(156, 143, 'the curve.', { anchor: 'middle', fill: COL.soft }));
    // The network: origin, backbone, the provider's edge cache, homes.
    const shownH = open() ? n.h : 0;
    const box = (bx: number, by: number, bw: number, bh: number, name: string, sub: string, stroke: string, dash = '') => [
      svg('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: COL.paper, stroke, 'stroke-width': 1.5, ...(dash ? { 'stroke-dasharray': dash } : {}) }),
      small(bx + bw / 2, by + bh / 2 - 2, name, { anchor: 'middle' }),
      small(bx + bw / 2, by + bh / 2 + 11, sub, { anchor: 'middle', soft: true }),
    ];
    parts.push(...box(330, 28, 180, 40, 'Origin (cloud region)', 'every title', COL.data));
    parts.push(svg('rect', { x: 312, y: 108, width: 216, height: 132, rx: 8, fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '6 4' }));
    parts.push(small(320, 122, 'Inside the internet provider', { fill: COL.soft }));
    parts.push(...box(340, 132, 160, 40, 'Edge cache', `${k.toLocaleString('en-US')} titles`, COL.cache, '5 2'));
    parts.push(...box(340, 192, 160, 36, 'Homes', `${PEAK_TBPS} Tb/s at peak`, COL.ink));
    const bw = 1 + 9 * (1 - shownH);
    parts.push(line(420, 70, 420, 130, COL.request, bw, { opacity: 0.35 }));
    parts.push(small(428, 96, open() ? `backbone: ${n.backbone.toFixed(2)} Tb/s` : 'backbone', { fill: COL.request }));
    parts.push(line(420, 174, 420, 190, COL.cache, 10, { opacity: 0.35 }));
    const phase = (clock / 900) % 1;
    const dotsUp = Math.max(1, Math.round(8 * (1 - shownH)));
    for (let i = 0; i < dotsUp; i++) {
      const fr = (phase + i / dotsUp) % 1;
      parts.push(svg('circle', { cx: 420, cy: 70 + 60 * fr, r: 2.6, fill: COL.answer }));
    }
    for (let i = 0; i < 4; i++) {
      const fr = (phase * 2 + i / 4) % 1;
      parts.push(svg('circle', { cx: 420, cy: 174 + 16 * fr, r: 2.6, fill: COL.answer }));
    }
    redraw(g, ...parts);
    if (open()) {
      f.readout.textContent = `The ${k.toLocaleString('en-US')} most popular titles (${((k / TITLES) * 100).toFixed(k < 100 ? 1 : 0)}% of the catalogue) get ${Math.round(n.h * 100)}% of the views. The other ${Math.round((1 - n.h) * 100)}% cross the backbone: ${n.backbone.toFixed(2)} Tb/s at peak, about ${money(n.cost)} a month at an illustrative $${TRANSIT} per Mb/s.`;
      if (t.goal === 'ninety' && s <= 1.0001 && n.h >= 0.9) t.done();
    }
  };
  const size = slider('Titles held at the edge', { min: 10, max: TITLES, scale: 'log', step: 10, value: k, color: 'cache', show: (v) => Math.round(v).toLocaleString('en-US'), onInput: (v) => {
    k = Math.round(v);
    paint();
  } });
  const skew = slider('How steep popularity falls', 0.6, 1.4, 0.1, s, (v) => `s = ${v.toFixed(1)}`, (v) => {
    s = Math.round(v * 10) / 10;
    paint();
  }, 'busy');
  f.controls.append(size.node, skew.node);
  animate(f.svg, ctx, (dt) => {
    clock += dt * 1000;
    paint();
  });
  paint();
  open = guessFirst(t, f, {
    ask: `A provider's edge cache holds the 1,000 most popular of ${TITLES.toLocaleString('en-US')} titles: a tenth of the catalogue. Popularity falls off as 1/rank. What share of the evening's viewing can it serve?`,
    options: ['About 10%', 'About 40%', 'About 75%'],
    answer: 2,
    sliders: [size, skew],
    after: () => paint(),
  });
  return f.node;
}

// ---------------------------------------------------------------------------
// A player fetching four-second segments. Its buffer grows when segments come
// faster than they play and drains when slower; empty, the video stalls.
// Without adaptive bitrate it always asks for the top rung of the ladder;
// with it, it picks the rung from how full its buffer is, capped by the
// bandwidth it has measured.

export const LADDER = [0.235, 0.375, 0.56, 0.75, 1.05, 1.75, 2.35, 3.0, 4.3, 5.8];
export const SEG = 4;
export const T_END = 120;
const MAX_BUFFER = 30;

export interface Playback {
  /** Samples every 0.5 s: time, bandwidth, the bitrate being fetched, seconds in the buffer, stalled or not. */
  t: number[];
  bw: number[];
  rate: number[];
  buffer: number[];
  stalled: boolean[];
  stallSeconds: number;
  stalls: number;
  meanRate: number;
  /** When playback started, s. */
  startup: number;
}

export const bandwidthAt = (t: number, dropTo: number) => (t >= 30 && t < 80 ? dropTo : 8);

/** The rung a buffer-based player picks: lowest under 8 s, highest over 24 s, in between by the buffer; never above 80% of measured bandwidth. */
export function pickRate(buffer: number, measured: number): number {
  const frac = Math.max(0, Math.min(1, (buffer - 8) / 16));
  let i = Math.round(frac * (LADDER.length - 1));
  while (i > 0 && LADDER[i] > 0.8 * measured) i--;
  return LADDER[i];
}

export function playback(abr: boolean, dropTo: number): Playback {
  const dt = 0.05;
  const out: Playback = { t: [], bw: [], rate: [], buffer: [], stalled: [], stallSeconds: 0, stalls: 0, meanRate: 0, startup: 0 };
  let buffer = 0;
  let playing = false;
  let measured = 8;
  let fetching: { rate: number; left: number; took: number } | null = null;
  let wasStalled = false;
  let rateSum = 0;
  let segs = 0;
  for (let i = 0; i * dt <= T_END + 1e-9; i++) {
    const t = i * dt;
    const bw = bandwidthAt(t, dropTo);
    // Start the next segment if there is room in the buffer.
    if (!fetching && buffer < MAX_BUFFER) {
      const rate = abr ? pickRate(buffer, measured) : LADDER[LADDER.length - 1];
      fetching = { rate, left: rate * SEG, took: 0 };
    }
    if (fetching) {
      fetching.left -= bw * dt;
      fetching.took += dt;
      if (fetching.left <= 0) {
        buffer += SEG;
        measured = (fetching.rate * SEG) / fetching.took;
        rateSum += fetching.rate;
        segs++;
        fetching = null;
      }
    }
    if (!playing && buffer >= SEG) {
      playing = true;
      out.startup = t;
    }
    // Waiting for the first segment is start-up, not a stall.
    let stalled = false;
    if (playing) {
      if (buffer > 0) buffer = Math.max(0, buffer - dt);
      else stalled = true;
    }
    if (stalled) {
      out.stallSeconds += dt;
      if (!wasStalled) out.stalls++;
    }
    wasStalled = stalled;
    if (i % 10 === 0) {
      out.t.push(t);
      out.bw.push(bw);
      out.rate.push(fetching?.rate ?? out.rate[out.rate.length - 1] ?? LADDER[0]);
      out.buffer.push(buffer);
      out.stalled.push(stalled);
    }
  }
  out.meanRate = segs ? rateSum / segs : 0;
  return out;
}

function abrFigure(ctx: FigureContext, t: Task) {
  const W = 540;
  const H = 260;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let abr = false;
  let drop = 2;
  let now = T_END;
  const top = axes({
    x: 54, y: 24, w: 460, h: 90, xmin: 0, xmax: T_END, ymin: 0, ymax: 9,
    yticks: [0, 3, 6, 9], yfmt: (v) => `${v}`, ylabel: 'Mb/s: bandwidth, and the bitrate fetched', ink: COL.ink, grid: COL.grid,
  });
  const bot = axes({
    x: 54, y: 140, w: 460, h: 80, xmin: 0, xmax: T_END, ymin: 0, ymax: 32,
    xticks: [0, 30, 60, 90, 120], yticks: [0, 10, 20, 30], xfmt: (v) => `${v} s`, ylabel: 'seconds of video in the buffer', xlabel: 'time', ink: COL.ink, grid: COL.grid,
  });
  const paint = () => {
    const r = playback(abr, drop);
    const upTo = r.t.findIndex((x) => x > now);
    const n = upTo < 0 ? r.t.length : upTo;
    const pts = (ys: number[]) => r.t.slice(0, n).map((x, i) => [x, ys[i]] as [number, number]);
    const parts: SVGElement[] = [...top.parts, ...bot.parts];
    // Stalls, shaded on both charts.
    for (let i = 0; i < n; i++) {
      if (!r.stalled[i]) continue;
      const x = bot.X(r.t[i]);
      const w = bot.X(0.5) - bot.X(0);
      parts.push(svg('rect', { x, y: 24, width: w, height: 196, fill: COL.error, opacity: 0.18 }));
    }
    parts.push(top.path(pts(r.bw), COL.soft, 1.6, { 'stroke-dasharray': '4 3' }));
    parts.push(top.path(pts(r.rate), COL.request, 2.2));
    parts.push(bot.path(pts(r.buffer), COL.cache, 2.2));
    parts.push(...legend(60, 252, [{ text: 'bandwidth', color: COL.soft, dash: true }, { text: 'bitrate fetched', color: COL.request }, { text: 'buffer', color: COL.cache }, { text: 'stalled', color: COL.error }]));
    redraw(g, ...parts);
    const shown = r.stalled.slice(0, n).filter(Boolean).length * 0.5;
    f.readout.textContent = `${abr ? 'Adaptive bitrate' : 'Always 5.8 Mb/s'}, bandwidth falling to ${drop} Mb/s from 30 s to 80 s: ${shown ? `stalled for ${shown.toFixed(1)} s so far` : 'no stalls so far'}${now >= T_END ? `, in ${r.stalls} stall${r.stalls === 1 ? '' : 's'}; average bitrate ${r.meanRate.toFixed(1)} Mb/s.` : '.'}`;
    if (t.goal === 'smooth' && abr && drop <= 2 && now >= T_END && r.stalls === 0) t.done();
  };
  const time = slider('Time', 0, T_END, 1, now, (v) => `${v} s`, (v) => {
    now = v;
    paint();
  }, 'clock');
  const play = player(time, ctx, { seconds: 12 });
  const dropS = slider('Bandwidth during the dip', 0.5, 6, 0.5, drop, (v) => `${v} Mb/s`, (v) => {
    drop = v;
    paint();
  }, 'busy');
  const mode = pick(['Fixed 5.8 Mb/s', 'Adaptive bitrate'], 0, (i) => {
    abr = i === 1;
    paint();
  });
  f.controls.append(mode.node, play.node, time.node, dropS.node);
  paint();
  return f.node;
}

export const FIGS = {
  'edge-cache': figure(['ninety'], (ctx, t) => cacheFigure(ctx, t)),
  'edge-abr': figure(['smooth'], (ctx, t) => abrFigure(ctx, t)),
};
