// Lesson 12, A shopping cart that never says no: a consistent-hashing ring
// with virtual nodes and a key's preference list; a quorum write and read
// with N = 3 and the reader's R and W, a replica that is down, and a sloppy
// quorum with hinted handoff; and two replicas comparing Merkle trees.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { Ring, spot } from 'sysdiagram/ring';
import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { COL, figure, frame, named, player, slider, tint, toggles } from './kit';

export const NODES = 'ABCDEFGHIJ'.split('');

/** Each server's share of the circle, for `servers` servers with `vnodes` points each, without the ones in `removed`. */
export function shares(servers: number, vnodes: number, removed: readonly string[] = []): Map<string, number> {
  const ring = new Ring(NODES.slice(0, servers).filter((n) => !removed.includes(n)), vnodes);
  return ring.shares();
}

/** The busiest server's share over the average share. */
export function imbalance(servers: number, vnodes: number, removed: readonly string[] = []): number {
  const s = [...shares(servers, vnodes, removed).values()];
  return Math.max(...s) * s.length;
}

/** When `gone` leaves the ring, which servers take over its keys, and what share of its keys each takes. */
export function heirs(servers: number, vnodes: number, gone: string): Map<string, number> {
  const before = new Ring(NODES.slice(0, servers), vnodes);
  const after = new Ring(NODES.slice(0, servers).filter((n) => n !== gone), vnodes);
  const out = new Map<string, number>();
  const K = 4000;
  let mine = 0;
  for (let k = 0; k < K; k++) {
    if (before.owner(k) !== gone) continue;
    mine++;
    const h = after.owner(k);
    out.set(h, (out.get(h) ?? 0) + 1);
  }
  for (const [h, n] of out) out.set(h, n / Math.max(1, mine));
  return out;
}

const W = 420;
const RING_H = 300;
const Q_H = 400;
/** When B comes back, in the runs where it is down. */
const BACK = 420;

export interface QuorumSetup {
  R: number;
  W: number;
  bDown?: boolean;
  sloppy?: boolean;
}

export interface QuorumRun {
  lanes: Lane[];
  messages: Message[];
  marks: Mark[];
  tMax: number;
  /** When the coordinator answered the write, ms, and whether it succeeded. */
  writeDone: number;
  writeOk: boolean;
  /** The version the read returned, and whether it was older than the last acknowledged write. */
  readValue: 'v1' | 'v2';
  stale: boolean;
  /** When the read's answer reached the client. */
  readDone: number;
}

/**
 * A put of v2 and then a get of the same key, with N = 3: the key's
 * preference list is A, B, C, and D is next on the ring. A coordinates the
 * put; B and C are slow to receive it (busy, or far away). The get is
 * coordinated by D, which asks the replicas and answers with the newest of
 * the first R replies; C, the slow writer, happens to be the quickest to
 * answer D. With B down, a strict quorum can count only A and C; a sloppy
 * one writes B's copy to D with a hint and hands it to B when B is back.
 */
