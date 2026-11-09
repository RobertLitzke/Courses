// Lesson D6, Every night, all of history again: why a replay must be
// deterministic (a recorded run against its replay, an unrecorded random draw
// and a new build), the estimate for a nightly run of a million scenarios, the
// scheduler that runs them, and a workbench of a night on a shared cluster.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { count } from 'sysdiagram/numbers';
import { COL, figure, frame, guessFirst, named, pick, slider, tint } from './kit';
import { drawBoard, estimateFigure, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// Replaying a run: a puck among pegs, steered by recorded inputs.

export type DriftMode = 'replay' | 'unseeded' | 'build';
export const DRIFT_MODES: readonly DriftMode[] = ['replay', 'unseeded', 'build'];
export const DRIFT_NAMES = ['Same build, same seed', 'An unrecorded random draw', 'New build, 32-bit rounding'];

export const BOX_W = 1.6;
export const BOX_H = 0.8;
export const PEGS: readonly (readonly [number, number])[] = [
  [0.3, 0.2], [0.8, 0.2], [1.3, 0.2],
  [0.55, 0.4], [1.05, 0.4],
  [0.3, 0.6], [0.8, 0.6], [1.3, 0.6],
];
export const PEG_R = 0.09;
export const TICS = 600;

/**
 * The puck's path for `tics` steps. Every run reads the same recorded inputs
 * (a small steer each tic) and draws a little wheel slip from the simulator's
 * own generator. The recording used seed 42 for that generator; `unseeded`
 * takes another seed, as a simulator seeded from the clock would, and `build`
 * keeps the seed but rounds the position to 32 bits each tic. With no mode
 * given, it is the recorded run.
 */
export function trajectory(mode?: DriftMode, tics = TICS): [number, number][] {
  const inputs = makeRng(1);
  const slip = makeRng(mode === 'unseeded' ? 43 : 42);
  const round = mode === 'build' ? Math.fround : (v: number) => v;
  let x = 0.12;
  let y = 0.41;
  let a = 0.35;
  const speed = 0.02;
  const out: [number, number][] = [[x, y]];
  for (let i = 0; i < tics; i++) {
    a += (inputs() - 0.5) * 0.04 + (slip() - 0.5) * 0.002;
    x = round(x + speed * Math.cos(a));
    y = round(y + speed * Math.sin(a));
    if (x < 0 || x > BOX_W) {
      a = Math.PI - a;
      x = Math.max(0, Math.min(BOX_W, x));
    }
    if (y < 0 || y > BOX_H) {
      a = -a;
      y = Math.max(0, Math.min(BOX_H, y));
    }
    for (const [px, py] of PEGS) {
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      if (d < PEG_R) {
        // Reflect the heading about the peg's normal and step back out.
        const n = Math.atan2(dy, dx);
        a = 2 * n - a + Math.PI;
        x = round(px + (PEG_R + 1e-6) * Math.cos(n));
        y = round(py + (PEG_R + 1e-6) * Math.sin(n));
      }
    }
    out.push([x, y]);
  }
  return out;
}

/** The first tic at which two paths are more than `apart` apart, or -1. */
export function splitAt(a: readonly (readonly [number, number])[], b: readonly (readonly [number, number])[], apart = 0.02): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]) > apart) return i;
  return -1;
}

// ---------------------------------------------------------------------------
// The estimate.

export function suiteSize(scenarios: number, seconds: number, coreSecPerSec: number, cores: number) {
  const simSeconds = scenarios * seconds;
  const coreSeconds = simSeconds * coreSecPerSec;
  return { simSeconds, coreHours: coreSeconds / 3600, wallSeconds: coreSeconds / cores, falseAlarms: scenarios * 0.01 };
}

const sayTime = (s: number) => (s >= 86_400 * 2 ? `${count(s / 86_400)} days` : s >= 3600 * 2 ? `${count(s / 3600)} hours` : s >= 120 ? `${count(s / 60)} minutes` : `${count(s)} seconds`);
const sayYears = (s: number) => (s >= 365 * 86_400 ? `${(s / (365 * 86_400)).toFixed(1)} years` : `${count(s / 86_400)} days`);

// ---------------------------------------------------------------------------
// A night on a shared cluster.

export interface NightChoices {
  /** Run at batch priority on whatever production leaves, or reserve cores at production priority. */
  preemptible: boolean;
  /** Save each task's state every 5 minutes, so a preempted task resumes. */
  checkpoint: boolean;
  /** Minutes of work in one task. */
  taskMin: number;
  /** Reuse the baseline build's results from earlier nights, found by the hash of their inputs. */
  cache: boolean;
}

