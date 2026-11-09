// A small simulation of requests moving through a system: clients send
// requests, links carry them with a delay, each part (a server, a cache, a
// database) works on a few at a time and queues the rest, and passes them on
// by a rule of its own: answer, spread over the parts behind it, pick one by
// the request's key, fail over, answer from cache some of the time, or ask
// several at once and wait for enough answers. Any part or link can be failed
// while it runs. Time is in milliseconds of the system's own clock; no DOM.

import { makeRng, type Rng } from 'didactics/rng';

/** What a part is, which decides how it is drawn (view.ts); the model treats them all alike. */
export type Kind =
  | 'client'
  | 'user'
  | 'dns'
  | 'cdn'
  | 'lb'
  | 'server'
  | 'service'
  | 'cache'
  | 'db'
  | 'replica'
  | 'shard'
  | 'store'
  | 'queue'
  | 'worker'
  | 'master'
  | 'region';

/**
 * How a part passes a request on once it has worked on it.
 *
 * - `serve`: answers it (the default for a part with no links out).
 * - `spread`: sends it to one of the parts behind it: in turn, at random, or to the one with the fewest waiting (the default for a part with links out).
 * - `hash`: sends it to the part chosen by its key, `key mod n` over the targets in order, or over a ring (ring.ts) when one is given.
 * - `failover`: sends it to the first target that is up, as far as this part knows (see `health`).
 * - `cache`: answers it itself with probability `hit` (or when `hot` says the key is held), else passes it on as `spread`.
 * - `fanout`: sends a copy to every target and answers once `need` of them have answered (default all): a quorum, a scatter and gather, a replicated write.
 * - `async`: answers at once and passes a copy on behind it without waiting: a queue, a log, a write-behind.
 */
export type Policy =
  | { type: 'serve' }
  | { type: 'spread'; mode?: 'round-robin' | 'random' | 'least' }
  | { type: 'hash'; ring?: (key: number) => string }
  | { type: 'failover' }
  | { type: 'cache'; hit?: number; hot?: (key: number) => boolean }
  | { type: 'fanout'; need?: number }
  | { type: 'async' };

export interface PartSpec {
  id: string;
  kind: Kind;
  label?: string;
  /** Where to draw it, in drawing units (view.ts). */
  x: number;
  y: number;
  policy?: Policy;
  /** How many requests it works on at once (threads, cores, connections). Default 1. */
  servers?: number;
  /** Mean time to work on one, ms. Default 1. */
  serviceMs?: number;
  /** Most it will hold waiting; past that it turns requests away at once. Default no limit. */
  queue?: number;
  /** For a client: requests it starts a second. */
  rps?: number;
  /** For a client: how many distinct keys its requests use (0 to keys-1), and the Zipf skew of how often each is asked for (0 is even). Default 1000 keys, skew 0. */
  keys?: number;
  skew?: number;
  /** How long it waits for an answer from behind it before giving up, ms. A client's default is 1000; others wait as long as their client. */
  timeoutMs?: number;
  /** For a client: tries after the first, and the wait before the first retry (doubling each time, with jitter). */
  retries?: number;
  backoffMs?: number;
  /** For a part that passes requests on: it notices a target is down (health checks) and skips it. Default false. */
  health?: boolean;
  /** Starts failed. */
  down?: boolean;
}

export interface LinkSpec {
  from: string;
  to: string;
  /** One-way delay, ms. Default 1. */
  ms?: number;
  /** Starts cut. */
  down?: boolean;
  /** Draw it curved by this much (view.ts). */
  bend?: number;
}

export interface Part extends Required<Omit<PartSpec, 'label' | 'policy' | 'down' | 'timeoutMs'>> {
  label: string;
  policy: Policy;
  up: boolean;
  timeoutMs: number;
  /** Requests being worked on now. */
  busy: number;
  /** Requests waiting. */
  waiting: Call[];
  /** Requests it has finished working on, and turned away, since the start. */
  served: number;
  rejected: number;
  /** Time spent busy, summed over its servers, for utilisation. */
  busyMs: number;
  /** Next target in turn for `spread`. */
  turn: number;
  /** Counts its failures, so work it held when it failed is not finished after it comes back. */
  epoch: number;
}

export interface Link extends Required<Omit<LinkSpec, 'down' | 'bend'>> {
  up: boolean;
  bend: number;
}

