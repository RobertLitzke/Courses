// Lesson 14, Who pays for a tweet?: the work of fan-out on write, on read
// and the hybrid, with one account whose followers can be raised to the
// hundreds of millions; and a Snowflake ID generator with a sequence that
// runs out and a clock that steps back.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, named, pick, player, slider, tint, toggles } from './kit';

const W = 420;

// ---------------------------------------------------------------- the numbers

/** Krikorian, 2012, rounded: tweets written and home timelines read, a second. */
export const TWEETS = 5_000;
export const READS = 300_000;
/** Assumed round numbers for the model: followers of an average tweet's author, and accounts an average reader follows. */
export const AVG_FOLLOWERS = 200;
export const FOLLOWS = 200;
/** In the hybrid, accounts above this many followers are not fanned out; an average reader follows this many of them. */
export const BIG = 1_000_000;
export const BIG_FOLLOWED = 3;
/** How fast one tweet's fan-out inserts into timelines, a second (illustrative). */
export const FANOUT_RATE = 100_000;

export const DESIGNS = ['Fan-out on write', 'Fan-out on read', 'Hybrid'] as const;
export type Design = (typeof DESIGNS)[number];

export interface Load {
  /** Timeline inserts a second, for the ordinary flow of tweets. */
  inserts: number;
  /** Lists or indexes a timeline read must look at. */
  listsPerRead: number;
  /** Inserts plus list reads, a second. */
  total: number;
  /** Inserts for one tweet from the biggest account, and seconds until its last follower has it. */
  bigInserts: number;
  bigDelay: number;
}

export function fanoutLoad(design: Design, biggest: number): Load {
  const push = design !== 'Fan-out on read';
  const inserts = push ? TWEETS * AVG_FOLLOWERS : TWEETS;
  const listsPerRead = design === 'Fan-out on write' ? 1 : design === 'Fan-out on read' ? FOLLOWS : 1 + (biggest > BIG ? BIG_FOLLOWED : 0);
  const fanned = design === 'Fan-out on write' || (design === 'Hybrid' && biggest <= BIG);
  const bigInserts = fanned ? biggest : 0;
  return { inserts, listsPerRead, total: inserts + READS * listsPerRead, bigInserts, bigDelay: bigInserts / FANOUT_RATE };
}

const FOLLOWER_STEPS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 30_000_000, 100_000_000];

const short = (n: number) =>
  n >= 1e9 ? `${+(n / 1e9).toPrecision(2)} billion` : n >= 1e6 ? `${+(n / 1e6).toPrecision(2)} million` : n >= 1e4 ? `${Math.round(n / 1e3)},000` : n.toLocaleString('en-US');
const secs = (s: number) => (s === 0 ? 'at once' : s < 1 ? `${Math.round(s * 1000)} ms` : s < 120 ? `${+s.toPrecision(2)} s` : `${+(s / 60).toPrecision(2)} min`);

// ---------------------------------------------------------------- Snowflake

/** Twitter's epoch for Snowflake, in Unix milliseconds (4 November 2010). */
export const TWEPOCH = 1288834974657n;
export const SEQ_MAX = 4096;

export function snowflakeId(unixMs: bigint, machine: number, seq: number): bigint {
  return ((unixMs - TWEPOCH) << 22n) | (BigInt(machine) << 12n) | BigInt(seq);
}

export function snowflakeParts(id: bigint): { ms: bigint; machine: number; seq: number } {
  return { ms: (id >> 22n) + TWEPOCH, machine: Number((id >> 12n) & 1023n), seq: Number(id & 4095n) };
}

export interface Tick {
  /** The real millisecond, and what the machine's clock said. */
  real: number;
  clock: number;
  issued: number;
  /** Requests carried over to the next millisecond because the sequence ran out. */
  waiting: number;
  refused: number;
  ids: bigint[];
}

/** The base time of the run: 7 November 2012, in Unix ms. */
export const BASE_MS = 1352246400000n;
export const MACHINE = 37;
export const RUN_MS = 20;
export const STEP_AT = 10;
export const STEP_BACK = 4;

