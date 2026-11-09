// Lesson 11, Who is in charge?: five servers running Raft, worked out
// message by message (a leader that dies; a network split into two and
// three, guess first), and a lock holder paused past its lease, with and
// without a fencing token. The protocols are computed here; sysdiagram's
// sequence view only draws them.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { sequenceView, type Lane, type Mark, type Message } from 'sysdiagram/sequence';
import { SEQUENCE } from './diagram';
import { COL, figure, frame, guessFirst, named, player, slider, tint, toggles, type Task } from './kit';

export interface Entry {
  term: number;
  cmd: string;
}

/** What one server's log looked like from time `t` on. */
export interface Snapshot {
  t: number;
  log: Entry[];
  commit: number;
  role: 'follower' | 'candidate' | 'leader' | 'down';
  term: number;
}

export interface RaftRun {
  lanes: Lane[];
  messages: Message[];
  marks: Mark[];
  /** Per server, its log over time. */
  history: Record<string, Snapshot[]>;
  tMax: number;
  /** The partition, if any: when it starts and ends, and which servers are on the small side. */
  split?: { from: number; to: number; minority: string[] };
}

export const SERVERS = ['S1', 'S2', 'S3', 'S4', 'S5'];
/** One-way message delay, ms. */
export const DELAY = 40;
/** A leader's heartbeat interval, ms. */
export const HEARTBEAT = 200;
/** Each server's election timeout, ms. Raft draws them at random so one server usually goes first; fixed here so the run repeats. */
export const TIMEOUT: Record<string, number> = { S1: 600, S2: 700, S3: 520, S4: 660, S5: 740 };

type Msg =
  | { kind: 'vote?'; term: number; from: string; lastIndex: number; lastTerm: number }
  | { kind: 'vote'; term: number; from: string; granted: boolean }
  | { kind: 'append'; term: number; from: string; prev: number; prevTerm: number; entries: Entry[]; commit: number }
  | { kind: 'appended'; term: number; from: string; ok: boolean; match: number }
  | { kind: 'client'; cmd: string };

export interface RaftScenario {
  /** S1 crashes at this time. */
  crash?: number;
  /** The network splits S1 and S2 from S3, S4 and S5 between these times. */
  split?: [number, number];
  /** Client writes: when, to which server, what. */
  writes: { at: number; to: string; cmd: string }[];
  tMax: number;
}

export const LEADER_DIES: RaftScenario = { crash: 330, writes: [{ at: 40, to: 'S1', cmd: 'x=2' }, { at: 960, to: 'S3', cmd: 'x=3' }], tMax: 1260 };
export const SPLIT: RaftScenario = { split: [330, 1150], writes: [{ at: 400, to: 'S1', cmd: 'x=2' }, { at: 960, to: 'S3', cmd: 'x=3' }], tMax: 1350 };

/**
 * Raft on five servers, event by event, as Ongaro and Ousterhout describe
 * it: terms, one vote per term for a candidate whose log is at least as
 * up to date, a leader that appends client writes and sends them with each
 * heartbeat, and an entry committed once a majority holds it in the
 * leader's own term. S1 starts as leader of term 1 with x=1 committed.
 */
