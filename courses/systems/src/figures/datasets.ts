// Lesson P3, A dataset everyone builds on: three sources matched into one
// place with a stable ID; a manifest and the pointer that publishes it, with
// lineage back to inputs and code; and twelve days of a map built
// incrementally, rebuilt in full, or both, with a bug to find and IDs that
// must not change under the consumers.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, frame, named, pick, tint } from './kit';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// Twelve days of builds.

export type BuildMode = 'incremental' | 'rebuild' | 'both';
export const DAYS = 12;
export const REGIONS = 4;
/** The incremental job's bug starts on this day and loses this many updates a day in each region. */
export const BUG_DAY = 3;
export const LOST_PER_REGION_DAY = 5_000;
/** Records in one region, all of which get new IDs if a rebuild ignores the registry. */
export const RECORDS_PER_REGION = 100e6;
/** Compute a day, in units of one day's incremental run. */
export const COST = { incremental: 1, rebuild: 100, both: 1 + 100 / REGIONS };
/** Hours from a change in a source to a published version. */
export const FRESH_HOURS = { incremental: 4, rebuild: 30, both: 4 };

export interface BuildDay {
  day: number;
  /** Records that are wrong in the published version. */
  wrong: number;
  /** A full rebuild of one region ran today, and its diff against the incremental result was over tolerance. */
  rebuilt?: number;
  alarm?: boolean;
  /** IDs that changed for consumers today. */
  idsChanged: number;
}

/**
 * Twelve published versions. Incremental only: lost updates pile up for good.
 * Rebuild only: a whole rebuild a day, never wrong, a day late and a hundred
 * times the compute. Both: a rolling rebuild of one region a day, diffed against
 * the incremental result; the first diff over tolerance raises the alarm, the
 * bug is fixed the next day, and each region's rebuild clears its drift.
 */
export function buildDays(mode: BuildMode, bug: boolean, registry: boolean): BuildDay[] {
  const drift = Array<number>(REGIONS).fill(0);
  let fixedOn = Infinity;
  const out: BuildDay[] = [];
  for (let day = 1; day <= DAYS; day++) {
    const bugOn = bug && day >= BUG_DAY && day < fixedOn;
    let idsChanged = 0;
    let rebuilt: number | undefined;
    let alarm = false;
    if (mode === 'rebuild') {
      drift.fill(0);
      if (!registry) idsChanged = RECORDS_PER_REGION * REGIONS;
    } else {
      if (bugOn) for (let r = 0; r < REGIONS; r++) drift[r] += LOST_PER_REGION_DAY;
      if (mode === 'both') {
        rebuilt = (day - 1) % REGIONS;
        if (drift[rebuilt] > 1_000) {
          alarm = true;
          if (fixedOn === Infinity) fixedOn = day + 1;
        }
        drift[rebuilt] = 0;
        if (!registry) idsChanged = RECORDS_PER_REGION;
      }
    }
    out.push({ day, wrong: drift.reduce((a, b) => a + b, 0), rebuilt, alarm, idsChanged });
  }
  return out;
}

const count = (n: number) => (n >= 1e6 ? `${Math.round(n / 1e6)} million` : Math.round(n).toLocaleString('en-US'));

