// Lesson 24, The website nobody could see inside: a month of a service
// against its SLO, the error budget it spends, and the alerts that would have
// paged someone (on burn rate, and on CPU); and how Gorilla packs a time
// series into a bit or two a number.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { axes, COL, figure, frame, guessFirst, legend, player, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// A month against an SLO.

/** Minutes in the 30-day window. */
export const MONTH = 30 * 24 * 60;

/** Minutes of complete outage a target allows over `days`: 99.9% over 30 days is 43.2. */
export function budgetMinutes(slo: number, days = 30): number {
  return (1 - slo) * days * 24 * 60;
}

/** How fast the budget is going: 1 spends it exactly over the window. */
export function burnRate(errorRate: number, slo: number): number {
  return errorRate / (1 - slo);
}

export interface Incident {
  /** Start, in days from the start of the month. */
  day: number;
  minutes: number;
  /** Share of requests that fail meanwhile. */
  errors: number;
  what: string;
}

/** The month's troubles: two bad deploys, a slow leak of errors, and a dependency down. */
export const INCIDENTS: readonly Incident[] = [
  { day: 3.4, minutes: 30, errors: 0.08, what: 'a bad deploy, rolled back' },
  { day: 14.5, minutes: 2.5 * 1440, errors: 0.004, what: 'a dependency failing 0.4% of calls' },
  { day: 22.2, minutes: 12, errors: 1, what: 'a database down' },
  { day: 27, minutes: 10, errors: 0.2, what: 'another bad deploy' },
];

/** Failing share every minute when nothing is wrong. */
export const BACKGROUND = 0.0002;

/** Share of requests failing in each minute of the month. */
export function errorSeries(): Float64Array {
  const e = new Float64Array(MONTH).fill(BACKGROUND);
  for (const inc of INCIDENTS) {
    const a = Math.round(inc.day * 1440);
    for (let m = a; m < Math.min(MONTH, a + inc.minutes); m++) e[m] = Math.max(e[m], inc.errors);
  }
  return e;
}

/** CPU use each minute: a daily swing, and from day 8 a batch job that fills the machines from 1 to 4 a.m. */
export function cpuSeries(): Float64Array {
  const c = new Float64Array(MONTH);
  for (let m = 0; m < MONTH; m++) {
    const hour = (m % 1440) / 60;
    c[m] = 0.5 + 0.15 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    if (m >= 8 * 1440 && hour >= 1 && hour < 4) c[m] = 0.95;
  }
  return c;
}

export interface MonthRun {
  /** Share of the budget left at the end of each hour (720 values, may go below zero). */
  left: number[];
  /** Minutes at which a burn-rate alert starts, and at which a CPU alert starts. */
  burnAlerts: number[];
  cpuAlerts: number[];
  /** Burn-rate alerts that started during an incident. */
  burnReal: number;
  /** CPU alerts that started while users saw more than the background errors. */
  cpuReal: number;
}

/**
 * The month against target `slo`. Burn-rate alerts follow the SRE workbook:
 * 2% of the budget in an hour (burn 14.4), 5% in six hours (burn 6), or 10%
 * in three days (burn 1). A CPU alert fires after ten minutes above 90%.
 * An alert, once started, is quiet until its condition has been clear for an hour.
 */
