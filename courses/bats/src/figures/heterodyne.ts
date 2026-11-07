// Lesson L1, Hearing the unhearable: how a heterodyne bat detector mixes a
// call down into hearing. A live detector (tune the dial; a Myotis call
// sweeps past; the beat comes out of the speaker), a guess first on what a
// steady 83 kHz call sounds like with the dial at 80, and the detector as a
// block diagram (a still).

import { svg } from 'didactics/dom';
import { arrow, label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { COL, animate, figure, type FigureFactory, frame, guessFirst, named, pick, slider, tint, wrapped } from './kit';
import { playButton, type Call } from './sound';

const W = 400;

/**
 * A frequency-modulated call: it sweeps from `start` down to `end` (kHz)
 * in `dur` milliseconds. `bend` sets its shape: 1 is a straight line on the
 * sonogram, larger values a steep start and a long, nearly flat tail near
 * `end`, the call's characteristic frequency.
 */
export interface Sweep {
  start: number;
  end: number;
  dur: number;
  bend: number;
}

/** The frequency (kHz) a sweep has reached a fraction `u` (0 to 1) of the way through. */
export const freqAt = (s: Sweep, u: number): number => s.end + (s.start - s.end) * Math.pow(1 - Math.max(0, Math.min(1, u)), s.bend);

/** How far through the sweep (0 to 1) it passes frequency `f`. */
export function timeAt(s: Sweep, f: number): number {
  if (f >= s.start) return 0;
  if (f <= s.end) return 1;
  return 1 - Math.pow((f - s.end) / (s.start - s.end), 1 / s.bend);
}

/** How far either side of the dial a detector lets through, in kHz: its low-pass filter. */
export const BAND = 5;

/** What the speaker plays when a call at `f` meets a dial at `lo`: the difference, in kHz. */
export const beat = (f: number, lo: number): number => Math.abs(f - lo);

/** The two tones a mixer makes from a call at `f` and the dial at `lo`, in kHz. */
export const products = (f: number, lo: number) => ({ difference: beat(f, lo), sum: f + lo });

/** The share of a call (0 to 1) that falls inside the detector's window with the dial at `lo`. */
export function dwell(s: Sweep, lo: number, band = BAND): number {
  const hi = Math.min(s.start, lo + band);
  const low = Math.max(s.end, lo - band);
  if (hi <= low) return 0;
  return timeAt(s, low) - timeAt(s, hi);
}

/**
 * What a heterodyne detector plays for one call starting at `at` seconds:
 * the parts of the sweep inside the window, each as the falling or rising
 * difference tone, in real time (hertz, seconds), for sound.ts with no
 * slowing. A sweep falls through the dial, so the tone drops toward zero
 * and climbs again.
 */
export function heterodyned(s: Sweep, lo: number, at = 0, band = BAND): Call[] {
  const hi = Math.min(s.start, lo + band);
  const low = Math.max(s.end, lo - band);
  if (hi <= low) return [];
  const out: Call[] = [];
  const piece = (fa: number, fb: number) => {
    const ua = timeAt(s, fa);
    const ub = timeAt(s, fb);
    const dur = ((ub - ua) * s.dur) / 1000;
    if (dur <= 0) return;
    out.push({ at: at + (ua * s.dur) / 1000, dur, from: Math.max(0.1, beat(fa, lo)) * 1000, to: Math.max(0.1, beat(fb, lo)) * 1000 });
  };
  if (hi > lo) piece(hi, Math.max(lo, low));
  if (low < lo) piece(Math.min(lo, hi), low);
  return out;
}

/** The two bats the live detector can hear. Parameters are typical search calls, rounded. */
export const DETECTOR_BATS: readonly { name: string; sweep: Sweep; every: number }[] = [
  { name: 'Myotis, 45 kHz', sweep: { start: 90, end: 45, dur: 5, bend: 3 }, every: 0.1 },
  { name: 'Big brown bat', sweep: { start: 55, end: 27, dur: 9, bend: 3 }, every: 0.15 },
];

// ---- The detector, live ---------------------------------------------------------------------------

const AX = { x0: 34, x1: 384, f0: 10, f1: 110 };
const X = (f: number) => AX.x0 + ((f - AX.f0) / (AX.f1 - AX.f0)) * (AX.x1 - AX.x0);

/** The mixer's output on its own scale, from 0 kHz. */
const X2 = (f: number) => AX.x0 + (Math.max(0, f) / 100) * (AX.x1 - AX.x0);

const freqAxis = (y: number, ticks: readonly number[], at: (f: number) => number = X): SVGElement[] => [
  line(AX.x0, y, AX.x1, y, COL.ink, 1.2),
  ...ticks.flatMap((v) => [line(at(v), y, at(v), y + 4, COL.ink, 1), small(at(v), y + 14, `${v}`, { anchor: 'middle', soft: true })]),
];

/** A short trace of the speaker's output, a sine at `khz` across 2 ms, `amp` 0 to 1. */
function scope(x0: number, x1: number, y: number, khz: number, amp: number, color: string): SVGElement {
  const pts: P[] = [];
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const tms = (i / n) * 2;
    pts.push([x0 + ((x1 - x0) * i) / n, y - amp * 13 * Math.sin(2 * Math.PI * khz * tms)]);
  }
  return polyline(pts, color, 1.6);
}

