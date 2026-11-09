// Lesson 21, zanzibar: the new-enemy problem and the zookie that fixes it,
// and check servers whose caches are filled by routing each object to one
// server, with the hottest objects spread over all of them.

import type { Lane, Mark, Message } from 'sysdiagram/sequence';
import { Ring } from 'sysdiagram/ring';
import { liveDiagram, statsLine, type PartSpec } from './diagram';
import { msg, seqFigure, type Script } from './leases';
import { COL, figure, named, pick, slider, toggles } from './kit';

// ---------------------------------------------------------------------------
// The new enemy. Alice removes Bob from a folder, then puts a secret
// document in it. Bob opens the document; the check is answered at a
// snapshot of the permissions. Without a zookie the snapshot may be older
// than the removal.

/** What Bob gets, and the snapshot his check is evaluated at, against the time Bob was removed. */
export function enemyOutcome(zookie: boolean): { bobSees: boolean; removedAt: number; snapshot: number } {
  const removedAt = 14;
  // Without a token the server picks a snapshot a little in the past, cheap to serve from its replica and cache.
  const snapshot = zookie ? 40 : 4;
  return { bobSees: snapshot < removedAt, removedAt, snapshot };
}

export function enemyScript(zookie: boolean): Script {
  const o = enemyOutcome(zookie);
  const lanes: Lane[] = [
    { id: 'alice', label: 'Alice' },
    { id: 'drive', label: 'Drive' },
    { id: 'z', label: 'Zanzibar' },
    { id: 'bob', label: 'Bob' },
  ];
  const W = COL.write;
  const R = COL.request;
  const messages: Message[] = [
    msg('alice', 'drive', 0, 5, 'remove Bob', W),
    msg('drive', 'z', 6, 6, 'delete tuple', W),
    msg('z', 'drive', 16, 6, 'ok', COL.answer),
    msg('alice', 'drive', 26, 5, 'add plan.doc', W),
  ];
  const marks: Mark[] = [{ lane: 'z', at: 14, text: `t=${o.removedAt}: Bob removed`, color: COL.clock }];
  if (zookie) {
    messages.push(msg('drive', 'z', 32, 5, 'content changed', W), msg('z', 'drive', 39, 5, 'zookie ≥ 40', COL.clock));
    marks.push({ lane: 'drive', at: 45, text: 'keeps zookie with doc', color: COL.clock });
  } else {
    marks.push({ lane: 'drive', at: 33, text: 'saves doc', color: COL.ink });
  }
  messages.push(
    msg('bob', 'drive', 52, 5, 'open plan.doc', R),
    msg('drive', 'z', 58, 6, zookie ? 'check, zookie' : 'check Bob', R),
  );
  marks.push({
    lane: 'z',
    at: 66,
    text: zookie ? 'snapshot ≥ 40: no Bob' : `snapshot t=${o.snapshot}: Bob in`,
    color: o.bobSees ? COL.error : COL.answer,
  });
  messages.push(
    msg('z', 'drive', 68, 6, o.bobSees ? 'allowed' : 'denied', o.bobSees ? COL.error : COL.answer),
    msg('drive', 'bob', 76, 5, o.bobSees ? 'the document' : 'no access', o.bobSees ? COL.error : COL.answer),
  );
  const story: Script['story'] = [
    { at: 0, text: 'Alice owns a shared folder. She removes Bob from its viewers; Drive writes the change to Zanzibar, which commits it at time 14.' },
    { at: 26, text: 'Now that Bob is out, Alice adds a plan he must not see to the folder.' },
    zookie
      ? { at: 32, text: 'Drive tells Zanzibar the content changed and gets back a zookie: a token holding a timestamp at least as late as every permission change before it. Drive stores it with the document.' }
      : { at: 32, text: 'Drive saves the document. Nothing records which version of the permissions it was added under.' },
    { at: 52, text: 'Bob, who still has the link, opens the document. Drive asks Zanzibar whether he may view it.' },
    zookie
      ? { at: 58, text: 'The check carries the zookie, so Zanzibar must answer at a snapshot no older than 40. That snapshot has the removal: denied.' }
      : { at: 58, text: 'With no token, Zanzibar answers from a snapshot a few moments old, cheap to serve from a nearby replica and its cache. That snapshot is from before the removal, so Bob is still a viewer.' },
    o.bobSees
      ? { at: 74, text: 'Bob reads the plan. Each step was correct for the snapshot it used; the snapshot was older than a change the document depended on.' }
      : { at: 74, text: 'Bob is refused. Checks without a zookie can still use older snapshots; only content that depends on a recent change carries one.' },
  ];
  return { lanes, messages, marks, tMax: 86, story };
}

