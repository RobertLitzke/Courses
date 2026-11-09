// Lesson 20, spanner: two-phase commit, blocking when the coordinator dies,
// and the same over Paxos groups; and TrueTime's commit wait.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import type { Lane, Mark, Message } from 'sysdiagram/sequence';
import { msg, seqFigure, type Script } from './leases';
import { COL, figure, frame, guessFirst, pick, slider, toggles, type Task } from './kit';

// ---------------------------------------------------------------------------
// Two-phase commit between a coordinator and two participants (shards that
// each hold part of the transaction's data).

export interface TwoPcOptions {
  /** The coordinator's machine dies after the votes are in and before it sends the decision. */
  crash: boolean;
  /** Coordinator and participants are each a Paxos group, so a leader's death is covered by another member. */
  paxos: boolean;
}

/** When each participant releases its locks, ms; Infinity if not within the drawing. */
export function twoPcOutcome(o: TwoPcOptions): { release: number; blocked: number } {
  if (!o.crash) return { release: 40, blocked: 0 };
  if (o.paxos) return { release: 52, blocked: 52 - 40 };
  return { release: 130, blocked: 130 - 40 };
}

export function twoPcScript(o: TwoPcOptions): Script {
  const P = o.paxos;
  const lanes: Lane[] = [
    { id: 'client', label: 'Client' },
    { id: 'C', label: P ? 'Coord. leader' : 'Coordinator', ...(o.crash ? { downFrom: 31, downTo: P ? 70 : 120 } : {}) },
    ...(P ? [{ id: 'C2', label: 'Coord. group' }] : []),
    { id: 'A', label: P ? 'Shard A group' : 'Shard A' },
    { id: 'B', label: P ? 'Shard B group' : 'Shard B' },
  ];
  const R = COL.request;
  const L = COL.leader;
  const messages: Message[] = [
    msg('client', 'C', 0, 5, 'commit T', COL.write),
    msg('C', 'A', 6, 10, 'prepare', L),
    msg('C', 'B', 9, 10, 'prepare', L),
    msg('A', 'C', 18, 10, 'yes', COL.answer),
    msg('B', 'C', 21, 10, 'yes', COL.answer),
  ];
  const marks: Mark[] = [
    { lane: 'A', at: 16, text: 'lock, log', color: COL.write },
    { lane: 'B', at: 19, text: 'lock, log', color: COL.write },
  ];
  const story: Script['story'] = [
    { at: 0, text: 'A transaction moves money from an account on shard A to one on shard B. The client asks the coordinator to commit it.' },
    { at: 6, text: 'Phase one: the coordinator asks each shard to prepare. Each locks the rows, writes the change to its log, and votes yes. Having voted yes, a shard may no longer abort on its own.' },
  ];
  if (!o.crash) marks.push({ lane: 'C', at: 31, text: P ? 'commit, in Paxos log' : 'logs commit', color: L });
  if (!o.crash) {
    messages.push(msg('C', 'A', 32, 8, 'commit', L), msg('C', 'B', 32, 8, 'commit', L), msg('C', 'client', 42, 5, 'committed', COL.answer));
    marks.push({ lane: 'A', at: 40, text: 'unlocks', color: COL.answer }, { lane: 'B', at: 40, text: 'unlocks', color: COL.answer });
    story.push(
      { at: 31, text: 'Both voted yes, so the coordinator decides to commit and writes that decision down. This moment is the commit.' },
      { at: 32, text: 'Phase two: the coordinator tells each shard to commit. They apply the change and release their locks; the client hears it is done.' },
    );
  } else if (!P) {
    messages.push(
      msg('A', 'C', 60, 10, 'decision?', R, true),
      msg('B', 'C', 64, 10, 'decision?', R, true),
      msg('A', 'B', 76, 6, 'did you hear?', R),
      msg('B', 'A', 82, 6, 'no', COL.soft),
      msg('C', 'A', 122, 8, 'commit', L),
      msg('C', 'B', 122, 8, 'commit', L),
    );
    marks.push(
      { lane: 'C', at: 31, text: 'logs commit, dies', color: COL.error },
      { lane: 'A', at: 50, text: 'blocked', color: COL.error },
      { lane: 'B', at: 50, text: 'blocked', color: COL.error },
      { lane: 'C', at: 110, text: 'back, reads log', color: L },
      { lane: 'A', at: 130, text: 'unlocks', color: COL.answer },
      { lane: 'B', at: 130, text: 'unlocks', color: COL.answer },
    );
    story.push(
      { at: 31, text: 'Both voted yes, so the coordinator decides to commit and logs it. Then its machine dies, before telling anyone.' },
      { at: 50, text: 'The shards wait, holding their locks. Each voted yes, so it cannot abort: the coordinator may have decided to commit. It cannot commit either: the coordinator may have decided to abort.' },
      { at: 76, text: 'Asking each other does not help. Neither heard the decision, and the only record of it is on a dead machine. Every transaction that needs these rows waits too.' },
      { at: 120, text: 'Only when the coordinator\'s machine comes back and reads its log does the decision go out. The shards were blocked the whole time it was down: here 90 ms, in real life minutes or hours.' },
    );
  } else {
    messages.push(
      msg('C2', 'A', 42, 10, 'commit', L),
      msg('C2', 'B', 42, 10, 'commit', L),
      msg('C2', 'client', 54, 6, 'committed', COL.answer),
    );
    marks.push(
      { lane: 'C', at: 31, text: 'logged, dies', color: COL.error },
      { lane: 'C2', at: 31, text: 'has the log', color: L },
      { lane: 'C2', at: 40, text: 'new leader', color: L },
      { lane: 'A', at: 52, text: 'unlocks', color: COL.answer },
      { lane: 'B', at: 52, text: 'unlocks', color: COL.answer },
    );
    story.push(
      { at: 31, text: 'The decision to commit is written through Paxos, so a majority of the coordinator group\'s replicas hold it before it counts. Then the leader\'s machine dies.' },
      { at: 40, text: 'Its lease runs out, and another replica of the coordinator group becomes leader. It already has the decision in its copy of the log.' },
      { at: 42, text: 'The new leader sends the decision. The shards, themselves Paxos groups that no single death can stop, commit and release their locks after a short pause instead of an outage.' },
    );
  }
  story.sort((a, b) => a.at - b.at);
  return { lanes, messages, marks, tMax: o.crash && !o.paxos ? 140 : 70, story };
}

