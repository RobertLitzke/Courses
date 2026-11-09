// Lesson 15, leases: a hot key's herd with leases off and on, the stale-set
// race, and invalidation across regions. Also the message-timeline figure
// that lessons 17, 20 and 21 use (seqFigure).

import { svg } from 'didactics/dom';
import { label, line, small, redraw } from 'didactics/draw';
import type { FigureContext } from 'didactics/figure';
import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { axes, COL, figure, frame, guessFirst, legend, pick, player, slider, toggles, type Frame, type Player, type Slider, type Task } from './kit';

// ---------------------------------------------------------------------------
// A message timeline played by a time slider, with a line of story for each
// moment. The script is worked out again whenever the reader's choices change.

export interface Script {
  lanes: Lane[];
  messages: Message[];
  marks: Mark[];
  /** The time at the bottom of the drawing. */
  tMax: number;
  /** What the readout says from each moment on (the first from 0). */
  story: { at: number; text: string }[];
}

/** The story line in force at `now`. */
export function narration(story: Script['story'], now: number): string {
  let out = story[0]?.text ?? '';
  for (const s of story) if (s.at <= now) out = s.text;
  return out;
}

export interface SeqFigure {
  f: Frame;
  time: Slider;
  play: Player;
  /** Work the script out again (after a choice changed) and redraw. */
  redo: () => void;
  now: () => number;
  script: () => Script;
}

export interface SeqOptions {
  w: number;
  h: number;
  lines?: number;
  script: () => Script;
  /** Seconds for Play to run from top to bottom. Default 12. */
  seconds?: number;
  /** Called after every redraw. */
  onTime?: (now: number, s: Script) => void;
  /** The time slider's words. Default "Time". */
  timeLabel?: string;
  unit?: string;
}

/** A message timeline with a time slider and a Play button; the readout tells the story. */
export function seqFigure(ctx: FigureContext, o: SeqOptions): SeqFigure {
  const f = frame(o.w, o.h, o.lines ?? 3);
  const layer = svg('g');
  f.svg.append(layer);
  let s = o.script();
  let now = 0;
  let view = sequenceView(layer, { x: 4, y: 2, w: o.w - 8, h: o.h - 6, lanes: s.lanes, tMax: s.tMax, colors: SEQUENCE });
  const build = () => {
    layer.replaceChildren();
    view = sequenceView(layer, { x: 4, y: 2, w: o.w - 8, h: o.h - 6, lanes: s.lanes, tMax: s.tMax, colors: SEQUENCE });
  };
  const paint = () => {
    view.draw(s.messages, s.marks, now);
    f.readout.textContent = narration(s.story, now);
    o.onTime?.(now, s);
  };
  const unit = o.unit ?? 'ms';
  const time = slider(o.timeLabel ?? 'Time', 0, s.tMax, 1, 0, (v) => `${Math.round(v)} ${unit}`, (v) => {
    now = v;
    paint();
  }, 'clock');
  const play = player(time, ctx, { seconds: o.seconds ?? 12 });
  f.controls.append(play.node, time.node);
  paint();
  return {
    f, time, play,
    redo: () => {
      s = o.script();
      build();
      paint();
    },
    now: () => now,
    script: () => s,
  };
}

/** A message from `from` to `to`, leaving at `send` and taking `ms`. */
export const msg = (from: string, to: string, send: number, ms: number, text: string, color: string = COL.ink, lost = false): Message =>
  ({ from, to, send, arrive: send + ms, label: text, color, lost });

// ---------------------------------------------------------------------------
// The herd: a hot key expires, and every web server that reads it misses at
// once. The database shares its time among the queries it holds (it runs
// `slots` at full speed; more, and each runs slower), so a big enough herd
// slows the very query that would refill the cache.

export interface HerdOptions {
  /** Reads of the key a second, over all web servers. */
  reads: number;
  /** One query's time on an idle database, ms. Default 50. */
  queryMs?: number;
  /** Queries the database runs at full speed at once. Default 100. */
  slots?: number;
  /** With leases, only one reader is sent to the database; the rest wait and read the cache again. */
  leases: boolean;
  /** How long to follow it, ms. Default 2000. */
  until?: number;
}

export interface HerdRun {
  /** Queries in the database at each millisecond. */
  inflight: number[];
  /** Queries sent to the database while the key was missing (up to `until`). */
  queries: number;
  /** When the key was back in the cache, ms; Infinity if not by `until`. */
  refilledAt: number;
  /** Most queries in the database at once. */
  peak: number;
  /** When the key would be back, ms, with readers still arriving after `until`; Infinity past two minutes. */
  eventually: number;
}