/** Cores in the cell, and the cores a reservation holds all day. */
export const CLUSTER = 15_000;
export const RESERVED = 4_000;
/** Both builds, a million scenarios each, 30 simulated seconds at 4 core-seconds a second: core-hours. */
export const NIGHT_WORK = (2 * 1e6 * 30 * 4) / 3600;
/** The run starts at 22:00 and must be done by 07:00, nine hours later. */
export const START = 22;
export const DEADLINE_H = 9;
/** A minute to start each task: fetch the build, load the map and the scenario. */
export const STARTUP_MIN = 1;
/** How often a batch task is preempted by churn, a share an hour, besides the morning rise in production. */
export const CHURN = 0.2;
export const CKPT_MIN = 5;
/** Share of time spent writing checkpoints. */
export const CKPT_COST = 0.03;
/** Round prices of our own, a core-hour: production priority, and batch priority. */
export const PRICE_PROD = 0.04;
export const PRICE_BATCH = 0.01;

/** Share of the cell production uses at a clock hour: busiest at 14:00, quietest at 02:00. */
export const prodShare = (clock: number) => 0.6 + 0.25 * Math.cos((2 * Math.PI * (clock - 14)) / 24);

export interface NightPoint {
  /** Hours since 22:00. */
  t: number;
  prod: number;
  batch: number;
}

export interface Night {
  /** Hours after 22:00 when the last task finished, or Infinity if not within 24 hours. */
  finish: number;
  /** Core-hours used, and how many of them did no lasting work (start-up, checkpoints, work lost to preemption). */
  used: number;
  wasted: number;
  cost: number;
  series: NightPoint[];
}

export function nightRun(o: NightChoices, stepMin = 5): Night {
  const dt = stepMin / 60;
  const L = o.taskMin / 60;
  const eff = (L / (L + STARTUP_MIN / 60)) * (o.checkpoint ? 1 - CKPT_COST : 1);
  // Work lost when a task is preempted: on average half of what it had done since it last saved.
  const lostEach = (o.checkpoint ? Math.min(L, CKPT_MIN / 60) : L) / 2;
  let need = NIGHT_WORK * (o.cache ? 0.5 : 1);
  let used = 0;
  let wasted = 0;
  let finish = Infinity;
  let prev = 0;
  const series: NightPoint[] = [];
  for (let t = 0; t < 24 - 1e-9; t += dt) {
    const prod = CLUSTER * prodShare((START + t) % 24);
    let cores = need > 0 ? (o.preemptible ? CLUSTER - prod : RESERVED) : 0;
    let lost = 0;
    if (o.preemptible && cores > 0) lost = cores * dt * CHURN * lostEach + Math.max(0, prev - cores) * lostEach;
    let gross = cores * dt;
    let useful = Math.max(0, gross * eff - lost);
    if (useful >= need && need > 0) {
      const frac = need / useful;
      gross *= frac;
      useful = need;
      finish = t + frac * dt + L / 2;
    }
    if (need > 0) {
      used += gross;
      wasted += gross - useful;
      need -= useful;
    } else cores = 0;
    series.push({ t, prod, batch: need > 0 || gross > 0 ? cores : 0 });
    prev = cores;
  }
  // The last wave: tasks started just before the work ran out finish over the next half task.
  const workDone = finish - L / 2;
  const last = series.find((p) => p.t <= workDone && p.t + dt > workDone);
  const wave = last ? last.batch || (o.preemptible ? CLUSTER - last.prod : RESERVED) : 0;
  for (const p of series) if (p.t > workDone && p.t < finish) p.batch = wave * (1 - (p.t - workDone) / (finish - workDone));
  const cost = o.preemptible ? used * PRICE_BATCH : RESERVED * 24 * PRICE_PROD;
  return { finish, used, wasted, cost, series };
}

