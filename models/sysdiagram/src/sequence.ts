// A message timeline: one lane per node, time running down the page, and
// each message an arrow from its sender's lane at the time it left to its
// receiver's lane at the time it arrived. A message lost on the way stops
// half way with a cross. Marks note what a node did at a moment (became
// leader, wrote to disk, committed). Draw it up to a moment `now` to play a
// protocol out step by step (Lamport clocks, two-phase commit, Paxos, Raft,
// a quorum read). The course works out the messages; this only draws them.

import { svg } from 'didactics/dom';
import { text } from './view';

export interface Lane {
  id: string;
  label: string;
  /** Drawn faded from this time on: the node has failed. */
  downFrom?: number;
  downTo?: number;
}

export interface Message {
  from: string;
  to: string;
  send: number;
  arrive: number;
  label?: string;
  /** A colour from the course's palette; default ink. */
  color?: string;
  /** Lost on the way: drawn to its middle, then a cross. */
  lost?: boolean;
}

export interface Mark {
  lane: string;
  at: number;
  text: string;
  color?: string;
}

export interface SequenceColors {
  ink: string;
  soft: string;
  error: string;
  paper: string;
}

export interface SequenceOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  lanes: Lane[];
  /** The time at the bottom of the drawing; the top is 0. */
  tMax: number;
  colors: SequenceColors;
  /** Room at the top for lane names. Default 22. */
  head?: number;
}

export interface SequenceView {
  node: SVGGElement;
  /** Redraw showing what has happened by `now`. */
  draw: (messages: readonly Message[], marks: readonly Mark[], now: number) => void;
  laneX: (id: string) => number;
  timeY: (t: number) => number;
}

/** Where a message is at time `now`: the fraction of its way it has gone (0 before it leaves, 1 once arrived; a lost one stops at a half). */
export function progress(m: Message, now: number): number {
  if (now <= m.send) return 0;
  const f = m.arrive > m.send ? (now - m.send) / (m.arrive - m.send) : 1;
  return Math.min(m.lost ? 0.5 : 1, f);
}

export function sequenceView(into: SVGElement, o: SequenceOptions): SequenceView {
  const head = o.head ?? 22;
  const C = o.colors;
  const node = svg('g', { class: 'sequence' }) as SVGGElement;
  into.append(node);
  const n = o.lanes.length;
  const laneX = (id: string) => {
    const i = o.lanes.findIndex((l) => l.id === id);
    return o.x + ((i + 0.5) * o.w) / n;
  };
  const timeY = (t: number) => o.y + head + (Math.max(0, Math.min(t, o.tMax)) / o.tMax) * (o.h - head - 4);
  const lanesG = svg('g', {});
  for (const l of o.lanes) {
    const x = laneX(l.id);
    lanesG.append(text(x, o.y + 13, l.label, { anchor: 'middle', fill: C.ink, size: 11.5, bold: true }));
    lanesG.append(svg('line', { x1: x, y1: o.y + head, x2: x, y2: o.y + o.h, stroke: C.soft, 'stroke-width': 1.2 }));
    if (l.downFrom !== undefined) {
      const y1 = timeY(l.downFrom);
      const y2 = timeY(l.downTo ?? o.tMax);
      lanesG.append(svg('rect', { x: x - 5, y: y1, width: 10, height: Math.max(0, y2 - y1), fill: C.error, opacity: 0.25 }));
    }
  }
  const live = svg('g', {});
  node.append(lanesG, live);

  function draw(messages: readonly Message[], marks: readonly Mark[], now: number) {
    while (live.firstChild) live.firstChild.remove();
    live.append(svg('line', { x1: o.x, y1: timeY(now), x2: o.x + o.w, y2: timeY(now), stroke: C.soft, 'stroke-width': 0.8, 'stroke-dasharray': '2 3' }));
    for (const m of messages) {
      const f = progress(m, now);
      if (f <= 0) continue;
      const x0 = laneX(m.from);
      const y0 = timeY(m.send);
      const x1 = laneX(m.to);
      const y1 = timeY(m.arrive);
      const x = x0 + (x1 - x0) * f;
      const y = y0 + (y1 - y0) * f;
      const col = m.color ?? C.ink;
      live.append(svg('line', { x1: x0, y1: y0, x2: x, y2: y, stroke: col, 'stroke-width': 1.6 }));
      if (f >= 1) {
        const a = Math.atan2(y1 - y0, x1 - x0);
        const k = 6;
        live.append(svg('path', { d: `M${x1},${y1} L${x1 - k * Math.cos(a - 0.45)},${y1 - k * Math.sin(a - 0.45)} L${x1 - k * Math.cos(a + 0.45)},${y1 - k * Math.sin(a + 0.45)} Z`, fill: col }));
      } else if (m.lost && f >= 0.5) {
        const k = 4;
        live.append(svg('path', { d: `M${x - k},${y - k} L${x + k},${y + k} M${x + k},${y - k} L${x - k},${y + k}`, stroke: C.error, 'stroke-width': 2 }));
      }
      if (m.label && f > 0.3) {
        const mx = (x0 + x) / 2;
        const my = (y0 + y) / 2;
        live.append(text(mx, my - 3, m.label, { anchor: 'middle', fill: col, size: 9.5 }));
      }
    }
    for (const k of marks) {
      if (k.at > now) continue;
      const x = laneX(k.lane);
      const y = timeY(k.at);
      live.append(svg('circle', { cx: x, cy: y, r: 3.5, fill: k.color ?? C.ink }));
      live.append(text(x + 6, y + 3, k.text, { fill: k.color ?? C.ink, size: 9.5 }));
    }
  }

  return { node, draw, laneX, timeY };
}
