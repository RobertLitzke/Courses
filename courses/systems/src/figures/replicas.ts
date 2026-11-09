// Lesson 4, When the database can't keep up: a primary and its read
// replicas, which every write must reach; reading your own write from a
// replica that is behind; and users split across clusters with a directory.

import { moved, modulo } from 'sysdiagram/ring';
import { sequenceView, type Mark, type Message } from 'sysdiagram/sequence';
import { liveDiagram, SEQUENCE, type PartSpec, type System } from './diagram';
import { COL, figure, frame, named, pick, player, slider } from './kit';

/**
 * Load on each read replica when `q` queries a second, a share `w` of them
 * writes, are served by a primary and `n` replicas that each manage `cap`
 * queries a second. Reads go to the replicas; every replica applies every write.
 */
export function replicaLoad(q: number, w: number, n: number, cap: number) {
  const writes = q * w;
  const reads = (q * (1 - w)) / n;
  return { writes, reads, perReplica: writes + reads, util: (writes + reads) / cap };
}

/** The most queries a second a primary and `n` replicas can serve at write share `w`: cap / (w + (1 − w) / n). */
export const maxQueries = (w: number, n: number, cap: number) => cap / (w + (1 - w) / n);

/** The share of users who move when going from `a` clusters to `b` with `user mod n`. */
export const modMoves = (a: number, b: number, users = 10_000) => moved(users, modulo(Array.from({ length: a }, (_, i) => `c${i}`)), modulo(Array.from({ length: b }, (_, i) => `c${i}`)));

const W = 440;
const Q = 10_000;
const CAP = 3_000;
/** The live diagram runs at a hundredth of the real rates. */
const SCALE = 100;