export function raft(sc: RaftScenario): RaftRun {
  type Node = { id: string; term: number; voted: string | null; role: Snapshot['role']; log: Entry[]; commit: number; deadline: number; votes: Set<string>; next: Record<string, number>; match: Record<string, number>; nextBeat: number };
  const nodes = new Map<string, Node>();
  for (const id of SERVERS) {
    nodes.set(id, {
      id, term: 1, voted: 'S1', role: id === 'S1' ? 'leader' : 'follower',
      log: [{ term: 1, cmd: 'x=1' }], commit: 1, deadline: TIMEOUT[id], votes: new Set(),
      next: Object.fromEntries(SERVERS.map((s) => [s, 2])), match: Object.fromEntries(SERVERS.map((s) => [s, 1])), nextBeat: 0,
    });
  }
  const messages: Message[] = [];
  const marks: Mark[] = [];
  const history: Record<string, Snapshot[]> = Object.fromEntries(SERVERS.map((s) => [s, []]));
  const snap = (n: Node, t: number) => history[n.id].push({ t, log: n.log.map((e) => ({ ...e })), commit: n.commit, role: n.role, term: n.term });
  for (const n of nodes.values()) snap(n, 0);
  marks.push({ lane: 'S1', at: 0, text: 'leader, term 1', color: COL.leader });

  const queue: { t: number; seq: number; to: string; from: string; msg: Msg }[] = [];
  let seq = 0;
  const sideOf = (id: string) => (id === 'S1' || id === 'S2' ? 0 : 1);
  const cut = (a: string, b: string, t: number) => {
    if (a === 'Client' || b === 'Client') return false;
    if (!sc.split) return false;
    return t >= sc.split[0] && t < sc.split[1] && sideOf(a) !== sideOf(b);
  };
  const down = (id: string, t: number) => id === 'S1' && sc.crash !== undefined && t >= sc.crash;
  const colour = (m: Msg) => (m.kind === 'vote?' || m.kind === 'vote' ? COL.leader : m.kind === 'client' ? COL.request : m.kind === 'append' ? (m.entries.length ? COL.write : COL.soft) : m.ok ? COL.answer : COL.soft);
  const neighbour = (from: string, to: string) => {
    const a = SERVERS.indexOf(from);
    const b = SERVERS.indexOf(to);
    return b === a + 1 || (a === SERVERS.length - 1 && b === a - 1);
  };
  const send = (from: string, to: string, msg: Msg, t: number, label?: string) => {
    const lost = cut(from, to, t) || down(to, t + DELAY);
    // Replies to empty heartbeats are left out of the drawing, and a broadcast is labelled once.
    const quiet = msg.kind === 'appended' && msg.ok && !ackOfEntries.has(`${from}>${to}@${t}`);
    if (!quiet) messages.push({ from, to, send: t, arrive: t + DELAY, label: label && (neighbour(from, to) || msg.kind === 'appended') ? label : undefined, color: colour(msg), lost });
    if (!lost) queue.push({ t: t + DELAY, seq: seq++, to, from, msg });
  };
  const ackOfEntries = new Set<string>();
  const lastIndex = (n: Node) => n.log.length;
  const lastTerm = (n: Node) => n.log[n.log.length - 1]?.term ?? 0;
  const majority = 3;
  const announced = new Set<string>(['x=1']);

  const heartbeat = (n: Node, t: number) => {
    for (const p of SERVERS) {
      if (p === n.id) continue;
      const prev = n.next[p] - 1;
      const entries = n.log.slice(prev);
      send(n.id, p, { kind: 'append', term: n.term, from: n.id, prev, prevTerm: n.log[prev - 1]?.term ?? 0, entries, commit: n.commit }, t, entries.length ? entries.map((e) => e.cmd).join(' ') : undefined);
    }
    n.nextBeat = t + HEARTBEAT;
  };
  const stepDown = (n: Node, term: number, t: number) => {
    const wasLeader = n.role === 'leader';
    n.term = term;
    n.voted = null;
    n.role = 'follower';
    n.deadline = t + TIMEOUT[n.id];
    if (wasLeader) marks.push({ lane: n.id, at: t, text: `steps down, term ${term}`, color: COL.leader });
  };
  const advanceCommit = (n: Node, t: number) => {
    for (let i = lastIndex(n); i > n.commit; i--) {
      const holders = SERVERS.filter((p) => (p === n.id ? lastIndex(n) : n.match[p]) >= i).length;
      if (holders >= majority && n.log[i - 1].term === n.term) {
        for (let k = n.commit + 1; k <= i; k++) {
          const cmd = n.log[k - 1].cmd;
          if (!announced.has(cmd)) marks.push({ lane: n.id, at: t, text: `${cmd} committed`, color: COL.answer });
          announced.add(cmd);
        }
        n.commit = i;
        return true;
      }
    }
    return false;
  };

  for (const w of sc.writes) queue.push({ t: w.at + DELAY, seq: seq++, to: w.to, from: 'Client', msg: { kind: 'client', cmd: w.cmd } }), messages.push({ from: 'Client', to: w.to, send: w.at, arrive: w.at + DELAY, label: `write ${w.cmd}`, color: COL.request, lost: down(w.to, w.at + DELAY) });

  let t = 0;
  for (let guard = 0; guard < 20000 && t <= sc.tMax; guard++) {
    // The next thing to happen: a message arriving, a heartbeat due, an election timer running out, a crash.
    const timers: { t: number; act: () => void }[] = [];
    for (const n of nodes.values()) {
      if (down(n.id, t) || n.role === 'down') continue;
      if (n.role === 'leader') timers.push({ t: n.nextBeat, act: () => heartbeat(n, n.nextBeat) });
      else timers.push({
        t: n.deadline,
        act: () => {
          const now = n.deadline;
          n.term++;
          n.role = 'candidate';
          n.voted = n.id;
          n.votes = new Set([n.id]);
          n.deadline = now + TIMEOUT[n.id];
          marks.push({ lane: n.id, at: now, text: `candidate, term ${n.term}`, color: COL.leader });
          snap(n, now);
          for (const p of SERVERS) if (p !== n.id) send(n.id, p, { kind: 'vote?', term: n.term, from: n.id, lastIndex: lastIndex(n), lastTerm: lastTerm(n) }, now);
        },
      });
    }
    if (sc.crash !== undefined && nodes.get('S1')!.role !== 'down') timers.push({ t: sc.crash, act: () => { const s1 = nodes.get('S1')!; s1.role = 'down'; marks.push({ lane: 'S1', at: sc.crash!, text: 'crashes', color: COL.error }); snap(s1, sc.crash!); } });
    queue.sort((a, b) => a.t - b.t || a.seq - b.seq);
    const nextMsg = queue[0]?.t ?? Infinity;
    const timer = timers.sort((a, b) => a.t - b.t)[0];
    const tt = Math.min(nextMsg, timer?.t ?? Infinity);
    if (!Number.isFinite(tt) || tt > sc.tMax) break;
    t = tt;
    if (timer && timer.t <= nextMsg) {
      timer.act();
      continue;
    }
    const ev = queue.shift()!;
    const n = nodes.get(ev.to)!;
    if (down(n.id, t)) continue;
    const m = ev.msg;
    if (m.kind !== 'client' && m.term > n.term) {
      stepDown(n, m.term, t);
      snap(n, t);
    }
    switch (m.kind) {
      case 'client': {
        if (n.role !== 'leader') break;
        n.log.push({ term: n.term, cmd: m.cmd });
        snap(n, t);
        heartbeat(n, t);
        break;
      }
      case 'vote?': {
        const upToDate = m.lastTerm > lastTerm(n) || (m.lastTerm === lastTerm(n) && m.lastIndex >= lastIndex(n));
        const granted = m.term === n.term && (n.voted === null || n.voted === m.from) && upToDate;
        if (granted) {
          n.voted = m.from;
          n.deadline = t + TIMEOUT[n.id];
        }
        send(n.id, m.from, { kind: 'vote', term: n.term, from: n.id, granted }, t);
        break;
      }
      case 'vote': {
        if (n.role !== 'candidate' || m.term !== n.term || !m.granted) break;
        n.votes.add(m.from);
        if (n.votes.size >= majority) {
          n.role = 'leader';
          for (const p of SERVERS) {
            n.next[p] = lastIndex(n) + 1;
            n.match[p] = 0;
          }
          marks.push({ lane: n.id, at: t, text: `leader, term ${n.term}`, color: COL.leader });
          snap(n, t);
          heartbeat(n, t);
        }
        break;
      }
      case 'append': {
        if (m.term < n.term) {
          send(n.id, m.from, { kind: 'appended', term: n.term, from: n.id, ok: false, match: 0 }, t);
          break;
        }
        if (n.role !== 'follower') stepDown(n, m.term, t);
        n.deadline = t + TIMEOUT[n.id];
        const ok = m.prev === 0 || (n.log.length >= m.prev && n.log[m.prev - 1].term === m.prevTerm);
        if (ok) {
          let changed = false;
          m.entries.forEach((e, k) => {
            const i = m.prev + k;
            if (n.log[i] && n.log[i].term !== e.term) {
              if (!marks.some((k) => k.lane === n.id && k.at === t)) marks.push({ lane: n.id, at: t, text: `${n.log[i].cmd} overwritten`, color: COL.error });
              n.log.length = i;
            }
            if (!n.log[i]) {
              n.log.push({ ...e });
              changed = true;
            }
          });
          const newCommit = Math.min(m.commit, m.prev + m.entries.length);
          if (newCommit > n.commit) {
            n.commit = newCommit;
            changed = true;
          }
          if (changed) snap(n, t);
        }
        if (ok && m.entries.length) ackOfEntries.add(`${n.id}>${m.from}@${t}`);
        send(n.id, m.from, { kind: 'appended', term: n.term, from: n.id, ok, match: ok ? m.prev + m.entries.length : 0 }, t);
        break;
      }
      case 'appended': {
        if (n.role !== 'leader' || m.term !== n.term) break;
        if (m.ok) {
          n.match[m.from] = Math.max(n.match[m.from], m.match);
          n.next[m.from] = n.match[m.from] + 1;
          if (advanceCommit(n, t)) snap(n, t);
        } else n.next[m.from] = Math.max(1, n.next[m.from] - 1);
        break;
      }
    }
  }
  const lanes: Lane[] = [{ id: 'Client', label: 'Client' }, ...SERVERS.map((id) => ({ id, label: id, ...(id === 'S1' && sc.crash !== undefined ? { downFrom: sc.crash } : {}) }))];
  return { lanes, messages, marks, history, tMax: sc.tMax, split: sc.split ? { from: sc.split[0], to: sc.split[1], minority: ['S1', 'S2'] } : undefined };
}