/** One request at one part: a client's request, or a part's request to a part behind it. */
export interface Call {
  id: number;
  key: number;
  at: string;
  parent?: Call;
  /** The client's request this belongs to. */
  root: Call;
  /** For a root: its first start, the try it is on, and when it gives up. */
  born: number;
  tries: number;
  deadline: number;
  /** Answers still wanted, and those in, for a fanout. */
  need: number;
  got: number;
  failed: number;
  asked: number;
  settled: boolean;
  /** The part's epoch when the call reached it (see Part.epoch). */
  epoch: number;
  /** Sent on with nobody waiting for its answer (an `async` part's copy). */
  detached: boolean;
}

/** A message on a link, for drawing: a request going out, or an answer (good or bad) coming back. */
export interface Wire {
  from: string;
  to: string;
  sent: number;
  arrive: number;
  what: 'request' | 'answer' | 'error';
  key: number;
}

/** What became of one of a client's requests. */
export interface Outcome {
  client: string;
  key: number;
  start: number;
  end: number;
  ok: boolean;
  /** Tries it took. */
  tries: number;
  /** Why it failed: turned away (a full queue), timed out, or no part up to take it. */
  why?: 'rejected' | 'timeout' | 'unreachable';
}

export interface Stats {
  /** Requests clients started a second, over the window (retries included). */
  offered: number;
  /** Requests answered well a second. */
  goodput: number;
  /** Share of finished requests that failed. */
  errors: number;
  /** Latency of good answers, ms: median, 99th percentile and mean. NaN when none. */
  p50: number;
  p99: number;
  mean: number;
  /** How many finished in the window. */
  count: number;
}

type Event =
  | { t: number; seq: number; kind: 'start'; client: string }
  | { t: number; seq: number; kind: 'arrive'; call: Call; from: string }
  | { t: number; seq: number; kind: 'finish'; call: Call }
  | { t: number; seq: number; kind: 'reply'; call: Call; ok: boolean; from: string }
  | { t: number; seq: number; kind: 'timeout'; call: Call; tries: number }
  | { t: number; seq: number; kind: 'retry'; call: Call }
  | { t: number; seq: number; kind: 'wait'; call: Call };

type Unsequenced = Event extends infer E ? (E extends Event ? Omit<E, 'seq'> : never) : never;

/** A min-heap of events by time, then by the order they were made. */
class Agenda {
  private a: Event[] = [];
  get size() {
    return this.a.length;
  }
  peek(): Event | undefined {
    return this.a[0];
  }
  push(e: Event) {
    const a = this.a;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): Event | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && before(a[l], a[m])) m = l;
        if (r < a.length && before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}
const before = (x: Event, y: Event) => x.t < y.t || (x.t === y.t && x.seq < y.seq);

/** A value from a sorted list at quantile `q` (0 to 1), nearest rank; NaN for an empty list. */
export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