export function quorumRun(o: QuorumSetup): QuorumRun {
  const bDown = !!o.bDown;
  const sloppy = !!o.sloppy && bDown;
  const lanes: Lane[] = [
    { id: 'client', label: 'Client' },
    { id: 'D', label: 'D' },
    { id: 'A', label: 'A' },
    { id: 'B', label: 'B', ...(bDown ? { downFrom: 0, downTo: BACK } : {}) },
    { id: 'C', label: 'C' },
  ];
  const messages: Message[] = [];
  const marks: Mark[] = [];
  const m = (from: string, to: string, send: number, arrive: number, label: string | undefined, color: string, lost = false) => messages.push({ from, to, send, arrive, label, color, lost });
  // When each node holds v2.
  const has: Record<string, number> = { A: Infinity, B: Infinity, C: Infinity, D: Infinity };
  m('client', 'A', 0, 20, 'put v2', COL.write);
  has.A = 20;
  marks.push({ lane: 'A', at: 20, text: 'v2', color: COL.write });
  const acks: number[] = [20];
  // To B: slow; lost if B is down.
  if (!bDown) {
    m('A', 'B', 20, 140, undefined, COL.write);
    has.B = 140;
    marks.push({ lane: 'B', at: 140, text: 'v2', color: COL.write });
    m('B', 'A', 140, 180, undefined, COL.answer);
    acks.push(180);
  } else {
    m('A', 'B', 20, 140, undefined, COL.write, true);
    if (sloppy) {
      m('A', 'D', 20, 50, 'v2 for B', COL.write);
      has.D = 50;
      marks.push({ lane: 'D', at: 50, text: 'hint', color: COL.write });
      m('D', 'A', 50, 80, undefined, COL.answer);
      acks.push(80);
    }
  }
  m('A', 'C', 20, 300, undefined, COL.write);
  has.C = 300;
  marks.push({ lane: 'C', at: 300, text: 'v2', color: COL.write });
  m('C', 'A', 300, 330, undefined, COL.answer);
  acks.push(330);
  acks.sort((a, b) => a - b);
  const writeOk = acks.length >= o.W;
  const writeDone = writeOk ? acks[o.W - 1] : 360;
  m('A', 'client', writeDone, writeDone + 20, writeOk ? 'ok' : 'failed', writeOk ? COL.answer : COL.error);
  if (!writeOk) marks.push({ lane: 'A', at: writeDone, text: `only ${acks.length} copies: refused`, color: COL.error });

  // The read, coordinated by D, asked of the key's healthy replicas (and D's own hinted copy).
  const start = writeDone + 30;
  m('client', 'D', start, start + 20, 'get', COL.request);
  const r = start + 20;
  const asked: { node: string; out: number }[] = [];
  if (sloppy) asked.push({ node: 'D', out: 0 });
  asked.push({ node: 'C', out: 20 });
  if (!bDown) asked.push({ node: 'B', out: 40 });
  asked.push({ node: 'A', out: 60 });
  const replies = asked.map((a) => {
    const at = r + a.out;
    const v: 'v1' | 'v2' = has[a.node] <= at ? 'v2' : 'v1';
    if (a.node !== 'D') {
      m('D', a.node, r, at, undefined, COL.request);
      m(a.node, 'D', at, at + a.out, v, v === 'v2' ? COL.answer : COL.error);
    }
    return { node: a.node, back: at + a.out, v };
  }).sort((x, y) => x.back - y.back);
  const got = replies.slice(0, Math.min(o.R, replies.length));
  const readValue: 'v1' | 'v2' = got.some((g) => g.v === 'v2') ? 'v2' : 'v1';
  const readAt = got[got.length - 1].back;
  const readDone = readAt + 20;
  m('D', 'client', readAt, readDone, readValue, readValue === 'v2' ? COL.answer : COL.error);
  const stale = writeOk && readValue === 'v1';
  marks.push({ lane: 'client', at: readDone, text: stale ? 'stale' : `read ${readValue}`, color: stale ? COL.error : COL.answer });
  let tMax = Math.max(readDone + 20, 560);
  if (bDown) {
    marks.push({ lane: 'B', at: BACK, text: 'back', color: COL.answer });
    if (sloppy) {
      m('D', 'B', BACK + 10, BACK + 50, 'handed off', COL.write);
      marks.push({ lane: 'B', at: BACK + 50, text: 'v2', color: COL.write });
    }
    tMax = Math.max(tMax, BACK + 80);
  }
  return { lanes, messages, marks, tMax, writeDone, writeOk, readValue, stale, readDone };
}

/** Merkle trees over 8 key ranges of two replicas, which differ in range `diff`; returns the hashes, level by level, root first. */
export function merkle(diff: number): { a: string[][]; b: string[][] } {
  const h = (s: string) => {
    let x = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
    return x.toString(16).slice(0, 4).padStart(4, '0');
  };
  const build = (leaves: string[]) => {
    const levels = [leaves.map(h)];
    while (levels[0].length > 1) {
      const up: string[] = [];
      for (let i = 0; i < levels[0].length; i += 2) up.push(h(levels[0][i] + levels[0][i + 1]));
      levels.unshift(up);
    }
    return levels;
  };
  const base = Array.from({ length: 8 }, (_, i) => `range ${i}: keys and versions`);
  const other = base.map((x, i) => (i === diff ? `${x} + one newer cart` : x));
  return { a: build(base), b: build(other) };
}

