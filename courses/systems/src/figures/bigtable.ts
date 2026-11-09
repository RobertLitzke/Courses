// Lesson 10, A sorted map for the whole web: the Webtable's rows, columns and
// versions; an SSTable on disk; a log-structured store filling its memtable,
// flushing SSTables and compacting them, with and without Bloom filters (a
// time lapse); and tablets split by row range, where a row key that starts
// with the time sends every write to one server.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { liveDiagram, statsLine, type PartSpec } from './diagram';
import { COL, figure, frame, named, pick, player, slider, tint, toggles } from './kit';

/** Bits per key a Bloom filter needs for a false-positive rate p, with the best number of hashes: −ln p / (ln 2)². */
export const bloomBits = (p: number) => -Math.log(p) / Math.LN2 ** 2;

/** The false-positive rate of a Bloom filter with b bits per key and the best number of hashes, (1/2)^(b ln 2). */
export const bloomRate = (bitsPerKey: number) => Math.pow(0.5, bitsPerKey * Math.LN2);

/** Disk reads for one lookup that misses the memtable: every SSTable without filters; with filters, one for the file that holds the row, plus a false positive now and then. */
export function readCost(tables: number, bloom: boolean, present = true, fp = 0.01): number {
  if (!tables) return 0;
  if (!bloom) return present ? (tables + 1) / 2 : tables;
  return present ? 1 + fp * (tables - 1) : fp * tables;
}

export interface LsmState {
  /** Seconds since the start. */
  t: number;
  /** MB in the memtable. */
  memtable: number;
  /** SSTable sizes on disk, MB, newest first. */
  tables: number[];
  /** MB written by clients, and MB written to disk by flushes and compactions together. */
  written: number;
  diskWritten: number;
  flushes: number;
  compactions: number;
  /** Tables being merged in the last second, for drawing. */
  merging: number;
}

/** The memtable's size before it is flushed, MB. */
export const MEMTABLE_MB = 64;

/**
 * A log-structured store, second by second: writes fill the memtable at
 * `rate` MB/s; a full memtable becomes an SSTable; with compaction on,
 * whenever four tables of the same size sit together they are merged into
 * one (size-tiered), so the count of tables stays small and data is rewritten
 * once per tier. Returns the state at time `t` seconds.
 */
export function lsmAt(t: number, rate: number, compaction: boolean): LsmState {
  const s: LsmState = { t: 0, memtable: 0, tables: [], written: 0, diskWritten: 0, flushes: 0, compactions: 0, merging: 0 };
  const dt = 0.25;
  for (let k = 0; k < Math.round(t / dt); k++) {
    s.t += dt;
    s.memtable += rate * dt;
    s.written += rate * dt;
    if (s.merging > 0) s.merging = Math.max(0, s.merging - dt);
    while (s.memtable >= MEMTABLE_MB) {
      s.memtable -= MEMTABLE_MB;
      s.tables.unshift(MEMTABLE_MB);
      s.diskWritten += MEMTABLE_MB;
      s.flushes++;
      if (!compaction) continue;
      for (;;) {
        const size = s.tables[0];
        let run = 0;
        while (run < s.tables.length && s.tables[run] === size) run++;
        if (run < 4) break;
        const merged = s.tables.splice(0, 4).reduce((a, b) => a + b, 0);
        // Keep newest first: the merged table is older than nothing before it, so it goes where its parts were.
        s.tables.unshift(merged);
        s.diskWritten += merged;
        s.compactions++;
        s.merging = 1.5;
      }
    }
  }
  return s;
}

const W = 420;
const H = 250;
const T_MAX = 120;

