// Lesson 4, The feeding buzz: how fast a bat can call at each distance from
// its prey (guess first), an approach played out call by call with its echoes
// (a time lapse, and the calls to hear slowed ten times), and a still of
// Suga's map of delay-tuned cells.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { playButton, type Call } from './sound';
import { axes, COL, figure, frame, guessFirst, player, slider, tint, wrapped, type FigureFactory } from './kit';

const W = 400;

/** The speed of sound in air, metres a second. */
export const SOUND = 343;
/** How close a bat finds a moth by echo, metres (5 to 10 m in the field). */
export const DETECT = 7;
/** Calls a second while searching: one a wingbeat. */
export const WINGBEAT = 10;
/** The fastest a bat calls, in the terminal buzz. */
export const MAX_RATE = 200;
/** How close counts as caught, metres. */
export const CAUGHT = 0.1;

/** Seconds from a call to its echo off something `d` metres away: 5.8 ms a metre. */
export const roundTrip = (d: number) => (2 * d) / SOUND;

/** How long a call lasts at distance `d`, seconds: shortened so it ends well before its echo begins, between 8 ms and half a millisecond. */
export const callLength = (d: number) => Math.min(0.008, Math.max(0.0005, 0.4 * roundTrip(d)));

/**
 * Seconds from one call to the next, with the moth `d` metres away. Before
 * the bat has found it, one call a wingbeat; after, the bat calls again as
 * soon as the last echo is home and its own call over, but never more than
 * 200 times a second.
 */
export function interval(d: number): number {
  if (d > DETECT) return 1 / WINGBEAT;
  return Math.max(1 / MAX_RATE, roundTrip(d) + callLength(d));
}

/** The most calls a second a bat can make with its target `d` metres away. */
export const callRate = (d: number) => 1 / interval(d);

/** Which part of a hunt the bat is in at distance `d`. */
export const phase = (d: number): 'search' | 'approach' | 'buzz' => (d > DETECT ? 'search' : callRate(d) >= 150 ? 'buzz' : 'approach');

export interface Pulse {
  /** When the call starts, seconds from the start. */
  t: number;
  /** How far the moth is when the call goes out. */
  d: number;
  dur: number;
  /** When its echo is back at the bat. */
  echo: number;
}

/** Every call of an approach from `d0` metres at `v` metres a second, to the catch. */
export function approach(d0: number, v = 5): Pulse[] {
  const out: Pulse[] = [];
  let t = 0;
  for (;;) {
    const d = d0 - v * t;
    if (d <= CAUGHT) break;
    out.push({ t, d, dur: callLength(d), echo: t + roundTrip(d) });
    t += interval(d);
  }
  return out;
}

/** Seconds from the start of an approach to the catch. */
export const catchTime = (d0: number, v = 5) => (d0 - CAUGHT) / v;

/** The calls of an approach as sounds: sweeps from 70 to 35 kHz, slowed ten times to 7 to 3.5 kHz. */
export const approachCalls = (pulses: readonly Pulse[]): Call[] =>
  pulses.map((p) => ({ at: p.t, dur: p.dur, from: 70000, to: 35000, gain: p.d > DETECT ? 0.7 : 1 }));

const ms = (s: number) => (s >= 0.01 ? `${Math.round(s * 1000)} ms` : `${(s * 1000).toFixed(1)} ms`);
const metres = (d: number) => (d >= 1 ? `${d.toFixed(1)} m` : `${Math.round(d * 100)} cm`);

// ---- Call rate against distance (guess first) --------------------------------