export const FIGS = {
  'replicas-flow': figure(['lag'], (ctx, t) => {
    let w = 0.05;
    let n = 5;
    const lag = new Map<string, number>();
    const spec = () => {
      const ids = Array.from({ length: n }, (_, i) => `r${i}`);
      const top = 160 - ((n - 1) * 50) / 2;
      const parts: PartSpec[] = [
        { id: 'writes', kind: 'client', label: 'Writes', x: 50, y: 50, rps: (Q * w) / SCALE, timeoutMs: 4000, keys: 1 },
        { id: 'reads', kind: 'client', label: 'Reads', x: 50, y: 270, rps: (Q * (1 - w)) / SCALE, timeoutMs: 4000 },
        { id: 'primary', kind: 'master', label: 'Primary', x: 190, y: 50, serviceMs: (1000 * SCALE) / CAP, policy: { type: 'fanout', need: 0 } },
        { id: 'lb', kind: 'lb', label: 'Balancer', x: 190, y: 270, servers: 8, policy: { type: 'spread', mode: 'least' } },
        ...ids.map((id, i): PartSpec => ({ id, kind: 'replica', label: `Replica ${i + 1}`, x: 370, y: top + i * 50, serviceMs: (1000 * SCALE) / CAP })),
      ];
      const links = [
        { from: 'writes', to: 'primary', ms: 20 },
        { from: 'reads', to: 'lb', ms: 20 },
        ...ids.map((id) => ({ from: 'primary', to: id, ms: 15 })),
        ...ids.map((id) => ({ from: 'lb', to: id, ms: 15 })),
      ];
      return { parts, links, seed: 6 };
    };
    // How far behind each replica is: the age of the last write it applied, less its trip there.
    const attach = (sys: System) => {
      lag.clear();
      sys.hooks.serve = (p, call, now) => {
        if (p.kind === 'replica' && call.root.at === 'writes') lag.set(p.id, Math.max(0, now - call.root.born - 35 - (1000 * SCALE) / CAP));
      };
    };
    const d = liveDiagram(ctx, spec(), {
      w: W, h: 310, lines: 3, speed: 150, tap: 'parts', fixed: ['lb', ...Array.from({ length: 6 }, (_, i) => `r${i}`)],
      sub: (p) => (p.kind === 'replica' && (lag.get(p.id) ?? 0) > 300 ? `${((lag.get(p.id) ?? 0) / 1000).toFixed(1)} s behind` : undefined),
      onFrame: (sys) => {
        const l = replicaLoad(Q, w, n, CAP);
        const worst = Math.max(0, ...lag.values());
        const down = !sys.part('primary').up;
        d.f.readout.textContent = (down
          ? `Primary down: every write fails. Promote a replica, and any write it had not applied (up to ${(worst / 1000).toFixed(1)} s of them) is lost. `
          : `Each replica applies all ${Math.round(l.writes).toLocaleString('en-US')} writes a second and serves ${Math.round(l.reads).toLocaleString('en-US')} reads: ${Math.round(l.util * 100)}% of the 3,000 it can do. `)
          + (l.util >= 1 ? `It cannot keep up: lag ${(worst / 1000).toFixed(1)} s and growing.` : `Lag ${worst < 100 ? 'under 0.1' : (worst / 1000).toFixed(1)} s.`);
        if (worst > 1500 && t.goal === 'lag') t.done();
      },
    });
    attach(d.sys);
    const ws = slider('Share of queries that are writes', 0, 40, 1, w * 100, (v) => `${v}% (${(Q * v / 100).toLocaleString('en-US')} writes a second of 10,000)`, (v) => {
      w = v / 100;
      d.sys.setRate('writes', (Q * w) / SCALE);
      d.sys.setRate('reads', (Q * (1 - w)) / SCALE);
    }, 'write');
    const rs = slider('Read replicas', 1, 6, 1, n, (v) => `${v}`, (v) => {
      n = v;
      d.rebuild(spec());
      attach(d.sys);
    }, 'ink');
    d.f.controls.append(ws.node, rs.node);
    return d.f.node;
  }),

  'replicas-seq': figure(['fixed'], (ctx, t) => {
    const f = frame(W, 330, 3);
    const lanes = [
      { id: 'you', label: 'You' },
      { id: 'web', label: 'Web server' },
      { id: 'primary', label: 'Primary' },
      { id: 'replica', label: 'Replica' },
    ];
    const T = 440;
    const view = sequenceView(f.svg, { x: 0, y: 4, w: W, h: 322, lanes, tMax: T, colors: SEQUENCE });
    let lagMs = 250;
    let fix = 0;
    let now = T;
    let run = readAfterWrite(lagMs, fix);
    const paint = () => {
      view.draw(run.messages, run.marks, now);
      if (now < 70) f.readout.textContent = 'You post a comment. The web server writes it to the primary, which commits it and says so.';
      else if (now < 150) f.readout.textContent = `"Saved." The primary sends the change on to the replica, which will apply it ${lagMs} ms after the commit.`;
      else if (now < run.end) f.readout.textContent = fix === 0 ? 'You reload the page. The web server reads from a replica, as it does for every read.' : fix === 1 ? 'You reload. You wrote less than 10 s ago, so the web server reads from the primary.' : 'You reload. The web server asks the replica to answer only once it has applied your write.';
      else f.readout.textContent = run.stale
        ? `The replica had not applied your comment yet, so the page comes back without it. Your write is safe on the primary; you just can't see it.`
        : fix === 0 ? 'The replica had caught up in time, so the page shows your comment. Make the lag longer.' : `The page shows your comment, ${fix === 2 && run.waited > 0 ? `${run.waited} ms later than an unchecked read would have` : 'at the cost of one more read on the primary'}.`;
      if (now >= run.end && fix > 0 && lagMs > 140 && t.goal === 'fixed') t.done();
    };
    const recompute = () => {
      run = readAfterWrite(lagMs, fix);
      paint();
    };
    const ts = slider('Time', 0, T, 2, T, (v) => `${Math.round(v)} ms`, (v) => { now = v; paint(); }, 'clock');
    const play = player(ts, ctx, { seconds: 8 });
    const ls = slider('Replica lag', 0, 350, 10, lagMs, (v) => `${v} ms`, (v) => { lagMs = v; recompute(); }, 'clock');
    const fx = named(pick(['No fix', 'Primary for 10 s', 'Wait for my write'], 0, (i) => { fix = i; recompute(); }), 'Reads:');
    f.controls.append(play.node, ts.node, ls.node, fx.node);
    paint();
    return f.node;
  }),

  'replicas-shards': figure(['fit'], (ctx, t) => {
    let k = 1;
    const RATE = 8_000;
    const spec = () => {
      const top = 140 - ((k - 1) * 56) / 2;
      const parts: PartSpec[] = [
        { id: 'users', kind: 'client', label: 'Users', x: 50, y: 140, rps: RATE / SCALE, keys: 1000, timeoutMs: 4000 },
        { id: 'web', kind: 'server', label: 'Web', x: 160, y: 140, servers: 8, serviceMs: 2 },
        { id: 'dir', kind: 'service', label: 'Directory', x: 270, y: 140, servers: 8, serviceMs: 1, policy: { type: 'hash' } },
        ...Array.from({ length: k }, (_, i): PartSpec => ({ id: `c${i}`, kind: 'db', label: `Cluster ${i + 1}`, x: 385, y: top + i * 56, serviceMs: (1000 * SCALE) / CAP })),
      ];
      const links = [
        { from: 'users', to: 'web', ms: 20 },
        { from: 'web', to: 'dir', ms: 12 },
        ...Array.from({ length: k }, (_, i) => ({ from: 'dir', to: `c${i}`, ms: 15 })),
      ];
      return { parts, links, seed: 7 };
    };
    const d = liveDiagram(ctx, spec(), {
      w: W, h: 280, lines: 3, speed: 150,
      sub: (p) => (p.kind === 'db' ? `${Math.round(RATE / k).toLocaleString('en-US')} a second` : undefined),
      onFrame: () => {
        const util = RATE / k / CAP;
        const move = k > 1 ? ` Going from ${k - 1} to ${k} clusters by user number mod ${k} moved ${Math.round(modMoves(k - 1, k) * 100)}% of users; a directory moves only the ones you pick.` : '';
        d.f.readout.textContent = `${RATE.toLocaleString('en-US')} writes a second split by user over ${k} cluster${k > 1 ? 's' : ''}: each takes ${Math.round(RATE / k).toLocaleString('en-US')}, ${Math.round(util * 100)}% of the 3,000 it can do.${move}`;
        if (util <= 0.8 && t.goal === 'fit') t.done();
      },
    });
    const ks = slider('Clusters', 1, 5, 1, k, (v) => `${v}`, (v) => { k = v; d.rebuild(spec()); }, 'ink');
    d.f.controls.append(ks.node);
    return d.f.node;
  }),
};

