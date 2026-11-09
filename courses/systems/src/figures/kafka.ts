// Lesson 16, kafka: a partitioned log with a consumer group (kill a consumer,
// its partitions move and are read again from the last committed offset; a
// new reader replays from the start), and a still of a partition on disk.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { animate, button, COL, figure, frame, slider, type FigureContext, type Task } from './kit';

// ---------------------------------------------------------------------------
// The model: partitions are counts of messages appended (the next offset);
// each group keeps, per partition, where it has read to and what it has
// committed. A group's partitions are dealt round robin over its live
// consumers; a consumer that dies is noticed after a session timeout, and its
// partitions restart from their last committed offsets.

export interface Consumer {
  id: string;
  up: boolean;
}

export interface Group {
  name: string;
  consumers: Consumer[];
  /** Messages a second each consumer can handle. */
  speed: number;
  /** Per partition: its consumer, the next offset to read, the last offset committed. */
  owner: (string | null)[];
  pos: number[];
  committed: number[];
  /** Messages read a second time after a rebalance. */
  reread: number;
  /** When a dead consumer will be noticed, ms. */
  noticeAt: number | null;
  rebalances: number;
}

export interface LogOptions {
  partitions?: number;
  /** Messages a second the producers append, over all partitions. */
  produce?: number;
  /** Messages already in each partition at the start. */
  history?: number;
  consumers?: number;
  speed?: number;
  /** How often a consumer commits its offsets, ms. */
  commitMs?: number;
  /** How long before a silent consumer is declared dead, ms. */
  sessionMs?: number;
}

export class LogSim {
  readonly P: number;
  produce: number;
  /** Next offset in each partition: how many messages it holds. */
  end: number[];
  groups: Group[] = [];
  t = 0;
  private acc = 0;
  private key = 0;
  private sinceCommit = 0;
  readonly commitMs: number;
  readonly sessionMs: number;

  constructor(o: LogOptions = {}) {
    this.P = o.partitions ?? 6;
    this.produce = o.produce ?? 60;
    this.end = Array.from({ length: this.P }, () => o.history ?? 300);
    this.commitMs = o.commitMs ?? 1000;
    this.sessionMs = o.sessionMs ?? 2000;
    const n = o.consumers ?? 3;
    this.addGroup('billing', n, o.speed ?? 25, 'end');
  }

  addGroup(name: string, n: number, speed: number, from: 'start' | 'end'): Group {
    const g: Group = {
      name,
      consumers: Array.from({ length: n }, (_, i) => ({ id: `${name}-${i + 1}`, up: true })),
      speed,
      owner: Array(this.P).fill(null),
      pos: from === 'end' ? this.end.slice() : Array(this.P).fill(0),
      committed: from === 'end' ? this.end.slice() : Array(this.P).fill(0),
      reread: 0,
      noticeAt: null,
      rebalances: 0,
    };
    this.groups.push(g);
    this.assign(g, false);
    return g;
  }

  /** Deal the partitions over the live consumers. Moved partitions start again from their committed offsets. */
  private assign(g: Group, rewind: boolean) {
    const live = g.consumers.filter((c) => c.up);
    for (let p = 0; p < this.P; p++) {
      const next = live.length ? live[p % live.length].id : null;
      if (next !== g.owner[p]) {
        if (rewind && g.owner[p] !== null) {
          const was = g.consumers.find((c) => c.id === g.owner[p]);
          if (was && !was.up) {
            g.reread += Math.floor(g.pos[p]) - g.committed[p];
            g.pos[p] = g.committed[p];
          }
        }
        g.owner[p] = next;
      }
    }
  }

  /** Stop or restart a consumer. A clean restart commits first, so nothing is read twice. */
  setUp(g: Group, id: string, up: boolean) {
    const c = g.consumers.find((x) => x.id === id);
    if (!c || c.up === up) return;
    c.up = up;
    if (!up) g.noticeAt = this.t + this.sessionMs;
    else {
      if (g.consumers.every((x) => x.up)) g.noticeAt = null;
      this.commit(g);
      this.assign(g, true);
      g.rebalances++;
    }
  }

  private commit(g: Group) {
    for (let p = 0; p < this.P; p++) {
      const c = g.consumers.find((x) => x.id === g.owner[p]);
      if (c?.up) g.committed[p] = Math.floor(g.pos[p]);
    }
  }

  /** Messages a group still has to read. */
  lag(g: Group = this.groups[0]): number {
    return this.end.reduce((s, e, p) => s + e - Math.floor(g.pos[p]), 0);
  }