// ---------------------------------------------------------------------------
// TrueTime. Server 1's clock runs fast and server 2's slow, each by 0.9 ε.
// T1 commits on server 1 at true time 10 ms; a client sees it and 2 ms later
// starts T2 on server 2. Is T2's timestamp after T1's?

export type StampRule = 'clock' | 'tt' | 'wait';

export interface TrueTimeRun {
  /** T1's timestamp, and the true time it becomes visible. */
  s1: number;
  shown1: number;
  /** T2's start (true time) and timestamp. */
  start2: number;
  s2: number;
  /** T2's timestamp is after T1's. */
  ordered: boolean;
  /** How long T1 waited before it was shown. */
  wait: number;
}

export const T1_AT = 10;
export const GAP = 2;

export function trueTime(eps: number, rule: StampRule): TrueTimeRun {
  const skew1 = 0.9 * eps;
  const skew2 = -0.9 * eps;
  const clock1 = (t: number) => t + skew1;
  const clock2 = (t: number) => t + skew2;
  let s1: number;
  let shown1: number;
  if (rule === 'clock') {
    s1 = clock1(T1_AT);
    shown1 = T1_AT;
  } else {
    s1 = clock1(T1_AT) + eps; // TT.now().latest
    // Commit wait: until TT.now().earliest > s1, i.e. clock1(t) - eps > s1.
    shown1 = rule === 'wait' ? s1 + eps - skew1 : T1_AT;
  }
  const start2 = shown1 + GAP;
  const s2 = rule === 'clock' ? clock2(start2) : clock2(start2) + eps;
  return { s1, shown1, start2, s2, ordered: s2 > s1, wait: shown1 - T1_AT };
}

