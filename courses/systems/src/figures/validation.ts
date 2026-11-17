// Lesson P4, The numbers that quietly went wrong: a month of nightly builds
// with five things going wrong (four faults and one legitimate change), the
// checks the reader switches on, and how sensitive the statistical checks are;
// and a still of write, audit, publish.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, named, pick, slider, tint, toggles } from './kit';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

export const NIGHTS = 30;
export const REGIONS = 4;

export type CheckName = 'totals' | 'schema' | 'history' | 'reference';
export const CHECKS: readonly CheckName[] = ['totals', 'schema', 'history', 'reference'];
export const CHECK_LABEL: Record<CheckName, string> = { totals: 'Control totals', schema: 'Schema and ranges', history: 'Volume against last week', reference: 'Distribution against a fixed reference' };

export interface Fault {
  name: string;
  night: number;
  /** Not a fault: a legitimate change that a check may mistake for one. */
  legitimate?: boolean;
  /** Which checks see it. A slow drift is seen by the fixed reference only once it has grown past the threshold. */
  seenBy: readonly CheckName[];
}

/** Drift a night, in standard deviations of the night-to-night noise. */
export const DRIFT_PER_NIGHT = 0.15;
export const DRIFT_START = 8;

export const FAULTS: readonly Fault[] = [
  { name: 'A lab file cut off at a row limit', night: 5, seenBy: ['totals', 'history'] },
  { name: 'Speeds sent in km/h, read as mph', night: 12, seenBy: ['schema', 'reference'] },
  { name: 'One region missing', night: 18, seenBy: ['history', 'reference'] },
  { name: 'A source adds a new country', night: 24, legitimate: true, seenBy: ['history', 'reference'] },
];

/** The chance a normal night crosses a threshold of z standard deviations, either way. */
export function tail(z: number): number {
  // Abramowitz and Stegun 26.2.17, accurate to about 1e-7.
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return 2 * p;
}

/** False alarms a month from the statistical checks switched on, at threshold z, over four regions. */
export function falseAlarms(on: readonly CheckName[], z: number): number {
  const stat = on.filter((c) => c === 'history' || c === 'reference').length;
  return NIGHTS * REGIONS * stat * tail(z);
}

/** The night the fixed reference first sees the slow drift, or null if not within the month. */
export function driftSeen(z: number): number | null {
  const n = DRIFT_START + Math.ceil(z / DRIFT_PER_NIGHT);
  return n <= NIGHTS ? n : null;
}

export interface MonthResult {
  /** Faults that reached consumers, and those blocked (with the night). */
  reached: string[];
  blocked: string[];
  /** The legitimate change raised an alarm. */
  legitAlarm: boolean;
  falseAlarms: number;
  /** Nights the pointer did not move. */
  heldNights: number;
}

export function month(on: readonly CheckName[], z: number, declared: boolean): MonthResult {
  const reached: string[] = [];
  const blocked: string[] = [];
  let legitAlarm = false;
  let held = 0;
  for (const f of FAULTS) {
    const seen = f.seenBy.some((c) => on.includes(c));
    if (f.legitimate) {
      if (seen && !declared) { legitAlarm = true; held++; }
      continue;
    }
    if (seen) { blocked.push(f.name); held++; } else reached.push(f.name);
  }
  const drift = 'A region slowly losing roads';
  if (on.includes('reference') && driftSeen(z) !== null) { blocked.push(drift); held++; } else reached.push(drift);
  const fa = falseAlarms(on, z);
  return { reached, blocked, legitAlarm, falseAlarms: fa, heldNights: held + Math.round(fa) };
}

