// Lesson L2, Reading a sonogram: one call through three kinds of detector
// (a still), the parts of a sonogram (a still), building a call and hearing
// it (live), and naming Washington bats from their calls (live, a drill).
// The calls are synthesised from rounded published values and played slowed
// ten times, as a time-expansion detector plays them.

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { shuffle } from 'didactics/rng';
import { COL, figure, frame, slider, tint, verdict, wrapped, type FigureFactory } from './kit';
import { freqAt, type Sweep } from './heterodyne';
import { playButton, type Call } from './sound';

const W = 400;

/** A Washington bat's search call, rounded: sweep, how loud (0 to 1), how often, and a second harmonic. */
export interface Caller {
  name: string;
  sweep: Sweep;
  /** Seconds between calls. */
  every: number;
  gain: number;
  harmonic?: boolean;
  why: string;
}

/** The callers the drill asks about, by the group a listener can actually name from a sonogram. */
export const CALLERS: readonly Caller[] = [
  { name: 'Hoary bat', sweep: { start: 27, end: 19, dur: 12, bend: 1.6 }, every: 0.3, gain: 1, why: 'Low, long and shallow, near 20 kHz, with long gaps: a big bat hunting in open sky.' },
  { name: 'Big brown or silver-haired', sweep: { start: 52, end: 27, dur: 9, bend: 3 }, every: 0.16, gain: 1, why: 'A steep start bending into a long tail near 25 to 28 kHz. Telling these two apart from one call is often impossible.' },
  { name: 'Little brown myotis', sweep: { start: 85, end: 40, dur: 5, bend: 2.5 }, every: 0.09, gain: 0.9, why: 'A steep sweep ending near 40 kHz, about 5 ms long.' },
  { name: '50 kHz myotis (Yuma or California)', sweep: { start: 95, end: 50, dur: 4, bend: 2.5 }, every: 0.08, gain: 0.9, why: 'Short and steep, ending near 50 kHz. Yuma and California myotis overlap so much that many surveys leave them as one group.' },
  { name: "Townsend's big-eared bat", sweep: { start: 40, end: 22, dur: 3, bend: 1.3 }, every: 0.1, gain: 0.3, harmonic: true, why: 'Faint, short, with a second harmonic as strong as the first: the whispering bat, heard only within a few metres.' },
];

/** The sweep's average slope, in kHz per millisecond. */
export const slope = (s: Sweep): number => (s.start - s.end) / s.dur;

/**
 * The caller whose search call is nearest a sweep by its end frequency
 * (kHz) and its length (ms), weighed so that 5 kHz counts like 3 ms.
 */
export function nearest(s: Sweep): Caller {
  const score = (c: Caller) => Math.hypot((s.end - c.sweep.end) / 5, (s.dur - c.sweep.dur) / 3);
  return CALLERS.reduce((best, c) => (score(c) < score(best) ? c : best));
}

/** One call and its harmonic as sound.ts calls, at `at` seconds real time. */
export const callSound = (c: Pick<Caller, 'sweep' | 'gain' | 'harmonic'>, at = 0): Call[] => {
  const one: Call = { at, dur: c.sweep.dur / 1000, from: c.sweep.start * 1000, to: c.sweep.end * 1000, gain: c.gain };
  return c.harmonic ? [one, { ...one, from: one.from * 2, to: one.to * 2, gain: c.gain * 0.8 }] : [one];
};

/** A train of `n` calls of one caller, real time. */
export const callTrain = (c: Caller, n = 6): Call[] => Array.from({ length: n }, (_, k) => callSound(c, k * c.every)).flat();

// ---- Drawing a sonogram ---------------------------------------------------------------------------

interface Panel { x: number; y: number; w: number; h: number; ms: number; khz: number }