export const FIGS = {
  'datasets-conflate': () => {
    const W = 600;
    const H = 230;
    const s = still(W, H);
    const g = svg('g');
    s.svg.append(g);
    const parts: SVGElement[] = [];
    const src = [
      { name: 'Open map', lines: ['"Café Mira"', '47.6205, −122.3493', 'opening hours'], col: COL.request },
      { name: 'Licensed directory', lines: ['"Mira Coffee Co."', '47.6207, −122.3490', 'phone, website'], col: COL.request },
      { name: 'Fleet sighting', lines: ['sign reads "MIRA"', '47.6206, −122.3492', 'seen 14 Nov'], col: COL.request },
    ];
    src.forEach((r, i) => {
      const y = 14 + i * 70;
      parts.push(svg('rect', { x: 10, y, width: 190, height: 60, rx: 6, fill: tint(r.col, 0.08), stroke: r.col }));
      parts.push(small(20, y + 15, r.name, { bold: true, fill: r.col }));
      r.lines.forEach((t, j) => parts.push(small(20, y + 30 + j * 12, t)));
      parts.push(line(200, y + 30, 262, 115, COL.soft, 1.2));
    });
    parts.push(svg('rect', { x: 262, y: 92, width: 92, height: 46, rx: 23, fill: tint(COL.model, 0.12), stroke: COL.model }));
    parts.push(small(308, 112, 'Match', { anchor: 'middle', bold: true }), small(308, 126, 'name, distance, kind', { anchor: 'middle', soft: true }));
    parts.push(line(354, 115, 384, 115, COL.soft, 1.4));
    parts.push(svg('rect', { x: 384, y: 40, width: 206, height: 150, rx: 6, fill: tint(COL.data, 0.1), stroke: COL.data }));
    parts.push(small(394, 58, 'One place', { bold: true, fill: COL.data }));
    parts.push(small(394, 76, 'ID: 6f1c…a2 (kept from last version)', { fill: COL.clock, bold: true }));
    const attrs = ['name: Café Mira (open map)', 'position: fleet sighting', 'hours: open map', 'phone, website: directory', 'sources: 3; last seen 14 Nov'];
    attrs.forEach((t, i) => parts.push(small(394, 96 + i * 16, t)));
    parts.push(small(394, 182, 'Each attribute records where it came from.', { soft: true }));
    parts.push(small(10, 226, 'Three sources, three spellings, three positions within 30 m: one real café.', { soft: true }));
    redraw(g, ...parts);
    return { node: s.node };
  },

  'datasets-manifest': () => {
    const W = 600;
    const H = 256;
    const s = still(W, H);
    const g = svg('g');
    s.svg.append(g);
    const boxes: BoardBox[] = [
      { id: 'cat', x: 90, y: 36, label: 'Catalogue', sub: 'current → 2026-11-17', color: 'leader', w: 150 },
      { id: 'v17', x: 90, y: 130, label: 'Version 2026-11-17', sub: 'manifest', shape: 'store', color: 'data', w: 150, h: 40 },
      { id: 'v16', x: 90, y: 205, label: 'Version 2026-11-16', sub: 'manifest', shape: 'store', color: 'data', faded: true, w: 150, h: 40 },
      { id: 'files', x: 310, y: 205, label: 'Files', sub: 'named by content hash', shape: 'store', color: 'data', stack: true, w: 140, h: 40 },
      { id: 'inputs', x: 520, y: 130, label: 'Inputs', sub: 'source snapshots, pinned', shape: 'store', color: 'request', w: 140, h: 40 },
      { id: 'code', x: 520, y: 205, label: 'Build code', sub: 'commit 4e1a, image 92c0', color: 'model', w: 140 },
    ];
    const wires: BoardWire[] = [
      { from: 'cat', to: 'v17', text: 'pointer', weight: 0.25, color: 'leader', lift: 0 },
      { from: 'v17', to: 'files', text: 'lists', weight: 0.2, color: 'data' },
      { from: 'v16', to: 'files', weight: 0.1, color: 'data', faded: true },
      { from: 'v17', to: 'inputs', text: 'lineage', weight: 0.12, color: 'request', dashed: true },
      { from: 'v17', to: 'code', weight: 0.12, color: 'model', dashed: true },
    ];
    drawBoard(g, boxes, wires);
    const over = svg('g');
    s.svg.append(over);
    const parts: SVGElement[] = [];
    parts.push(svg('rect', { x: 210, y: 6, width: 210, height: 96, rx: 6, fill: tint(COL.data, 0.07), stroke: COL.data }));
    parts.push(small(220, 22, 'Manifest 2026-11-17', { bold: true, fill: COL.data }));
    ['roads: snapshot 881, 2,400 files', 'places: snapshot 412, 310 files', 'buildings: snapshot 97, 5,100 files', 'inputs: open map 11-16, fleet 11-17', 'built by: commit 4e1a', 'checks: passed (lesson P4)'].forEach((t, i) => parts.push(small(220, 36 + i * 11, t)));
    parts.push(small(10, 250, 'Publishing and rolling back are both one atomic change to the pointer; files shared by two versions are stored once.', { soft: true }));
    redraw(over, ...parts);
    return { node: s.node };
  },

  'datasets-bench': figure(['caught'], (_ctx, t) => {
    const W = 600;
    const H = 230;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    let mode: BuildMode = 'incremental';
    let bug = true;
    let registry = true;
    const paint = () => {
      const days = buildDays(mode, bug, registry);
      const maxWrong = REGIONS * LOST_PER_REGION_DAY * (DAYS - BUG_DAY + 1);
      const a = axes({ x: 64, y: 40, w: W - 90, h: 140, xmin: 0.5, xmax: DAYS + 0.5, ymin: 0, ymax: maxWrong, xticks: [1, 3, 5, 7, 9, 11], yticks: [0, 100_000, 200_000], yfmt: (v) => (v ? `${v / 1000}k` : '0'), xlabel: 'day (one published version a day)', ylabel: 'wrong records in the published map', ink: COL.ink, grid: COL.grid });
      const parts: SVGElement[] = [...a.parts];
      days.forEach((d) => {
        const x = a.X(d.day);
        const y = a.Y(d.wrong);
        parts.push(svg('rect', { x: x - 14, y, width: 28, height: a.Y(0) - y, fill: tint(COL.error, 0.55) }));
        if (d.rebuilt !== undefined) {
          parts.push(svg('circle', { cx: x, cy: 26, r: 6, fill: d.alarm ? COL.error : COL.good }));
          parts.push(small(x, 14, `R${d.rebuilt + 1}`, { anchor: 'middle', soft: true }));
        }
        if (mode === 'rebuild') parts.push(svg('circle', { cx: x, cy: 26, r: 6, fill: COL.good }));
        if (d.idsChanged) parts.push(small(x, a.Y(0) - 4, 'IDs', { anchor: 'middle', fill: COL.clock, bold: true }));
      });
      if (bug) parts.push(line(a.X(BUG_DAY - 0.5), 34, a.X(BUG_DAY - 0.5), 180, COL.error, 1, { 'stroke-dasharray': '4 3' }), small(a.X(BUG_DAY - 0.5) + 4, 44, 'bug in the incremental job', { fill: COL.error }));
      redraw(g, ...parts);
      const last = days[days.length - 1];
      const alarmDay = days.find((d) => d.alarm)?.day;
      const ids = days.reduce((s, d) => s + d.idsChanged, 0);
      f.readout.textContent = [
        `Fresh within ${FRESH_HOURS[mode]} hours; compute ${COST[mode]}× an incremental day. Day 12: ${count(last.wrong)} wrong records.`,
        mode === 'incremental' ? (bug ? 'Nothing compares the incremental result with anything, so the lost updates stay lost.' : 'No bug this time; the job would not notice one if there were.') : mode === 'rebuild' ? 'Every version is rebuilt from the sources: always right, a day late, and a hundred times the compute.' : alarmDay ? `The rebuild of region ${days[alarmDay - 1].rebuilt! + 1} disagreed with the incremental result on day ${alarmDay}; the bug was fixed the next day.` : 'Each day one region is rebuilt and diffed against the incremental result; every diff is within tolerance.',
        ids ? `${count(ids)} IDs reissued: every consumer's stored references to those records break.` : 'IDs carried over from the registry: consumers\' references still work.',
      ].join('\n');
      if (mode === 'both' && bug && registry) t.done();
    };
    const m = named(pick(['Incremental only', 'Full rebuild daily', 'Incremental + rolling rebuild'], 0, (i) => { mode = (['incremental', 'rebuild', 'both'] as const)[i]; paint(); }), 'Build:');
    const b = named(pick(['No bug', 'A bug on day 3'], 1, (i) => { bug = i === 1; paint(); }), 'Incremental job:');
    const r = named(pick(['Fresh IDs', 'IDs from the registry'], 1, (i) => { registry = i === 1; paint(); }), 'Rebuild assigns:');
    f.controls.append(m.node, b.node, r.node);
    paint();
    return f.node;
  }),
};