// ---------------------------------------------------------------------------
// Serving checks: an app sends checks on objects whose popularity is
// Zipf-skewed; four check servers each cache the answers for CAP objects;
// misses read from Spanner. Routing decides which server's cache sees which
// objects.

export const OBJECTS = 2000;
export const CAP = 100;
export const SERVERS = ['s1', 's2', 's3', 's4'] as const;
/** The objects counted as hot: in the drawing, the three most checked. */
export const HOT = 3;
export type Routing = 'any' | 'hash' | 'spread';
export const ROUTINGS: Routing[] = ['any', 'hash', 'spread'];

const ring = new Ring([...SERVERS], 64);
/** The server an object belongs to under consistent hashing. */
export const ownerOf = (key: number) => ring.owner(key);

/** Zipf probabilities over n objects. */
export function zipfProbs(n: number, s: number): number[] {
  const w = Array.from({ length: n }, (_, k) => 1 / Math.pow(k + 1, s));
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}

/**
 * The steady state of each routing, worked out exactly: each server's share
 * of checks, and the share answered from cache when each server keeps the
 * CAP objects it sees most.
 */
export function routeLoad(routing: Routing, skew: number, n = OBJECTS, cap = CAP): { shares: number[]; hit: number } {
  const p = zipfProbs(n, skew);
  const seen = SERVERS.map(() => new Map<number, number>());
  for (let k = 0; k < n; k++) {
    if (routing === 'any' || (routing === 'spread' && k < HOT)) seen.forEach((m) => m.set(k, p[k] / SERVERS.length));
    else seen[SERVERS.indexOf(ownerOf(k) as (typeof SERVERS)[number])].set(k, p[k]);
  }
  const shares = seen.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  let hit = 0;
  for (const m of seen) hit += [...m.values()].sort((a, b) => b - a).slice(0, cap).reduce((a, b) => a + b, 0);
  return { shares, hit };
}

/** One server's cache: the objects it holds, least recently used first. */
class Lru {
  private m = new Map<number, true>();
  constructor(private cap: number) {}
  has(k: number): boolean {
    if (!this.m.has(k)) return false;
    this.m.delete(k);
    this.m.set(k, true);
    return true;
  }
  add(k: number) {
    this.m.delete(k);
    this.m.set(k, true);
    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value!);
  }
}

const ROUTE_NAMES = ['Any server', 'By object', 'By object, hot ones spread'];
const ROUTE_TEXT = [
  'Each check goes to any server, so every cache holds the same popular objects.',
  'Each object goes to one server by consistent hashing, so the four caches hold different objects.',
  'By object, except the three most checked, which any server may answer.',
];