export function herd(o: HerdOptions): HerdRun {
  const q = o.queryMs ?? 50;
  const slots = o.slots ?? 100;
  const until = o.until ?? 2000;
  // Every query needs the same work, so they finish in the order sent; keep
  // them as cohorts by the database's progress when each was sent.
  const cohorts: { p0: number; n: number }[] = [];
  let k = 0;
  let P = 0;
  let acc = 0;
  let cached = false;
  let refilledAt = Infinity;
  let queries = 0;
  let peak = 0;
  let token = false;
  const inflight: number[] = [];
  const send = (n: number) => {
    if (n <= 0) return;
    cohorts.push({ p0: P, n });
    k += n;
    queries += n;
  };
  const step = (t: number, arriving: boolean) => {
    if (arriving && !cached) {
      acc += o.reads / 1000;
      const n = Math.floor(acc);
      acc -= n;
      if (o.leases) {
        if (!token) {
          token = true;
          send(1);
        }
      } else send(n);
    }
    if (k > 0) P += Math.min(1, slots / k);
    while (cohorts.length && P - cohorts[0].p0 >= q - 1e-9) {
      k -= cohorts[0].n;
      cohorts.shift();
      if (!cached) {
        cached = true;
        refilledAt = t + 1;
      }
    }
    peak = Math.max(peak, k);
  };
  for (let t = 0; t <= until; t++) {
    step(t, true);
    inflight.push(k);
  }
  // Follow on, readers still arriving, to see when the key would be back (up to two minutes).
  const queriesShown = queries;
  const peakShown = peak;
  for (let t2 = until + 1; !cached && t2 < 120_000; t2++) step(t2, true);
  const eventually = cached ? refilledAt : Infinity;
  queries = queriesShown;
  peak = peakShown;
  if (refilledAt > until) refilledAt = Infinity;
  return { inflight, queries, refilledAt, peak, eventually };
}