export interface ReadAfterWrite {
  messages: Message[];
  marks: Mark[];
  /** The page came back without the reader's own comment. */
  stale: boolean;
  /** When the page is back, ms. */
  end: number;
  /** How long the read waited at the replica for the write to arrive, ms. */
  waited: number;
}

/**
 * Post a comment, then reload 150 ms later. The write commits on the primary
 * at 38 ms and reaches the replica `lagMs` after that. `fix` 0 reads the
 * replica as usual; 1 reads the primary for a while after a write; 2 asks the
 * replica to wait until it has applied the write's position in the log.
 */
export function readAfterWrite(lagMs: number, fix: number): ReadAfterWrite {
  const commit = 38;
  const applied = commit + lagMs;
  const messages: Message[] = [
    { from: 'you', to: 'web', send: 0, arrive: 20, label: 'post', color: COL.write },
    { from: 'web', to: 'primary', send: 20, arrive: 30, label: 'INSERT', color: COL.write },
    { from: 'primary', to: 'web', send: 40, arrive: 50, label: 'ok', color: COL.answer },
    { from: 'web', to: 'you', send: 50, arrive: 70, label: 'saved', color: COL.answer },
    { from: 'primary', to: 'replica', send: commit, arrive: applied, label: 'change', color: COL.write },
    { from: 'you', to: 'web', send: 150, arrive: 170, label: 'reload', color: COL.request },
  ];
  const marks: Mark[] = [
    { lane: 'primary', at: commit, text: 'committed', color: COL.write },
    { lane: 'replica', at: applied, text: 'applied', color: COL.write },
  ];
  const target = fix === 1 ? 'primary' : 'replica';
  const asked = 180;
  const answered = fix === 2 ? Math.max(asked, applied) + 12 : asked + 12;
  const stale = fix === 0 && applied > asked;
  messages.push(
    { from: 'web', to: target, send: 170, arrive: asked, label: fix === 2 ? 'SELECT after my write' : 'SELECT', color: COL.request },
    { from: target, to: 'web', send: answered, arrive: answered + 10, label: stale ? 'no comment' : 'with comment', color: stale ? COL.error : COL.answer },
    { from: 'web', to: 'you', send: answered + 10, arrive: answered + 30, label: stale ? 'where is it?' : 'page', color: stale ? COL.error : COL.answer },
  );
  return { messages, marks, stale, end: answered + 30, waited: answered - asked - 12 };
}