  /** Partitions each consumer holds. */
  holds(g: Group, id: string): number[] {
    return g.owner.flatMap((o, p) => (o === id ? [p] : []));
  }

  step(ms: number) {
    // Producers: each message goes to the partition its key hashes to.
    this.acc += (this.produce * ms) / 1000;
    while (this.acc >= 1) {
      this.acc -= 1;
      const k = this.key++;
      this.end[((Math.imul(k + 1, 2654435761) >>> 0) >>> 8) % this.P]++;
    }
    for (const g of this.groups) {
      for (const c of g.consumers) {
        if (!c.up) continue;
        const mine = this.holds(g, c.id).filter((p) => g.pos[p] < this.end[p]);
        if (!mine.length) continue;
        const each = (g.speed * ms) / 1000 / mine.length;
        for (const p of mine) g.pos[p] = Math.min(this.end[p], g.pos[p] + each);
      }
      if (g.noticeAt !== null && this.t + ms >= g.noticeAt) {
        g.noticeAt = null;
        this.assign(g, true);
        g.rebalances++;
      }
    }
    this.t += ms;
    this.sinceCommit += ms;
    if (this.sinceCommit >= this.commitMs) {
      this.sinceCommit = 0;
      for (const g of this.groups) this.commit(g);
    }
  }
}

/** The plain words for a group's state. */
export function groupText(sim: LogSim, g: Group): string {
  const live = g.consumers.filter((c) => c.up).length;
  const lag = sim.lag(g);
  const most = Math.max(0, ...g.consumers.filter((c) => c.up).map((c) => sim.holds(g, c.id).length));
  const need = (sim.produce / sim.P) * most;
  const keep = need <= g.speed ? 'keeps up' : `falls behind: a consumer with ${most} partitions gets ${Math.round(need)} a second`;
  const re = g.reread ? ` ${g.reread} messages read a second time after rebalancing.` : '';
  const wait = g.noticeAt !== null ? ' A consumer has gone silent; the group will notice when its session times out.' : '';
  return `${g.name}: ${live} consumer${live === 1 ? '' : 's'} at ${g.speed} a second ${keep}; lag ${lag} message${lag === 1 ? '' : 's'}.${wait}${re}`;
}

const CELLS = 22;
const CW = 13.5;