export function monthRun(slo: number): MonthRun {
  const e = errorSeries();
  const cpu = cpuSeries();
  const allowed = 1 - slo;
  const cum = new Float64Array(MONTH + 1);
  for (let m = 0; m < MONTH; m++) cum[m + 1] = cum[m] + e[m];
  const burnOver = (m: number, win: number) => {
    const a = Math.max(0, m + 1 - win);
    return (cum[m + 1] - cum[a]) / (m + 1 - a) / allowed;
  };
  const left: number[] = [];
  for (let h = 1; h <= 720; h++) left.push(1 - cum[h * 60] / (allowed * MONTH));
  const burnAlerts: number[] = [];
  const cpuAlerts: number[] = [];
  let burnOn = false;
  let burnClear = 0;
  let cpuOn = false;
  let cpuClear = 0;
  let hot = 0;
  for (let m = 0; m < MONTH; m++) {
    const burning = burnOver(m, 60) >= 14.4 || burnOver(m, 360) >= 6 || (m >= 4320 && burnOver(m, 4320) >= 1);
    if (burning) {
      if (!burnOn) burnAlerts.push(m);
      burnOn = true;
      burnClear = 0;
    } else if (burnOn && ++burnClear >= 60) burnOn = false;
    hot = cpu[m] > 0.9 ? hot + 1 : 0;
    if (hot >= 10) {
      if (!cpuOn) cpuAlerts.push(m);
      cpuOn = true;
      cpuClear = 0;
    } else if (cpuOn && ++cpuClear >= 60) cpuOn = false;
  }
  const during = (m: number) => INCIDENTS.some((i) => m >= i.day * 1440 && m < i.day * 1440 + i.minutes + 60);
  return {
    left,
    burnAlerts,
    cpuAlerts,
    burnReal: burnAlerts.filter(during).length,
    cpuReal: cpuAlerts.filter((m) => e[m] > BACKGROUND).length,
  };
}

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
const SLOS = [0.99, 0.995, 0.999, 0.9995, 0.9999];

const budgetFigure = figure(['month'], (ctx, t) => {
  const W = 480;
  const H = 300;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  let slo = 0.999;
  let day = 0;
  let run = monthRun(slo);
  const errs = errorSeries();
  const during = (m: number) => INCIDENTS.some((i) => m >= i.day * 1440 && m < i.day * 1440 + i.minutes + 60);
  const A = axes({ x: 52, y: 20, w: W - 70, h: 150, xmin: 0, xmax: 30, ymin: -0.5, ymax: 1, xticks: [0, 5, 10, 15, 20, 25, 30], yticks: [-0.5, 0, 0.5, 1], yfmt: (v) => `${v * 100}%`, ylabel: 'Error budget left', ink: COL.ink, grid: COL.grid });
  const paint = () => {
    const parts: SVGElement[] = [...A.parts];
    parts.push(line(A.X(0), A.Y(0), A.X(30), A.Y(0), COL.error, 1, { 'stroke-dasharray': '4 3' }));
    for (const inc of INCIDENTS) {
      if (inc.day > day) continue;
      const x0 = A.X(inc.day);
      const x1 = Math.max(x0 + 2, A.X(Math.min(day, inc.day + inc.minutes / 1440)));
      parts.push(svg('rect', { x: x0, y: A.Y(1), width: x1 - x0, height: A.Y(-0.5) - A.Y(1), fill: tint(COL.error, 0.12) }));
    }
    const hours = Math.round(day * 24);
    const pts = run.left.slice(0, hours).map((v, h) => [(h + 1) / 24, v] as const);
    parts.push(A.path([[0, 1], ...pts], COL.cost, 2.2));
    // Error strip, one bar an hour.
    const sy = 214;
    parts.push(small(8, sy - 8, 'Requests failing, each hour', { soft: true }));
    for (let h = 0; h < hours; h++) {
      let worst = 0;
      for (let m = h * 60; m < h * 60 + 60; m++) worst = Math.max(worst, errs[m]);
      const v = Math.min(1, Math.log10(Math.max(worst, 1e-4) / 1e-4) / 4);
      if (worst > BACKGROUND) parts.push(svg('rect', { x: A.X(h / 24), y: sy + 14 - 14 * v, width: Math.max(1, A.X(1 / 24) - A.X(0)), height: 14 * v + 0.5, fill: COL.error }));
    }
    parts.push(line(A.X(0), sy + 14.5, A.X(30), sy + 14.5, COL.grid, 1));
    // Alert rows.
    const row = (y: number, name: string, ms: number[], color: string) => {
      parts.push(small(8, y + 4, name, { soft: true }));
      for (const m of ms) if (m / 1440 <= day) parts.push(svg('path', { d: `M${A.X(m / 1440)},${y - 6} l5,10 h-10 Z`, fill: color }));
    };
    row(250, 'Burn-rate alerts', run.burnAlerts, COL.error);
    row(274, 'CPU alerts', run.cpuAlerts, COL.busy);
    parts.push(...legend(W - 230, 14, [{ text: 'budget left', color: COL.cost }, { text: 'incident', color: tint(COL.error, 0.5) }]));
    redraw(g, ...parts);
    const now = Math.min(719, Math.max(0, hours - 1));
    const leftNow = hours ? run.left[now] : 1;
    const burns = run.burnAlerts.filter((m) => m / 1440 <= day);
    const cpus = run.cpuAlerts.filter((m) => m / 1440 <= day);
    const state = leftNow >= 0 ? `${pct(leftNow)} of the budget left` : `budget overspent by ${pct(-leftNow)}`;
    f.readout.textContent = `Day ${Math.floor(day)}, target ${pct(slo)} (${Math.round(budgetMinutes(slo) * 10) / 10} minutes of total failure a month): ${state}. Alerts so far: ${burns.length} on burn rate, ${burns.filter(during).length} of them during an incident; ${cpus.length} on CPU, ${cpus.filter((m) => errs[m] > BACKGROUND).length} while users saw errors.`;
    if (day >= 30) t.done();
  };
  const target = slider('Target', { steps: SLOS, value: slo, show: (v) => pct(v), onInput: (v) => { slo = v; run = monthRun(slo); paint(); }, color: 'answer' });
  const time = slider('Day', 0, 30, 0.05, 0, (v) => `${Math.floor(v)}`, (v) => { day = v; paint(); }, 'clock');
  const play = player(time, ctx, { seconds: 14 });
  f.controls.append(target.node, play.node, time.node);
  paint();
  guessFirst(t, f, {
    ask: 'This month brings two bad deploys, a slow leak of errors and a short database outage. Against a 99.9% target, does the error budget last the month?',
    options: ['Yes, with some left', 'It runs out'],
    answer: () => (monthRun(0.999).left[719] >= 0 ? 0 : 1),
    sliders: [target, time],
    reveal: 'done',
    after: () => paint(),
  });
  return f.node;
});