const sec = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toPrecision(2)} s` : `${Math.round(ms)} ms`);
const many = (n: number) => Math.round(n).toLocaleString('en-US');

/** The readout for one run. */
export function herdText(r: HerdRun, leases: boolean): string {
  if (leases) return `Leases on: one reader holds the lease and queries the database; the others wait a few ms and read the cache again. The key is back after ${sec(r.refilledAt)}, from ${r.queries} query.`;
  const back = Number.isFinite(r.refilledAt)
    ? `The key is back after ${sec(r.refilledAt)}`
    : `After 2 s the key is still missing; the first query finishes only after ${Number.isFinite(r.eventually) ? sec(r.eventually) : 'more than two minutes'}`;
  return `Leases off: every reader that misses queries the database. ${back}; ${many(r.queries)} queries for one value, up to ${many(r.peak)} at once.`;
}

function herdFigure(ctx: FigureContext, t: Task) {
  const W = 540;
  const H = 320;
  const f = frame(W, H, 4);
  const g = svg('g');
  f.svg.append(g);
  let reads = 20000;
  let leases = false;
  let now = 0;
  let runs = { off: herd({ reads, leases: false }), on: herd({ reads, leases: true }) };
  const ax = axes({
    x: 60, y: 168, w: 450, h: 112, xmin: 0, xmax: 2000, ymin: 0.5, ymax: 100000, ylog: true,
    xticks: [0, 500, 1000, 1500, 2000], yticks: [1, 10, 100, 1000, 10000, 100000],
    xfmt: (v) => (v ? `${v / 1000} s` : '0'), yfmt: (v) => (v >= 1000 ? `${v / 1000}k` : String(v)),
    xlabel: 'time since the key expired', ylabel: 'queries in the database at once', ink: COL.ink, grid: COL.grid,
  });
  const webs = [32, 58, 84, 110, 136];
  const box = (x: number, y: number, w: number, h: number, stroke: string, fill: string, dash = '') =>
    svg('rect', { x, y, width: w, height: h, rx: 4, fill, stroke, 'stroke-width': 1.5, ...(dash ? { 'stroke-dasharray': dash } : {}) });
  let open = () => false;
  const paint = () => {
    const r = leases ? runs.on : runs.off;
    const i = Math.min(r.inflight.length - 1, Math.round(now));
    const inDb = r.inflight[i];
    const missing = now < r.refilledAt;
    const parts: SVGElement[] = [];
    parts.push(small(20, 18, `Web servers: ${many(reads)} reads a second of one key`, { fill: COL.soft }));
    for (const y of webs) parts.push(box(20, y - 10, 70, 20, COL.ink, COL.paper), small(55, y + 4, 'web', { anchor: 'middle' }));
    // The cache.
    parts.push(box(235, 50, 92, 64, COL.cache, COL.paper, '5 2'), label(281, 70, 'memcache', { anchor: 'middle', fill: COL.cache }));
    parts.push(small(281, 92, missing ? 'hot key: missing' : 'hot key: held', { anchor: 'middle', fill: missing ? COL.error : COL.cache, bold: true }));
    if (leases && missing && now >= 1) parts.push(small(281, 106, 'lease given to 1', { anchor: 'middle', fill: COL.clock }));
    // The database.
    parts.push(svg('path', { d: 'M420,52 a40,7 0 0 0 80,0 a40,7 0 0 0 -80,0 v54 a40,7 0 0 0 80,0 v-54', fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.5 }));
    parts.push(label(460, 80, 'database', { anchor: 'middle' }));
    const load = Math.min(1, Math.log10(1 + inDb) / 5);
    parts.push(svg('rect', { x: 424, y: 96, width: 72 * load, height: 5, fill: COL.busy }));
    parts.push(small(460, 132, `${many(inDb)} queries at once`, { anchor: 'middle', fill: inDb > 100 ? COL.error : COL.soft }));
    // Reads to the cache, always; misses on to the database while the key is missing.
    for (const y of webs) parts.push(line(92, y, 233, 82, COL.grid, 1));
    parts.push(line(329, 82, 418, 80, COL.grid, 1));
    const phase = (now / 40) % 1;
    for (let j = 0; j < webs.length; j++) {
      const f2 = (phase + j * 0.2) % 1;
      parts.push(svg('circle', { cx: 92 + (233 - 92) * f2, cy: webs[j] + (82 - webs[j]) * f2, r: 3, fill: COL.request }));
    }
    if (missing && now > 0) {
      const dots = leases ? 1 : Math.min(9, Math.max(1, Math.round(Math.log10(1 + inDb) * 2)));
      for (let j = 0; j < dots; j++) {
        const f2 = (phase + j / dots) % 1;
        parts.push(svg('circle', { cx: 329 + 89 * f2, cy: 82 - 2 * f2, r: 3, fill: COL.request }));
      }
    }
    // The chart: both runs, this one bold.
    const series = (run: HerdRun) => run.inflight.map((v, ms) => [ms, Math.max(1, v)] as [number, number]).filter((_, ms) => ms % 5 === 0);
    parts.push(...ax.parts);
    if (!open()) {
      redraw(g, ...parts, small(285, 230, 'Lock in a guess to see the run.', { anchor: 'middle', fill: COL.soft }));
      return;
    }
    parts.push(ax.path(series(runs.off), COL.error, leases ? 1.2 : 2.4, leases ? { opacity: 0.45 } : {}));
    parts.push(ax.path(series(runs.on), COL.answer, leases ? 2.4 : 1.2, leases ? {} : { opacity: 0.45 }));
    parts.push(line(ax.X(now), 168, ax.X(now), 280, COL.clock, 1.2, { 'stroke-dasharray': '3 3' }));
    parts.push(...legend(300, 160, [{ text: 'leases off', color: COL.error }, { text: 'leases on', color: COL.answer }]));
    redraw(g, ...parts);
    f.readout.textContent = herdText(r, leases);
    if (t.goal === 'calm' && leases && now >= 1900) t.done();
  };
  const rate = slider('Reads a second', { min: 1000, max: 50000, scale: 'log', step: 100, value: reads, color: 'request', show: (v) => many(v), onInput: (v) => {
    reads = v;
    runs = { off: herd({ reads, leases: false }), on: herd({ reads, leases: true }) };
    paint();
  } });
  const time = slider('Time', 0, 2000, 5, 0, (v) => sec(v), (v) => {
    now = v;
    paint();
  }, 'clock');
  const play = player(time, ctx, { seconds: 10 });
  const mode = pick(['Leases off', 'Leases on'], 0, (i) => {
    leases = i === 1;
    paint();
  });
  f.controls.append(mode.node, play.node, time.node, rate.node);
  paint();
  open = guessFirst(t, f, {
    ask: 'The key is read 20,000 times a second; refilling it takes a 50 ms query; the database runs 100 queries at full speed. With no leases, how long is the key missing?',
    options: ['About 50 ms', 'About half a second', 'Tens of seconds'],
    answer: 2,
    sliders: [time, rate],
    hidden: [mode.node],
    after: () => paint(),
  });
  return f.node;
}

// ---------------------------------------------------------------------------
// The stale set: a reader that missed fills the cache with a value that a
// writer has since replaced. Lanes: web server A, memcache, the database,
// web server B.

export function staleSetScript(leases: boolean): Script {
  const lanes: Lane[] = [
    { id: 'A', label: 'Web server A' },
    { id: 'C', label: 'memcache' },
    { id: 'D', label: 'Database' },
    { id: 'B', label: 'Web server B' },
  ];
  const R = COL.request;
  const W = COL.write;
  const messages: Message[] = [
    msg('A', 'C', 4, 5, 'get k', R),
    msg('C', 'A', 9, 5, leases ? 'miss, lease 7' : 'miss', leases ? COL.clock : COL.soft),
    msg('A', 'D', 16, 6, 'SELECT k', R),
    msg('D', 'A', 22, 6, 'k = v1', COL.answer),
    msg('B', 'D', 34, 6, 'UPDATE k = v2', W),
    msg('D', 'B', 40, 5, 'ok', COL.answer),
    msg('B', 'C', 46, 6, 'delete k', W),
    msg('A', 'C', 66, 6, leases ? 'set k = v1, lease 7' : 'set k = v1', W),
    msg('C', 'A', 72, 5, leases ? 'refused' : 'stored', leases ? COL.error : COL.soft),
    msg('B', 'C', 88, 5, 'get k', R),
    msg('C', 'B', 93, 5, leases ? 'miss, lease 8' : 'k = v1', leases ? COL.clock : COL.error),
  ];
  const marks: Mark[] = [
    { lane: 'A', at: 30, text: 'A pauses', color: COL.soft },
  ];
  if (leases) {
    marks.push({ lane: 'C', at: 9, text: 'lease 7', color: COL.clock });
    marks.push({ lane: 'C', at: 52, text: 'lease 7 void', color: COL.clock });
    marks.push({ lane: 'C', at: 72, text: 'k empty', color: COL.answer });
  } else {
    marks.push({ lane: 'C', at: 72, text: 'k = v1: stale', color: COL.error });
  }
  const story = [
    { at: 0, text: 'Web server A reads key k from memcache, misses, and goes to the database for it.' },
    { at: 22, text: 'The database answers A with v1. Then A stalls for a moment: a garbage collection, a busy CPU, a slow network.' },
    { at: 34, text: 'Meanwhile web server B changes k to v2 in the database, then deletes k from memcache, as it should.' },
    { at: 52, text: leases ? 'The delete also voids the lease that memcache gave A on its miss.' : 'The cache is empty now, so the next reader would fetch v2.' },
    { at: 66, text: leases ? 'A wakes and sets k = v1 with lease 7. Memcache refuses: that lease was voided by the delete.' : 'A wakes and sets k = v1, the value it read before the write. Memcache takes it.' },
    {
      at: 88,
      text: leases
        ? 'The next reader misses and gets a fresh lease, so it reads v2 from the database. The stale value never got in.'
        : 'Every reader now gets v1, and goes on getting it until k is written again or expires. Nothing will correct it.',
    },
  ];
  return { lanes, messages, marks, tMax: 100, story };
}

// ---------------------------------------------------------------------------
// Two regions: a write from the replica region goes to the primary region's
// database and reaches the local replica later. Who deletes the cached key,
// and when, decides whether a stale value gets back in.

export interface RegionOptions {
  /** Deletes come from the local replica's commit log, once it has applied the write. */
  fromLog: boolean;
  /** The writer sets a remote marker, so a miss on k reads from the primary region while it stands. */
  marker: boolean;
}

/** What the user's read after their own write returns, and what the cache holds at the end. */
export function regionOutcome(o: RegionOptions): { userSees: 'v1' | 'v2'; cacheEnds: 'v1' | 'empty' } {
  return { userSees: o.marker ? 'v2' : 'v1', cacheEnds: o.marker || o.fromLog ? 'empty' : 'v1' };
}

export function regionScript(o: RegionOptions): Script {
  const lanes: Lane[] = [
    { id: 'W', label: 'Web (Europe)' },
    { id: 'C', label: 'Cache (Europe)' },
    { id: 'R', label: 'Replica (Europe)' },
    { id: 'P', label: 'Primary (US)' },
  ];
  const R = COL.request;
  const Wr = COL.write;
  const far = 40;
  const messages: Message[] = [];
  const marks: Mark[] = [];
  if (o.marker) messages.push(msg('W', 'C', 0, 6, 'set marker rk', COL.clock));
  messages.push(msg('W', 'P', 8, far, 'UPDATE k = v2', Wr));
  messages.push(msg('P', 'W', 48, far, 'committed', COL.answer));
  messages.push(msg('W', 'C', 92, 8, 'delete k', Wr));
  messages.push(msg('P', 'R', 48, 152, 'replication', COL.data));
  marks.push({ lane: 'P', at: 48, text: 'k = v2', color: Wr });
  marks.push({ lane: 'R', at: 200, text: 'k = v2', color: Wr });
  // The user reads their own write straight after.
  messages.push(msg('W', 'C', 108, 8, 'get k', R));
  if (o.marker) {
    messages.push(msg('C', 'W', 116, 8, 'miss, marker', COL.clock));
    messages.push(msg('W', 'P', 130, far, 'SELECT k', R));
    messages.push(msg('P', 'W', 170, far, 'k = v2', COL.answer));
    marks.push({ lane: 'W', at: 210, text: 'user sees v2', color: COL.answer });
  } else {
    messages.push(msg('C', 'W', 116, 8, 'miss', COL.soft));
    messages.push(msg('W', 'R', 130, 10, 'SELECT k', R));
    messages.push(msg('R', 'W', 140, 10, 'k = v1', COL.error));
    messages.push(msg('W', 'C', 166, 8, 'set k = v1', Wr));
    marks.push({ lane: 'W', at: 157, text: 'user sees v1', color: COL.error });
    marks.push({ lane: 'C', at: 174, text: 'k = v1', color: COL.error });
  }
  if (o.fromLog) {
    messages.push(msg('R', 'C', 204, 10, 'delete k (log)', Wr));
    marks.push({ lane: 'C', at: 214, text: 'k empty', color: COL.answer });
  }
  const end = regionOutcome(o);
  const story = [
    { at: 0, text: o.marker ? 'A user in Europe saves a change. The web server first sets a remote marker for k in the local cache, then sends the write to the primary database in the US.' : 'A user in Europe saves a change. The web server sends the write across the Atlantic to the primary database in the US.' },
    { at: 48, text: 'The primary commits k = v2 and starts shipping the change to the European replica, which will take a while.' },
    { at: 92, text: 'The web server deletes k from its local cache and sends the user back to the page.' },
    {
      at: 108,
      text: o.marker
        ? 'The page reads k: a miss, but the marker says k was just written here, so the read goes to the primary in the US and gets v2. Slower, and right.'
        : 'The page reads k: a miss, so the web server reads the local replica, which has not got the write yet, and gets v1. The user sees their change undone, and v1 goes back into the cache.',
    },
    {
      at: 200,
      text: o.fromLog
        ? `The replica applies the write. The daemon reading its commit log now deletes k from the cache, ${end.userSees === 'v1' ? 'clearing the stale v1' : 'so no older copy can outlive the write'}.`
        : end.cacheEnds === 'v1'
          ? 'The replica applies the write, but nothing tells the cache. It holds v1 for every reader in Europe until k expires.'
          : 'The replica applies the write. The cache stayed empty, so the next reader will fill it with v2.',
    },
  ];
  return { lanes, messages, marks, tMax: 240, story };
}

export const FIGS = {
  'leases-herd': figure(['calm'], (ctx, t) => herdFigure(ctx, t)),

  'leases-stale': figure(['fixed'], (ctx, t) => {
    let leases = false;
    const s = seqFigure(ctx, {
      w: 540, h: 300, lines: 3, seconds: 12,
      script: () => staleSetScript(leases),
      onTime: (now) => {
        if (t.goal === 'fixed' && leases && now >= 98) t.done();
      },
    });
    const mode = pick(['Leases off', 'Leases on'], 0, (i) => {
      leases = i === 1;
      s.redo();
    });
    s.f.controls.prepend(mode.node);
    return s.f.node;
  }),

  'leases-regions': figure(['fixed'], (ctx, t) => {
    const o: RegionOptions = { fromLog: false, marker: false };
    const s = seqFigure(ctx, {
      w: 540, h: 380, lines: 4, seconds: 14,
      script: () => regionScript(o),
      onTime: (now) => {
        if (t.goal === 'fixed' && o.fromLog && o.marker && now >= 220) t.done();
      },
    });
    const opts = toggles(['Deletes from the commit log', 'Remote marker'], [false, false], (on) => {
      o.fromLog = on[0];
      o.marker = on[1];
      s.redo();
    });
    s.f.controls.prepend(opts.node);
    return s.f.node;
  }),
};