/** A server's log at time `t`. */
export function logAt(run: RaftRun, id: string, t: number): Snapshot {
  const h = run.history[id];
  let s = h[0];
  for (const x of h) if (x.t <= t) s = x;
  return s;
}

/** The entries committed by a majority at time `t`, as the leader of the highest term sees them. */
export function committedAt(run: RaftRun, t: number): string[] {
  let best: Snapshot | undefined;
  for (const id of SERVERS) {
    const s = logAt(run, id, t);
    if (!best || s.term > best.term || (s.term === best.term && s.commit > best.commit)) best = s;
  }
  return best ? best.log.slice(0, best.commit).map((e) => e.cmd) : [];
}

const W = 420;

/** The timeline and the logs under it, drawn for a run up to `now`. */
function raftDrawing(f: { svg: SVGSVGElement }, run: RaftRun) {
  const seqH = 360;
  const g = svg('g');
  const over = svg('g');
  const logs = svg('g');
  f.svg.append(g, over, logs);
  const view = sequenceView(g, { x: 0, y: 0, w: W, h: seqH, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
  return (now: number) => {
    view.draw(run.messages, run.marks.filter((m) => m.at <= now), now);
    const parts: SVGElement[] = [];
    if (run.split && now >= run.split.from) {
      const x = (view.laneX('S2') + view.laneX('S3')) / 2;
      const y1 = view.timeY(run.split.from);
      const y2 = view.timeY(Math.min(now, run.split.to));
      parts.push(line(x, y1, x, y2, COL.error, 2, { 'stroke-dasharray': '6 4' }), small(x + 3, y1 - 3, 'network split', { fill: COL.error }));
      if (now >= run.split.to) parts.push(small(x + 3, view.timeY(run.split.to) + 10, 'healed', { fill: COL.answer }));
    }
    redraw(over, ...parts);
    // Each server's log at `now`: committed entries solid, others outlined.
    const lp: SVGElement[] = [];
    const y0 = seqH + 14;
    lp.push(small(4, y0, 'Logs now (term and command; solid = committed):', { soft: true }));
    SERVERS.forEach((id, r) => {
      const s = logAt(run, id, now);
      const y = y0 + 8 + r * 18;
      lp.push(small(4, y + 11, id, { bold: true, fill: s.role === 'leader' ? COL.leader : undefined }));
      s.log.forEach((e, i) => {
        const x = 26 + i * 64;
        const done = i < s.commit;
        lp.push(svg('rect', { x, y, width: 60, height: 15, rx: 2, fill: done ? tint(COL.data, 0.3) : COL.paper, stroke: done ? COL.data : COL.write, 'stroke-dasharray': done ? '' : '3 2' }));
        lp.push(small(x + 4, y + 11, `t${e.term}  ${e.cmd}`));
      });
      const roleText = s.role === 'down' ? 'crashed' : `${s.role}, term ${s.term}`;
      lp.push(small(W - 4, y + 11, roleText, { anchor: 'end', fill: s.role === 'down' ? COL.error : s.role === 'leader' ? COL.leader : COL.soft }));
    });
    redraw(logs, ...lp);
  };
}

const RAFT_H = 470;

function describe(run: RaftRun, now: number): string {
  const leaders = SERVERS.map((id) => ({ id, s: logAt(run, id, now) })).filter((x) => x.s.role === 'leader');
  const who = leaders.length ? leaders.map((l) => `${l.id} leads term ${l.s.term}`).join('; ') : 'No leader: an election is due';
  const committed = committedAt(run, now);
  return `At ${Math.round(now)} ms. ${who}. Committed by a majority: ${committed.join(', ')}.`;
}

export const FIGS = {
  'chubby-raft': figure(['elected'], (ctx, t) => {
    const run = raft(LEADER_DIES);
    const f = frame(W, RAFT_H, 2);
    const paint = raftDrawing(f, run);
    const show = (now: number) => {
      paint(now);
      f.readout.textContent = describe(run, now);
      if (t.goal === 'elected' && now >= run.tMax) t.done();
    };
    const time = slider('Time', 0, run.tMax, 2, 0, (v) => `${Math.round(v)} ms`, show, 'clock');
    f.controls.append(player(time, ctx, { seconds: 16 }).node, time.node);
    show(0);
    return f.node;
  }),

  'chubby-split': figure(['split'], (ctx, t: Task) => {
    const run = raft(SPLIT);
    const f = frame(W, RAFT_H, 3);
    const paint = raftDrawing(f, run);
    let open = false;
    const show = (now: number) => {
      paint(now);
      if (open) f.readout.textContent = describe(run, now) + (now >= 440 && now < 1240 ? ' S1 has x=2, but only S2 has a copy: 2 of 5.' : '');
      if (t.goal === 'split' && open && now >= run.tMax) t.done();
    };
    const time = slider('Time', 0, run.tMax, 2, 0, (v) => `${Math.round(v)} ms`, show, 'clock');
    f.controls.append(player(time, ctx, { seconds: 18 }).node, time.node);
    guessFirst(t, f, {
      ask: 'The network splits S1, the leader, and S2 away from S3, S4 and S5. One client writes x=2 to S1; later another writes x=3 to the other side. Once the network heals, which write is in every log?',
      options: ['x=2, sent to the leader', 'x=3, on the side of three', 'Both, one after the other'],
      answer: 1,
      sliders: [time],
      reveal: 'done',
      after: () => {
        open = true;
        show(time.value());
      },
    });
    show(0);
    return f.node;
  }),

  'chubby-fencing': figure(['fenced'], (ctx, t) => {
    const f = frame(W, 330, 3);
    const g = svg('g');
    f.svg.append(g);
    let fencing = false;
    let run = fencingRun(fencing);
    const view = sequenceView(g, { x: 0, y: 0, w: W, h: 330, lanes: run.lanes, tMax: run.tMax, colors: SEQUENCE });
    let now = 0;
    const show = () => {
      view.draw(run.messages, run.marks, now);
      const step = [...run.story].reverse().find((s) => s.at <= now);
      f.readout.textContent = step ? step.text : 'Client 1 asks the lock service for the lock on the file.';
      if (t.goal === 'fenced' && fencing && now >= run.tMax - 10) t.done();
    };
    const time = slider('Time', 0, 340, 2, 0, (v) => `${Math.round(v)} ms`, (v) => { now = v; show(); }, 'clock');
    const chips = named(toggles(['Fencing tokens'], [fencing], (on) => { fencing = on[0]; run = fencingRun(fencing); show(); }), 'With:');
    f.controls.append(chips.node, player(time, ctx, { seconds: 14 }).node, time.node);
    show();
    return f.node;
  }),
};

export interface FencingRun {
  lanes: Lane[];
  messages: Message[];
  marks: Mark[];
  /** The readout's words from each moment on. */
  story: { at: number; text: string }[];
  tMax: number;
  /** Whether the stale write reached the file. */
  corrupted: boolean;
}

/**
 * A lock with a lease of 100 ms, as in Martin Kleppmann's example: client 1
 * takes the lock (token 33), pauses for garbage collection past its lease,
 * client 2 takes the lock (token 34) and writes, then client 1 wakes and
 * writes. With fencing, storage remembers the highest token it has seen
 * and refuses lower ones.
 */
export function fencingRun(fencing: boolean): FencingRun {
  const lanes: Lane[] = [
    { id: 'c1', label: 'Client 1', downFrom: 45, downTo: 255 },
    { id: 'lock', label: 'Lock service' },
    { id: 'c2', label: 'Client 2' },
    { id: 'disk', label: 'Storage' },
  ];
  const d = 18;
  const msg = (from: string, to: string, send: number, label: string, color: string): Message => ({ from, to, send, arrive: send + d, label, color });
  const messages: Message[] = [
    msg('c1', 'lock', 0, 'lock?', COL.request),
    msg('lock', 'c1', 20, fencing ? 'yes, token 33' : 'yes', COL.clock),
    msg('c2', 'lock', 120, 'lock?', COL.request),
    msg('lock', 'c2', 150, fencing ? 'yes, token 34' : 'yes', COL.clock),
    msg('c2', 'disk', 175, fencing ? 'write, 34' : 'write', COL.write),
    msg('disk', 'c2', 200, 'ok', COL.answer),
    msg('c1', 'disk', 265, fencing ? 'write, 33' : 'write', COL.write),
    msg('disk', 'c1', 290, fencing ? 'refused: 33 < 34' : 'ok', fencing ? COL.error : COL.answer),
  ];
  const marks: Mark[] = [
    { lane: 'c1', at: 45, text: 'GC pause', color: COL.error },
    { lane: 'lock', at: 140, text: 'lease of client 1 ran out', color: COL.clock },
    { lane: 'c1', at: 255, text: 'wakes, thinks it holds the lock', color: COL.ink },
    fencing ? { lane: 'c2', at: 283, text: 'its data kept', color: COL.answer } : { lane: 'c2', at: 283, text: 'its data overwritten', color: COL.error },
  ];
  const story = [
    { at: 38, text: `Client 1 holds the lock${fencing ? ' with token 33' : ''} and a lease of 100 ms. It must renew the lease before it runs out.` },
    { at: 45, text: 'Client 1 stops for a long garbage-collection pause. It is not dead, and it does not know time is passing.' },
    { at: 140, text: 'The lease ran out without a renewal, so the lock service treats client 1 as gone and frees the lock.' },
    { at: 168, text: `Client 2 gets the lock${fencing ? ' with token 34, one higher than any before' : ''} and writes the file.` },
    { at: 255, text: 'Client 1 wakes. Its own clock read the lease as still valid when it paused, so it carries on writing.' },
    { at: 290, text: fencing ? 'Storage has seen token 34, so it refuses token 33. The paused client learns it lost the lock, and the file is safe.' : 'Storage accepts the write. Two clients each believed they held the lock, and client 2’s data is lost.' },
  ];
  return { lanes, messages, marks, story, tMax: 330, corrupted: !fencing };
}