/** A sonogram's axes: frequency up the side, time along the bottom. */
function sonoAxes(p: Panel, tickMs: readonly number[], tickKhz: readonly number[], unit = 'ms'): SVGElement[] {
  const X = (ms: number) => p.x + (ms / p.ms) * p.w;
  const Y = (k: number) => p.y + p.h - (k / p.khz) * p.h;
  return [
    svg('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: tint(COL.ink, 0.03) }),
    ...tickKhz.flatMap((k) => [line(p.x, Y(k), p.x + p.w, Y(k), COL.grid, 1), small(p.x - 4, Y(k) + 3, `${k}`, { anchor: 'end', soft: true })]),
    ...tickMs.map((ms) => small(X(ms), p.y + p.h + 12, `${ms}`, { anchor: 'middle', soft: true })),
    line(p.x, p.y + p.h, p.x + p.w, p.y + p.h, COL.ink, 1.2),
    line(p.x, p.y, p.x, p.y + p.h, COL.ink, 1.2),
    small(p.x + p.w, p.y + p.h + 24, unit, { anchor: 'end', soft: true }),
  ];
}

/** A call's trace on a panel, starting at `t0` ms; darker for a louder call, as a sonogram shows loudness. */
function trace(p: Panel, s: Sweep, t0: number, gain = 1, mult = 1, width = 3): SVGElement {
  const pts: P[] = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    pts.push([p.x + ((t0 + u * s.dur) / p.ms) * p.w, p.y + p.h - ((freqAt(s, u) * mult) / p.khz) * p.h]);
  }
  return polyline(pts.filter(([, y]) => y >= p.y - 1), COL.call, width, { opacity: 0.25 + 0.75 * gain, 'stroke-linecap': 'round' });
}

// ---- One call, three detectors (still) ------------------------------------------------------------

export const methodsStill = () => {
  const s = still(W, 236);
  const call: Sweep = { start: 90, end: 45, dur: 5, bend: 3 };
  const col = (x: number, title: string, body: string, parts: SVGElement[]) => [
    label(x + 56, 16, title, { anchor: 'middle', bold: true }),
    ...parts,
    ...wrapped(x, 168, body, 24, { soft: true }),
  ];
  const panel = (x: number): Panel => ({ x: x + 18, y: 28, w: 96, h: 104, ms: 7, khz: 100 });
  const pH = panel(4);
  const pF = panel(136);
  const pT = panel(268);
  // Heterodyne: only the slice within 5 kHz of a 48 kHz dial.
  const u0 = 0;
  const slice: Sweep = { ...call };
  const het: P[] = [];
  for (let i = 0; i <= 60; i++) {
    const u = u0 + i / 60;
    const f = freqAt(slice, u);
    if (Math.abs(f - 48) <= 5) het.push([pH.x + (u * call.dur / pH.ms) * pH.w, pH.y + pH.h - (f / pH.khz) * pH.h]);
  }
  // Frequency division: the whole shape, as dots, one per counted burst, and no loudness.
  const fd: SVGElement[] = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    fd.push(svg('circle', { cx: pF.x + (u * call.dur / pF.ms) * pF.w, cy: pF.y + pF.h - (freqAt(call, u) / pF.khz) * pF.h, r: 2, fill: COL.call }));
  }
  s.svg.append(
    ...col(4, 'Heterodyne', 'Hears only the slice within 5 kHz of the dial, live.', [
      ...sonoAxes(pH, [0, 5], [0, 50, 100]),
      trace(pH, call, 0, 0.12, 1, 2),
      svg('rect', { x: pH.x, y: pH.y + pH.h - (53 / 100) * pH.h, width: pH.w, height: (10 / 100) * pH.h, fill: tint(COL.good, 0.2) }),
      polyline(het, COL.call, 4),
    ]),
    ...col(136, 'Frequency division', 'The whole shape, live, but no loudness: each dot is ten waves counted.', [
      ...sonoAxes(pF, [0, 5], [0, 50, 100]),
      ...fd,
    ]),
    ...col(268, 'Time expansion', 'The whole call, loudness and all, played back ten times slower.', [
      ...sonoAxes(pT, [0, 5], [0, 50, 100]),
      trace(pT, call, 0, 1, 1, 3.5),
    ]),
    small(4, 230, 'kHz up the side, ms along the bottom; the same 90 to 45 kHz call in each.', { soft: true }),
  );
  return { node: s.node };
};

// ---- The parts of a sonogram (still) --------------------------------------------------------------