export const rateFigure = figure(['near'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let d = 10;
  const ax = axes({
    x: 46, y: 26, w: 330, h: 160, xmin: 10, xmax: 0, ymin: 0, ymax: 240,
    xticks: [10, 8, 6, 4, 2, 0], yticks: [0, 50, 100, 150, 200], xlabel: 'metres to the moth', ylabel: 'calls a second, at most',
    ink: COL.ink, grid: COL.grid,
  });
  const curve: [number, number][] = [];
  for (let x = 10; x >= 0.15; x -= 0.02) curve.push([x, callRate(x)]);
  const paint = () => {
    const r = callRate(d);
    const p = phase(d);
    const band = (from: number, to: number, name: string, color: string) => [
      svg('rect', { x: ax.X(from), y: 26, width: ax.X(to) - ax.X(from), height: 160, fill: tint(color, 0.08) }),
      small((ax.X(from) + ax.X(to)) / 2, 40, name, { anchor: 'middle', fill: color, bold: true }),
    ];
    redraw(g,
      ...band(10, DETECT, 'search', COL.soft),
      ...band(DETECT, 0.8, 'approach', COL.call),
      ...band(0.8, 0, 'buzz', COL.cost),
      ...ax.parts,
      // Traced only as far as the moth has come, so the guess is not given away.
      open() ? ax.path(curve.filter(([x]) => x >= d), COL.model, 2.2) : null,
      ...(open() ? [
        line(ax.X(d), ax.Y(0), ax.X(d), ax.Y(r), COL.moth, 1, { 'stroke-dasharray': '3 2' }),
        svg('circle', { cx: ax.X(d), cy: ax.Y(r), r: 5, fill: COL.moth, stroke: COL.ink, 'stroke-width': 0.8 }),
        ax.X(d) > 300
          ? small(ax.X(d) - 9, Math.max(ax.Y(r) + 4, 60), `${Math.round(r)} a second`, { bold: true, anchor: 'end' })
          : small(ax.X(d) + 8, Math.max(ax.Y(r) - 8, 60), `${Math.round(r)} a second`, { bold: true }),
      ] : []),
    );
    if (!open()) return;
    f.readout.textContent = p === 'search'
      ? `At ${metres(d)} the bat has not found the moth yet. It calls once a wingbeat, about ${WINGBEAT} times a second. Drag the slider to bring the moth in.`
      : `At ${metres(d)} each echo is back ${ms(roundTrip(d))} after its call, and the call itself lasts ${ms(callLength(d))}, so the bat can call at most ${Math.round(r)} times a second.${p === 'buzz' ? ' That is the buzz.' : d > 1 ? ' Keep going, to within a metre.' : ''}`;
    if (d <= 1) t.done();
  };
  const s = slider('Moth distance', 0.2, 10, 0.1, d, (v) => metres(v), (v) => { d = v; paint(); }, 'moth');
  // Distance falls as the slider moves right, as the bat closes in.
  s.input.style.direction = 'rtl';
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: 'A bat closes on a moth from 10 metres, calling again as soon as each echo is back. Where does its call rate climb most steeply?',
    options: ['Evenly, all the way in', 'In the last metre', 'In the first few metres'],
    answer: 1,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The approach, call by call ----------------------------------------------

export const approachFigure = figure(['catch'], (ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  const SPEED = 5;
  const MOTH_X = 370;
  const PX = 22; // pixels a metre in the scene
  let d0 = 6;
  let pulses = approach(d0, SPEED);
  let end = catchTime(d0, SPEED);
  let now = 0;
  const STRIP = { x: 20, w: 360, y: 176 };
  const paint = () => {
    const d = Math.max(CAUGHT, d0 - SPEED * now);
    const batX = MOTH_X - d * PX;
    const waves: SVGElement[] = [];
    // The wavefronts in the air now: each call going out, and its echo coming back.
    for (const p of pulses) {
      if (p.t > now) break;
      const age = now - p.t;
      const outR = SOUND * age;
      const x0 = MOTH_X - p.d * PX;
      if (outR < p.d) {
        waves.push(arc(x0, 70, outR * PX, 1, COL.call));
      } else {
        const back = SOUND * age - p.d;
        const batNow = MOTH_X - Math.max(CAUGHT, d0 - SPEED * now) * PX;
        if (back * PX < MOTH_X - batNow + 4) waves.push(arc(MOTH_X, 70, back * PX, -1, COL.echo));
      }
    }
    // The whole hunt as ticks: calls above the line, echoes below.
    const X = (s: number) => STRIP.x + (s / end) * STRIP.w;
    const ticks: SVGElement[] = [];
    for (const p of pulses) {
      ticks.push(line(X(p.t), STRIP.y - 12, X(p.t), STRIP.y, COL.call, 1, { opacity: p.t <= now ? 1 : 0.25 }));
      if (p.echo <= end) ticks.push(line(X(p.echo), STRIP.y + 2, X(p.echo), STRIP.y + 12, COL.echo, 1, { opacity: p.echo <= now ? 1 : 0.25 }));
    }
    const found = pulses.find((p) => p.d <= DETECT);
    const buzzAt = pulses.find((p) => phase(p.d) === 'buzz');
    const marks: SVGElement[] = [];
    if (found && found.t > 0) marks.push(small(X(found.t), STRIP.y + 26, 'moth found', { anchor: 'middle', soft: true }), line(X(found.t), STRIP.y + 14, X(found.t), STRIP.y + 18, COL.soft, 1));
    if (buzzAt) marks.push(small(Math.min(X(buzzAt.t), 360), STRIP.y + 40, 'buzz', { anchor: 'middle', fill: COL.cost, bold: true }), line(X(buzzAt.t), STRIP.y + 14, X(buzzAt.t), STRIP.y + 30, COL.cost, 1));
    const recent = pulses.filter((p) => p.t <= now && p.t > now - 0.1).length;
    redraw(g,
      line(10, 112, 390, 112, COL.grid, 1),
      ...Array.from({ length: 17 }, (_, k) => k).filter((k) => k * PX <= MOTH_X - 20).map((k) => small(MOTH_X - k * PX, 124, k % 2 === 0 ? `${k}` : '', { anchor: 'middle', soft: true })),
      small(MOTH_X + 12, 124, 'm', { soft: true }),
      ...waves,
      batShape(batX, 70),
      mothShape(MOTH_X, 70, d <= CAUGHT + 0.01),
      line(X(now), STRIP.y - 18, X(now), STRIP.y + 16, COL.ink, 1.5),
      line(STRIP.x, STRIP.y + 1, STRIP.x + STRIP.w, STRIP.y + 1, COL.grid, 1),
      ...ticks,
      ...marks,
      small(STRIP.x, STRIP.y - 22, 'calls', { fill: COL.call, bold: true }),
      small(STRIP.x + 36, STRIP.y - 22, 'echoes', { fill: COL.echo, bold: true }),
      small(STRIP.x + STRIP.w, STRIP.y - 22, `${pulses.length} calls in ${end.toFixed(1)} s`, { anchor: 'end', soft: true }),
      label(14, 22, `${metres(d)} to go`, { bold: true }),
      small(390, 22, `${recent * 10} calls a second now`, { anchor: 'end', fill: COL.call }),
    );
    const p = phase(d);
    f.readout.textContent = now === 0
      ? `The bat starts ${metres(d0)} from the moth. Press Play to run the hunt, or drag Time. Every call of the hunt is marked on the strip below.`
      : now >= end - 1e-6
      ? `Caught. From ${metres(d0)} the hunt took ${end.toFixed(1)} seconds and ${pulses.length} calls; ${pulses.filter((q) => phase(q.d) === 'buzz').length} of them came in the last ${metres(0.8)}, the buzz.`
      : p === 'search'
        ? `Searching: the moth is ${metres(d)} away, too far to return an echo the bat can hear. One call a wingbeat, about ${WINGBEAT} a second.`
        : `${p === 'buzz' ? 'Buzz' : 'Approach'}: each echo is back ${ms(roundTrip(d))} after its call, so the next call can follow almost at once. Calls now ${ms(callLength(d))} long.`;
    if (now >= end - 1e-6) t.done();
  };
  const time = slider('Time', 0, 1, 0.001, 0, (v) => `${v.toFixed(2)} s`, (v) => { now = Math.min(v, end); paint(); }, 'call');
  const reset = () => {
    pulses = approach(d0, SPEED);
    end = catchTime(d0, SPEED);
    time.input.max = String(end);
    time.set(0);
  };
  const start = slider('Bat starts', 2, 15, 0.5, d0, (v) => `${v} m from the moth`, (v) => { d0 = v; reset(); }, 'bat');
  const play = player(time, ctx, { seconds: 14 });
  const hear = playButton('Hear it, slowed 10 times', () => approachCalls(pulses));
  const row = document.createElement('div');
  row.className = 'chips';
  row.append(play.node, hear);
  f.controls.append(start.node, row, time.node);
  reset();
  return f.node;
});

/** A wavefront: part of a circle about (x, y), opening right (dir 1) or left (dir -1). */
function arc(x: number, y: number, r: number, dir: 1 | -1, color: string): SVGElement {
  if (r < 1) return svg('circle', { cx: x, cy: y, r: 1.5, fill: color });
  const a = (50 * Math.PI) / 180;
  const x1 = x + dir * r * Math.cos(a);
  const y1 = y - r * Math.sin(a);
  const y2 = y + r * Math.sin(a);
  return svg('path', { d: `M${x1},${y1} A${r},${r} 0 0 ${dir === 1 ? 1 : 0} ${x1},${y2}`, fill: 'none', stroke: color, 'stroke-width': 1.6, opacity: 0.85 });
}

/** A bat seen from the side, flying right. */
export function batShape(x: number, y: number, scale = 1, color: string = COL.bat): SVGElement {
  const s = scale;
  return svg('g', { transform: `translate(${x} ${y}) scale(${s})` },
    svg('path', { d: 'M-14,-2 Q-6,-16 0,-4 Q6,-16 14,-2 Q6,-6 0,0 Q-6,-6 -14,-2 Z', fill: COL.wing, opacity: 0.9 }),
    svg('ellipse', { cx: 0, cy: 0, rx: 7, ry: 3.5, fill: color }),
    svg('circle', { cx: 7, cy: -1, r: 2.6, fill: color }),
    svg('path', { d: 'M7,-3 L8,-7 L9.5,-3 Z', fill: color }),
  );
}

/** A moth from above, small; struck through when caught. */
export function mothShape(x: number, y: number, caught = false): SVGElement {
  return svg('g', { transform: `translate(${x} ${y})`, opacity: caught ? 0.35 : 1 },
    svg('path', { d: 'M0,0 L-7,-6 L-8,2 Z M0,0 L7,-6 L8,2 Z', fill: COL.moth }),
    svg('ellipse', { cx: 0, cy: 0, rx: 1.6, ry: 4.5, fill: COL.ink }),
  );
}

// ---- Delay-tuned cells (still) -----------------------------------------------

/** The best delays of the cells in the still, milliseconds, short to long (Suga's range runs about 0.4 to 18 ms). */
export const BEST_DELAYS = [0.4, 0.6, 0.9, 1.3, 1.9, 2.8, 4, 5.8, 8.4, 12, 18] as const;

/** The distance, metres, whose echo comes back after `ms` milliseconds. */
export const rangeOf = (delayMs: number) => (delayMs / 1000) * SOUND / 2;

/** The cell (index into BEST_DELAYS) that answers best to an echo `ms` after the call. */
export const bestCell = (delayMs: number) =>
  BEST_DELAYS.reduce((best, b, i) => (Math.abs(Math.log(b / delayMs)) < Math.abs(Math.log(BEST_DELAYS[best] / delayMs)) ? i : best), 0);

export const delayMapStill = () => {
  const s = still(W, 232);
  const targets = [{ d: 0.5, name: 'moth at 50 cm' }, { d: 2, name: 'leaf at 2 m' }];
  const lit = targets.map((tg) => bestCell(roundTrip(tg.d) * 1000));
  const cellX = (i: number) => 40 + i * 32;
  const parts: SVGElement[] = [];
  // The scene: a bat and two targets, with their echo delays.
  parts.push(batShape(34, 40), small(34, 62, 'call', { anchor: 'middle', fill: COL.call }));
  const sx = (d: number) => 90 + d * 120;
  targets.forEach((tg, k) => {
    const x = sx(tg.d);
    parts.push(
      k === 0 ? mothShape(x, 40) : svg('path', { d: `M${x - 6},40 Q${x},28 ${x + 6},40 Q${x},48 ${x - 6},40 Z`, fill: COL.plant }),
      small(x, 24 - k * 0, tg.name, { anchor: 'middle', soft: true }),
      small(x, 62, `echo after ${(roundTrip(tg.d) * 1000).toFixed(1)} ms`, { anchor: 'middle', fill: COL.echo, bold: true }),
      line(x, 68, cellX(lit[k]), 128, COL.echo, 1, { 'stroke-dasharray': '3 2' }),
    );
  });
  // The strip of cortex: cells in a row by the delay they answer to.
  parts.push(svg('rect', { x: 22, y: 116, width: 356, height: 34, rx: 17, fill: tint(COL.bat, 0.08), stroke: COL.grid }));
  BEST_DELAYS.forEach((b, i) => {
    const on = lit.includes(i);
    parts.push(
      svg('circle', { cx: cellX(i), cy: 133, r: on ? 10 : 8, fill: on ? COL.echo : '#fff', stroke: on ? COL.ink : COL.soft, 'stroke-width': on ? 1.4 : 0.8 }),
      small(cellX(i), 166, b < 1 ? b.toFixed(1) : String(b), { anchor: 'middle', soft: !on, bold: on }),
    );
  });
  parts.push(
    small(22, 180, 'best delay, ms', { soft: true }),
    small(22, 196, `near: ${Math.round(rangeOf(BEST_DELAYS[0]) * 100)} cm`, { bold: true }),
    small(378, 196, `far: ${rangeOf(BEST_DELAYS[BEST_DELAYS.length - 1]).toFixed(1)} m`, { anchor: 'end', bold: true }),
    ...wrapped(22, 214, 'Each cell fires only when an echo follows the bat’s own call by its own delay. Distance becomes a place along the strip.', 74, { soft: true }),
    small(22, 108, 'a strip of auditory cortex', { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  'buzz-rate': rateFigure,
  'buzz-approach': approachFigure,
  'buzz-delay-map': delayMapStill,
};