function logFigure(ctx: FigureContext, t: Task) {
  const W = 560;
  const H = 340;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  const sim = new LogSim();
  const billing = sim.groups[0];
  let replay: ReturnType<LogSim['addGroup']> | null = null;
  let wasBehind = false;
  const X0 = 128;
  const rowY = (p: number) => 62 + p * 42;
  const consumerY = (i: number) => 80 + i * 80;
  const boxes: { id: string; el: SVGElement }[] = [];
  const cx = 470;
  const consumerBoxes = svg('g');
  billing.consumers.forEach((c, i) => {
    const b = svg('g', { style: 'cursor:pointer', role: 'button', 'aria-label': `Consumer ${i + 1}: tap to stop or restart` });
    b.addEventListener('click', () => {
      sim.setUp(billing, c.id, !c.up);
    });
    boxes.push({ id: c.id, el: b });
    consumerBoxes.append(b);
  });
  const paint = () => {
    const parts: SVGElement[] = [];
    parts.push(small(10, 16, `Producers write ${sim.produce} messages a second, each to the partition its key hashes to`, { fill: COL.soft }));
    parts.push(svg('rect', { x: 8, y: 150, width: 74, height: 46, rx: 4, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }));
    parts.push(small(45, 170, 'Producers', { anchor: 'middle' }), small(45, 184, '(web servers)', { anchor: 'middle', soft: true }));
    parts.push(small(X0 + (CELLS * CW) / 2, 40, 'Topic "clicks": six partitions, newest offsets at the right', { anchor: 'middle', fill: COL.data }));
    const phase = (sim.t / 1000) % 1;
    for (let p = 0; p < sim.P; p++) {
      const y = rowY(p);
      const end = sim.end[p];
      const first = end - CELLS;
      parts.push(line(84, 173, X0 - 4, y + 9, COL.grid, 1));
      const fw = (phase + p * 0.27) % 1;
      parts.push(svg('circle', { cx: 84 + (X0 - 88) * fw, cy: 173 + (y + 9 - 173) * fw, r: 2.6, fill: COL.write }));
      parts.push(small(X0 - 8, y + 2, `P${p}`, { anchor: 'end', bold: true }));
      for (let i = 0; i < CELLS; i++) {
        const off = first + i;
        const fresh = end - off <= 2;
        parts.push(svg('rect', { x: X0 + i * CW, y, width: CW - 1.5, height: 18, fill: fresh ? COL.write : COL.data, opacity: fresh ? 0.85 : 0.22 }));
      }
      parts.push(small(X0 + CELLS * CW + 3, y + 13, String(end), { fill: COL.soft }));
      // The billing group's position and its last commit.
      const at = (off: number) => X0 + (Math.max(first, Math.min(end, off)) - first) * CW;
      const pos = Math.floor(billing.pos[p]);
      const com = billing.committed[p];
      if (com >= first) parts.push(line(at(com), y - 2, at(com), y + 20, COL.clock, 2));
      parts.push(svg('path', { d: `M${at(pos)},${y + 20} l-4,7 h8 z`, fill: COL.request }));
      if (pos < first) parts.push(small(X0 - 8, y + 14, `${end - pos} behind`, { anchor: 'end', fill: COL.error, halo: COL.paper }));
      if (replay) {
        const rp = Math.floor(replay.pos[p]);
        parts.push(svg('circle', { cx: at(rp), cy: y - 5, r: 3.5, fill: COL.paper, stroke: COL.request, 'stroke-width': 1.8 }));
        if (rp < first) parts.push(small(X0 + 8, y - 7, `◂ new reader at offset ${rp}`, { fill: COL.request }));
      }
      // Reads flowing to this partition's consumer.
      const owner = billing.owner[p];
      const ci = billing.consumers.findIndex((c) => c.id === owner);
      if (ci >= 0) {
        const up = billing.consumers[ci].up;
        const y2 = consumerY(ci) + 17;
        parts.push(line(X0 + CELLS * CW + 26, y + 9, cx - 2, y2, up ? COL.grid : COL.error, 1, up ? {} : { 'stroke-dasharray': '3 3' }));
        if (up && billing.pos[p] < sim.end[p]) {
          const fr = (phase * 1.3 + p * 0.31) % 1;
          parts.push(svg('circle', { cx: X0 + CELLS * CW + 26 + (cx - 2 - X0 - CELLS * CW - 26) * fr, cy: y + 9 + (y2 - y - 9) * fr, r: 2.6, fill: COL.request }));
        }
      }
    }
    parts.push(...[
      svg('path', { d: `M${X0},${H - 14} l-4,7 h8 z`, fill: COL.request }), small(X0 + 8, H - 7, 'billing group reads here'),
      line(X0 + 150, H - 18, X0 + 150, H - 6, COL.clock, 2), small(X0 + 156, H - 7, 'last committed offset'),
    ]);
    if (replay) parts.push(svg('circle', { cx: X0 + 290, cy: H - 10, r: 3.5, fill: COL.paper, stroke: COL.request, 'stroke-width': 1.8 }), small(X0 + 298, H - 7, 'new reader'));
    parts.push(small(cx + 40, 36, 'Billing group', { anchor: 'middle', fill: COL.soft }), small(cx + 40, 48, '(tap one to stop it)', { anchor: 'middle', fill: COL.soft }));
    redraw(g, ...parts);
    billing.consumers.forEach((c, i) => {
      const held = sim.holds(billing, c.id);
      const y = consumerY(i);
      redraw(boxes[i].el,
        svg('rect', { x: cx, y, width: 80, height: 34, rx: 4, fill: COL.paper, stroke: c.up ? COL.ink : COL.error, 'stroke-width': 1.5, opacity: c.up ? 1 : 0.6 }),
        small(cx + 40, y + 14, `Consumer ${i + 1}`, { anchor: 'middle' }),
        small(cx + 40, y + 27, c.up ? (held.length ? held.map((p) => `P${p}`).join(', ') : 'idle') : 'stopped', { anchor: 'middle', fill: c.up ? COL.soft : COL.error }),
        ...(c.up ? [] : [line(cx, y, cx + 80, y + 34, COL.error, 2), line(cx + 80, y, cx, y + 34, COL.error, 2)]),
      );
    });
    const lag = sim.lag(billing);
    let text = groupText(sim, billing);
    if (replay) text += ` New reader: ${sim.lag(replay) > 20 ? `replaying history, ${sim.lag(replay)} messages to go` : 'caught up with the producers'}.`;
    f.readout.textContent = text;
    if (lag > 20) wasBehind = true;
    if (t.goal === 'rebalance' && billing.rebalances > 0 && wasBehind && lag <= 8) t.done();
  };
  g.after(consumerBoxes);
  const speed = slider('Each consumer handles', 5, 40, 1, billing.speed, (v) => `${v} a second`, (v) => {
    billing.speed = v;
  }, 'request');
  const produce = slider('Producers write', 10, 80, 5, sim.produce, (v) => `${v} a second`, (v) => {
    sim.produce = v;
  }, 'write');
  const add = button('Add a new reader from offset 0', () => {
    if (replay) return;
    replay = sim.addGroup('search index', 1, 200, 'start');
    add.disabled = true;
  });
  f.controls.append(speed.node, produce.node, add);
  animate(f.svg, ctx, (dt) => {
    // Several small steps a frame, so a rebalance is not skipped over.
    for (let i = 0; i < 4; i++) sim.step((dt * 1000) / 4);
    paint();
  });
  paint();
  return { node: f.node, sim, paint };
}