// ---------------------------------------------------------------------------
// Gorilla's compression of one time series.

export interface Point { t: number; v: number }

export interface PointBits {
  t: number;
  v: number;
  /** Delta of delta of the timestamp, s. */
  dod: number;
  tBits: number;
  /** The XOR of this value's bits with the last, as 16 hex digits. */
  xor: string;
  vBits: number;
}

const bitsOf = (v: number): bigint => {
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, v);
  return dv.getBigUint64(0);
};

const leadingZeros = (x: bigint): number => {
  let n = 0;
  for (let b = 63n; b >= 0n && !((x >> b) & 1n); b--) n++;
  return n;
};
const trailingZeros = (x: bigint): number => {
  let n = 0;
  for (let b = 0n; b < 64n && !((x >> b) & 1n); b++) n++;
  return n;
};

/** Bits Gorilla spends on a timestamp's delta of delta. */
export function timeBits(dod: number): number {
  if (dod === 0) return 1;
  if (dod >= -63 && dod <= 64) return 2 + 7;
  if (dod >= -255 && dod <= 256) return 3 + 9;
  if (dod >= -2047 && dod <= 2048) return 4 + 12;
  return 4 + 32;
}

/**
 * Gorilla's encoding (Pelkonen and others, VLDB 2015), point by point after
 * the first: timestamps as the change in the gap between them, values as the
 * XOR with the previous value, keeping only its meaningful bits.
 */