export const clockAt = (hoursAfterStart: number) => {
  const m = Math.round(((START + hoursAfterStart) % 24) * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------

export const FIGS = {
  'replay-drift': figure(['drift'], (_ctx, t) => {
    const W = 560;
    const H = 300;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    const S = (W - 40) / BOX_W;
    const X = (x: number) => 20 + x * S;
    const Y = (y: number) => 26 + y * S;
    const recorded = trajectory();
    let mode = 0;
    let open = false;
    const pathOf = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('');
    const paint = () => {
      const parts: SVGElement[] = [];
      parts.push(svg('rect', { x: X(0), y: Y(0), width: BOX_W * S, height: BOX_H * S, fill: 'none', stroke: COL.soft, 'stroke-width': 1.2 }));
      for (const [px, py] of PEGS) parts.push(svg('circle', { cx: X(px), cy: Y(py), r: PEG_R * S, fill: tint(COL.soft, 0.2), stroke: COL.soft }));
      parts.push(svg('path', { d: pathOf(recorded), fill: 'none', stroke: COL.ink, 'stroke-width': 3, opacity: 0.25 }));
      parts.push(small(20, 16, 'Recorded run', { bold: true, soft: true }));
      if (open) {
        const run = trajectory(DRIFT_MODES[mode]);
        const at = splitAt(recorded, run);
        const col = at < 0 ? COL.answer : COL.error;
        parts.push(svg('path', { d: pathOf(run), fill: 'none', stroke: col, 'stroke-width': 1.6 }));
        parts.push(small(110, 16, `Replay: ${DRIFT_NAMES[mode].toLowerCase()}`, { bold: true, fill: col }));
        if (at >= 0) {
          const [x, y] = run[at];
          parts.push(svg('circle', { cx: X(x), cy: Y(y), r: 6, fill: 'none', stroke: COL.error, 'stroke-width': 2 }));
          parts.push(label(X(x), Y(y) - 10, `apart at tic ${at}`, { anchor: 'middle', size: 'note', bold: true, fill: COL.error, halo: COL.paper }));
        }
        const end = run[run.length - 1];
        parts.push(svg('circle', { cx: X(end[0]), cy: Y(end[1]), r: 4, fill: col }));
        f.readout.textContent = at < 0
          ? `All ${TICS} tics land exactly on the recorded run: the same inputs into the same code with the same seed give the same answer, bit for bit.`
          : mode === 1
            ? `The simulator drew its own random numbers from another seed. Within ${at} tics the puck is on another path, and every result after that point describes a run that never happened.`
            : `Rounding moved the puck by about one part in ten million. Each bounce off a peg magnified the difference, and by tic ${at} the paths had split.`;
        if (mode === 2) t.done();
      }
      const end = recorded[recorded.length - 1];
      parts.push(svg('circle', { cx: X(end[0]), cy: Y(end[1]), r: 4, fill: COL.ink, opacity: 0.5 }));
      redraw(g, ...parts);
    };
    const modes = named(pick(DRIFT_NAMES, 0, (i) => { mode = i; paint(); }), 'Replay with:');
    f.controls.append(modes.node);
    guessFirst(t, f, {
      ask: `The replay feeds the same recorded inputs to a new build. Its only change rounds the puck's position to 32-bit numbers, an error of about one part in ten million. After ${TICS} tics, where is the replayed puck?`,
      options: ['On the recorded path', 'A hair off, too small to see', 'Somewhere else entirely'],
      answer: 2,
      sliders: [],
      buttons: modes.buttons,
      after: () => { open = true; paint(); },
    });
    paint();
    return f.node;
  }),

  'replay-estimate': estimateFigure({
    inputs: [
      { key: 'scenarios', label: 'Scenarios', min: 10_000, max: 10_000_000, value: 1_000_000, log: true, show: (v) => count(v), color: 'request' },
      { key: 'speed', label: 'Core-seconds per simulated second', min: 0.25, max: 16, value: 1, log: true, show: (v) => v.toFixed(2).replace(/\.?0+$/, ''), color: 'model' },
      { key: 'cores', label: 'Cores', min: 1000, max: 100_000, value: 10_000, log: true, show: (v) => count(v), color: 'busy' },
    ],
    rows: (v) => {
      const s = suiteSize(v.scenarios, 30, v.speed, v.cores);
      return [
        { label: 'Simulated driving, 30 s a scenario', say: sayYears(s.simSeconds), how: `${count(v.scenarios)} × 30 s`, color: 'request' },
        { label: 'Core-hours', say: count(s.coreHours), how: `${sayYears(s.simSeconds)} × ${v.speed.toFixed(2).replace(/\.?0+$/, '')} core-s per s ÷ 3,600`, color: 'model' },
        { label: 'Time on the cluster', say: sayTime(s.wallSeconds), how: `${count(s.coreHours)} core-hours ÷ ${count(v.cores)} cores`, color: 'busy' },
        { label: 'False alarms if 1% of tests flag by chance', say: count(s.falseAlarms), how: `${count(v.scenarios)} × 1%`, color: 'error' },
      ];
    },
    ask: 'A million scenarios of 30 seconds each, simulated at one core-second per simulated second, on 10,000 cores. How long does the run take?',
    options: ['About a minute', 'About an hour', 'About a day', 'About a year'],
    answer: 1,
    after: (v) => {
      const s = suiteSize(v.scenarios, 30, v.speed, v.cores);
      return `${sayYears(s.simSeconds)} of driving in ${sayTime(s.wallSeconds)}. Every night, ${count(s.falseAlarms)} scenarios would cross a 1% threshold by chance alone.`;
    },
  }),

  'replay-scheduler': () => {
    const W = 600;
    const H = 260;
    const s = still(W, H);
    const g = svg('g');
    const boxes: BoardBox[] = [
      { id: 'api', x: 70, y: 60, label: 'Job API', sub: 'submit, schedule', shape: 'pill', color: 'request', w: 110 },
      { id: 'store', x: 300, y: 60, label: 'Job store', sub: 'jobs, tasks, leases', shape: 'store', color: 'data', w: 130, h: 44 },
      { id: 'sched', x: 520, y: 60, label: 'Scheduler', sub: 'one elected leader', color: 'leader', stack: true, w: 120 },
      { id: 'workers', x: 300, y: 175, label: 'Workers', sub: 'pull, lease, heartbeat', color: 'model', stack: true, w: 140 },
      { id: 'results', x: 520, y: 175, label: 'Results', sub: 'named by input hash', shape: 'store', color: 'cache', w: 130, h: 44 },
    ];
    const wires: BoardWire[] = [
      { from: 'api', to: 'store', text: 'write the job', weight: 0.15, color: 'write' },
      { from: 'sched', to: 'store', text: 'due runs, ready tasks', weight: 0.2, color: 'leader' },
      { from: 'workers', to: 'store', text: 'claim with a lease', weight: 0.35, color: 'model' },
      { from: 'workers', to: 'results', text: 'write once', weight: 0.25, color: 'cache' },
    ];
    drawBoard(g, boxes, wires);
    const parts: SVGElement[] = [g];
    parts.push(svg('rect', { x: 10, y: 120, width: 190, height: 128, rx: 6, fill: tint(COL.data, 0.07), stroke: COL.data, 'stroke-width': 1 }));
    parts.push(label(20, 138, 'One task row', { size: 'note', bold: true, fill: COL.data }));
    const row = ['task: scenario 4471, build 9132', 'state: running, attempt 2', 'lease: worker 17 until 03:12:40', 'priority: batch', 'after: simulate, done', 'key: hash of all its inputs'];
    row.forEach((r, i) => parts.push(small(20, 156 + i * 15, r)));
    // The job's tasks as a small graph.
    const dag = [['Simulate', 'model'], ['Score', 'model'], ['Compare', 'busy'], ['Report', 'answer']] as const;
    dag.forEach(([name, col], i) => {
      const x = 236 + i * 90;
      parts.push(svg('rect', { x, y: 228, width: 74, height: 22, rx: 11, fill: tint(COL[col], 0.15), stroke: COL[col] }));
      parts.push(small(x + 37, 243, name, { anchor: 'middle', bold: true }));
      if (i) parts.push(line(x - 16, 239, x - 2, 239, COL.soft, 1.4));
    });
    parts.push(small(236, 220, 'One job\'s tasks, each starting when those before it are done', { soft: true }));
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'replay-bench': figure(['night'], (_ctx, t) => {
    const W = 600;
    const H = 230;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    const o: NightChoices = { preemptible: false, checkpoint: false, taskMin: 120, cache: false };
    const x0 = 56;
    const x1 = W - 16;
    const y0 = 24;
    const y1 = 180;
    const X = (h: number) => x0 + (h / 24) * (x1 - x0);
    const Y = (c: number) => y1 - (c / CLUSTER) * (y1 - y0);
    const paint = () => {
      const n = nightRun(o);
      const parts: SVGElement[] = [];
      const pts = n.series;
      const dt = pts.length > 1 ? pts[1].t - pts[0].t : 1 / 12;
      const prodTop = pts.map((p) => `${X(p.t).toFixed(1)},${Y(p.prod).toFixed(1)} ${X(p.t + dt).toFixed(1)},${Y(p.prod).toFixed(1)}`).join(' ');
      parts.push(svg('polygon', { points: `${X(0)},${Y(0)} ${prodTop} ${X(24)},${Y(0)}`, fill: tint(COL.request, 0.35) }));
      const base = (p: NightPoint) => (o.preemptible ? p.prod : 0);
      const upper = pts.map((p) => `${X(p.t).toFixed(1)},${Y(base(p) + p.batch).toFixed(1)}`).join(' ');
      const lower = [...pts].reverse().map((p) => `${X(p.t).toFixed(1)},${Y(base(p)).toFixed(1)}`).join(' ');
      parts.push(svg('polygon', { points: `${upper} ${lower}`, fill: tint(COL.model, 0.75) }));
      if (!o.preemptible) parts.push(line(X(0), Y(RESERVED), X(24), Y(RESERVED), COL.model, 1, { 'stroke-dasharray': '4 3' }), small(X(24) - 4, Y(RESERVED) - 4, 'reserved all day', { anchor: 'end', fill: COL.model }));
      parts.push(line(x0, Y(CLUSTER), x1, Y(CLUSTER), COL.ink, 1), small(x0 + 4, Y(CLUSTER) - 5, `the cell: ${count(CLUSTER)} cores`, { soft: true }));
      parts.push(line(x0, y1, x1, y1, COL.ink, 1));
      for (let h = 0; h <= 24; h += 3) parts.push(small(X(h), y1 + 14, clockAt(h), { anchor: 'middle', soft: true }));
      parts.push(line(X(DEADLINE_H), y0, X(DEADLINE_H), y1, COL.clock, 1.6, { 'stroke-dasharray': '5 3' }), small(X(DEADLINE_H) - 4, y0 + 14, 'results due', { anchor: 'end', fill: COL.clock, bold: true, halo: COL.paper }));
      if (Number.isFinite(n.finish)) {
        const late = n.finish > DEADLINE_H;
        parts.push(line(X(n.finish), y0 + 16, X(n.finish), y1, late ? COL.error : COL.answer, 2), small(X(n.finish) + 4, y0 + 26, `done ${clockAt(n.finish)}`, { bold: true, fill: late ? COL.error : COL.answer }));
      }
      parts.push(svg('rect', { x: x0, y: y1 + 24, width: 10, height: 10, fill: tint(COL.request, 0.35) }), small(x0 + 14, y1 + 33, 'production serving users'));
      parts.push(svg('rect', { x: x0 + 190, y: y1 + 24, width: 10, height: 10, fill: tint(COL.model, 0.75) }), small(x0 + 204, y1 + 33, 'the nightly simulation run'));
      parts.push(small(8, (y0 + y1) / 2, 'cores', { soft: true }));
      redraw(g, ...parts);
      const share = n.used ? n.wasted / n.used : 0;
      f.readout.textContent = [
        Number.isFinite(n.finish) ? `Done at ${clockAt(n.finish)}${n.finish > DEADLINE_H ? `, ${count((n.finish - DEADLINE_H) * 60)} minutes after the results were due` : ', in time for the morning'}.` : 'Not done within 24 hours: tonight\'s run collides with tomorrow\'s.',
        `${count(n.used)} core-hours used, ${Math.round(share * 100)}% of them wasted on start-up, checkpoints and work lost to preemption.`,
        `Cost about $${count(n.cost)} a night${o.preemptible ? ' at batch prices' : ' for 4,000 cores reserved all day at production prices'}.`,
      ].join('\n');
      if (o.preemptible && n.finish <= DEADLINE_H && share < 0.1) t.done();
    };
    const prio = named(pick(['Reserve 4,000 cores', 'Batch, preemptible'], 0, (i) => { o.preemptible = i === 1; paint(); }), 'Capacity:');
    const ckpt = named(pick(['None', 'Every 5 minutes'], 0, (i) => { o.checkpoint = i === 1; paint(); }), 'Checkpoints:');
    const cache = named(pick(['Run both builds', 'Reuse baseline results'], 0, (i) => { o.cache = i === 1; paint(); }), 'Baseline:');
    const size = slider('Work in one task', { min: 1, max: 240, scale: 'log', step: 1, value: o.taskMin, show: (v) => (v >= 60 ? `${(v / 60).toFixed(1).replace(/\.0$/, '')} h` : `${Math.round(v)} min`), onInput: (v) => { o.taskMin = v; paint(); }, color: 'model' });
    f.controls.append(prio.node, ckpt.node, cache.node, size.node);
    paint();
    return f.node;
  }),
};