export const detectorFigure = figure(['myotis'], (ctx, t) => {
  const f = frame(W, 262, 4);
  const base = svg('g');
  const live = svg('g');
  f.svg.append(base, live);
  let bat = 0;
  let lo = 30;
  let clock = 0;
  const sweepOf = () => DETECTOR_BATS[bat].sweep;

  const paintBase = () => {
    const s = sweepOf();
    redraw(base,
      small(4, 14, 'Into the microphone: the call, kHz', { bold: true }),
      line(X(s.end), 52, X(s.start), 52, tint(COL.call, 0.35), 6, { 'stroke-linecap': 'round' }),
      svg('rect', { x: X(lo - BAND), y: 26, width: X(lo + BAND) - X(lo - BAND), height: 40, fill: tint(COL.good, 0.18) }),
      line(X(lo), 22, X(lo), 70, COL.ink, 1.5, { 'stroke-dasharray': '4 3' }),
      small(X(lo), 20, `dial ${lo}`, { anchor: lo > 95 ? 'end' : lo < 22 ? undefined : 'middle' }),
      ...freqAxis(70, [20, 40, 60, 80, 100]),
      small(4, 112, 'Out of the mixer: difference and sum, kHz', { bold: true }),
      svg('rect', { x: X2(0), y: 122, width: X2(BAND) - X2(0), height: 34, fill: tint(COL.good, 0.25) }),
      small(X2(BAND) + 4, 132, 'the filter lets through 0 to 5 kHz', { soft: true }),
      ...freqAxis(156, [0, 20, 40, 60, 80, 100], X2),
      small(4, 196, 'To the speaker', { bold: true }),
      line(AX.x0, 230, AX.x1, 230, COL.grid, 1),
      small(AX.x1, 256, '2 milliseconds of sound', { anchor: 'end', soft: true }),
    );
  };

  const paintLive = () => {
    const s = sweepOf();
    // One call drawn slowed right down: 1.4 s of sweep, then 0.6 s quiet.
    const cycle = 2;
    const ph = clock % cycle;
    const calling = ph < 1.4;
    const fNow = calling ? freqAt(s, ph / 1.4) : NaN;
    const inside = calling && Math.abs(fNow - lo) <= BAND;
    const parts: SVGElement[] = [];
    if (calling) {
      const { difference, sum } = products(fNow, lo);
      parts.push(
        svg('circle', { cx: X(fNow), cy: 52, r: 6, fill: COL.call, stroke: inside ? COL.ink : 'none', 'stroke-width': 1.5 }),
        line(X2(difference), 124, X2(difference), 154, inside ? COL.good : COL.soft, 3),
        small(Math.max(AX.x0 + 14, X2(difference)), 184, `difference ${difference.toFixed(0)}`, { anchor: 'middle', fill: inside ? COL.good : COL.soft }),
      );
      if (sum <= 100) parts.push(line(X2(sum), 124, X2(sum), 154, COL.soft, 2), small(X2(sum), 120, `sum ${sum.toFixed(0)}`, { anchor: 'middle', soft: true }));
      else parts.push(arrow(AX.x1 - 30, 140, AX.x1, 140, COL.soft, 1.5), small(AX.x1, 120, `sum ${sum.toFixed(0)}, off the scale`, { anchor: 'end', soft: true }));
      if (inside) parts.push(scope(AX.x0, AX.x1, 230, difference, 1, COL.good));
      else parts.push(small(W / 2, 234, 'silence: the difference is too high for the filter', { anchor: 'middle', soft: true }));
    } else parts.push(small(W / 2, 234, 'silence between calls', { anchor: 'middle', soft: true }));
    redraw(live, ...parts);
  };

  const say = () => {
    const s = sweepOf();
    const d = dwell(s, lo);
    if (d === 0) {
      f.readout.textContent = `Dial at ${lo} kHz. The call runs from ${s.start} down to ${s.end} kHz and never comes within ${BAND} kHz of the dial, so the speaker stays silent. Drag the dial into the call's range.`;
    } else {
      const ms = d * s.dur;
      const sound = d >= 0.45 ? 'a full, wet "tock"' : d >= 0.2 ? 'a short "chip"' : 'a dry tick';
      f.readout.textContent = `Dial at ${lo} kHz. ${ms.toFixed(1)} ms of the ${s.dur} ms call falls inside the window: ${sound} on each call.${d >= 0.45 ? ' The call lingers near its end frequency, so this is where it sounds loudest.' : ' Keep tuning: find where the call lingers longest in the green window.'}`;
    }
    if (bat === 0 && d >= 0.45) t.done();
  };

  const species = named(pick(DETECTOR_BATS.map((b) => b.name), 0, (i) => { bat = i; paintBase(); say(); }), 'Bat:');
  const dial = slider('Dial', 15, 100, 1, lo, (v) => `${v} kHz`, (v) => { lo = v; paintBase(); say(); }, 'ink');
  const listen = playButton('Listen, real time', () => {
    const b = DETECTOR_BATS[bat];
    return Array.from({ length: 10 }, (_, k) => heterodyned(b.sweep, lo, k * b.every)).flat();
  }, 1);
  f.controls.append(species.node, dial.node, listen);
  paintBase();
  paintLive();
  say();
  animate(f.node, ctx, (dt) => { clock += dt; paintLive(); });
  return f.node;
});