export const anatomyStill = () => {
  const s = still(W, 232);
  const p: Panel = { x: 40, y: 26, w: 230, h: 150, ms: 14, khz: 60 };
  const call: Sweep = { start: 52, end: 27, dur: 9, bend: 3 };
  const X = (ms: number) => p.x + (ms / p.ms) * p.w;
  const Y = (k: number) => p.y + p.h - (k / p.khz) * p.h;
  const t0 = 2;
  s.svg.append(
    ...sonoAxes(p, [0, 2, 4, 6, 8, 10, 12, 14], [0, 20, 40, 60]),
    small(p.x - 30, p.y - 8, 'kHz', { soft: true }),
    trace(p, call, t0, 1, 1, 4),
    // Start, end, characteristic frequency.
    line(X(t0) - 4, Y(call.start), X(t0) - 16, Y(call.start), COL.ink, 1),
    small(X(t0) + 8, Y(call.start) + 2, `starts at ${call.start} kHz`),
    line(X(t0 + call.dur * 0.6), Y(28.5) + 8, X(t0 + call.dur * 0.6), Y(28.5) + 26, COL.ink, 1),
    small(X(t0 + call.dur * 0.6), Y(28.5) + 36, 'characteristic frequency, 28 kHz:', { anchor: 'middle', bold: true }),
    small(X(t0 + call.dur * 0.6), Y(28.5) + 47, 'the flattest part', { anchor: 'middle' }),
    // Duration bracket.
    line(X(t0), p.y - 2, X(t0 + call.dur), p.y - 2, COL.ink, 1),
    line(X(t0), p.y - 6, X(t0), p.y + 2, COL.ink, 1),
    line(X(t0 + call.dur), p.y - 6, X(t0 + call.dur), p.y + 2, COL.ink, 1),
    small(X(t0 + call.dur / 2), p.y - 8, `duration ${call.dur} ms`, { anchor: 'middle' }),
    small(X(t0 + 2.5), Y(46), 'steep: fast sweep', { soft: true }),
    // The interval, off to the right with the axis broken.
    ...wrapped(284, 40, 'The next call comes about 150 ms later, far off this scale. The gap between call starts is the interval; it shrinks as the bat closes on prey (lesson 4).', 22, { soft: true }),
    small(284, 200, 'Darker means louder.', { soft: true }),
  );
  return { node: s.node };
};

// ---- Build a call (live) --------------------------------------------------------------------------

/** The target the reader builds: a Yuma myotis's search call. */
export const YUMA = { endNear: 50, endBy: 3, startAtLeast: 80, durAtMost: 6 } as const;

/** Whether a sweep would pass for a Yuma myotis's search call. */
export const passesForYuma = (s: Sweep): boolean =>
  Math.abs(s.end - YUMA.endNear) <= YUMA.endBy && s.start >= YUMA.startAtLeast && s.dur <= YUMA.durAtMost;

export const buildFigure = figure(['yuma'], (_ctx, t) => {
  const f = frame(W, 200, 4);
  const g = svg('g');
  f.svg.append(g);
  const s: Sweep = { start: 50, end: 25, dur: 12, bend: 2.5 };
  const p: Panel = { x: 36, y: 14, w: 210, h: 150, ms: 20, khz: 110 };
  const paint = () => {
    if (s.end >= s.start) s.end = s.start - 1;
    const like = nearest(s);
    const sl = slope(s);
    redraw(g,
      ...sonoAxes(p, [0, 5, 10, 15, 20], [0, 20, 40, 60, 80, 100]),
      small(p.x - 30, p.y - 4, 'kHz', { soft: true }),
      svg('rect', { x: p.x, y: p.y + p.h - (53 / p.khz) * p.h, width: p.w, height: (6 / p.khz) * p.h, fill: tint(COL.good, 0.18) }),
      small(p.x + p.w - 4, p.y + p.h - (53 / p.khz) * p.h - 3, 'Yuma ends here', { anchor: 'end', fill: COL.good }),
      trace(p, s, 2, 1, 1, 3.5),
      label(262, 34, `${sl.toFixed(1)} kHz per ms`, { bold: true }),
      small(262, 48, sl > 8 ? 'steep' : sl > 3 ? 'moderate' : 'shallow', { soft: true }),
      label(262, 78, 'Slowed ten times:', { bold: true }),
      small(262, 92, `${(s.start / 10).toFixed(1)} to ${(s.end / 10).toFixed(1)} kHz`),
      small(262, 104, `over ${s.dur * 10} ms`),
      label(262, 134, 'Nearest call:', { bold: true }),
      ...wrapped(262, 148, like.name, 24),
    );
    f.readout.textContent = passesForYuma(s)
      ? `That would pass for a Yuma myotis: a ${s.dur} ms sweep from ${s.start} kHz to ${s.end}, ${sl.toFixed(0)} kHz each millisecond. A short, steep call that ends high suits a small bat working close to water and trees.`
      : `${s.dur > 8
        ? `A ${s.dur} ms call is long: it puts more sound on a distant target, for hunting in open air, but echoes from anything close overlap it.`
        : `A ${s.dur} ms sweep from ${s.start} to ${s.end} kHz.`} For a Yuma: ${s.start >= YUMA.startAtLeast ? '✓' : '○'} start above 80 kHz, ${Math.abs(s.end - YUMA.endNear) <= YUMA.endBy ? '✓' : '○'} end near 50, ${s.dur <= YUMA.durAtMost ? '✓' : '○'} last 6 ms or less.`;
    if (passesForYuma(s)) t.done();
  };
  const a = slider('Starts at', 20, 110, 1, s.start, (v) => `${v} kHz`, (v) => { s.start = v; paint(); }, 'call');
  const b = slider('Ends at', 10, 60, 1, s.end, (v) => `${v} kHz`, (v) => { s.end = v; paint(); }, 'call');
  const c = slider('Lasts', 1, 20, 1, s.dur, (v) => `${v} ms`, (v) => { s.dur = v; paint(); }, 'ink');
  const listen = playButton('Play, slowed ten times', () => Array.from({ length: 4 }, (_, k): Call => ({ at: k * 0.1, dur: s.dur / 1000, from: s.start * 1000, to: s.end * 1000 })));
  f.controls.append(a.node, b.node, c.node, listen);
  paint();
  return f.node;
});

