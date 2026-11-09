// Lesson D5, More data than the network can carry: the estimate for a fleet
// that records more than any link can move, a workbench of what to keep and
// how to move and store it, resumable uploads in content-addressed chunks,
// and finding scenes in a catalogue instead of scanning the logs.

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { count } from 'sysdiagram/numbers';
import { COL, figure, frame, named, pick, slider, tint, toggles } from './kit';
import { drawBoard, estimateFigure, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// The estimate.

const TB = 1e12;
const PB = 1e15;

/** Bytes a link of `gbps` gigabits a second moves in a day. */
export const perDay = (gbps: number) => (gbps * 1e9 * 86_400) / 8;

export interface FleetSize {
  /** Bytes recorded a day. */
  daily: number;
  /** Bytes one depot link moves a day. */
  linkDaily: number;
  /** Days for one link to move one day's recording. */
  linkDays: number;
  /** Share of a vehicle's day that cellular at 50 Mb/s for its working hours could carry. */
  cellShare: number;
  /** 20 TB drives filled a day. */
  drives: number;
}

export function fleetSize(vehicles: number, tbPerHour: number, hours: number, linkGbps: number): FleetSize {
  const daily = vehicles * tbPerHour * TB * hours;
  const linkDaily = perDay(linkGbps);
  const cell = (50e6 / 8) * hours * 3600;
  return { daily, linkDaily, linkDays: daily / linkDaily, cellShare: cell / (tbPerHour * TB * hours), drives: Math.ceil(daily / (20 * TB)) };
}

export const sayBytes = (b: number) => (b >= PB ? `${count(b / PB)} PB` : b >= TB ? `${count(b / TB)} TB` : `${count(b / 1e9)} GB`);

// ---------------------------------------------------------------------------
// The workbench.

export type Path = 'cell' | 'depot' | 'drives';
export interface PlanChoices {
  /** Share of the raw recording kept on board after triage. */
  keep: number;
  path: Path;
  /** Move data older than 30 days to erasure-coded cold storage. */
  tiered: boolean;
}

export const FLEET = 1000;
export const DAILY_RAW = FLEET * 8 * TB;
/** Round prices of our own, a month: a terabyte kept hot in three copies, and kept cold, erasure coded. */
export const HOT_TB_MONTH = 60;
export const COLD_TB_MONTH = 4;
export const CELL_PER_GB = 1;

export interface Plan {
  kept: number;
  capacity: number;
  /** Bytes a day that can't be moved and pile up on the vehicles. */
  backlog: number;
  /** Hours from something happening on a vehicle to the data in the datacentre. */
  delayHours: number;
  /** After a year: bytes stored, and the monthly bill for storage and moving data. */
  yearBytes: number;
  storeMonth: number;
  moveMonth: number;
}

export function plan(o: PlanChoices): Plan {
  const kept = DAILY_RAW * o.keep;
  // 1,000 vehicles at 50 Mb/s for 8 h; ten depots with a 10 Gb/s link each; or a van of drives from each depot each day.
  const capacity = o.path === 'cell' ? FLEET * (50e6 / 8) * 8 * 3600 : o.path === 'depot' ? 10 * perDay(10) : 10 * 200 * 20 * TB;
  const moved = Math.min(kept, capacity);
  const yearBytes = moved * 365;
  const hotBytes = o.tiered ? moved * 30 : yearBytes;
  const coldBytes = yearBytes - hotBytes;
  return {
    kept,
    capacity,
    backlog: Math.max(0, kept - capacity),
    delayHours: o.path === 'cell' ? 0.1 : o.path === 'depot' ? 12 : 60,
    yearBytes,
    storeMonth: (hotBytes / TB) * HOT_TB_MONTH + (coldBytes / TB) * COLD_TB_MONTH,
    moveMonth: o.path === 'cell' ? (moved / 1e9) * CELL_PER_GB * 30 : o.path === 'depot' ? 10 * 5_000 : 10 * 30 * 2_000,
  };
}

// ---------------------------------------------------------------------------
// Uploads that survive a dropped link.

export interface UploadCost {
  /** Gigabytes sent in all, and how many of them were sent twice. */
  sent: number;
  wasted: number;
  /** Gigabytes not sent because the store already had chunks with the same hash. */
  skipped: number;
}

/**
 * Upload a log of `size` GB over a link that drops once, `dropAt` of the way
 * through. Sent whole, the upload starts again from the beginning; sent as
 * chunks named by their hash, it asks which chunks the store lacks and sends
 * only those. `shared` is the share of chunks the store already holds
 * (calibration files, map data, a copy sent from another vehicle).
 */
export function uploadCost(chunked: boolean, size: number, dropAt: number, shared: number, chunkMB = 4): UploadCost {
  if (!chunked) return { sent: size * dropAt + size, wasted: size * dropAt, skipped: 0 };
  const need = size * (1 - shared);
  const lostChunk = chunkMB / 1000;
  return { sent: need + lostChunk, wasted: lostChunk, skipped: size * shared };
}

// ---------------------------------------------------------------------------
// The catalogue.

export const TAGS = ['night', 'rain', 'cyclist', 'junction', 'roadworks'] as const;
export type Tag = (typeof TAGS)[number];
/** Share of one-minute segments that carry each tag (round figures for the figure). */
export const TAG_SHARE: Record<Tag, number> = { night: 0.3, rain: 0.1, cyclist: 0.05, junction: 0.2, roadworks: 0.03 };

/** Share of segments matching every tag in `on`, taking the tags as independent. */
export const matchShare = (on: readonly Tag[]) => on.reduce((s, t) => s * TAG_SHARE[t], 1);

/** A sample of segments with tags drawn at those shares, the same every time. */
export function sampleSegments(n = 400, seed = 5): Tag[][] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => TAGS.filter((t) => rng() < TAG_SHARE[t]));
}

