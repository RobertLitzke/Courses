// Lesson 7, A disk dies every day: chunks with three copies on racks of
// machines, failures and re-replication (rack-aware or not, the most
// endangered first or not); a GFS write with its lease, data pipeline and
// serial order, and the duplicate a retried record append leaves; and the
// cost of copies against erasure codes.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { makeRng, type Rng } from 'didactics/rng';
import { sequenceView, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { animate, button, COL, figure, frame, named, pick, player, slider, toggles } from './kit';

// ---- The cluster model ---------------------------------------------------------

export interface ClusterOptions {
  racks: number;
  perRack: number;
  chunks: number;
  copies: number;
  /** Put each chunk's copies on different racks. */
  rackAware: boolean;
  /** Repair the chunks with the fewest copies first; else in the order they lost a copy. */
  priority: boolean;
  seed: number;
}

export const DEFAULTS: ClusterOptions = { racks: 3, perRack: 4, chunks: 150, copies: 3, rackAware: false, priority: true, seed: 2 };

/** Chunks with copies on machines in racks; machines fail, and the master makes new copies one at a time. */
export class Cluster {
  readonly o: ClusterOptions;
  /** For each chunk, the machines holding a copy. */
  where: number[][];
  up: boolean[];
  /** Chunks that have lost every copy. */
  lost = new Set<number>();
  /** Chunks waiting for a copy, in the order they lost one. */
  queue: number[] = [];
  copiesMade = 0;
  private rng: Rng;

  constructor(o: Partial<ClusterOptions> = {}) {
    this.o = { ...DEFAULTS, ...o };
    this.rng = makeRng(this.o.seed);
    const n = this.o.racks * this.o.perRack;
    this.up = Array.from({ length: n }, () => true);
    this.where = [];
    for (let i = 0; i < this.o.chunks; i++) this.where.push(this.place([]));
  }

  rackOf = (m: number) => Math.floor(m / this.o.perRack);
  get machines() {
    return this.up.length;
  }

  /** Copies each machine holds. */
  load(): number[] {
    const l = this.up.map(() => 0);
    for (const ms of this.where) for (const m of ms) l[m]++;
    return l;
  }

  /** Machines to add to a chunk that already has copies on `have`, to bring it to full strength. */
  private place(have: number[], want = this.o.copies - have.length): number[] {
    const out: number[] = [];
    const load = this.load();
    for (let i = 0; i < want; i++) {
      const taken = [...have, ...out];
      const racks = new Set(taken.map(this.rackOf));
      let pool = this.up.map((u, m) => (u && !taken.includes(m) ? m : -1)).filter((m) => m >= 0);
      if (this.o.rackAware) {
        const fresh = pool.filter((m) => !racks.has(this.rackOf(m)));
        if (fresh.length) pool = fresh;
      }
      if (!pool.length) break;
      // New chunks go anywhere at random; repairs prefer the least loaded machines.
      const m = have.length ? pool.sort((a, b) => load[a] - load[b] || a - b)[Math.floor(this.rng() * Math.min(3, pool.length))] : pool[Math.floor(this.rng() * pool.length)];
      out.push(m);
      load[m]++;
    }
    return out;
  }

  /** Fail or restore machines. A restored machine comes back empty. */
  setUp(ms: number[], up: boolean) {
    for (const m of ms) this.up[m] = up;
    if (up) return;
    this.where.forEach((holders, c) => {
      const left = holders.filter((m) => !ms.includes(m));
      if (left.length === holders.length) return;
      this.where[c] = left;
      if (!left.length) this.lost.add(c);
      else if (!this.queue.includes(c)) this.queue.push(c);
    });
    this.queue = this.queue.filter((c) => !this.lost.has(c));
  }

  failRack(r: number) {
    this.setUp(Array.from({ length: this.o.perRack }, (_, i) => r * this.o.perRack + i), false);
  }

  /** Make one new copy; false when nothing is waiting. */
  repairOne(): boolean {
    if (!this.queue.length) return false;
    let i = 0;
    if (this.o.priority) {
      let fewest = Infinity;
      this.queue.forEach((c, k) => {
        if (this.where[c].length < fewest) [fewest, i] = [this.where[c].length, k];
      });
    }
    const c = this.queue[i];
    const add = this.place(this.where[c], 1);
    if (!add.length) {
      // Nowhere to put it now; try again later.
      this.queue.push(this.queue.splice(i, 1)[0]);
      return false;
    }
    this.where[c] = [...this.where[c], ...add];
    this.copiesMade++;
    if (this.where[c].length >= this.o.copies) this.queue.splice(i, 1);
    return true;
  }

  /** Chunks by how many copies they have now. */
  counts(): { full: number; two: number; one: number; lost: number } {
    let full = 0;
    let two = 0;
    let one = 0;
    for (const w of this.where) {
      if (w.length >= this.o.copies) full++;
      else if (w.length === 2) two++;
      else if (w.length === 1) one++;
    }
    return { full, two, one, lost: this.lost.size };
  }
}

/** Disk failures a day in a fleet of `disks` failing at `annual` a year. */
export const failuresPerDay = (disks: number, annual: number) => (disks * annual) / 365;

/** Minutes to copy a dead disk's `tb` terabytes when `sources` machines each copy `mbps` MB a second in parallel. */
export const repairMinutes = (tb: number, sources: number, mbps: number) => (tb * 1e6) / (sources * mbps) / 60;

export interface Scheme {
  name: string;
  /** Bytes stored per byte of data. */
  overhead: number;
  /** Losses it survives. */
  survives: number;
  /** Blocks read to rebuild one lost block. */
  repairReads: number;
}

/** Reed-Solomon with k data blocks and m parity blocks, or n full copies (k = 1, m = n − 1, but repair reads one). */
export function scheme(k: number, m: number, copies = false): Scheme {
  return copies
    ? { name: `${m + 1} copies`, overhead: m + 1, survives: m, repairReads: 1 }
    : { name: `Reed-Solomon ${k}+${m}`, overhead: (k + m) / k, survives: m, repairReads: k };
}

// ---- The write and the record append -----------------------------------------

export interface WriteRun {
  messages: Message[];
  marks: Mark[];
  end: number;
  /** How many times the record ends up in each replica. */
  copiesOf: Record<'a' | 'p' | 'b', number>;
}

/**
 * A record append to a chunk. The client learns the lease holder from the
 * master, pushes the data along a chain (A, then the primary, then B), then
 * asks the primary to commit. The primary picks the offset and tells the
 * secondaries. If B fails to apply it, the client is told the append failed and
 * retries, and the record lands again at a new offset.
 */
export function recordAppend(fail: boolean): WriteRun {
  const C = COL;
  const m: Message[] = [
    { from: 'client', to: 'master', send: 0, arrive: 10, label: 'who has the lease?', color: C.leader },
    { from: 'master', to: 'client', send: 12, arrive: 22, label: 'P; also A, B', color: C.leader },
    { from: 'client', to: 'a', send: 24, arrive: 38, label: 'data', color: C.write },
    { from: 'a', to: 'p', send: 30, arrive: 44, label: 'data', color: C.write },
    { from: 'p', to: 'b', send: 36, arrive: 50, label: 'data', color: C.write },
    { from: 'client', to: 'p', send: 52, arrive: 62, label: 'append', color: C.request },
    { from: 'p', to: 'a', send: 66, arrive: 76, label: 'at offset 0', color: C.leader },
    { from: 'p', to: 'b', send: 66, arrive: 76, label: 'at offset 0', color: C.leader },
    { from: 'a', to: 'p', send: 78, arrive: 88, label: 'ok', color: C.answer },
  ];
  const marks: Mark[] = [
    { lane: 'p', at: 4, text: 'holds lease', color: C.clock },
    { lane: 'p', at: 64, text: '@0', color: C.data },
    { lane: 'a', at: 77, text: '@0', color: C.data },
  ];
  if (!fail) {
    m.push(
      { from: 'b', to: 'p', send: 78, arrive: 88, label: 'ok', color: C.answer },
      { from: 'p', to: 'client', send: 90, arrive: 100, label: 'done, offset 0', color: C.answer },
    );
    marks.push({ lane: 'b', at: 77, text: '@0', color: C.data });
    return { messages: m, marks, end: 100, copiesOf: { a: 1, p: 1, b: 1 } };
  }
  m.push(
    { from: 'b', to: 'p', send: 78, arrive: 88, label: 'failed', color: C.error },
    { from: 'p', to: 'client', send: 90, arrive: 100, label: 'append failed', color: C.error },
    { from: 'client', to: 'a', send: 104, arrive: 118, label: 'data', color: C.write },
    { from: 'a', to: 'p', send: 110, arrive: 124, label: 'data', color: C.write },
    { from: 'p', to: 'b', send: 116, arrive: 130, label: 'data', color: C.write },
    { from: 'client', to: 'p', send: 132, arrive: 142, label: 'append again', color: C.request },
    { from: 'p', to: 'a', send: 146, arrive: 156, label: 'at offset 1', color: C.leader },
    { from: 'p', to: 'b', send: 146, arrive: 156, label: 'at offset 1', color: C.leader },
    { from: 'a', to: 'p', send: 158, arrive: 168, label: 'ok', color: C.answer },
    { from: 'b', to: 'p', send: 158, arrive: 168, label: 'ok', color: C.answer },
    { from: 'p', to: 'client', send: 170, arrive: 180, label: 'done, offset 1', color: C.answer },
  );
  marks.push(
    { lane: 'b', at: 77, text: 'gap', color: C.error },
    { lane: 'p', at: 144, text: '@1, twice', color: C.data },
    { lane: 'a', at: 157, text: '@1, twice', color: C.data },
    { lane: 'b', at: 157, text: '@1', color: C.data },
  );
  return { messages: m, marks, end: 180, copiesOf: { a: 2, p: 2, b: 1 } };
}

// ---- The figures ---------------------------------------------------------------

const W = 440;

export const FIGS = {
  'chunks-fault': figure(['safe'], (ctx, t) => {
    const f = frame(W, 262, 3);
    const g = svg('g');
    f.svg.append(g);
    let rackAware = false;
    let priority = true;
    let c = new Cluster({ rackAware, priority });
    let rackFailed = false;
    let clock = 0;
    let oneSince: number | null = null;
    let exposed = 0;
    const colW = 135;
    const mx = (m: number) => 10 + c.rackOf(m) * (colW + 5);
    const my = (m: number) => 36 + (m % c.o.perRack) * 56;
    const paint = () => {
      const parts: SVGElement[] = [];
      for (let r = 0; r < c.o.racks; r++) {
        const head = small(10 + r * (colW + 5) + colW / 2, 18, `Rack ${r + 1}  (tap to fail)`, { anchor: 'middle', bold: true });
        head.setAttribute('style', 'cursor:pointer');
        head.addEventListener('click', () => {
          c.failRack(r);
          rackFailed = true;
          paint();
        });
        parts.push(head, line(10 + r * (colW + 5), 26, 10 + r * (colW + 5) + colW, 26, COL.grid, 1));
      }
      const held: number[][] = c.up.map(() => []);
      c.where.forEach((ms, ch) => ms.forEach((m) => held[m].push(ch)));
      for (let m = 0; m < c.machines; m++) {
        const x = mx(m);
        const y = my(m);
        const box = svg('rect', { x, y, width: colW, height: 48, rx: 4, fill: COL.paper, stroke: c.up[m] ? COL.ink : COL.error, 'stroke-width': 1.2, opacity: c.up[m] ? 1 : 0.5, style: 'cursor:pointer' });
        box.addEventListener('click', () => {
          c.setUp([m], !c.up[m]);
          paint();
        });
        parts.push(box);
        if (!c.up[m]) {
          parts.push(line(x, y, x + colW, y + 48, COL.error, 2), line(x + colW, y, x, y + 48, COL.error, 2));
          continue;
        }
        held[m].forEach((ch, k) => {
          const n = c.where[ch].length;
          // Copies are counted in shades of ink, light to dark as a chunk loses them, and red at the last one.
          const col = n >= c.o.copies ? COL.soft : n === 2 ? COL.ink : COL.error;
          parts.push(svg('rect', { x: x + 4 + (k % 17) * 7.5, y: y + 4 + Math.floor(k / 17) * 7.5, width: 6, height: 6, fill: col, opacity: n >= c.o.copies ? 0.45 : 1, 'pointer-events': 'none' }));
        });
      }
      redraw(g, ...parts);
      const k = c.counts();
      f.readout.textContent = `${k.full} chunks with three copies, ${k.two} with two, ${k.one} with one, ${k.lost} lost. ${c.queue.length ? `Making copies: ${c.copiesMade} so far.` : c.copiesMade ? `Repairs done: ${c.copiesMade} copies made.` : 'Tap a machine or a rack to fail it.'}${exposed > 0 ? ` Chunks sat on one copy for ${exposed.toFixed(1)} s.` : ''}`;
      if (rackFailed && rackAware && k.lost === 0 && !c.queue.length && t.goal === 'safe') t.done();
    };
    // Repairs run at about 25 copies a second on screen.
    animate(f.svg, ctx, (dt) => {
      clock += dt;
      if (!c.queue.length) return;
      const k = c.counts();
      if (k.one > 0) {
        oneSince ??= clock;
        exposed = clock - oneSince;
      } else oneSince = null;
      let n = Math.max(1, Math.round(dt * 25));
      while (n-- > 0 && c.repairOne());
      paint();
    });
    const reset = () => {
      c = new Cluster({ rackAware, priority });
      rackFailed = false;
      exposed = 0;
      oneSince = null;
      paint();
    };
    const tg = toggles(['Rack-aware placement', 'Most endangered first'], [rackAware, priority], ([a, p]) => {
      rackAware = a;
      priority = p;
      reset();
    });
    const again = button('Start again', reset);
    tg.node.append(again);
    f.controls.append(tg.node);
    paint();
    return f.node;
  }),

  'chunks-seq': figure(['retry'], (ctx, t) => {
    const f = frame(W, 340, 3);
    const lanes = [
      { id: 'client', label: 'Client' },
      { id: 'master', label: 'Master' },
      { id: 'a', label: 'Second. A' },
      { id: 'p', label: 'Primary' },
      { id: 'b', label: 'Second. B' },
    ];
    const T = 190;
    const view = sequenceView(f.svg, { x: 0, y: 4, w: W, h: 332, lanes, tMax: T, colors: SEQUENCE });
    let fail = false;
    let run = recordAppend(fail);
    let now = T;
    const paint = () => {
      view.draw(run.messages, run.marks, now);
      f.readout.textContent = now < 24
        ? 'The client asks the master which replica holds the lease for this chunk. The master answers once; the client remembers.'
        : now < 52
          ? 'The data flows along a chain of chunkservers, each passing it on as it arrives, so every link is used once.'
          : now < 90
            ? 'The primary, holder of the lease, picks where in the chunk the record goes and tells both secondaries to apply it there.'
            : !fail
              ? 'All three applied the record at the same offset. The client is told where it is.'
              : now < run.end
                ? 'B failed to apply it, so the client is told the append failed, and it tries again with the same record.'
                : 'The retry succeeds at offset 1. A and the primary hold the record twice; B has a gap and one copy. Readers must skip both.';
      if (fail && now >= run.end && t.goal === 'retry') t.done();
    };
    const ts = slider('Time', 0, T, 1, T, (v) => `${Math.round(v)} ms`, (v) => { now = v; paint(); }, 'clock');
    const play = player(ts, ctx, { seconds: 10 });
    const m = named(pick(['All apply it', 'B fails to apply it'], 0, (i) => {
      fail = i === 1;
      run = recordAppend(fail);
      ts.set(0);
      play.play();
    }), 'This time:');
    f.controls.append(play.node, ts.node, m.node);
    paint();
    return f.node;
  }),

  'chunks-cost': () => {
    const s = still(W, 220);
    const rows = [scheme(1, 2, true), scheme(6, 3), scheme(10, 4)];
    const p: SVGElement[] = [];
    const cols = [
      { x: 128, title: 'Bytes stored per byte', key: 'overhead' as const, max: 3, color: COL.cost, fmt: (v: number) => `${Number(v.toFixed(2))}×` },
      { x: 245, title: 'Losses survived', key: 'survives' as const, max: 4, color: COL.ink, fmt: (v: number) => `${v}` },
      { x: 345, title: 'Reads to rebuild one', key: 'repairReads' as const, max: 10, color: COL.busy, fmt: (v: number) => `${v}` },
    ];
    for (const c of cols) p.push(small(c.x, 20, c.title, { bold: true }));
    rows.forEach((r, i) => {
      const y = 44 + i * 44;
      p.push(small(10, y + 12, r.name, { bold: true }));
      for (const c of cols) {
        const w = (r[c.key] / c.max) * 70;
        p.push(svg('rect', { x: c.x, y: y + 2, width: w, height: 14, rx: 2, fill: c.color, opacity: 0.85 }), small(c.x + w + 4, y + 13, c.fmt(r[c.key]), { fill: c.color, bold: true }));
      }
      p.push(line(10, y + 30, W - 10, y + 30, COL.grid, 1));
    });
    p.push(
      small(10, 186, '6+3: six blocks of data and three of parity, any six of the nine rebuild the rest.', { soft: true }),
      small(10, 204, 'Copies cost twice the space; codes cost reads and network when a block is lost.', { soft: true }),
    );
    s.svg.append(...p);
    return { node: s.node };
  },
};