export const FIGS = {
  'bigtable-webtable': () => {
    const w = 420;
    const h = 196;
    const s = still(w, h);
    const parts: SVGElement[] = [];
    const cols = [
      { x: 150, w: 120, name: '"contents:"' },
      { x: 276, w: 140, name: '"anchor:cnnsi.com"' },
    ];
    parts.push(small(8, 14, 'row key', { soft: true }), ...cols.map((c) => small(c.x + 4, 14, c.name, { fill: COL.data })));
    const rows = [
      { key: '"com.cnn.money"', dim: true },
      { key: '"com.cnn.www"', dim: false },
      { key: '"com.cnn.www/sports"', dim: true },
      { key: '"com.example"', dim: true },
    ];
    const y0 = 22;
    const rh = [26, 92, 26, 26];
    let y = y0;
    rows.forEach((r, i) => {
      const hh = rh[i];
      parts.push(svg('rect', { x: 4, y, width: w - 8, height: hh - 3, rx: 3, fill: r.dim ? COL.paper : tint(COL.data, 0.08), stroke: r.dim ? COL.grid : COL.data }));
      parts.push(small(10, y + 15, r.key, { bold: !r.dim, soft: r.dim }));
      if (!r.dim) {
        const versions = [['t6', '"<html>…" newest'], ['t5', '"<html>…"'], ['t3', '"<html>…" oldest']];
        versions.forEach(([ts, v], k) => {
          const vy = y + 8 + k * 20;
          parts.push(svg('rect', { x: cols[0].x + k * 4, y: vy, width: cols[0].w - 8, height: 18, rx: 2, fill: COL.paper, stroke: COL.soft }));
          parts.push(small(cols[0].x + 6 + k * 4, vy + 12, `${ts}: ${v}`, { fill: k === 0 ? COL.ink : COL.soft }));
        });
        parts.push(svg('rect', { x: cols[1].x, y: y + 8, width: cols[1].w - 4, height: 18, rx: 2, fill: COL.paper, stroke: COL.soft }));
        parts.push(small(cols[1].x + 6, y + 20, 't9: "CNN"'));
        parts.push(small(cols[1].x + 6, y + 46, '(text of a link to it', { soft: true }), small(cols[1].x + 6, y + 58, 'on the page cnnsi.com)', { soft: true }));
      } else {
        parts.push(small(cols[0].x + 4, y + 15, '…', { soft: true }));
      }
      y += hh;
    });
    parts.push(
      small(8, y + 14, 'Rows sorted by key, so the pages of one site sit together.', { soft: true }),
      small(8, y + 28, 'Each cell holds versions by timestamp, newest first.', { soft: true }),
    );
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'bigtable-sstable': () => {
    const w = 420;
    const h = 150;
    const s = still(w, h);
    const parts: SVGElement[] = [];
    const blocks = [
      ['aardvark', 'abacus'],
      ['abalone', 'abbey'],
      ['…', '…'],
      ['zebra', 'zygote'],
    ];
    parts.push(label(8, 14, 'One SSTable file in GFS (immutable, sorted)', { bold: true, size: 'small' }));
    let x = 8;
    blocks.forEach((b, i) => {
      const bw = i === 2 ? 36 : 72;
      parts.push(svg('rect', { x, y: 24, width: bw - 4, height: 56, rx: 2, fill: tint(COL.data, 0.12), stroke: COL.data }));
      if (i !== 2) parts.push(small(x + 4, 38, `block ${i === 3 ? 'n' : i + 1}, 64 KB`, { bold: true }), small(x + 4, 54, `${b[0]} …`), small(x + 4, 68, `… ${b[1]}`, { soft: true }));
      else parts.push(small(x + 18, 54, '…', { soft: true }));
      x += bw;
    });
    parts.push(svg('rect', { x, y: 24, width: 74, height: 56, rx: 2, fill: tint(COL.cache, 0.12), stroke: COL.cache }));
    parts.push(small(x + 4, 38, 'block index', { bold: true }), small(x + 4, 54, 'last key of each', { soft: true }), small(x + 4, 66, 'block, and where', { soft: true }));
    x += 78;
    parts.push(svg('rect', { x, y: 24, width: w - x - 6, height: 56, rx: 2, fill: tint(COL.cache, 0.12), stroke: COL.cache }));
    parts.push(small(x + 4, 38, 'Bloom filter', { bold: true }), small(x + 4, 54, 'about 10 bits', { soft: true }), small(x + 4, 66, 'per key', { soft: true }));
    parts.push(
      small(8, 100, 'Opening the file loads the index and the filter into memory. A lookup asks the filter', { soft: true }),
      small(8, 113, '"could this key be here?"; if yes, a binary search of the index names one block,', { soft: true }),
      small(8, 126, 'and one disk read fetches it. The file is never changed after it is written.', { soft: true }),
    );
    redraw(s.svg, ...parts);
    return { node: s.node };
  },

  'bigtable-lsm': figure(['bloom'], (ctx, t) => {
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    let now = 0;
    let rate = 8;
    let compaction = true;
    let bloom = false;
    const paint = () => {
      const s = lsmAt(now, rate, compaction);
      const parts: SVGElement[] = [];
      // Memory: the memtable.
      parts.push(label(10, 16, 'Memory', { bold: true, size: 'small' }));
      parts.push(svg('rect', { x: 10, y: 26, width: 110, height: 40, rx: 3, fill: COL.paper, stroke: COL.cache, 'stroke-dasharray': '5 2' }));
      parts.push(svg('rect', { x: 12, y: 28, width: 106 * (s.memtable / MEMTABLE_MB), height: 36, fill: tint(COL.cache, 0.45) }));
      parts.push(small(65, 44, 'memtable', { anchor: 'middle', bold: true }), small(65, 58, `${Math.round(s.memtable)} of ${MEMTABLE_MB} MB`, { anchor: 'middle' }));
      // The commit log grows with every write.
      parts.push(label(10, 88, 'Commit log in GFS', { bold: true, size: 'small' }));
      const logW = Math.min(106, (s.written % 512) / 512 * 106);
      parts.push(svg('rect', { x: 10, y: 96, width: 110, height: 12, rx: 2, fill: COL.paper, stroke: COL.write }), svg('rect', { x: 12, y: 98, width: logW, height: 8, fill: COL.write }));
      parts.push(small(10, 122, 'appended in order;', { soft: true }), small(10, 134, 'replayed after a crash', { soft: true }));
      parts.push(line(122, 46, 150, 46, COL.soft, 1.2), small(136, 40, 'flush', { anchor: 'middle', soft: true }));
      // Disk: the SSTables, newest on top, width by log of size.
      parts.push(label(156, 16, 'SSTables in GFS, newest first', { bold: true, size: 'small' }));
      const shown = s.tables.slice(0, 9);
      shown.forEach((mb, i) => {
        const bw = 40 + 50 * Math.log(mb / MEMTABLE_MB + 1) / Math.log(2);
        const y = 24 + i * 15;
        const merged = s.merging > 0 && i === 0 && mb > MEMTABLE_MB;
        parts.push(svg('rect', { x: 156, y, width: Math.min(bw, 250), height: 12, rx: 2, fill: merged ? tint(COL.busy, 0.5) : tint(COL.data, 0.25), stroke: merged ? COL.busy : COL.data }));
        parts.push(small(160, y + 9.5, mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`));
        if (bloom) parts.push(svg('rect', { x: 156 + Math.min(bw, 250) + 3, y: y + 2, width: 8, height: 8, rx: 1, fill: COL.cache }));
      });
      if (s.tables.length > shown.length) parts.push(small(156, 24 + shown.length * 15 + 9, `and ${s.tables.length - shown.length} more`, { soft: true }));
      if (bloom) parts.push(svg('rect', { x: 330, y: 8, width: 8, height: 8, rx: 1, fill: COL.cache }), small(342, 16, 'Bloom filter'));
      // A read for a row that is in none of the files.
      const reads = readCost(s.tables.length, bloom, false);
      const readsHit = readCost(s.tables.length, bloom, true);
      const by = 222;
      parts.push(small(10, by - 16, 'Disk reads to look up one row that is not in memory:', { soft: true }));
      const scale = 12;
      parts.push(svg('rect', { x: 10, y: by - 8, width: Math.max(1, Math.min(400, readsHit * scale)), height: 10, fill: COL.request }));
      parts.push(small(14 + Math.min(400, readsHit * scale), by + 1, `${readsHit < 2 ? readsHit.toFixed(2) : readsHit.toFixed(1)} on average`));
      parts.push(svg('rect', { x: 10, y: by + 6, width: Math.max(1, Math.min(400, reads * scale)), height: 10, fill: tint(COL.request, 0.45) }));
      parts.push(small(14 + Math.min(400, reads * scale), by + 15, `${reads < 2 ? reads.toFixed(2) : reads.toFixed(0)} for a row that isn't stored`));
      redraw(g, ...parts);
      const amp = s.written ? s.diskWritten / s.written : 1;
      f.readout.textContent = `After ${Math.round(now)} s at ${rate} MB/s: ${s.tables.length} SSTable${s.tables.length === 1 ? '' : 's'} on disk, after ${s.flushes} flushes and ${s.compactions} compactions. Each MB written by clients has been written to disk ${amp.toFixed(1)} times.`;
      if (t.goal === 'bloom' && bloom && s.tables.length >= 6) t.done();
    };
    const time = slider('Time', 0, T_MAX, 1, 0, (v) => `${Math.round(v)} s`, (v) => { now = v; paint(); }, 'clock');
    const play = player(time, ctx, { seconds: 15 });
    const r = slider('Writes', 2, 16, 1, rate, (v) => `${v} MB/s`, (v) => { rate = v; paint(); }, 'write');
    const chips = named(toggles(['Compaction', 'Bloom filters'], [compaction, bloom], (on) => { [compaction, bloom] = on; paint(); }), 'With:');
    f.controls.append(chips.node, play.node, time.node, r.node);
    paint();
    return f.node;
  }),

  'bigtable-hotspot': figure(['spread'], (ctx, t) => {
    const SCHEMES = ['Time first', 'Sensor, then time', 'Random prefix'] as const;
    let scheme = 0;
    const ring = (key: number) => {
      // Keys are sensors 0 to 999; tablets hold row ranges, one quarter of the key space each.
      if (scheme === 0) return 't4'; // every new row sorts after every old one: the last tablet
      if (scheme === 1) return `t${Math.floor(key / 250) + 1}`;
      return `t${((key * 2654435761) >>> 0) % 4 + 1}`;
    };
    const parts: PartSpec[] = [
      { id: 'sensors', kind: 'client', label: 'Sensors', x: 52, y: 120, rps: 220, keys: 1000, timeoutMs: 1500 },
      { id: 'map', kind: 'lb', label: 'Tablet map', x: 170, y: 120, policy: { type: 'hash', ring } },
      ...[1, 2, 3, 4].map((i): PartSpec => ({ id: `t${i}`, kind: 'server', label: `Server ${i}`, x: 330, y: 30 + (i - 1) * 60, serviceMs: 12, servers: 1, queue: 25 })),
    ];
    const links = [
      { from: 'sensors', to: 'map', ms: 25 },
      ...[1, 2, 3, 4].map((i) => ({ from: 'map', to: `t${i}`, ms: 25 })),
    ];
    const RANGES = [
      ['', '', '', 'all new rows'],
      ['sensors 0 to 249', 'sensors 250 to 499', 'sensors 500 to 749', 'sensors 750 to 999'],
      ['prefix 0', 'prefix 1', 'prefix 2', 'prefix 3'],
    ];
    const SCANS = [
      'The last minute of every sensor: 1 tablet. One sensor’s day: scan a day of every sensor’s rows.',
      'One sensor’s day: 1 tablet, one range. The last minute of every sensor: every tablet.',
      'Both queries go to every tablet: the prefix scatters each sensor’s rows.',
    ];
    const d = liveDiagram(ctx, { parts, links, seed: 3 }, {
      w: 420, h: 250, lines: 5, speed: 150,
      sub: (p) => (p.id.startsWith('t') ? RANGES[scheme][Number(p.id[1]) - 1] : undefined),
      onFrame: (sys) => {
        const util = [1, 2, 3, 4].map((i) => sys.part(`t${i}`).served);
        const total = util.reduce((a, b) => a + b, 0) || 1;
        d.f.readout.textContent = `${statsLine(sys.stats(3000))} Writes per server: ${util.map((u) => `${Math.round((u / total) * 100)}%`).join(', ')}. ${SCANS[scheme]}`;
      },
    });
    const choose = named(pick(SCHEMES, 0, (i) => {
      scheme = i;
      d.rebuild({ parts, links, seed: 3 + i });
      if (t.goal === 'spread' && i > 0) t.done();
    }), 'Row key:');
    d.f.controls.append(choose.node);
    return d.f.node;
  }),
};