/** For tests: build the log figure and get at its model. */
export function logFigureForTest(ctx: FigureContext, t: Task) {
  return logFigure(ctx, t);
}

// ---------------------------------------------------------------------------
// A partition on disk: segment files named by their first offset, each with a
// sparse index from offset to byte position.

function segmentsStill() {
  const s = still(540, 268);
  const parts: SVGElement[] = [];
  parts.push(label(12, 20, 'Directory clicks-2/ (partition 2 of topic "clicks")', { bold: true, fill: COL.data }));
  const files = [
    { name: '00000000000000000000.log', note: 'offsets 0 to 1,041,203 · closed, 1 GB' },
    { name: '00000000000001041204.log', note: 'offsets 1,041,204 to 2,079,880 · closed, 1 GB' },
    { name: '00000000000002079881.log', note: 'offsets 2,079,881 on · open: appends go here' },
  ];
  files.forEach((fl, i) => {
    const y = 36 + i * 30;
    const open = i === files.length - 1;
    parts.push(svg('rect', { x: 12, y, width: 196, height: 22, rx: 3, fill: COL.paper, stroke: open ? COL.write : COL.data, 'stroke-width': open ? 2 : 1.2 }));
    parts.push(small(20, y + 15, fl.name, { attrs: { 'font-family': 'monospace' } }));
    parts.push(small(216, y + 15, fl.note, { fill: open ? COL.write : COL.soft }));
  });
  parts.push(small(12, 140, 'Inside the open segment: messages of about 1 KB, one after another, each with its offset and length', { fill: COL.soft }));
  const recs = [
    { off: 2079881, w: 70 }, { off: 2079882, w: 46 }, { off: 2079883, w: 92 }, { off: 2079884, w: 54 }, { off: 2079885, w: 64 }, { off: 2079886, w: 50 }, { off: 2079887, w: 80 },
  ];
  let x = 12;
  recs.forEach((r, i) => {
    parts.push(svg('rect', { x, y: 150, width: r.w - 2, height: 26, fill: COL.data, opacity: 0.18, stroke: COL.data, 'stroke-width': 1 }));
    parts.push(small(x + 4, 167, String(r.off).slice(-3), { attrs: { 'font-family': 'monospace' } }));
    if (i === 0 || i === 4) parts.push(line(x, 186, x, 178, COL.clock, 1.5));
    x += r.w;
  });
  parts.push(svg('path', { d: `M${x + 4},163 l10,0 l-4,-4 m4,4 l-4,4`, fill: 'none', stroke: COL.write, 'stroke-width': 1.5 }), small(x + 18, 167, 'appends', { fill: COL.write }));
  parts.push(svg('rect', { x: 12, y: 196, width: 300, height: 62, rx: 3, fill: COL.paper, stroke: COL.data, 'stroke-width': 1.2 }));
  parts.push(small(20, 212, '00000000000002079881.index: an entry every 4 KB', { fill: COL.data }));
  parts.push(small(20, 230, 'offset 2,079,881 → byte 0'), small(20, 247, 'offset 2,079,885 → byte 4,182'));
  parts.push(small(330, 212, 'To read from an offset: find the segment', { fill: COL.soft }));
  parts.push(small(330, 226, 'by its name, look up the nearest index', { fill: COL.soft }));
  parts.push(small(330, 240, 'entry below it, and scan forward.', { fill: COL.soft }));
  s.svg.append(...parts);
  return { node: s.node };
}

export const FIGS = {
  'kafka-log': figure(['rebalance'], (ctx, t) => logFigure(ctx, t).node),
  'kafka-segments': segmentsStill,
};