/**
 * One Snowflake generator for 20 ms, with `rate` requests arriving each
 * millisecond. It hands out at most 4,096 IDs in one millisecond and holds
 * the rest for the next. With `stepBack`, the machine's clock jumps back 4 ms
 * at 10 ms, and the generator refuses requests until its clock passes the
 * last millisecond it used.
 */
export function snowflakeRun(rate: number, stepBack: boolean): Tick[] {
  const out: Tick[] = [];
  let last = -1;
  let used = 0;
  let queue = 0;
  for (let real = 0; real < RUN_MS; real++) {
    const clock = stepBack && real >= STEP_AT ? real - STEP_BACK : real;
    let demand = queue + rate;
    const ids: bigint[] = [];
    let refused = 0;
    let issued = 0;
    if (clock < last) {
      refused = demand;
      demand = 0;
    } else {
      if (clock > last) {
        last = clock;
        used = 0;
      }
      const n = Math.min(demand, SEQ_MAX - used);
      // Keep only a few ids: the first and last are what the figure shows.
      for (let i = 0; i < n; i++) if (i < 3 || i === n - 1) ids.push(snowflakeId(BASE_MS + BigInt(clock), MACHINE, used + i));
      used += n;
      demand -= n;
      issued = n;
    }
    queue = demand;
    out.push({ real, clock, issued, waiting: queue, refused, ids });
  }
  return out;
}

// ---------------------------------------------------------------- figures