// ---- Name the bat (live) --------------------------------------------------------------------------

export const drillFigure = figure(['named'], (_ctx, t) => {
  const f = frame(W, 196, 3);
  const g = svg('g');
  f.svg.append(g);
  const named = new Set<string>();
  let order = shuffle(CALLERS.map((_, i) => i), Math.random);
  let at = 0;
  let answered = false;
  const p: Panel = { x: 36, y: 14, w: 230, h: 140, ms: 14, khz: 110 };
  const train: Panel = { x: 286, y: 14, w: 104, h: 140, ms: 1000, khz: 110 };
  const current = () => CALLERS[order[at]];
  const paint = () => {
    const c = current();
    f.svg.setAttribute('data-caller', c.name);
    const ticks: SVGElement[] = [];
    for (let k = 0; k * c.every < 1; k++) {
      const x = train.x + ((k * c.every * 1000) / train.ms) * train.w;
      ticks.push(line(x, train.y + train.h - (c.sweep.start / train.khz) * train.h, x, train.y + train.h - (c.sweep.end / train.khz) * train.h, COL.call, 2, { opacity: 0.25 + 0.75 * c.gain }));
    }
    redraw(g,
      ...sonoAxes(p, [0, 5, 10], [0, 20, 40, 60, 80, 100]),
      small(p.x - 30, p.y - 4, 'kHz', { soft: true }),
      trace(p, c.sweep, 2, c.gain, 1, 3.5),
      ...(c.harmonic ? [trace(p, c.sweep, 2, c.gain * 0.8, 2, 3)] : []),
      ...sonoAxes(train, [0, 500], [], 'ms'),
      ...ticks,
      small(train.x, train.y - 4, 'one second of calls', { soft: true }),
      small(p.x, 194, `${named.size} of ${CALLERS.length} named`, { bold: true, fill: named.size === CALLERS.length ? COL.good : COL.ink }),
    );
  };
  const answers = el('div', 'chips');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'btn btn-small';
  next.textContent = 'Next call';
  next.disabled = true;
  const ask = () => {
    answered = false;
    next.disabled = true;
    for (const b of answers.querySelectorAll('button')) { b.disabled = false; b.classList.remove('on'); }
    f.readout.textContent = 'Which bat made this call? Play it if you like: it is slowed ten times.';
    paint();
  };
  CALLERS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c.name;
    b.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const right = c.name === current().name;
      if (right) named.add(c.name);
      b.classList.add('on');
      for (const x of answers.querySelectorAll('button')) (x as HTMLButtonElement).disabled = true;
      f.readout.replaceChildren(verdict(right, right ? `${c.name}.` : `No: ${current().name}.`), ` ${current().why}`);
      next.disabled = false;
      paint();
      if (named.size === CALLERS.length) t.done();
    });
    answers.append(b);
  });
  next.addEventListener('click', () => {
    at += 1;
    if (at >= order.length) {
      // Go round again, the ones not yet named first.
      order = shuffle(CALLERS.map((_, i) => i), Math.random).sort((x, y) => Number(named.has(CALLERS[x].name)) - Number(named.has(CALLERS[y].name)));
      at = 0;
    }
    ask();
  });
  const listen = playButton('Play, slowed ten times', () => callTrain(current(), 5));
  f.controls.append(listen, answers, next);
  ask();
  return f.node;
});

function el(tag: string, cls: string): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  return n;
}

export const FIGS: Record<string, FigureFactory> = {
  'sono-methods': methodsStill,
  'sono-anatomy': anatomyStill,
  'sono-build': buildFigure,
  'sono-drill': drillFigure,
};