export const FIGS = {
  'validation-wap': () => {
    const W = 600;
    const H = 170;
    const s = still(W, H);
    const g = svg('g');
    const over = svg('g');
    s.svg.append(g, over);
    const boxes: BoardBox[] = [
      { id: 'build', x: 72, y: 70, label: 'Write', sub: 'a staged snapshot', color: 'write', w: 120 },
      { id: 'audit', x: 230, y: 70, label: 'Audit', sub: 'run every check on it', color: 'busy', w: 120 },
      { id: 'pub', x: 390, y: 40, label: 'Publish', sub: 'move the pointer', color: 'answer', w: 120 },
      { id: 'quar', x: 390, y: 120, label: 'Hold', sub: 'pointer stays; alert the owner', color: 'error', w: 140 },
      { id: 'cons', x: 540, y: 70, label: 'Consumers', sub: 'read current', shape: 'pill', color: 'request', w: 100 },
    ];
    const wires: BoardWire[] = [
      { from: 'build', to: 'audit', weight: 0.2, color: 'write' },
      { from: 'audit', to: 'pub', text: 'all pass', weight: 0.2, color: 'answer' },
      { from: 'audit', to: 'quar', text: 'any fails', weight: 0.2, color: 'error', lift: -10 },
      { from: 'pub', to: 'cons', text: 'new', weight: 0.2, color: 'answer' },
      { from: 'quar', to: 'cons', text: 'last good', weight: 0.15, color: 'soft', dashed: true },
    ];
    drawBoard(g, boxes, wires);
    redraw(over, small(10, 162, 'Consumers never see a version that has not passed; a failed audit leaves them on the last good one, which is stale but right.', { soft: true }));
    return { node: s.node };
  },

  'validation-bench': figure(['guarded'], (_ctx, t) => {
    const W = 600;
    const H = 216;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    let on: CheckName[] = [];
    let z = 2;
    let declared = false;
    const paint = () => {
      const r = month(on, z, declared);
      const parts: SVGElement[] = [];
      const x0 = 300;
      const cw = (W - x0 - 14) / NIGHTS;
      parts.push(small(14, 32, 'Thirty nightly builds of the map', { bold: true }));
      parts.push(small(x0, 14, 'night 1', { soft: true }), small(W - 14, 14, 'night 30', { soft: true, anchor: 'end' }));
      for (let n = 1; n <= NIGHTS; n++) parts.push(svg('rect', { x: x0 + (n - 1) * cw + 1, y: 22, width: cw - 2, height: 14, rx: 2, fill: tint(COL.answer, 0.25) }));
      const rows: { name: string; night: number; ok: boolean; legit?: boolean; span?: number }[] = FAULTS.map((fa) => ({
        name: fa.name,
        night: fa.night,
        legit: fa.legitimate,
        ok: fa.legitimate ? !(fa.seenBy.some((c) => on.includes(c)) && !declared) : fa.seenBy.some((c) => on.includes(c)),
      }));
      const seen = driftSeen(z);
      rows.splice(1, 0, { name: 'A region slowly losing roads', night: DRIFT_START, ok: on.includes('reference') && seen !== null, span: NIGHTS - DRIFT_START + 1 });
      rows.forEach((row, i) => {
        const y = 56 + i * 28;
        const x = x0 + (row.night - 1) * cw;
        const hue = row.ok ? (row.legit ? COL.answer : COL.good) : row.legit ? COL.busy : COL.error;
        if (row.span) parts.push(svg('rect', { x, y: y - 9, width: row.span * cw, height: 12, rx: 3, fill: tint(COL.error, 0.18) }));
        parts.push(svg('circle', { cx: x + cw / 2, cy: y - 3, r: 5, fill: hue }));
        if (row.span && row.ok && seen) parts.push(line(x0 + (seen - 0.5) * cw, y - 10, x0 + (seen - 0.5) * cw, y + 4, COL.good, 2));
        const say = row.legit ? (row.ok ? (declared ? 'declared in advance: published' : 'not seen by any check: published') : 'false alarm: publish held') : row.ok ? `blocked${row.span && seen ? ` on night ${seen}` : ''}: consumers keep the last good version` : 'reached consumers';
        parts.push(small(14, y - 4, row.name, { bold: true }), small(14, y + 8, say, { fill: hue }));
      });
      // False alarms from noise: marked on the nights row.
      const fa = Math.round(r.falseAlarms);
      for (let k = 0; k < Math.min(fa, NIGHTS); k++) {
        const n = 1 + ((k * 7 + 3) % NIGHTS);
        parts.push(svg('rect', { x: x0 + (n - 1) * cw + 1, y: 22, width: cw - 2, height: 14, rx: 2, fill: tint(COL.busy, 0.8) }));
      }
      parts.push(small(14, 206, 'Night squares: green published, amber held by a false alarm from ordinary night-to-night noise.', { soft: true }));
      redraw(g, ...parts);
      f.readout.textContent = [
        `${r.reached.length} of 4 faults reached consumers; ${r.blocked.length} blocked.`,
        `About ${r.falseAlarms < 1 && r.falseAlarms > 0 ? r.falseAlarms.toFixed(1) : Math.round(r.falseAlarms)} false alarms a month from ordinary noise${r.legitAlarm ? ', plus one for the new country' : ''}.`,
        r.reached.length ? `Missed: ${r.reached.join('; ')}.` : 'Every fault was stopped before publish.',
      ].join('\n');
      if (r.reached.length === 0 && !r.legitAlarm && r.falseAlarms <= 1) t.done();
    };
    const checks = toggles(CHECKS.map((c) => CHECK_LABEL[c]), CHECKS.map(() => false), (state) => { on = CHECKS.filter((_, i) => state[i]); paint(); });
    const sens = slider('Statistical checks alarm beyond', { min: 1.5, max: 5, step: 0.1, value: z, show: (v) => `${v.toFixed(1)} standard deviations`, onInput: (v) => { z = v; paint(); }, color: 'busy' });
    const decl = named(pick(['Not declared', 'Declared in advance'], 0, (i) => { declared = i === 1; paint(); }), 'New country:');
    f.controls.append(named(checks, 'Checks:').node, sens.node, decl.node);
    paint();
    return f.node;
  }),
};