/** A year of kept data, and how fast a large cluster can read it. */
export const YEAR_KEPT = 146 * PB;
export const SCAN_BYTES_PER_S = 1 * TB;

const money = (n: number) => `$${count(n)}`;
const weight = (bytes: number) => Math.max(0.05, Math.min(1, (Math.log10(Math.max(bytes, 1)) - 12) / 4));

export const FIGS = {
  'sensors-estimate': estimateFigure({
    inputs: [
      { key: 'vehicles', label: 'Vehicles', min: 10, max: 10_000, value: 1000, log: true, show: (v) => count(v), color: 'request' },
      { key: 'tb', label: 'Recorded an hour', min: 0.1, max: 4, step: 0.1, value: 1, show: (v) => `${v.toFixed(1)} TB`, color: 'data' },
      { key: 'link', label: 'Depot link', min: 1, max: 100, value: 10, log: true, show: (v) => `${Math.round(v)} Gb/s`, color: 'request' },
    ],
    rows: (v) => {
      const s = fleetSize(v.vehicles, v.tb, 8, v.link);
      return [
        { label: 'Recorded a day, 8 hours a vehicle', say: sayBytes(s.daily), how: `${count(v.vehicles)} × ${v.tb.toFixed(1)} TB × 8 h`, color: 'data' },
        { label: 'One depot link moves a day', say: sayBytes(s.linkDaily), how: `${Math.round(v.link)} Gb/s ÷ 8 × 86,400 s`, color: 'request' },
        { label: 'Days for that link to move one day', say: `${count(s.linkDays)} days`, how: `${sayBytes(s.daily)} ÷ ${sayBytes(s.linkDaily)}`, color: 'busy' },
        { label: 'Share cellular could carry, 50 Mb/s', say: `${(s.cellShare * 100).toPrecision(2)}%`, how: '50 Mb/s for the same 8 hours, against the recording', color: 'error' },
        { label: '20 TB drives filled a day', say: count(s.drives), how: `${sayBytes(s.daily)} ÷ 20 TB`, color: 'cost' },
      ];
    },
    ask: '1,000 vehicles each record 1 TB an hour for 8 hours a day. Over one 10 Gb/s link, how long does it take to move one day\'s recording?',
    options: ['About an hour', 'About a day', 'About ten weeks', 'About five years'],
    answer: 2,
    after: (v) => {
      const s = fleetSize(v.vehicles, v.tb, 8, v.link);
      return `${sayBytes(s.daily)} a day against ${sayBytes(s.linkDaily)} a day through the link: ${count(s.linkDays)} days of upload for each day of driving.`;
    },
  }),

  'sensors-bench': figure(['keeps'], (_ctx, t) => {
    const W = 600;
    const H = 230;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    const o: PlanChoices = { keep: 1, path: 'cell', tiered: false };
    const paint = () => {
      const p = plan(o);
      const pathName = { cell: 'Cellular', depot: 'Depot links', drives: 'Shipped drives' }[o.path];
      const boxes: BoardBox[] = [
        { id: 'fleet', x: 60, y: 110, label: '1,000 vehicles', sub: `keep ${Math.round(o.keep * 100)}% on board`, shape: 'pill', color: 'request', w: 108 },
        { id: 'path', x: 225, y: 110, label: pathName, sub: `${sayBytes(p.capacity)} a day`, color: p.backlog > 0 ? 'error' : 'request', w: 104 },
        { id: 'ingest', x: 380, y: 110, label: 'Ingest', sub: 'checks, catalogue', color: 'write', w: 96 },
        { id: 'hot', x: 530, y: 55, label: 'Hot store', sub: o.tiered ? 'last 30 days, 3 copies' : 'everything, 3 copies', shape: 'store', color: 'data', w: 120 },
        { id: 'cold', x: 530, y: 170, label: 'Cold store', sub: 'erasure coded', shape: 'store', color: 'data', faded: !o.tiered, w: 120 },
      ];
      const wires: BoardWire[] = [
        { from: 'fleet', to: 'path', text: `${sayBytes(p.kept)}/day`, weight: weight(p.kept), color: 'data' },
        { from: 'path', to: 'ingest', text: `${sayBytes(Math.min(p.kept, p.capacity))}/day`, weight: weight(Math.min(p.kept, p.capacity)), color: 'request' },
        { from: 'ingest', to: 'hot', weight: 0.3, color: 'write' },
        { from: 'hot', to: 'cold', text: 'after 30 days', weight: 0.2, color: 'data', faded: !o.tiered, lift: -30 },
      ];
      drawBoard(g, boxes, wires);
      f.readout.textContent = [
        p.backlog > 0 ? `${sayBytes(p.backlog)} a day can't be moved and piles up on the vehicles.` : `Everything kept is moved: ${sayBytes(p.kept)} a day, in the datacentre about ${p.delayHours < 1 ? 'minutes' : `${p.delayHours} hours`} later.`,
        `After a year, ${sayBytes(p.yearBytes)} stored: about ${money(p.storeMonth)} a month for storage.`,
        `Moving it costs about ${money(p.moveMonth)} a month.`,
      ].join('\n');
      if (p.backlog === 0 && o.tiered && p.storeMonth + p.moveMonth < 3e6) t.done();
    };
    const keep = slider('Kept after triage on board', { min: 0.01, max: 1, scale: 'log', step: 0.01, value: o.keep, show: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { o.keep = v; paint(); }, color: 'data' });
    const path = named(pick(['Cellular', 'Depot links', 'Shipped drives'], 0, (i) => { o.path = (['cell', 'depot', 'drives'] as const)[i]; paint(); }), 'Bulk path:');
    const tier = named(pick(['All hot', 'Cold after 30 days'], 0, (i) => { o.tiered = i === 1; paint(); }), 'Storage:');
    f.controls.append(keep.node, path.node, tier.node);
    paint();
    return f.node;
  }),

  'sensors-chunks': figure(['resumed'], (_ctx, t) => {
    const W = 560;
    const H = 150;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let chunked = false;
    let drop = 0.6;
    let shared = 0;
    let moved = false;
    const N = 64;
    const SIZE = 256;
    const paint = () => {
      const c = uploadCost(chunked, SIZE, drop, shared);
      const parts: SVGElement[] = [];
      const cw = (W - 28) / N;
      parts.push(label(14, 18, `A ${SIZE} GB log, ${N} pieces shown (each stands for many 4 MB chunks)`, { size: 'note', bold: true }));
      const dropAt = Math.round(drop * N);
      const rng = makeRng(9);
      const have = Array.from({ length: N }, () => rng() < shared);
      for (let i = 0; i < N; i++) {
        const x = 14 + i * cw;
        // First attempt: up to the drop.
        let first: string = COL.soft;
        let second: string = COL.soft;
        if (chunked) {
          if (have[i]) first = second = COL.cache;
          else if (i < dropAt) first = second = COL.answer;
          else second = COL.answer;
        } else {
          if (i < dropAt) {
            first = COL.busy;
            second = COL.answer;
          } else second = COL.answer;
        }
        parts.push(svg('rect', { x: x + 0.5, y: 32, width: cw - 1, height: 22, fill: first === COL.soft ? tint(COL.soft, 0.15) : tint(first, 0.6) }));
        parts.push(svg('rect', { x: x + 0.5, y: 74, width: cw - 1, height: 22, fill: second === COL.soft ? tint(COL.soft, 0.15) : tint(second, 0.6) }));
      }
      const dx = 14 + dropAt * cw;
      parts.push(svg('line', { x1: dx, y1: 26, x2: dx, y2: 58, stroke: COL.error, 'stroke-width': 2 }), small(dx + 3, 66, 'link drops', { fill: COL.error }));
      parts.push(small(14, 28, 'First try', { soft: true }), small(14, 70, chunked ? 'After reconnecting: "which of these hashes do you lack?"' : 'After reconnecting: from the start', { soft: true }));
      const key: [string, string][] = chunked ? [['sent once', COL.answer], ['already stored, skipped', COL.cache]] : [['sent, then lost and sent again', COL.busy], ['sent', COL.answer]];
      key.forEach(([text, col], i) => {
        parts.push(svg('rect', { x: 14 + i * 200, y: 112, width: 12, height: 12, fill: tint(col, 0.6) }), small(32 + i * 200, 122, text));
      });
      parts.push(label(W - 14, 140, `${Math.round(c.sent)} GB sent for a ${SIZE} GB log`, { anchor: 'end', bold: true, fill: c.wasted > 1 ? COL.error : COL.answer }));
      redraw(g, ...parts);
      f.readout.textContent = chunked
        ? `Sent ${Math.round(c.sent)} GB: only the chunks the store lacked${c.skipped ? `, skipping ${Math.round(c.skipped)} GB it already had` : ''}. A drop costs one chunk.`
        : `Sent ${Math.round(c.sent)} GB, of which ${Math.round(c.wasted)} GB went twice. A second drop would start it over again.`;
      if (chunked && moved) t.done();
    };
    const mode = named(pick(['One file, start again', 'Chunks named by hash'], 0, (i) => { chunked = i === 1; paint(); }), 'Upload as:');
    const at = slider('Link drops at', 0.05, 0.95, 0.05, drop, (v) => `${Math.round(v * 100)}%`, (v) => { drop = v; moved = true; paint(); }, 'error');
    const sh = slider('Already in the store', 0, 0.5, 0.05, shared, (v) => `${Math.round(v * 100)}%`, (v) => { shared = v; paint(); }, 'cache');
    f.controls.append(mode.node, at.node, sh.node);
    paint();
    return f.node;
  }),

  'sensors-find': figure(['found'], (_ctx, t) => {
    const W = 560;
    const H = 250;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    const segs = sampleSegments();
    let on: Tag[] = [];
    let indexed = false;
    const paint = () => {
      const share = matchShare(on);
      const parts: SVGElement[] = [];
      parts.push(label(14, 18, 'A year of kept segments (400 shown, each a sample of many)', { size: 'note', bold: true }));
      const cols = 40;
      const cs = 13.2;
      segs.forEach((tags, i) => {
        const hit = on.length > 0 && on.every((x) => tags.includes(x));
        const read = !indexed || hit;
        const x = 14 + (i % cols) * cs;
        const y = 28 + Math.floor(i / cols) * cs;
        parts.push(svg('rect', { x, y, width: cs - 1.5, height: cs - 1.5, rx: 1.5, fill: hit ? COL.answer : read ? tint(COL.busy, 0.45) : tint(COL.soft, 0.15) }));
      });
      const shown = on.length ? segs.filter((tags) => on.every((x) => tags.includes(x))).length : 0;
      const readBytes = indexed ? YEAR_KEPT * (on.length ? share : 1) : YEAR_KEPT;
      const secs = readBytes / SCAN_BYTES_PER_S;
      const hours = (share * FLEET * 8 * 365);
      parts.push(svg('rect', { x: 14, y: 166, width: 10, height: 10, fill: COL.answer }), small(28, 175, 'matches'));
      parts.push(svg('rect', { x: 100, y: 166, width: 10, height: 10, fill: tint(COL.busy, 0.45) }), small(114, 175, 'read to find them'));
      parts.push(svg('rect', { x: 230, y: 166, width: 10, height: 10, fill: tint(COL.soft, 0.15) }), small(244, 175, 'never touched'));
      parts.push(label(14, 202, on.length ? `${shown} of 400 shown match; about ${count(hours)} hours of driving in a year` : 'Choose what to look for.', { size: 'note', bold: true }));
      parts.push(label(14, 226, `${indexed ? 'Ask the catalogue, then read the matches' : 'Scan every log'}: ${sayBytes(readBytes)} read, about ${secs > 86_400 ? `${(secs / 86_400).toFixed(1)} days` : secs > 3600 ? `${(secs / 3600).toFixed(1)} hours` : `${Math.max(1, Math.round(secs / 60))} minutes`} at 1 TB/s`, { size: 'note', fill: indexed ? COL.answer : COL.busy }));
      redraw(g, ...parts);
      f.readout.textContent = indexed
        ? 'The catalogue answers from its own small tables in milliseconds; only matching segments are read from the store.'
        : 'Without a catalogue, every log must be opened and decoded to see what it holds.';
      if (indexed && on.length >= 2) t.done();
    };
    const tags = named(toggles(TAGS, TAGS.map(() => false), (state) => { on = TAGS.filter((_, i) => state[i]); paint(); }), 'Find:');
    const how = named(pick(['Scan the logs', 'Ask the catalogue'], 0, (i) => { indexed = i === 1; paint(); }), 'How:');
    f.controls.append(tags.node, how.node);
    paint();
    return f.node;
  }),
};
