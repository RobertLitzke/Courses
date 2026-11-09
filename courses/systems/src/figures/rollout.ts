// Lesson D7, One update, 8.5 million screens: a defective update sent to a
// whole fleet at once or in stages behind a health gate, A/B partitions with
// a bootloader that falls back, the signed metadata of The Update Framework,
// and a workbench of bytes, cost and versions for a fleet of two million cars.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { count } from 'sysdiagram/numbers';
import { COL, figure, frame, guessFirst, named, pick, player, slider, tint, type ColorKey } from './kit';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// Staged rollouts.

export const FLEET = 1_000_000;
/** The share of the fleet each stage brings up to. */
export const STAGES = [0.01, 0.1, 0.5, 1] as const;
/** Hours to deliver a stage, and hours it bakes before the health check. */
export const RAMP_H = 1;
export const BAKE_H = 6;
/** All at once: everyone has it in 78 minutes. */
export const ALL_AT_ONCE_H = 1.3;
/**
 * Broken devices above the control group's rate that the health check needs
 * before it is sure something is wrong. Below this the excess hides in the
 * fleet's everyday failures.
 */
export const DETECT = 30;

export interface Rollout {
  /** Hour at which the rollout was halted, or Infinity. */
  haltedAt: number;
  /** Index of the stage it was halted after, or -1. */
  haltedStage: number;
  /** Devices that received the update, and devices it broke. */
  updated: number;
  broken: number;
  /** Updated devices by hour, 0 to `hours`. */
  byHour: number[];
}

export function rollout(staged: boolean, defect: number, hours = 36): Rollout {
  const byHour: number[] = [];
  if (!staged) {
    for (let h = 0; h <= hours; h++) byHour.push(FLEET * Math.min(1, h / ALL_AT_ONCE_H));
    return { haltedAt: Infinity, haltedStage: -1, updated: FLEET, broken: FLEET * defect, byHour };
  }
  let haltedAt = Infinity;
  let haltedStage = -1;
  STAGES.forEach((share, k) => {
    if (haltedStage >= 0) return;
    const check = k * (RAMP_H + BAKE_H) + RAMP_H + BAKE_H;
    if (k < STAGES.length - 1 && FLEET * share * defect >= DETECT) {
      haltedAt = check;
      haltedStage = k;
    }
  });
  const at = (h: number) => {
    let n = 0;
    for (let k = 0; k < STAGES.length; k++) {
      if (haltedStage >= 0 && k > haltedStage) break;
      const start = k * (RAMP_H + BAKE_H);
      const prev = k ? STAGES[k - 1] : 0;
      if (h >= start) n = FLEET * (prev + (STAGES[k] - prev) * Math.min(1, (h - start) / RAMP_H));
    }
    return n;
  };
  for (let h = 0; h <= hours; h++) byHour.push(at(h));
  const updated = haltedStage >= 0 ? FLEET * STAGES[haltedStage] : FLEET;
  return { haltedAt, haltedStage, updated, broken: updated * defect, byHour };
}

const pct = (x: number) => (x >= 0.01 ? `${Math.round(x * 100)}%` : x >= 0.001 ? `${(x * 100).toFixed(1)}%` : `${(x * 100).toFixed(2)}%`);

// ---------------------------------------------------------------------------
// A/B partitions.

export type Layout = 'inplace' | 'ab';
export type AbCase = 'good' | 'bad' | 'power';
export const AB_CASES: readonly AbCase[] = ['good', 'bad', 'power'];
export const AB_CASE_NAMES = ['A good update', 'An update that won\'t boot', 'Power cut while writing'];

export interface SlotState {
  text: string;
  color: ColorKey;
}
export interface AbStep {
  /** Slot A (the only slot when written in place), and slot B. */
  a: SlotState;
  b?: SlotState;
  /** Which slot the bootloader will start, and tries left on a slot being tried. */
  boot: string;
  /** The device's state after this step. */
  device: SlotState;
  say: string;
}