// ---- A steady call, guessed first -----------------------------------------------------------------

/** A greater horseshoe bat's call, rounded: a short rise, a long steady tone, a short fall. */
export const HORSESHOE = { cf: 83, dur: 50, tailTo: 68, tail: 3 } as const;

/** What a detector set to `lo` plays for a steady call at `cf`: a tone of the difference, or nothing outside the window. */
export const cfTone = (cf: number, lo: number, band = BAND): number | null => (beat(cf, lo) <= band ? beat(cf, lo) : null);

export const steadyFigure = figure(['zero'], (_ctx, t) => {
  const f = frame(W, 214, 4);
  const g = svg('g');
  f.svg.append(g);
  let lo = 80;
  const T0 = 40;
  const T1 = 380;
  const tx = (ms: number) => T0 + (ms / 60) * (T1 - T0);
  const fy = (k: number) => 100 - ((k - 60) / 40) * 80;
  const paint = () => {
    const tone = cfTone(HORSESHOE.cf, lo);
    const call: P[] = [[tx(2), fy(78)], [tx(4), fy(HORSESHOE.cf)], [tx(4 + HORSESHOE.dur), fy(HORSESHOE.cf)], [tx(4 + HORSESHOE.dur + HORSESHOE.tail), fy(HORSESHOE.tailTo)]];
    redraw(g,
      small(4, 14, 'The call on a sonogram: kHz against milliseconds', { bold: true }),
      svg('rect', { x: T0, y: fy(Math.min(100, lo + BAND)), width: T1 - T0, height: fy(Math.max(60, lo - BAND)) - fy(Math.min(100, lo + BAND)), fill: tint(COL.good, 0.18) }),
      line(T0, fy(lo), T1, fy(lo), COL.ink, 1.5, { 'stroke-dasharray': '4 3' }),
      small(T1, fy(lo) - 4, `dial ${lo}`, { anchor: 'end' }),
      polyline(call, COL.call, 3.5),
      line(T0, 100, T1, 100, COL.ink, 1.2),
      line(T0, 20, T0, 100, COL.ink, 1.2),
      ...[60, 70, 80, 90, 100].map((k) => small(T0 - 4, fy(k) + 3, `${k}`, { anchor: 'end', soft: true })),
      ...[0, 20, 40, 60].map((ms) => small(tx(ms), 114, `${ms}`, { anchor: 'middle', soft: true })),
      small(T1, 126, 'ms', { anchor: 'end', soft: true }),
      small(4, 146, 'Out of the speaker, 2 ms of it', { bold: true }),
      line(T0, 180, T1, 180, COL.grid, 1),
      !open()
        ? small(W / 2, 184, '? make your guess first', { anchor: 'middle', soft: true })
        : tone === null
        ? small(W / 2, 184, 'silence: the call is outside the window', { anchor: 'middle', soft: true })
        : tone < 0.25
          ? small(W / 2, 184, 'almost nothing: zero beat', { anchor: 'middle', fill: COL.good })
          : scope(T0, T1, 180, tone, 1, COL.good),
      ...(open() && tone !== null && tone >= 0.25 ? [small(T1, 206, `a steady whistle at ${tone.toFixed(1)} kHz`, { anchor: 'end', fill: COL.good })] : []),
    );
    if (!open()) return;
    f.readout.textContent = tone === null
      ? `With the dial at ${lo} kHz, the steady part of the call is more than ${BAND} kHz away. Only the brief falling tail might flick through the window.`
      : tone < 0.25
        ? 'Dial and call agree: the difference is close to zero, the whistle sinks to a flutter and stops. This "zero beat" is how a listener reads a constant-frequency call to a fraction of a kilohertz.'
        : `${HORSESHOE.cf} minus ${lo} is ${tone.toFixed(1)} kHz: a steady whistle for the ${HORSESHOE.dur} ms of the call, with a quick chirp at the end as the tail falls through the window. Turn the dial toward the call and the whistle drops.`;
    if (tone !== null && tone < 0.25) t.done();
  };
  const dial = slider('Dial', 70, 95, 0.5, lo, (v) => `${v} kHz`, (v) => { lo = v; paint(); }, 'ink');
  const listen = playButton('Listen, real time', () => {
    const tone = cfTone(HORSESHOE.cf, lo);
    const tail: Sweep = { start: HORSESHOE.cf, end: HORSESHOE.tailTo, dur: HORSESHOE.tail, bend: 1 };
    return Array.from({ length: 8 }, (_, k): Call[] => {
      const at = k * 0.1;
      const steady: Call[] = tone === null ? [] : [{ at, dur: HORSESHOE.dur / 1000, from: Math.max(20, tone * 1000), to: Math.max(20, tone * 1000), gain: tone < 0.25 ? 0 : 1 }];
      return [...steady, ...heterodyned(tail, lo, at + HORSESHOE.dur / 1000)];
    }).flat();
  }, 1);
  listen.disabled = true;
  f.controls.append(dial.node, listen);
  const open = guessFirst(t, f, {
    ask: `A horseshoe bat holds a steady ${HORSESHOE.cf} kHz for ${HORSESHOE.dur} ms at a time. With the detector's dial at 80 kHz, what comes out of the speaker?`,
    options: ['A steady whistle, about 3 kHz', 'A dry click on each call', 'Nothing: 83 kHz is out of hearing', 'A whistle that slides down'],
    answer: 0,
    sliders: [dial],
    buttons: [listen],
    hidden: [listen],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The detector, block by block (still) ---------------------------------------------------------

export const blocksStill = () => {
  const s = still(W, 250);
  const box = (x: number, y: number, w: number, title: string, part: string, color: string = COL.ink): SVGElement[] => [
    svg('rect', { x, y, width: w, height: 34, rx: 6, fill: COL.paper, stroke: color, 'stroke-width': 1.5 }),
    label(x + w / 2, y + 15, title, { anchor: 'middle', bold: true }),
    small(x + w / 2, y + 28, part, { anchor: 'middle', soft: true }),
  ];
  const sig = (x: number, y: number, text: string, color: string = COL.soft, anchor: 'middle' | 'end' | undefined = 'middle') => small(x, y, text, { anchor, fill: color });
  s.svg.append(
    // Row one: microphone, preamp, mixer.
    ...box(8, 30, 110, 'Microphone', 'MEMS or electret'),
    ...box(145, 30, 100, 'Preamp', 'op-amp, ×100'),
    ...box(272, 30, 120, 'Mixer', 'NE602 or CD4066'),
    arrow(118, 47, 143, 47, COL.call, 2),
    arrow(245, 47, 270, 47, COL.call, 2),
    sig(63, 20, '45 kHz call, millivolts', COL.call),
    sig(195, 20, 'the same, louder', COL.call),
    // The local oscillator under the mixer.
    ...box(272, 112, 120, 'Oscillator', '555 or CD4046'),
    arrow(332, 112, 332, 66, COL.ink, 2),
    sig(332, 160, 'the dial sets it: 48 kHz', COL.ink),
    // Row two: filter, amplifier, speaker.
    arrow(300, 64, 230, 112, COL.good, 2),
    sig(226, 92, '3 kHz and 93 kHz', COL.good, 'end'),
    ...box(130, 112, 110, 'Low-pass filter', 'resistor, capacitor'),
    ...box(8, 192, 110, 'Amplifier', 'LM386'),
    arrow(130, 138, 80, 190, COL.good, 2),
    sig(96, 160, '3 kHz only', COL.good, 'end'),
    ...box(145, 192, 100, 'Speaker', 'or headphones'),
    arrow(118, 209, 143, 209, COL.good, 2),
    ...wrapped(256, 202, 'Out comes a 3 kHz tone that starts and stops with each call.', 26, { soft: true }),
  );
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  'het-detector': detectorFigure,
  'het-steady': steadyFigure,
  'het-blocks': blocksStill,
};