export function gorilla(points: readonly Point[]): PointBits[] {
  const out: PointBits[] = [];
  let lead = -1;
  let trail = -1;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const gap = p.t - points[i - 1].t;
    const prevGap = i > 1 ? points[i - 1].t - points[i - 2].t : gap;
    const dod = i > 1 ? gap - prevGap : 0;
    const x = bitsOf(p.v) ^ bitsOf(points[i - 1].v);
    let vBits: number;
    if (x === 0n) vBits = 1;
    else {
      const l = Math.min(31, leadingZeros(x));
      const tr = trailingZeros(x);
      if (lead >= 0 && l >= lead && tr >= trail) vBits = 2 + (64 - lead - trail);
      else {
        lead = l;
        trail = tr;
        vBits = 2 + 5 + 6 + (64 - l - tr);
      }
    }
    out.push({ t: p.t, v: p.v, dod, tBits: i === 1 ? 14 : timeBits(dod), xor: x.toString(16).padStart(16, '0'), vBits });
  }
  return out;
}

/** A minute of a server's request rate, one reading every 10 s, one of them a second late. */
export const SAMPLE: readonly Point[] = [
  { t: 0, v: 412 }, { t: 10, v: 412 }, { t: 20, v: 412 }, { t: 30, v: 413 }, { t: 41, v: 413 }, { t: 50, v: 412 }, { t: 60, v: 412 },
];

const gorillaStill = () => {
  const W = 480;
  const rows = gorilla(SAMPLE);
  const H = 70 + (rows.length + 1) * 20 + 40;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg', role: 'img' }) as SVGSVGElement;
  const g = svg('g');
  s.append(g);
  const parts: SVGElement[] = [];
  const cols = [8, 52, 104, 152, 210, 388, 452];
  const heads = ['time', 'value', 'gap', 'change', 'value XOR last value', 'bits t', 'bits v'];
  heads.forEach((h, i) => parts.push(small(cols[i], 18, h, { soft: true, anchor: i >= 5 ? 'end' : undefined })));
  parts.push(small(8, 40, `${SAMPLE[0].t} s`), small(52, 40, String(SAMPLE[0].v)), small(104, 40, 'first point stored in full: 64 bits of value, 14 of time', { soft: true }));
  let y = 60;
  let prev = SAMPLE[0].t;
  let total = 0;
  for (const r of rows) {
    const gap = r.t - prev;
    prev = r.t;
    const xorShown = r.xor === '0000000000000000' ? '0 (same value)' : r.xor;
    parts.push(
      small(8, y, `${r.t} s`), small(52, y, String(r.v)), small(104, y, `${gap}`), small(152, y, `${r.dod}`, { fill: r.dod ? COL.clock : COL.soft }),
      small(210, y, xorShown, { fill: r.xor === '0000000000000000' ? COL.soft : COL.data, attrs: { 'font-family': 'ui-monospace, monospace' } }),
      small(cols[5], y, String(r.tBits), { anchor: 'end' }), small(cols[6], y, String(r.vBits), { anchor: 'end' }),
    );
    total += r.tBits + r.vBits;
    y += 20;
  }
  const per = total / rows.length;
  parts.push(line(6, y - 10, W - 6, y - 10, COL.ink, 1));
  parts.push(small(8, y + 8, `After the first point: ${total} bits for ${rows.length} points, ${Math.round(per * 10) / 10} bits (${Math.round((per / 8) * 100) / 100} bytes) a point.`, { bold: true }));
  parts.push(small(8, y + 28, 'Stored plainly, each point is a 64-bit time and a 64-bit value: 128 bits, 16 bytes.', { soft: true }));
  parts.push(small(8, y + 46, 'A repeated value costs 1 bit; a gap the same as the last costs 1 bit.', { soft: true }));
  redraw(g, ...parts);
  const node = document.createElement('div');
  node.className = 'fig-body fig-still';
  node.append(s);
  return { node };
};

export const FIGS = {
  'slo-budget': budgetFigure,
  'slo-gorilla': gorillaStill,
};