const OK: ColorKey = 'answer';
export function abSteps(layout: Layout, c: AbCase): AbStep[] {
  const v1 = { text: 'v1, good', color: OK };
  if (layout === 'inplace') {
    const steps: AbStep[] = [
      { a: v1, boot: 'start the system', device: { text: 'running v1', color: OK }, say: 'One system partition, running v1.' },
      { a: { text: 'v1, good', color: OK }, boot: 'start the system', device: { text: 'downloading v2', color: 'request' }, say: 'v2 is downloaded to spare space and its signature checked.' },
      { a: { text: 'v1 → v2, writing', color: 'busy' }, boot: 'start the system', device: { text: 'out of service', color: 'busy' }, say: 'To install it, the device stops and overwrites its only system in place.' },
    ];
    if (c === 'power') steps.push({ a: { text: 'half v1, half v2', color: 'error' }, boot: 'start the system', device: { text: 'won\'t start', color: 'error' }, say: 'The power fails half way. Neither version is whole, and nothing is left to boot: someone must come with a cable.' });
    else if (c === 'bad') steps.push({ a: { text: 'v2, won\'t boot', color: 'error' }, boot: 'start the system', device: { text: 'won\'t start', color: 'error' }, say: 'v2 installs but crashes as it starts, every time. v1 is gone, so the device stays broken until someone fixes it by hand.' });
    else steps.push({ a: { text: 'v2, good', color: OK }, boot: 'start the system', device: { text: 'running v2', color: OK }, say: 'v2 installs and starts. It worked, after some minutes out of service.' });
    return steps;
  }
  const steps: AbStep[] = [
    { a: v1, b: { text: 'old copy', color: 'soft' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'Two system slots. The device runs v1 from A; B is spare.' },
    { a: v1, b: { text: 'v2, writing', color: 'busy' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'v2 is written into B in the background, while the device carries on from A.' },
  ];
  if (c === 'power') {
    steps.push({ a: v1, b: { text: 'half written', color: 'error' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'The power fails half way. B was never marked bootable, so the device simply starts A again.' });
    steps.push({ a: v1, b: { text: 'v2, writing again', color: 'busy' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'The download resumes where it stopped, and the device never noticed.' });
    return steps;
  }
  steps.push({ a: v1, b: { text: 'v2, hash checked', color: 'request' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'B\'s contents are checked against the signed hash. Then B is marked "try once".' });
  steps.push({ a: v1, b: { text: 'v2, on trial', color: 'busy' }, boot: 'try B, 1 try left', device: { text: 'restarting', color: 'busy' }, say: 'At a convenient moment the device restarts into B. The bootloader counts the try down before it starts B.' });
  if (c === 'bad') {
    steps.push({ a: v1, b: { text: 'v2, crashed', color: 'error' }, boot: 'try B, 0 tries left', device: { text: 'restarting', color: 'busy' }, say: 'v2 crashes before it can report healthy. The device restarts.' });
    steps.push({ a: v1, b: { text: 'v2, marked bad', color: 'error' }, boot: 'start A', device: { text: 'running v1 from A', color: OK }, say: 'With no tries left on B, the bootloader starts A. The device is back on v1 and reports the failure, which counts against the rollout\'s health gate.' });
  } else {
    steps.push({ a: v1, b: { text: 'v2, good', color: OK }, boot: 'start B', device: { text: 'running v2 from B', color: OK }, say: 'v2 starts and passes its health checks, then marks B good. A keeps v1 as the fallback until the next update.' });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// The fleet workbench: two million cars, software and map data each month.

export const CARS = 2_000_000;
/** Gigabytes in a month's release: full and as a delta from last month. */
export const SOFT_FULL = 1.5;
export const MAP_FULL = 20;
export const SOFT_DELTA = 0.15;
export const MAP_DELTA = 1;
/** Share of cars with Wi-Fi at home, and the chance such a car is on it on a given day. */
export const WIFI_SHARE = 0.7;
export const WIFI_DAILY = 0.7;
/** Chance an active car is online on a given day. */
export const ONLINE_DAILY = 0.9;
/** Share of cars parked for months; and how fast they come back, a share a day. */
export const PARKED = 0.03;
export const RETURN_DAILY = 1 / 120;
/** Wi-Fi first: days before a car falls back to cellular. */
export const WIFI_WAIT = 14;
/** A round price of our own for bulk cellular data. */
export const CELL_PER_GB = 1;

export interface FleetChoices {
  delta: boolean;
  wifiFirst: boolean;
  /** How many past releases have a delta to this one. */
  deltaPaths: number;
  /** Days the release is offered over, a share of the fleet each day. */
  spreadDays: number;
}

export interface FleetPlan {
  /** Average gigabytes sent per car, and the share that needs the full release. */
  perCar: number;
  fullShare: number;
  totalBytes: number;
  cellBytes: number;
  cellCost: number;
  /** Highest day's delivery, in gigabits a second averaged over that day. */
  peakGbps: number;
  /** First day by which 95% have the release, or Infinity within 90 days. */
  daysTo95: number;
  /** Share still on older releases after 30 days. */
  lagging30: number;
  /** Updated share by day, 0 to 90. */
  byDay: number[];
}

/** Share of the fleet more than `k` releases behind: cars parked for months. */
export const behindMoreThan = (k: number) => PARKED * 0.8 ** k;

export function fleetPlan(o: FleetChoices): FleetPlan {
  const fullShare = o.delta ? behindMoreThan(o.deltaPaths) : 1;
  const deltaGB = SOFT_DELTA + MAP_DELTA;
  const fullGB = SOFT_FULL + MAP_FULL;
  const perCar = fullShare * fullGB + (1 - fullShare) * deltaGB;
  const W = Math.max(1, Math.round(o.spreadDays));
  const DAYS = 90;
  // Cohorts by the day the release is offered to them. Classes: active with Wi-Fi, active without, parked.
  const active = 1 - PARKED;
  const daily: number[] = new Array(DAYS + 1).fill(0);
  const cell: number[] = new Array(DAYS + 1).fill(0);
  for (let e = 0; e < W; e++) {
    const share = 1 / W;
    let wifiLeft = active * WIFI_SHARE * share;
    let noWifiLeft = active * (1 - WIFI_SHARE) * share;
    let parkedLeft = PARKED * share;
    for (let d = e; d <= DAYS; d++) {
      const waited = d - e;
      let viaWifi = 0;
      let viaCell = 0;
      if (o.wifiFirst) {
        viaWifi += wifiLeft * WIFI_DAILY;
        wifiLeft -= wifiLeft * WIFI_DAILY;
        if (waited >= WIFI_WAIT) {
          viaCell += wifiLeft * ONLINE_DAILY + noWifiLeft * ONLINE_DAILY;
          wifiLeft -= wifiLeft * ONLINE_DAILY;
          noWifiLeft -= noWifiLeft * ONLINE_DAILY;
        }
      } else {
        viaCell += (wifiLeft + noWifiLeft) * ONLINE_DAILY;
        wifiLeft -= wifiLeft * ONLINE_DAILY;
        noWifiLeft -= noWifiLeft * ONLINE_DAILY;
      }
      const back = parkedLeft * RETURN_DAILY;
      parkedLeft -= back;
      const backWifi = o.wifiFirst ? back * WIFI_SHARE : 0;
      viaWifi += backWifi;
      viaCell += back - backWifi;
      daily[d] += viaWifi + viaCell;
      cell[d] += viaCell;
    }
  }
  const byDay: number[] = [];
  let sum = 0;
  let daysTo95 = Infinity;
  for (let d = 0; d <= DAYS; d++) {
    sum += daily[d];
    byDay.push(sum);
    if (sum >= 0.95 && daysTo95 === Infinity) daysTo95 = d + 1;
  }
  const cellShare = cell.reduce((a, b) => a + b, 0) / Math.max(sum, 1e-9);
  const totalBytes = CARS * sum * perCar * 1e9;
  const cellBytes = totalBytes * cellShare;
  const peak = Math.max(...daily) * CARS * perCar * 1e9;
  return {
    perCar,
    fullShare,
    totalBytes,
    cellBytes,
    cellCost: (cellBytes / 1e9) * CELL_PER_GB,
    peakGbps: (peak * 8) / 86_400 / 1e9,
    daysTo95,
    lagging30: 1 - byDay[30],
    byDay,
  };
}

const sayBytes = (b: number) => (b >= 1e15 ? `${count(b / 1e15)} PB` : `${count(b / 1e12)} TB`);
const weight = (bytes: number) => Math.max(0.05, Math.min(1, (Math.log10(Math.max(bytes, 1)) - 13) / 3.5));

// ---------------------------------------------------------------------------

export const FIGS = {
  'rollout-stages': figure(['subtle'], (_ctx, t) => {
    const W = 600;
    const H = 250;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let staged = false;
    let defect = 0.2;
    let open = false;
    const HOURS = 36;
    const x0 = 64;
    const x1 = W - 16;
    const y0 = 30;
    const y1 = 196;
    const X = (h: number) => x0 + (h / HOURS) * (x1 - x0);
    // Log scale from 1 device to the whole fleet.
    const Y = (n: number) => y1 - (Math.log10(Math.max(1, n)) / Math.log10(FLEET)) * (y1 - y0);
    const paint = () => {
      const r = rollout(staged, defect, HOURS);
      const other = rollout(!staged, defect, HOURS);
      const parts: SVGElement[] = [];
      for (const n of [1, 10, 100, 1000, 10_000, 100_000, 1_000_000]) {
        parts.push(line(x0, Y(n), x1, Y(n), COL.soft, 0.6, { opacity: 0.4 }), small(x0 - 6, Y(n) + 4, count(n), { anchor: 'end', soft: true }));
      }
      for (let h = 0; h <= HOURS; h += 6) parts.push(small(X(h), y1 + 14, `${h} h`, { anchor: 'middle', soft: true }));
      parts.push(line(x0, y1, x1, y1, COL.ink, 1));
      if (staged) {
        STAGES.forEach((s, k) => {
          const start = k * (RAMP_H + BAKE_H);
          if (r.haltedStage >= 0 && k > r.haltedStage) return;
          parts.push(svg('rect', { x: X(start), y: y0 - 18, width: X(RAMP_H + BAKE_H) - X(0) - 2, height: 14, rx: 3, fill: tint(COL.request, 0.12 + 0.12 * k) }), small(X(start) + 4, y0 - 7, `${Math.round(s * 100)}%`, { bold: true }));
        });
      }
      const pathOf = (rr: Rollout, scale: number) => rr.byHour.map((n, h) => `${h ? 'L' : 'M'}${X(h).toFixed(1)},${Y(n * scale).toFixed(1)}`).join('');
      if (open) {
        parts.push(svg('path', { d: pathOf(other, defect), fill: 'none', stroke: COL.error, 'stroke-width': 1.2, opacity: 0.3, 'stroke-dasharray': '4 3' }));
        parts.push(svg('path', { d: pathOf(r, defect), fill: 'none', stroke: COL.error, 'stroke-width': 2.4 }));
      }
      parts.push(svg('path', { d: pathOf(r, 1), fill: 'none', stroke: COL.request, 'stroke-width': 1.6 }));
      if (staged && open && Number.isFinite(r.haltedAt)) {
        parts.push(line(X(r.haltedAt), y0, X(r.haltedAt), y1, COL.clock, 1.6, { 'stroke-dasharray': '5 3' }), small(X(r.haltedAt) + 4, y0 + 12, 'health gate halts it', { fill: COL.clock, bold: true }));
      }
      parts.push(small(x0, y1 + 32, 'devices updated', { fill: COL.request, bold: true }), small(x0 + 120, y1 + 32, open ? 'devices broken' : 'devices broken: guess first', { fill: COL.error, bold: true }));
      parts.push(small(x1, y1 + 32, staged ? 'stages of 1 hour, then 6 hours of watching' : 'everyone within 78 minutes', { anchor: 'end', soft: true }));
      redraw(g, ...parts);
      if (open) {
        f.readout.textContent = staged
          ? Number.isFinite(r.haltedAt)
            ? `Halted after the ${pct(STAGES[r.haltedStage])} stage, at hour ${r.haltedAt}: ${count(r.broken)} devices broken. The excess failures in that stage stood out from the everyday ones.`
            : `No stage showed ${DETECT} extra failures before the next began, so the defect reached everyone: ${count(r.broken)} devices broken, more slowly.`
          : `${count(r.broken)} devices broken within ${Math.round(ALL_AT_ONCE_H * 60)} minutes, before anyone could have read a graph.`;
        if (staged && r.haltedStage >= 1) t.done();
      }
    };
    const mode = named(pick(['Everyone at once', 'Stages behind a health gate'], 0, (i) => { staged = i === 1; paint(); }), 'Rollout:');
    const rate = slider('Devices the defect breaks', { min: 0.00001, max: 0.5, scale: 'log', value: defect, show: (v) => pct(v), onInput: (v) => { defect = v; paint(); }, color: 'error' });
    f.controls.append(mode.node, rate.node);
    guessFirst(t, f, {
      ask: 'An update breaks one device in five, across a fleet of a million. Sent in stages of 1%, 10%, 50% and everyone, each watched for six hours, how many devices break before it stops?',
      options: ['About 200,000', 'About 20,000', 'About 2,000', 'None'],
      answer: 2,
      sliders: [rate],
      buttons: mode.buttons,
      after: () => { open = true; paint(); },
    });
    paint();
    return f.node;
  }),

  'rollout-ab': figure(['fallback'], (ctx, t) => {
    const W = 560;
    const H = 200;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let layout: Layout = 'inplace';
    let c: AbCase = 'good';
    let steps = abSteps(layout, c);
    let at = 0;
    const slot = (x: number, y: number, name: string, s: SlotState, live: boolean): SVGElement[] => [
      svg('rect', { x, y, width: 150, height: 56, rx: 6, fill: tint(COL[s.color], 0.14), stroke: COL[s.color], 'stroke-width': live ? 2.6 : 1.2 }),
      label(x + 10, y + 20, name, { size: 'note', bold: true }),
      small(x + 10, y + 40, s.text, { bold: true, fill: COL[s.color] }),
    ];
    const paint = () => {
      const s = steps[Math.min(at, steps.length - 1)];
      const parts: SVGElement[] = [];
      parts.push(svg('rect', { x: 14, y: 14, width: 190, height: 40, rx: 6, fill: tint(COL.leader, 0.1), stroke: COL.leader }));
      parts.push(label(24, 30, 'Bootloader', { size: 'note', bold: true, fill: COL.leader }), small(24, 46, s.boot));
      const bootsB = s.boot.includes('B');
      if (layout === 'ab' && s.b) {
        parts.push(...slot(14, 90, 'Slot A', s.a, !bootsB), ...slot(184, 90, 'Slot B', s.b, bootsB));
        parts.push(line(109, 54, bootsB ? 259 : 89, 88, COL.leader, 1.6));
      } else {
        parts.push(...slot(14, 90, 'System', s.a, true));
        parts.push(line(89, 54, 89, 88, COL.leader, 1.6));
      }
      parts.push(svg('rect', { x: 370, y: 90, width: 170, height: 56, rx: 28, fill: tint(COL[s.device.color], 0.14), stroke: COL[s.device.color], 'stroke-width': 1.6 }));
      parts.push(label(455, 112, 'The device', { anchor: 'middle', size: 'note', bold: true }), small(455, 130, s.device.text, { anchor: 'middle', bold: true, fill: COL[s.device.color] }));
      parts.push(small(14, 176, `Step ${Math.min(at, steps.length - 1) + 1} of ${steps.length}`, { soft: true }));
      redraw(g, ...parts);
      f.readout.textContent = s.say;
      if (layout === 'ab' && c === 'bad' && at >= steps.length - 1) t.done();
    };
    const time = slider('Step', 0, 100, 1, 0, (v) => `${Math.min(steps.length, Math.floor((v / 100) * steps.length) + 1)} of ${steps.length}`, (v) => { at = Math.min(steps.length - 1, Math.floor((v / 100) * steps.length)); paint(); }, 'clock');
    const play = player(time, ctx, { seconds: 8 });
    const reset = () => { steps = abSteps(layout, c); at = 0; time.set(0); paint(); };
    const lay = named(pick(['Written in place', 'A/B slots'], 0, (i) => { layout = i === 1 ? 'ab' : 'inplace'; reset(); }), 'Install:');
    const cases = named(pick(AB_CASE_NAMES, 0, (i) => { c = AB_CASES[i]; reset(); }), 'Case:');
    f.controls.append(lay.node, cases.node, play.node, time.node);
    paint();
    return f.node;
  }),

  'rollout-sign': () => {
    const W = 600;
    const H = 290;
    const s = still(W, H);
    const parts: SVGElement[] = [];
    const role = (x: number, y: number, name: string, keys: string, holds: string, stops: string, col: ColorKey) => {
      parts.push(svg('rect', { x, y, width: 270, height: 62, rx: 6, fill: tint(COL[col], 0.08), stroke: COL[col], 'stroke-width': 1.3 }));
      parts.push(label(x + 10, y + 18, name, { size: 'note', bold: true, fill: COL[col] }), small(x + 260, y + 18, keys, { anchor: 'end', soft: true }));
      parts.push(small(x + 10, y + 36, holds), small(x + 10, y + 52, stops, { fill: COL.answer }));
    };
    role(10, 10, 'Root', 'offline keys, 3 of 5', 'Lists the keys trusted for every role.', 'Stops: one stolen key taking over.', 'leader');
    role(320, 10, 'Timestamp', 'online key, expires in a day', 'Names the newest snapshot.', 'Stops: being fed old files for ever.', 'clock');
    role(320, 100, 'Snapshot', 'online key', 'Names the version of every targets file.', 'Stops: mixing files from two releases.', 'data');
    role(10, 100, 'Targets', 'offline keys', 'Lists every file with its hash and size.', 'Stops: a changed or swapped file.', 'write');
    parts.push(line(145, 72, 145, 98, COL.leader, 1.4), line(280, 72, 330, 98, COL.leader, 1.4), line(280, 42, 318, 42, COL.leader, 1.4));
    parts.push(small(150, 90, 'signs the keys of', { soft: true }));
    // The device's checks, in order.
    parts.push(label(10, 190, 'What a device checks, in this order', { size: 'note', bold: true }));
    const checks: [string, ColorKey][] = [['Timestamp: signed, not expired', 'clock'], ['Snapshot: no version goes down', 'data'], ['Targets: signed, lists this file', 'write'], ['File: hash and size match', 'answer']];
    checks.forEach(([text, col], i) => {
      const x = 10 + i * 148;
      parts.push(svg('rect', { x, y: 202, width: 138, height: 44, rx: 6, fill: tint(COL[col], 0.12), stroke: COL[col] }));
      const words = text.split(': ');
      parts.push(small(x + 8, 220, words[0], { bold: true }), small(x + 8, 236, words[1]));
      if (i) parts.push(line(x - 9, 224, x - 2, 224, COL.soft, 1.4));
    });
    parts.push(small(10, 266, 'Any failed check: keep the current version and report it.', { soft: true }), small(10, 282, 'Version numbers never go down, so an old release, signed but vulnerable, can\'t be sent again.', { soft: true }));
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'rollout-fleet': figure(['lean'], (_ctx, t) => {
    const W = 620;
    const H = 230;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    const o: FleetChoices = { delta: false, wifiFirst: false, deltaPaths: 1, spreadDays: 1 };
    const paint = () => {
      const p = fleetPlan(o);
      const wifiBytes = p.totalBytes - p.cellBytes;
      const boxes: BoardBox[] = [
        { id: 'build', x: 56, y: 60, label: 'Release', sub: o.delta ? `deltas from ${o.deltaPaths} back` : 'full images', color: 'write', w: 100 },
        { id: 'origin', x: 56, y: 160, label: 'Signed store', sub: 'origin', shape: 'store', color: 'data', w: 100, h: 42 },
        { id: 'cdn', x: 220, y: 110, label: 'CDN', sub: `peak ${count(p.peakGbps)} Gb/s`, color: p.peakGbps > 1000 ? 'error' : 'request', stack: true, w: 104 },
        { id: 'wifi', x: 385, y: 55, label: 'Home Wi-Fi', sub: 'free', color: 'request', faded: !o.wifiFirst, w: 100 },
        { id: 'cell', x: 385, y: 165, label: 'Cellular', sub: `$${CELL_PER_GB} a GB`, color: p.cellCost > 1e6 ? 'error' : 'cost', w: 100 },
        { id: 'cars', x: 548, y: 110, label: '2,000,000 cars', sub: `${(p.perCar).toFixed(2)} GB each`, shape: 'pill', color: 'model', stack: true, w: 120 },
      ];
      const wires: BoardWire[] = [
        { from: 'build', to: 'origin', weight: 0.15, color: 'write' },
        { from: 'origin', to: 'cdn', weight: 0.2, color: 'data' },
        { from: 'cdn', to: 'wifi', text: o.wifiFirst ? sayBytes(wifiBytes) : undefined, weight: weight(wifiBytes), color: 'request', faded: !o.wifiFirst },
        { from: 'cdn', to: 'cell', text: sayBytes(p.cellBytes), weight: weight(p.cellBytes), color: 'cost' },
        { from: 'wifi', to: 'cars', weight: weight(wifiBytes), color: 'request', faded: !o.wifiFirst },
        { from: 'cell', to: 'cars', weight: weight(p.cellBytes), color: 'cost' },
      ];
      drawBoard(g, boxes, wires);
      f.readout.textContent = [
        `Each monthly release: ${sayBytes(p.totalBytes)} sent, ${sayBytes(p.cellBytes)} of it over cellular for about $${count(p.cellCost)}.`,
        `${Number.isFinite(p.daysTo95) ? `95% of cars have it after ${p.daysTo95} days` : 'Fewer than 95% have it after 90 days'}; ${pct(p.lagging30)} still on older releases after 30 days.`,
        o.delta ? `${pct(p.fullShare)} of cars are too far behind for a delta and get everything. ${o.deltaPaths} upgrade ${o.deltaPaths === 1 ? 'path' : 'paths'} to build and test.` : 'Every car downloads the whole release, though most of it hasn\'t changed.',
      ].join('\n');
      if (o.delta && o.wifiFirst && p.cellCost < 1e6 && p.peakGbps < 100 && p.daysTo95 <= 21) t.done();
    };
    const delta = named(pick(['Full release', 'Delta from what the car has'], 0, (i) => { o.delta = i === 1; paint(); }), 'Send:');
    const path = named(pick(['Cellular at once', `Wi-Fi first, cellular after ${WIFI_WAIT} days`], 0, (i) => { o.wifiFirst = i === 1; paint(); }), 'Network:');
    const paths = slider('Releases with a delta', 1, 12, 1, o.deltaPaths, (v) => `${v} back`, (v) => { o.deltaPaths = v; paint(); }, 'write');
    const spread = slider('Offered over', 1, 14, 1, o.spreadDays, (v) => (v === 1 ? 'one day' : `${v} days`), (v) => { o.spreadDays = v; paint(); }, 'clock');
    f.controls.append(delta.node, path.node, paths.node, spread.node);
    paint();
    return f.node;
  }),
};