export const FIGS = {
  'fanout-cost': figure(['hybrid'], (ctx, t) => {
    void ctx;
    const H = 270;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    let design = 0;
    let biggest = 10_000;
    let guessed = false;
    const sketch = (d: Design): SVGElement[] => {
      // A tiny picture of where the work happens.
      const out: SVGElement[] = [];
      const y0 = 26;
      const box = (x: number, y: number, w: number, text: string, col: string) => {
        out.push(svg('rect', { x, y, width: w, height: 18, rx: 3, fill: tint(col, 0.15), stroke: col }), small(x + w / 2, y + 13, text, { anchor: 'middle', fill: col }));
      };
      if (d !== 'Fan-out on read') {
        box(8, y0 + 18, 56, 'tweet', COL.write);
        for (let i = 0; i < 4; i++) {
          out.push(line(64, y0 + 27, 104, y0 + 4 + i * 16, COL.write, 1));
          out.push(svg('rect', { x: 106, y: y0 - 2 + i * 16, width: 44, height: 12, rx: 2, fill: tint(COL.cache, 0.2), stroke: COL.cache }));
        }
        out.push(small(128, y0 + 72, 'timelines', { anchor: 'middle', soft: true }));
      }
      if (d !== 'Fan-out on write') {
        const x = d === 'Hybrid' ? 230 : 120;
        box(x + 104, y0 + 18, 60, 'reader', COL.request);
        const n = d === 'Hybrid' ? 2 : 4;
        for (let i = 0; i < n; i++) {
          out.push(line(x + 50, y0 + 4 + i * 16, x + 104, y0 + 27, COL.request, 1));
          out.push(svg('rect', { x, y: y0 - 2 + i * 16, width: 48, height: 12, rx: 2, fill: tint(COL.data, 0.2), stroke: COL.data }));
        }
        out.push(small(x + 24, y0 + 72, d === 'Hybrid' ? 'big accounts' : 'followed accounts', { anchor: 'middle', soft: true }));
        if (d === 'Hybrid') out.push(line(150, y0 + 4, x + 104, y0 + 27, COL.request, 1, { 'stroke-dasharray': '3 3' }));
      }
      out.push(label(8, 14, d, { bold: true }));
      return out;
    };
    const paint = () => {
      const d = DESIGNS[design];
      const L = fanoutLoad(d, biggest);
      const parts = sketch(d);
      // Log bars, 1 to 10^9.
      const bx = 150;
      const bw = 160;
      const at = (v: number) => (v <= 1 ? 0 : (Math.log10(v) / 9) * bw);
      const rows: [string, number, string, string][] = [
        ['Inserts a second', L.inserts, short(L.inserts), 'write'],
        ['Lists read per timeline', L.listsPerRead, short(L.listsPerRead), 'request'],
        ['Operations a second', L.total, short(L.total), L.total > 10_000_000 ? 'bad' : 'busy'],
        ['Biggest account\u2019s tweet', L.bigInserts, L.bigInserts ? short(L.bigInserts) : 'none', L.bigDelay > 60 ? 'bad' : 'write'],
      ];
      rows.forEach(([name, v, text, col], i) => {
        const y = 128 + i * 30;
        parts.push(small(8, y + 11, name));
        parts.push(svg('rect', { x: bx, y: y + 1, width: bw, height: 14, fill: COL.paper, stroke: COL.grid }));
        parts.push(svg('rect', { x: bx, y: y + 1, width: Math.max(1, at(v)), height: 14, fill: COL[col as keyof typeof COL] }));
        parts.push(small(bx + bw + 6, y + 11, text, { bold: true }));
      });
      parts.push(small(bx, 254, '1', { soft: true, anchor: 'middle' }), small(bx + bw / 3, 254, '1,000', { soft: true, anchor: 'middle' }), small(bx + (2 * bw) / 3, 254, '1 million', { soft: true, anchor: 'middle' }), small(bx + bw, 254, '1 billion', { soft: true, anchor: 'middle' }));
      redraw(g, ...parts);
      if (!guessed) return;
      let text = `${d}: ${short(L.total)} operations a second for 5,000 tweets and 300,000 timeline reads. `;
      text += L.bigInserts
        ? `A tweet from the account with ${short(biggest)} followers takes ${short(L.bigInserts)} inserts and reaches its last follower after ${secs(L.bigDelay)}.`
        : d === 'Fan-out on read'
          ? `Every read merges ${FOLLOWS} accounts’ tweets and waits for the slowest (lesson 9).`
          : `The account with ${short(biggest)} followers is not fanned out: each of its readers merges its tweets in when reading.`;
      f.readout.textContent = text;
      if (t.goal === 'hybrid' && d === 'Hybrid' && biggest >= 10_000_000) t.done();
    };
    const s = slider('Biggest account’s followers', { steps: FOLLOWER_STEPS, value: biggest, show: (v) => short(v), onInput: (v) => { biggest = v; paint(); }, color: 'data' });
    const chooser = named(pick(DESIGNS, 0, (i) => { design = i; paint(); }), 'Design:');
    f.controls.append(chooser.node, s.node);
    paint();
    guessFirst(t, f, {
      ask: 'At 5,000 tweets and 300,000 timeline reads a second, with about 200 followers to a tweet and 200 accounts followed by a reader, which design does less work in all?',
      options: ['Fan-out on write', 'Fan-out on read', 'About the same'],
      answer: 0,
      sliders: [s],
      buttons: chooser.buttons,
      after: () => {
        guessed = true;
        paint();
      },
    });
    return f.node;
  }),

  'fanout-snowflake': figure(['back'], (ctx, t) => {
    const H = 250;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    let rate = 1000;
    let stepBack = false;
    let now = 0;
    let run = snowflakeRun(rate, stepBack);
    const paint = () => {
      const parts: SVGElement[] = [];
      const shown = run.slice(0, Math.floor(now) + 1);
      const lastWith = [...shown].reverse().find((x) => x.ids.length);
      // The bits of the latest ID.
      const bitW = 6.2;
      const y0 = 22;
      const field = (x0: number, bits: number, col: string, title: string, value: string) => {
        parts.push(svg('rect', { x: x0, y: y0, width: bits * bitW, height: 20, fill: tint(col, 0.25), stroke: col }));
        parts.push(small(x0 + 3, y0 + 14, `${bits} bits`, { fill: col, bold: true }));
        parts.push(small(x0, y0 + 34, title, { soft: true }), small(x0, y0 + 47, value, { bold: true }));
      };
      parts.push(svg('rect', { x: 8, y: y0, width: bitW, height: 20, fill: COL.paper, stroke: COL.soft }));
      const id = lastWith ? lastWith.ids[lastWith.ids.length - 1] : null;
      const p = id ? snowflakeParts(id) : null;
      field(8 + bitW, 41, COL.clock, 'ms since 4 Nov 2010', p ? `${(p.ms - TWEPOCH).toString()}` : '');
      field(8 + bitW * 42, 10, COL.soft, 'machine', p ? `${p.machine}` : '');
      field(8 + bitW * 52, 12, COL.request, 'sequence', p ? `${p.seq}` : '');
      parts.push(label(8, 12, id ? `Latest ID: ${id.toString()}` : 'Latest ID: none yet', { bold: true }));
      // A column per real millisecond.
      const cx = 30;
      const cw = 18;
      const top = 100;
      const ch = 110;
      const max = 8000;
      const yOf = (n: number) => top + ch - (Math.min(n, max) / max) * ch;
      parts.push(line(cx - 4, yOf(SEQ_MAX), cx + RUN_MS * cw, yOf(SEQ_MAX), COL.soft, 1, { 'stroke-dasharray': '3 3' }), small(cx + RUN_MS * cw + 2, yOf(SEQ_MAX) + 4, '4,096', { soft: true }));
      for (const k of shown) {
        const x = cx + k.real * cw;
        const issued = k.issued;
        if (issued) parts.push(svg('rect', { x, y: yOf(issued), width: cw - 3, height: top + ch - yOf(issued), fill: COL.answer }));
        if (k.waiting) parts.push(svg('rect', { x, y: yOf(issued + k.waiting), width: cw - 3, height: yOf(issued) - yOf(issued + k.waiting), fill: COL.busy }));
        if (k.refused) parts.push(svg('rect', { x, y: yOf(k.refused), width: cw - 3, height: top + ch - yOf(k.refused), fill: COL.error }));
        parts.push(small(x + (cw - 3) / 2, top + ch + 12, `${k.clock}`, { anchor: 'middle', fill: k.clock !== k.real ? COL.error : undefined, soft: k.clock === k.real }));
      }
      parts.push(small(cx - 4, top + ch + 26, 'the machine’s clock, ms', { soft: true }));
      redraw(g, ...parts);
      const k = shown[shown.length - 1];
      const issued = k.issued;
      let text: string;
      if (k.refused) text = `The clock says ${k.clock} ms, earlier than ${shown.filter((x) => x.ids.length).at(-1)?.clock ?? 0} ms, the last millisecond used. An ID now could repeat or sort before an older one, so the generator refuses ${short(k.refused)} requests until its clock passes that.`;
      else if (k.waiting) text = `${short(rate)} requests a millisecond: the 12-bit sequence runs out at 4,096, so ${short(k.waiting)} requests wait for the next millisecond.`;
      else text = `Millisecond ${k.clock}: ${short(issued)} IDs, numbered 0 to ${issued - 1} in the sequence field. Every ID from a later millisecond is larger, so IDs sort by time.`;
      f.readout.textContent = text;
      if (t.goal === 'back' && stepBack && now >= STEP_AT) t.done();
    };
    const time = slider('Time', 0, RUN_MS - 1, 1, 0, (v) => `${v} ms`, (v) => { now = v; paint(); }, 'clock');
    const r = slider('Requests a millisecond', { steps: [100, 1000, 3000, 4096, 5000, 8000], value: rate, show: (v) => short(v), onInput: (v) => { rate = v; run = snowflakeRun(rate, stepBack); paint(); }, color: 'request' });
    const chips = named(toggles([`Clock steps back ${STEP_BACK} ms at ${STEP_AT} ms`], [false], (on) => { stepBack = on[0]; run = snowflakeRun(rate, stepBack); paint(); }), 'With:');
    f.controls.append(chips.node, r.node, player(time, ctx, { seconds: 8 }).node, time.node);
    paint();
    return f.node;
  }),
};