/** Draws keys 0 to n-1 with Zipf skew `s` (0 is even): key 0 is the most asked for. */
export function zipf(n: number, s: number, rng: Rng): () => number {
  if (s <= 0) return () => Math.floor(rng() * n);
  const cdf = new Float64Array(n);
  let sum = 0;
  for (let k = 0; k < n; k++) cdf[k] = sum += 1 / Math.pow(k + 1, s);
  return () => {
    const u = rng() * sum;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
}

export interface SystemSpec {
  parts: PartSpec[];
  links: LinkSpec[];
  /** For repeatable runs (tests, flash cards). */
  seed?: number;
  /** Service times vary as an exponential around their mean (default), or are exact. */
  exact?: boolean;
  /** How long a finished request is remembered for stats and drawing, ms. Default 5000. */
  keepMs?: number;
}

export interface Hooks {
  /** A part answered a request itself (`serve`, a cache hit, the last step of any chain). */
  serve?: (part: Part, call: Call, t: number) => void;
  /** A client's request finished. */
  done?: (o: Outcome) => void;
}

/** The running system. */
export class System {
  readonly parts = new Map<string, Part>();
  readonly links: Link[] = [];
  /** The links out of each part, in the order given. */
  readonly out = new Map<string, Link[]>();
  /** Messages on the wires now, for drawing. */
  wires: Wire[] = [];
  /** Requests finished within `keepMs`. */
  outcomes: Outcome[] = [];
  /** Every request finished since the start: good and failed. */
  totals = { ok: 0, failed: 0, started: 0 };
  hooks: Hooks = {};
  now = 0;
  private agenda = new Agenda();
  private seq = 0;
  private ids = 0;
  private rng: Rng;
  private exact: boolean;
  private keepMs: number;
  private draws = new Map<string, () => number>();

  constructor(spec: SystemSpec) {
    this.rng = makeRng(spec.seed ?? 1);
    this.exact = spec.exact ?? false;
    this.keepMs = spec.keepMs ?? 5000;
    for (const p of spec.parts) {
      const hasOut = spec.links.some((l) => l.from === p.id);
      this.parts.set(p.id, {
        id: p.id,
        kind: p.kind,
        label: p.label ?? p.id,
        x: p.x,
        y: p.y,
        policy: p.policy ?? (hasOut ? { type: 'spread' } : { type: 'serve' }),
        servers: p.servers ?? 1,
        serviceMs: p.serviceMs ?? 1,
        queue: p.queue ?? Infinity,
        rps: p.rps ?? 0,
        keys: p.keys ?? 1000,
        skew: p.skew ?? 0,
        timeoutMs: p.timeoutMs ?? (p.kind === 'client' || p.kind === 'user' ? 1000 : Infinity),
        retries: p.retries ?? 0,
        backoffMs: p.backoffMs ?? 50,
        health: p.health ?? false,
        up: !p.down,
        busy: 0,
        waiting: [],
        served: 0,
        rejected: 0,
        busyMs: 0,
        turn: 0,
        epoch: 0,
      });
      this.out.set(p.id, []);
    }
    for (const l of spec.links) {
      if (!this.parts.has(l.from) || !this.parts.has(l.to)) throw new Error(`link ${l.from} → ${l.to}: no such part`);
      const link: Link = { from: l.from, to: l.to, ms: l.ms ?? 1, up: !l.down, bend: l.bend ?? 0 };
      this.links.push(link);
      this.out.get(l.from)!.push(link);
    }
    for (const p of this.parts.values()) if (p.rps > 0) this.schedule({ kind: 'start', client: p.id, t: this.gap(p) });
  }

  part(id: string): Part {
    const p = this.parts.get(id);
    if (!p) throw new Error(`no part ${id}`);
    return p;
  }

  link(from: string, to: string): Link | undefined {
    return this.links.find((l) => l.from === from && l.to === to);
  }

  /** Fail a part or bring it back. A failed part drops what it holds and answers nothing. */
  setUp(id: string, up: boolean) {
    const p = this.part(id);
    if (p.up === up) return;
    p.up = up;
    if (!up) {
      p.waiting = [];
      p.busy = 0;
      p.epoch++;
    }
  }

  /** Cut a link or mend it. Messages already on it are lost when it is cut. */
  setLink(from: string, to: string, up: boolean) {
    const l = this.link(from, to);
    if (l) l.up = up;
    if (!up) this.wires = this.wires.filter((w) => !(w.from === from && w.to === to) && !(w.from === to && w.to === from));
  }

  /** Change a client's rate; takes effect from its next request. */
  setRate(id: string, rps: number) {
    const p = this.part(id);
    const was = p.rps;
    p.rps = rps;
    if (was <= 0 && rps > 0) this.schedule({ kind: 'start', client: id, t: this.now + this.gap(p) });
  }

  /** Run the clock forward `ms`. */
  run(ms: number) {
    const end = this.now + ms;
    for (let e = this.agenda.peek(); e && e.t <= end; e = this.agenda.peek()) {
      this.agenda.pop();
      this.account(e.t);
      this.now = e.t;
      this.handle(e);
    }
    this.account(end);
    this.now = end;
    this.wires = this.wires.filter((w) => w.arrive > this.now);
    const cut = this.now - this.keepMs;
    if (this.outcomes.length && this.outcomes[0].end < cut) this.outcomes = this.outcomes.filter((o) => o.end >= cut);
  }

  /** How the requests that finished in the last `windowMs` went. */
  stats(windowMs = 2000): Stats {
    const from = this.now - windowMs;
    const recent = this.outcomes.filter((o) => o.end >= from);
    const good = recent.filter((o) => o.ok).map((o) => o.end - o.start).sort((a, b) => a - b);
    const secs = Math.min(windowMs, Math.max(this.now, 1)) / 1000;
    const offered = this.started.filter((t) => t >= from).length / secs;
    return {
      offered,
      goodput: good.length / secs,
      errors: recent.length ? (recent.length - good.length) / recent.length : 0,
      p50: quantile(good, 0.5),
      p99: quantile(good, 0.99),
      mean: good.length ? good.reduce((s, v) => s + v, 0) / good.length : NaN,
      count: recent.length,
    };
  }

  /** Share of a part's capacity in use since the start (busy time over servers × time). */
  utilisation(id: string): number {
    const p = this.part(id);
    return this.now > 0 ? p.busyMs / (p.servers * this.now) : 0;
  }

  // ---- inside

  private started: number[] = [];
  private lastAccount = 0;

  private account(t: number) {
    const dt = t - this.lastAccount;
    if (dt > 0) for (const p of this.parts.values()) p.busyMs += p.busy * dt;
    this.lastAccount = t;
    if (this.started.length > 4096) this.started = this.started.filter((s) => s >= t - 10000);
  }

  private schedule(e: Unsequenced) {
    this.agenda.push({ ...e, seq: this.seq++ } as Event);
  }

  private gap(client: Part) {
    return client.rps > 0 ? -Math.log(1 - this.rng()) * (1000 / client.rps) : Infinity;
  }

  private keyFor(client: Part) {
    let d = this.draws.get(client.id);
    if (!d) this.draws.set(client.id, (d = zipf(client.keys, client.skew, this.rng)));
    return d();
  }

  private serviceTime(p: Part) {
    return this.exact ? p.serviceMs : -Math.log(1 - this.rng()) * p.serviceMs;
  }

  private handle(e: Event) {
    switch (e.kind) {
      case 'start': {
        const c = this.part(e.client);
        if (c.rps <= 0) return;
        this.schedule({ kind: 'start', client: c.id, t: this.now + this.gap(c) });
        if (!c.up) return;
        const root = this.newCall(c.id, this.keyFor(c));
        root.deadline = this.now + c.timeoutMs;
        this.totals.started++;
        this.begin(root);
        return;
      }
      case 'retry': {
        const old = e.call;
        const fresh = this.newCall(old.at, old.key);
        fresh.born = old.born;
        fresh.tries = old.tries;
        return this.begin(fresh);
      }
      case 'arrive':
        return this.arrive(e.call);
      case 'finish':
        return this.finish(e.call);
      case 'reply':
        return this.reply(e.call, e.ok);
      case 'timeout': {
        const r = e.call;
        if (!r.settled) this.end(r, false, 'timeout');
        return;
      }
      case 'wait': {
        const c = e.call;
        if (!c.settled) this.settle(c, false);
        return;
      }
    }
  }

  private newCall(at: string, key: number, parent?: Call): Call {
    const c: Call = { id: this.ids++, key, at, parent, root: undefined as unknown as Call, born: this.now, tries: 0, deadline: Infinity, need: 1, got: 0, failed: 0, asked: 0, settled: false, epoch: 0, detached: false };
    c.root = parent ? parent.root : c;
    return c;
  }

  /** A client's request starts, or starts again: it works through the client's own links. */
  private begin(root: Call) {
    const c = this.part(root.at);
    root.tries++;
    this.started.push(this.now);
    this.schedule({ kind: 'timeout', call: root, tries: root.tries, t: this.now + c.timeoutMs });
    this.pass(c, root);
  }

  private arrive(call: Call) {
    const p = this.part(call.at);
    if (!p.up) return; // lost: whoever asked finds out by timing out
    call.epoch = p.epoch;
    if (p.busy < p.servers) {
      p.busy++;
      this.schedule({ kind: 'finish', call, t: this.now + this.serviceTime(p) });
    } else if (p.waiting.length < p.queue) {
      p.waiting.push(call);
    } else {
      p.rejected++;
      this.answer(call, false);
    }
  }

  private finish(call: Call) {
    const p = this.part(call.at);
    if (!p.up || call.epoch !== p.epoch) return;
    p.busy = Math.max(0, p.busy - 1);
    p.served++;
    const next = p.waiting.shift();
    if (next) {
      p.busy++;
      this.schedule({ kind: 'finish', call: next, t: this.now + this.serviceTime(p) });
    }
    this.pass(p, call);
  }

  /** The targets a part can send to over links that are up, and, if it checks health, only parts that are up. */
  private targets(p: Part): Link[] {
    return this.out.get(p.id)!.filter((l) => l.up && (!p.health || this.part(l.to).up));
  }

  /** A part has done its own work on `call`: answer it or pass it on, by its policy. */
  private pass(p: Part, call: Call) {
    const pol = p.policy;
    const all = this.out.get(p.id)!;
    const live = this.targets(p);
    const answerHere = () => {
      this.hooks.serve?.(p, call, this.now);
      this.answer(call, true);
    };
    switch (pol.type) {
      case 'serve':
        return answerHere();
      case 'cache': {
        const hit = pol.hot ? pol.hot(call.key) : this.rng() < (pol.hit ?? 0.8);
        if (hit || !all.length) return answerHere();
        return this.forward(p, call, [this.spreadPick(p, live)]);
      }
      case 'spread':
        return this.forward(p, call, [this.spreadPick(p, live, pol.mode)]);
      case 'hash': {
        let id: string | undefined;
        if (pol.ring) id = pol.ring(call.key);
        else if (all.length) id = all[call.key % all.length].to;
        const l = all.find((x) => x.to === id);
        return this.forward(p, call, [l && l.up ? l : undefined]);
      }
      case 'failover':
        return this.forward(p, call, [live[0]]);
      case 'fanout': {
        const need = Math.min(pol.need ?? all.length, all.length);
        return this.forward(p, call, all.filter((l) => l.up), need);
      }
      case 'async': {
        this.hooks.serve?.(p, call, this.now);
        this.answer(call, true);
        const l = this.spreadPick(p, live);
        if (l) {
          const child = this.newCall(l.to, call.key);
          child.detached = true;
          this.send(l, child, 'request');
        }
        return;
      }
    }
  }

  private spreadPick(p: Part, live: Link[], mode: 'round-robin' | 'random' | 'least' = 'round-robin'): Link | undefined {
    if (!live.length) {
      // Not checking health, a part keeps sending to the next in turn even if it is down.
      const all = this.out.get(p.id)!.filter((l) => l.up);
      if (!all.length) return undefined;
      return all[p.turn++ % all.length];
    }
    if (mode === 'random') return live[Math.floor(this.rng() * live.length)];
    if (mode === 'least') {
      let best = live[0];
      let load = Infinity;
      for (const l of live) {
        const t = this.part(l.to);
        const n = t.busy + t.waiting.length;
        if (n < load) [best, load] = [l, n];
      }
      return best;
    }
    return live[p.turn++ % live.length];
  }

  /** Send `call` on to the parts behind `p` and wait for `need` answers. */
  private forward(p: Part, call: Call, links: (Link | undefined)[], need = 1) {
    const sendable = links.filter((l): l is Link => !!l);
    if (sendable.length < need) return this.answer(call, false, 'unreachable');
    call.need = need;
    call.got = call.failed = 0;
    call.asked = sendable.length;
    for (const l of sendable) this.send(l, this.newCall(l.to, call.key, call), 'request');
    if (Number.isFinite(p.timeoutMs) && p.kind !== 'client' && p.kind !== 'user') {
      this.schedule({ kind: 'wait', call, t: this.now + p.timeoutMs });
    }
  }

  private send(l: Link, child: Call, what: Wire['what']) {
    this.wires.push({ from: l.from, to: l.to, sent: this.now, arrive: this.now + l.ms, what, key: child.key });
    this.schedule({ kind: 'arrive', call: child, from: l.from, t: this.now + l.ms });
  }

  /** `call` is answered at its part: send the answer back to whoever asked. */
  private answer(call: Call, ok: boolean, why?: Outcome['why']) {
    const parent = call.parent;
    if (call.detached) return; // nobody is waiting for it
    if (!parent) {
      // A client's own request: it worked through no links (or none were up).
      if (!call.settled) this.end(call, ok, ok ? undefined : why ?? 'rejected');
      return;
    }
    const l = this.link(parent.at, call.at);
    if (!l || !l.up) return; // the answer is lost
    this.wires.push({ from: call.at, to: parent.at, sent: this.now, arrive: this.now + l.ms, what: ok ? 'answer' : 'error', key: call.key });
    this.schedule({ kind: 'reply', call: parent, ok, from: call.at, t: this.now + l.ms });
  }

  private reply(call: Call, ok: boolean) {
    if (call.settled) return;
    if (!this.part(call.at).up) return;
    if (ok) call.got++;
    else call.failed++;
    if (call.got >= call.need) this.settle(call, true);
    else if (call.asked - call.failed < call.need) this.settle(call, false);
  }

  private settle(call: Call, ok: boolean) {
    call.settled = true;
    if (!call.parent) this.end(call, ok, ok ? undefined : 'rejected');
    else this.answer(call, ok);
  }

  private end(root: Call, ok: boolean, why?: Outcome['why']) {
    root.settled = true;
    const c = this.part(root.at);
    if (!ok && root.tries <= c.retries) {
      const wait = c.backoffMs * 2 ** (root.tries - 1) * (0.5 + this.rng());
      this.schedule({ kind: 'retry', call: root, t: this.now + wait });
      return;
    }
    const o: Outcome = { client: c.id, key: root.key, start: root.born, end: this.now, ok, tries: root.tries, ...(why ? { why } : {}) };
    if (ok) this.totals.ok++;
    else this.totals.failed++;
    this.outcomes.push(o);
    this.hooks.done?.(o);
  }
}
