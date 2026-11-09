// Lesson 5, A cache in spare memory: what memcached keeps and says on the
// wire, cache-aside with its hit-rate arithmetic, the race that setting the
// cache on a write loses, and keys moving when a server is added (mod N
// against a ring).

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { modulo, moved, Ring, spot } from 'sysdiagram/ring';
import { sequenceView, type Mark, type Message } from 'sysdiagram/sequence';
import { liveDiagram, SEQUENCE, type PartSpec } from './diagram';
import { button, COL, figure, frame, guessFirst, named, pick, player, slider } from './kit';

/** Database reads a second and mean read latency (ms) with a cache of hit rate `h` in front. */
export function cacheAside(reads: number, h: number, cacheMs = 0.5, dbMs = 10) {
  return { db: reads * (1 - h), mean: h * cacheMs + (1 - h) * dbMs };
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

/** Share of keys that move going from `a` servers to `b`, by `key mod n` or on a ring. */
export function keysMoved(a: number, b: number, scheme: 'mod' | 'ring', keys = 10_000): number {
  if (scheme === 'mod') return moved(keys, modulo(names(a)), modulo(names(b)));
  const ra = new Ring(names(a));
  const rb = new Ring(names(b));
  return moved(keys, (k) => ra.owner(k), (k) => rb.owner(k));
}

export interface Race {
  messages: Message[];
  marks: Mark[];
  /** What the database and the cache hold at the end. */
  db: string;
  cache: string;
  end: number;
}

/**
 * Two writers update one row. A writes v1, then pauses; B writes v2 and
 * updates the cache at once. With `set`, A's late set leaves v1 in the cache
 * while the database holds v2. With `delete`, both delete the cache entry and
 * the next read fills it from the database.
 */
export function cacheRace(mode: 'set' | 'delete'): Race {
  const messages: Message[] = [
    { from: 'a', to: 'db', send: 0, arrive: 10, label: 'UPDATE v1', color: COL.write },
    { from: 'db', to: 'a', send: 12, arrive: 22, label: 'ok', color: COL.answer },
    { from: 'b', to: 'db', send: 16, arrive: 26, label: 'UPDATE v2', color: COL.write },
    { from: 'db', to: 'b', send: 28, arrive: 38, label: 'ok', color: COL.answer },
  ];
  const marks: Mark[] = [
    { lane: 'db', at: 10, text: 'v1', color: COL.data },
    { lane: 'db', at: 26, text: 'v2', color: COL.data },
    { lane: 'a', at: 44, text: 'paused', color: COL.clock },
  ];
  if (mode === 'set') {
    messages.push(
      { from: 'b', to: 'cache', send: 38, arrive: 48, label: 'set v2', color: COL.cache },
      { from: 'a', to: 'cache', send: 70, arrive: 80, label: 'set v1', color: COL.cache },
    );
    marks.push({ lane: 'cache', at: 48, text: 'v2', color: COL.cache }, { lane: 'cache', at: 80, text: 'v1, stale', color: COL.error });
    return { messages, marks, db: 'v2', cache: 'v1', end: 80 };
  }
  messages.push(
    { from: 'b', to: 'cache', send: 38, arrive: 48, label: 'delete', color: COL.cache },
    { from: 'a', to: 'cache', send: 70, arrive: 80, label: 'delete', color: COL.cache },
    { from: 'b', to: 'cache', send: 96, arrive: 106, label: 'get', color: COL.request },
    { from: 'cache', to: 'b', send: 107, arrive: 117, label: 'miss', color: COL.busy },
    { from: 'b', to: 'db', send: 117, arrive: 127, label: 'SELECT', color: COL.request },
    { from: 'db', to: 'b', send: 129, arrive: 139, label: 'v2', color: COL.answer },
    { from: 'b', to: 'cache', send: 139, arrive: 149, label: 'set v2', color: COL.cache },
  );
  marks.push({ lane: 'cache', at: 48, text: 'empty', color: COL.cache }, { lane: 'cache', at: 149, text: 'v2', color: COL.cache });
  return { messages, marks, db: 'v2', cache: 'v2', end: 149 };
}

const W = 440;
const READS = 20_000;
const DB_CAP = 4_000;

export const FIGS = {
  'memcached-wire': () => {
    const s = still(W, 300);
    const mono = { attrs: { style: 'font-family: ui-monospace, Menlo, Consolas, monospace' } };
    const p: SVGElement[] = [small(16, 20, 'On the wire: lines of text over TCP', { bold: true })];
    const talk: [string, string, keyof typeof COL][] = [
      ['set entry:4417 0 300 5120', 'write 5,120 bytes, keep 300 s', 'cache'],
      ['STORED', '', 'answer'],
      ['get entry:4417', 'a hit', 'request'],
      ['VALUE entry:4417 0 5120 … END', '', 'answer'],
      ['get entry:9999', 'a miss', 'request'],
      ['END', 'nothing there: go to the database', 'busy'],
      ['delete entry:4417', '', 'cache'],
      ['DELETED', '', 'answer'],
    ];
    talk.forEach(([a, b, c], i) => {
      const y = 42 + i * 17;
      p.push(small(i % 2 ? 36 : 16, y, a, { ...mono, fill: COL[c] }));
      if (b) p.push(small(W - 16, y, b, { anchor: 'end', soft: true }));
    });
    // In memory: a hash table of items, each on a least-recently-used list.
    const y0 = 196;
    p.push(small(16, y0, 'In memory: a hash table of items, oldest-used evicted first', { bold: true }));
    for (let i = 0; i < 6; i++) {
      const x = 22 + i * 24;
      p.push(svg('rect', { x, y: y0 + 12, width: 22, height: 18, fill: COL.paper, stroke: COL.cache, 'stroke-width': 1 }));
    }
    p.push(small(22, y0 + 46, 'buckets', { soft: true }));
    const items = [['entry:4417', '5 KB'], ['user:88', '300 B'], ['friends:88', '2 KB']];
    items.forEach(([k, v], i) => {
      const x = 190 + i * 82;
      p.push(svg('rect', { x, y: y0 + 8, width: 76, height: 40, rx: 3, fill: COL.paper, stroke: COL.cache, 'stroke-width': 1.3 }));
      p.push(small(x + 5, y0 + 22, k, { ...mono, fill: COL.cache }), small(x + 5, y0 + 38, `${v}, expiry`, { soft: true }));
      if (i) p.push(line(x - 6, y0 + 28, x, y0 + 28, COL.soft, 1.2));
    });
    p.push(line(166, y0 + 21, 190, y0 + 21, COL.soft, 1, { 'stroke-dasharray': '3 2' }));
    p.push(small(190, y0 + 66, 'most recently used  →  least recently used', { soft: true }));
    p.push(small(16, y0 + 92, 'No disk, no copies, no talk between servers: the client picks the server by hashing the key.', { soft: true }));
    s.svg.append(...p);
    return { node: s.node };
  },

  'memcached-flow': figure(['ninetynine'], (ctx, t) => {
    let h = 0.9;
    const SCALE = 200;
    const parts: PartSpec[] = [
      { id: 'users', kind: 'client', label: 'Readers', x: 50, y: 90, rps: READS / SCALE, timeoutMs: 5000 },
      { id: 'web', kind: 'server', label: 'Web', x: 160, y: 90, servers: 16, serviceMs: 2 },
      { id: 'cache', kind: 'cache', label: 'memcached', x: 280, y: 90, servers: 16, serviceMs: 0.5, policy: { type: 'cache', hit: h } },
      // The database manages DB_CAP real reads a second: DB_CAP / SCALE in the drawing, over 2 servers.
      { id: 'db', kind: 'db', label: 'Database', x: 390, y: 90, servers: 2, serviceMs: (2 * 1000) / (DB_CAP / SCALE) },
    ];
    const links = [
      { from: 'users', to: 'web', ms: 20 },
      { from: 'web', to: 'cache', ms: 15 },
      { from: 'cache', to: 'db', ms: 15 },
    ];
    const d = liveDiagram(ctx, { parts, links, seed: 8 }, {
      w: W, h: 150, lines: 3, speed: 150,
      onFrame: () => {
        if (!open()) return;
        const c = cacheAside(READS, h);
        d.f.readout.textContent = `Hit rate ${Math.round(h * 1000) / 10}%: the database gets ${Math.round(c.db).toLocaleString('en-US')} of the 20,000 reads a second, ${Math.round((c.db / DB_CAP) * 100)}% of what it can take. Mean read ${c.mean.toFixed(2)} ms (0.5 ms a hit, 10 ms a miss).`;
      },
    });
    const hs = slider('Hit rate', 0, 99.5, 0.5, h * 100, (v) => `${v}%`, (v) => {
      h = v / 100;
      const p = d.sys.part('cache');
      p.policy = { type: 'cache', hit: h };
      if (h >= 0.99 && t.goal === 'ninetynine') t.done();
    }, 'cache');
    d.f.controls.append(hs.node);
    const open = guessFirst(t, d.f, {
      ask: 'A cache answers 90% of reads. Raise its hit rate to 99%. What happens to the load on the database behind it?',
      options: ['It falls by about a tenth', 'It halves', 'It falls to a tenth'],
      answer: 2,
      sliders: [hs],
      after: () => {},
    });
    return d.f.node;
  }),

  'memcached-race': figure(['delete'], (ctx, t) => {
    const f = frame(W, 300, 3);
    const lanes = [
      { id: 'a', label: 'Writer A' },
      { id: 'b', label: 'Writer B' },
      { id: 'db', label: 'Database' },
      { id: 'cache', label: 'Cache' },
    ];
    const T = 160;
    const view = sequenceView(f.svg, { x: 0, y: 4, w: W, h: 292, lanes, tMax: T, colors: SEQUENCE });
    let mode: 'set' | 'delete' = 'set';
    let run = cacheRace(mode);
    let now = T;
    const paint = () => {
      view.draw(run.messages, run.marks, now);
      if (now < run.end) f.readout.textContent = mode === 'set'
        ? 'Each writer updates the database, then puts its new value in the cache. A is paused for a moment between the two (a garbage collection, a slow network).'
        : 'Each writer updates the database, then deletes the cache entry. The next read misses and fills the cache from the database.';
      else f.readout.textContent = mode === 'set'
        ? 'The database holds v2 but the cache holds v1, and keeps serving it until it expires or the row changes again.'
        : 'The cache holds v2, the same as the database. Deletes can arrive in either order and still agree.';
      if (now >= run.end && mode === 'delete' && t.goal === 'delete') t.done();
    };
    const ts = slider('Time', 0, T, 1, T, (v) => `${Math.round(v)} ms`, (v) => { now = v; paint(); }, 'clock');
    const play = player(ts, ctx, { seconds: 8 });
    const m = named(pick(['Set on write', 'Delete on write'], 0, (i) => {
      mode = i ? 'delete' : 'set';
      run = cacheRace(mode);
      ts.set(0);
      play.play();
    }), 'Writers:');
    f.controls.append(play.node, ts.node, m.node);
    paint();
    return f.node;
  }),

  'memcached-ring': figure(['both'], (_ctx, t) => {
    const f = frame(W, 300, 3);
    const g = svg('g');
    f.svg.append(g);
    let n = 10;
    let scheme: 'mod' | 'ring' = 'mod';
    let movedKeys = new Set<number>();
    let tried = { mod: false, ring: false };
    const KEYS = 240;
    const cx = 150;
    const cy = 150;
    const r = 118;
    const pt = (at: number, rr = r): [number, number] => [cx + rr * Math.sin(at * 2 * Math.PI), cy - rr * Math.cos(at * 2 * Math.PI)];
    const owner = (k: number, m: number) => (scheme === 'mod' ? `s${k % m}` : new Ring(names(m)).owner(k));
    const paint = () => {
      const parts: SVGElement[] = [svg('circle', { cx, cy, r, fill: 'none', stroke: COL.grid, 'stroke-width': 6 })];
      for (let k = 0; k < KEYS; k++) {
        const [x, y] = pt(spot(`k${k}`), r);
        parts.push(svg('circle', { cx: x, cy: y, r: 2.6, fill: movedKeys.has(k) ? COL.busy : COL.cache }));
      }
      if (scheme === 'ring') {
        for (const s of names(n)) {
          const at = spot(`${s}#0`);
          const [x, y] = pt(at, r);
          const [lx, ly] = pt(at, r + 16);
          const fresh = s === `s${n - 1}` && movedKeys.size > 0;
          parts.push(svg('circle', { cx: x, cy: y, r: 6, fill: fresh ? COL.paper : COL.ink, stroke: COL.ink, 'stroke-width': fresh ? 2.5 : 0 }), small(lx, ly + 3, String(Number(s.slice(1)) + 1), { anchor: 'middle', bold: true }));
        }
      } else {
        parts.push(small(cx, cy - 6, 'server = key mod n', { anchor: 'middle', soft: true }), small(cx, cy + 10, '(keys drawn where they hash)', { anchor: 'middle', soft: true }));
      }
      const share = movedKeys.size / KEYS;
      parts.push(
        small(300, 40, `${n} servers`, { bold: true }),
        small(300, 60, scheme === 'mod' ? 'Placing keys by key mod n' : 'Placing keys on a ring', { soft: true }),
        svg('circle', { cx: 304, cy: 92, r: 4, fill: COL.cache }), small(314, 96, 'key stayed: still a hit'),
        svg('circle', { cx: 304, cy: 112, r: 4, fill: COL.busy }), small(314, 116, 'key moved: now a miss'),
        small(300, 160, movedKeys.size ? `${Math.round(share * 100)}% of keys moved` : 'Add a server', { bold: true, fill: movedKeys.size ? COL.busy : COL.ink }),
      );
      redraw(g, ...parts);
    };
    const change = (to: number) => {
      const from = n;
      n = to;
      movedKeys = new Set(Array.from({ length: KEYS }, (_, k) => k).filter((k) => owner(k, from) !== owner(k, to)));
      const all = keysMoved(from, to, scheme);
      f.readout.textContent = `From ${from} to ${to} servers: ${Math.round(all * 100)}% of keys now live on a different server, and each of those is a miss that goes to the database. ${scheme === 'mod' ? 'With mod n almost every key moves.' : `On a ring only the keys on the ${to > from ? 'new' : 'removed'} server's arc move, on average 1/${Math.max(from, to)} of them.`}`;
      if (to > from) tried = { ...tried, [scheme]: true };
      paint();
      if (tried.mod && tried.ring && t.goal === 'both') t.done();
    };
    const sc = named(pick(['mod n', 'Ring'], 0, (i) => {
      scheme = i ? 'ring' : 'mod';
      n = 10;
      movedKeys = new Set();
      f.readout.textContent = 'Ten servers, each key on one of them. Add a server and see which keys move.';
      paint();
    }), 'Place keys by:');
    const add = button('Add a server', () => n < 16 && change(n + 1));
    const remove = button('Remove a server', () => n > 3 && change(n - 1));
    const row = document.createElement('div');
    row.className = 'chips';
    row.append(add, remove);
    f.controls.append(sc.node, row);
    f.readout.textContent = 'Ten servers, each key on one of them. Add a server and see which keys move.';
    paint();
    return f.node;
  }),
};