function flowFigure(ctx: Parameters<Parameters<typeof figure>[1]>[0], t: Parameters<Parameters<typeof figure>[1]>[1]) {
  let routing: Routing = 'any';
  let skew = 0.8;
  let caches = SERVERS.map(() => new Lru(CAP));
  let log: { t: number; hit: boolean; at: number }[] = [];
  const route = (key: number) => {
    if (routing === 'hash' || key >= HOT) return ownerOf(key);
    return SERVERS[Math.floor(Math.random() * SERVERS.length)];
  };
  const parts = (): PartSpec[] => [
    { id: 'apps', kind: 'client', label: 'Products', x: 52, y: 125, rps: 260, keys: OBJECTS, skew, timeoutMs: 3000 },
    {
      id: 'route', kind: 'lb', label: 'Router', x: 165, y: 125,
      policy: routing === 'any' ? { type: 'spread', mode: 'random' } : { type: 'hash', ring: route },
    },
    ...SERVERS.map((id, i): PartSpec => ({
      id, kind: 'server', label: `Check ${i + 1}`, x: 300, y: 35 + i * 60, serviceMs: 8, servers: 1, queue: 60,
      policy: {
        type: 'cache',
        hot: (key) => {
          const hit = caches[i].has(key);
          log.push({ t: d?.sys.now ?? 0, hit, at: i });
          return hit;
        },
      },
    })),
    { id: 'spanner', kind: 'db', label: 'Spanner', x: 460, y: 125, serviceMs: 10, servers: 40 },
  ];
  const links = [
    { from: 'apps', to: 'route', ms: 15 },
    ...SERVERS.map((id) => ({ from: 'route', to: id, ms: 5 })),
    ...SERVERS.map((id) => ({ from: id, to: 'spanner', ms: 30 })),
  ];
  const hook = () => {
    d.sys.hooks.serve = (part, call) => {
      if (part.id !== 'spanner' || !call.parent) return;
      const i = SERVERS.indexOf(call.parent.at as (typeof SERVERS)[number]);
      if (i >= 0) caches[i].add(call.key);
    };
  };
  const d = liveDiagram(ctx, { parts: parts(), links, seed: 5 }, {
    w: 520, h: 250, lines: 4, speed: 200,
    sub: (p) => {
      const i = SERVERS.indexOf(p.id as (typeof SERVERS)[number]);
      if (i < 0) return undefined;
      const recent = log.filter((e) => e.at === i);
      return recent.length ? `${Math.round((recent.filter((e) => e.hit).length / recent.length) * 100)}% hits` : undefined;
    },
    onFrame: (sys) => {
      log = log.filter((e) => e.t >= sys.now - 3000);
      const n = log.length || 1;
      const hits = log.filter((e) => e.hit).length;
      const per = SERVERS.map((_, i) => log.filter((e) => e.at === i).length);
      const busiest = Math.max(...per) / n;
      const reads = ((n - hits) / Math.min(3, Math.max(sys.now, 1) / 1000));
      d.f.readout.textContent = `${ROUTE_TEXT[ROUTINGS.indexOf(routing)]} Cache hits ${Math.round((hits / n) * 100)}%, Spanner reads ${Math.round(reads)} a second, busiest server ${Math.round(busiest * 100)}% of checks. ${statsLine(sys.stats(3000))}`;
    },
  });
  hook();
  const rebuild = () => {
    caches = SERVERS.map(() => new Lru(CAP));
    log = [];
    d.rebuild({ parts: parts(), links, seed: 5 });
    hook();
    if (t.goal === 'spread' && routing === 'spread' && skew >= 1.2) t.done();
  };
  const r = named(pick(ROUTE_NAMES, 0, (i) => {
    routing = ROUTINGS[i];
    rebuild();
  }), 'Route:');
  const s = slider('Skew', 0, 1.4, 0.1, skew, (v) => (v === 0 ? 'even' : `s = ${v.toFixed(1)}`), (v) => {
    skew = v;
    rebuild();
  }, 'request');
  d.f.controls.append(r.node, s.node);
  return d.f.node;
}

export const FIGS = {
  'zanzibar-enemy': figure(['token'], (ctx, t) => {
    let zookie = false;
    const s = seqFigure(ctx, {
      w: 540, h: 290, lines: 4, seconds: 12,
      script: () => enemyScript(zookie),
      onTime: (now) => {
        if (t.goal === 'token' && zookie && now >= 80) t.done();
      },
    });
    const opts = toggles(['Carry a zookie'], [false], (on) => {
      [zookie] = on;
      s.redo();
    });
    s.f.controls.prepend(opts.node);
    return s.f.node;
  }),
  'zanzibar-flow': figure(['spread'], (ctx, t) => flowFigure(ctx, t)),
};