export const FIGS = {
  'dynamo-ring': figure(['even'], (_ctx, t) => {
    const f = frame(W, RING_H, 3);
    const g = svg('g');
    f.svg.append(g);
    let servers = 6;
    let vnodes = 1;
    let goneC = false;
    const key = 17;
    const paint = () => {
      const all = NODES.slice(0, servers);
      const live = all.filter((n) => !(goneC && n === 'C'));
      const ring = new Ring(live, vnodes);
      const sh = ring.shares();
      const cx = 140;
      const cy = 150;
      const R = 112;
      const parts: SVGElement[] = [];
      const at = (p: number, r = R): [number, number] => [cx + r * Math.sin(p * 2 * Math.PI), cy - r * Math.cos(p * 2 * Math.PI)];
      parts.push(svg('circle', { cx, cy, r: R, fill: 'none', stroke: COL.grid, 'stroke-width': 6 }));
      // C's arcs, from the point before each of its points.
      const pts = ring.points;
      pts.forEach((p, i) => {
        const prev = i === 0 ? pts[pts.length - 1].at - 1 : pts[i - 1].at;
        if (p.node !== 'C') return;
        const a0 = prev;
        const a1 = p.at;
        const large = a1 - a0 > 0.5 ? 1 : 0;
        const [x0, y0] = at(a0);
        const [x1, y1] = at(a1);
        parts.push(svg('path', { d: `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1}`, fill: 'none', stroke: COL.data, 'stroke-width': 6 }));
      });
      for (const p of pts) {
        const [x0, y0] = at(p.at, R - 7);
        const [x1, y1] = at(p.at, R + 7);
        parts.push(line(x0, y0, x1, y1, p.node === 'C' ? COL.data : COL.ink, p.node === 'C' ? 2 : 1.2));
        if (vnodes <= 4) {
          const [lx, ly] = at(p.at, R + 17);
          parts.push(small(lx, ly + 3, p.node, { anchor: 'middle', bold: p.node === 'C', fill: p.node === 'C' ? COL.data : undefined }));
        }
      }
      // One key and its preference list: walk clockwise from the key.
      const prefs = ring.replicas(key, 3);
      const [kx, ky] = at(spot(`k${key}`), R - 22);
      const [kx2, ky2] = at(spot(`k${key}`), R);
      parts.push(line(kx, ky, kx2, ky2, COL.request, 1.5), svg('circle', { cx: kx2, cy: ky2, r: 4, fill: COL.request }), small(kx, ky + (ky < cy ? 10 : -4), 'key 17', { anchor: 'middle', fill: COL.request, bold: true }));
      redraw(g, ...parts);
      // Bars: each server's share.
      const bx = 280;
      const parts2: SVGElement[] = [small(bx, 22, 'Share of keys', { soft: true })];
      const mean = 1 / live.length;
      all.forEach((n, i) => {
        const y = 32 + i * 24;
        const s = sh.get(n) ?? 0;
        const wpx = Math.min(120, s * 240);
        parts2.push(small(bx, y + 11, n, { bold: n === 'C', fill: n === 'C' ? COL.data : undefined }));
        if (goneC && n === 'C') parts2.push(small(bx + 12, y + 11, 'taken out', { fill: COL.error }));
        else parts2.push(svg('rect', { x: bx + 12, y: y + 2, width: wpx, height: 12, rx: 2, fill: s > mean * 1.3 ? COL.busy : tint(COL.busy, 0.45) }));
      });
      parts2.push(line(bx + 12 + mean * 240, 28, bx + 12 + mean * 240, 32 + all.length * 24, COL.soft, 1, { 'stroke-dasharray': '3 3' }), small(bx + 12 + mean * 240, 40 + all.length * 24, 'fair share', { anchor: 'middle', soft: true }));
      parts2.push(small(bx, 268, `Key 17 is stored on`, { soft: true }), label(bx, 284, prefs.join(', '), { bold: true, fill: COL.request }));
      for (const p of parts2) g.append(p);
      const ratio = Math.max(...live.map((n) => sh.get(n) ?? 0)) * live.length;
      let text = `${live.length} servers, ${vnodes} point${vnodes === 1 ? '' : 's'} each: the busiest holds ${ratio.toFixed(2)} times its fair share.`;
      if (goneC) {
        const hs = heirs(servers, vnodes, 'C');
        text += ` C's keys went to ${hs.size} server${hs.size === 1 ? '' : 's'}.`;
      } else text += ' The arcs C owns are drawn thick.';
      f.readout.textContent = text;
      if (t.goal === 'even' && ratio <= 1.3 && live.length >= 5) t.done();
    };
    const s1 = slider('Servers', 4, 10, 1, servers, (v) => `${v}`, (v) => { servers = v; paint(); }, 'data');
    const s2 = slider('Points per server', { steps: [1, 2, 4, 8, 16, 32, 64, 128], value: vnodes, show: (v) => `${v}`, onInput: (v) => { vnodes = v; paint(); }, color: 'data' });
    const chips = named(toggles(['Take out C'], [false], (on) => { goneC = on[0]; paint(); }), 'Failure:');
    f.controls.append(chips.node, s1.node, s2.node);
    paint();
    return f.node;
  }),

  'dynamo-quorum': figure(['quorum'], (ctx, t) => {
    const f = frame(W, Q_H, 3);
    const g = svg('g');
    f.svg.append(g);
    let set: QuorumSetup = { R: 1, W: 2, bDown: false, sloppy: false };
    let run = quorumRun(set);
    let now = 0;
    let sawStale = false;
    let view = sequenceView(g, { x: 0, y: 0, w: W, h: Q_H, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
    const rebuild = () => {
      run = quorumRun(set);
      g.replaceChildren();
      view = sequenceView(g, { x: 0, y: 0, w: W, h: Q_H, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
      time.input.max = String(run.tMax);
      show();
    };
    const show = () => {
      view.draw(run.messages, run.marks, now);
      const sum = set.R + set.W;
      const rule = `N = 3, R = ${set.R}, W = ${set.W}: R + W = ${sum}, ${sum > 3 ? 'more than N, so every read set meets every write set' : 'not more than N, so a read can miss every replica the write reached'}.`;
      let what = '';
      if (now >= run.readDone) what = !run.writeOk ? ' The write was refused: not enough replicas were up.' : run.stale ? ' This read returned v1 after v2 was acknowledged: a stale read.' : ' This read returned v2.';
      else if (now >= run.writeDone + 20) what = run.writeOk ? ` The write was acknowledged at ${run.writeDone} ms.` : ' The write was refused.';
      f.readout.textContent = rule + what;
      if (now >= run.readDone && run.stale) sawStale = true;
      if (t.goal === 'quorum' && sawStale && now >= run.readDone && sum > 3 && run.writeOk && !run.stale) t.done();
    };
    const time = slider('Time', 0, 560, 2, 0, (v) => `${Math.round(v)} ms`, (v) => { now = v; show(); }, 'clock');
    const r = slider('R, replies a read waits for', 1, 3, 1, set.R, (v) => `${v}`, (v) => { set = { ...set, R: v }; rebuild(); }, 'request');
    const w = slider('W, acks a write waits for', 1, 3, 1, set.W, (v) => `${v}`, (v) => { set = { ...set, W: v }; rebuild(); }, 'write');
    const chips = named(toggles(['B is down', 'Sloppy quorum'], [false, false], (on) => { set = { ...set, bDown: on[0], sloppy: on[1] }; rebuild(); }), 'With:');
    f.controls.append(r.node, w.node, chips.node, player(time, ctx, { seconds: 10 }).node, time.node);
    show();
    return f.node;
  }),

  'dynamo-merkle': () => {
    const w = 420;
    const h = 240;
    const s = still(w, h);
    const { a, b } = merkle(5);
    const parts: SVGElement[] = [];
    const tree = (levels: string[][], x0: number, title: string, other: string[][]) => {
      parts.push(label(x0 + 100, 14, title, { bold: true, anchor: 'middle' }));
      levels.forEach((lv, d) => {
        const y = 30 + d * 44;
        const span = 200 / lv.length;
        lv.forEach((hsh, i) => {
          const x = x0 + span * (i + 0.5);
          const differ = other[d][i] !== hsh;
          if (d > 0) {
            const px = x0 + (200 / levels[d - 1].length) * (Math.floor(i / 2) + 0.5);
            parts.push(line(px, y - 30, x, y - 8, differ ? COL.error : COL.grid, differ ? 1.6 : 1));
          }
          const bw = Math.min(42, span - 3);
          parts.push(svg('rect', { x: x - bw / 2, y: y - 8, width: bw, height: 16, rx: 2, fill: differ ? tint(COL.error, 0.15) : COL.paper, stroke: differ ? COL.error : COL.soft }));
          parts.push(small(x, y + 4, d === 3 ? hsh.slice(0, 2) : hsh, { anchor: 'middle', fill: differ ? COL.error : COL.soft }));
        });
      });
      parts.push(small(x0 + 100, 190, 'leaves: hashes of 8 key ranges', { anchor: 'middle', soft: true }));
    };
    tree(a, 4, 'Replica A', b);
    tree(b, 216, 'Replica B', a);
    parts.push(
      small(4, 214, 'The roots differ, so compare their children, and follow the one that differs down.', { soft: true }),
      small(4, 228, 'Three levels find the one range of eight to send; a million ranges would take twenty.', { soft: true }),
    );
    redraw(s.svg, ...parts);
    return { node: s.node };
  },
};