function trueTimeFigure(t: Task) {
  const W = 540;
  const H = 260;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let eps = 4;
  let rule: StampRule = 'clock';
  let open = () => false;
  const x0 = 70;
  const x1 = 520;
  const tMax = 50;
  const X = (v: number) => x0 + (v / tMax) * (x1 - x0);
  const paint = () => {
    const r = trueTime(eps, rule);
    const parts: SVGElement[] = [];
    // True time axis.
    parts.push(line(x0, 232, x1, 232, COL.ink, 1.2));
    for (let v = 0; v <= tMax; v += 10) parts.push(line(X(v), 232, X(v), 236, COL.ink, 1), small(X(v), 248, `${v} ms`, { anchor: 'middle', soft: true }));
    parts.push(small(8, 236, 'true time', { bold: true }));
    const laneY = [60, 150];
    const names = ['Server 1 (clock fast)', 'Server 2 (clock slow)'];
    laneY.forEach((y, i) => {
      parts.push(small(8, y - 26, names[i], { bold: true }));
      parts.push(line(x0, y, x1, y, COL.grid, 1));
    });
    // T1 on server 1.
    const y1 = laneY[0];
    const tt1 = rule === 'clock' ? null : [r.s1 - 2 * eps, r.s1];
    if (tt1) {
      parts.push(svg('rect', { x: X(tt1[0]), y: y1 - 7, width: X(tt1[1]) - X(tt1[0]), height: 14, rx: 3, fill: COL.clock, opacity: 0.22 }));
      parts.push(small(X(tt1[0]), y1 - 22, 'TT.now() at commit', { fill: COL.clock }));
    }
    parts.push(svg('circle', { cx: X(T1_AT), cy: y1, r: 4, fill: COL.write }), small(X(T1_AT) - 4, y1 + 20, 'T1 commits', { anchor: 'end', fill: COL.write }));
    if (r.wait > 0) {
      parts.push(svg('rect', { x: X(T1_AT), y: y1 + 10, width: X(r.shown1) - X(T1_AT), height: 6, fill: COL.busy }));
      parts.push(small((X(T1_AT) + X(r.shown1)) / 2, y1 + 30, `commit wait ${r.wait.toFixed(1)} ms`, { anchor: 'middle', fill: COL.busy }));
    }
    parts.push(svg('circle', { cx: X(r.shown1), cy: y1, r: 4, fill: COL.answer }), small(X(r.shown1) + 6, y1 - 6, 'shown', { fill: COL.answer }));
    // The client hears of T1 and starts T2 on server 2.
    parts.push(line(X(r.shown1), y1 + 4, X(r.start2), laneY[1] - 4, COL.request, 1.2, { 'stroke-dasharray': '3 3' }));
    const y2 = laneY[1];
    if (rule !== 'clock') {
      const a = r.s2 - 2 * eps;
      parts.push(svg('rect', { x: X(a), y: y2 - 7, width: X(r.s2) - X(a), height: 14, rx: 3, fill: COL.clock, opacity: 0.22 }));
    }
    parts.push(svg('circle', { cx: X(r.start2), cy: y2, r: 4, fill: COL.write }), small(X(r.start2) + 6, y2 - 12, 'T2 starts, after T1 is shown', { fill: COL.write }));
    // Timestamps on one line.
    const yS = 196;
    parts.push(small(8, yS + 4, 'timestamps', { bold: true }), line(x0, yS, x1, yS, COL.grid, 1));
    const stamp = (v: number, name: string, up: boolean) => [
      svg('path', { d: `M${X(v)},${yS - 6} l-5,-8 h10 z`, fill: COL.clock }),
      small(X(v), up ? yS - 18 : yS + 14, `${name} = ${v.toFixed(1)}`, { anchor: 'middle', fill: COL.clock }),
    ];
    if (open()) {
      parts.push(...stamp(r.s1, 's1', true), ...stamp(r.s2, 's2', false));
      parts.push(label(x1, yS + 30, r.ordered ? 's1 < s2: the order is right' : 's2 < s1: T2 is stamped before T1', { anchor: 'end', size: 'small', bold: true, fill: r.ordered ? COL.answer : COL.error }));
    }
    redraw(g, ...parts);
    if (!open()) return;
    const how = rule === 'clock' ? 'Each server stamps with its own clock' : rule === 'tt' ? 'T1 is stamped with TrueTime\'s latest, and shown at once' : `T1 is stamped with TrueTime's latest and held back until the stamp has surely passed: ${r.wait.toFixed(1)} ms, about 2ε`;
    f.readout.textContent = `ε = ${eps} ms. ${how}. ${r.ordered ? 'T2, which started after T1 was visible, gets the later timestamp.' : 'T2 started after T1 was visible, yet gets the earlier timestamp, so a read at T2\'s time would not see T1.'}`;
    if (t.goal === 'ordered' && rule === 'wait' && eps >= 4) t.done();
  };
  const e = slider('Bound ε', 0.5, 10, 0.5, eps, (v) => `± ${v} ms`, (v) => {
    eps = v;
    paint();
  }, 'clock');
  const m = pick(['Local clocks', 'TrueTime, no wait', 'TrueTime with commit wait'], 0, (i) => {
    rule = (['clock', 'tt', 'wait'] as const)[i];
    paint();
  });
  f.controls.append(m.node, e.node);
  paint();
  open = guessFirst(t, f, {
    ask: 'TrueTime says the true time is within ± 4 ms of the clock. How long must a commit wait before its result may be shown, so that every later transaction anywhere gets a later timestamp?',
    options: ['No time at all', 'About 4 ms', 'About 8 ms'],
    answer: 2,
    sliders: [e],
    hidden: [m.node],
    after: () => paint(),
  });
  return f.node;
}

export const FIGS = {
  'spanner-2pc': figure(['unblocked'], (ctx, t) => {
    const o: TwoPcOptions = { crash: false, paxos: false };
    const s = seqFigure(ctx, {
      w: 540, h: 300, lines: 4, seconds: 12,
      script: () => twoPcScript(o),
      onTime: (now, sc) => {
        if (t.goal === 'unblocked' && o.crash && o.paxos && now >= sc.tMax - 5) t.done();
      },
    });
    const opts = toggles(['Coordinator dies after the votes', 'Each is a Paxos group'], [false, false], (on) => {
      [o.crash, o.paxos] = on;
      s.redo();
      // The drawing's length changes with the story; keep the slider's range in step.
      s.time.input.max = String(s.script().tMax);
    });
    s.f.controls.prepend(opts.node);
    return s.f.node;
  }),
  'spanner-truetime': figure(['ordered'], (_ctx, t) => trueTimeFigure(t)),
};
