// Lesson 3, A shorter link, a billion times: how soon random short codes
// collide (the birthday problem), the API and the one table, and the finished
// design with its read path and write path.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { liveDiagram, statsLine, type PartSpec } from './diagram';
import { axes, COL, figure, frame, guessFirst, named, pick, slider } from './kit';

/** How many codes `len` characters from an alphabet of `alpha` symbols can make. */
export const keySpace = (alpha: number, len: number) => Math.pow(alpha, len);

/** The chance that `n` codes drawn at random from `space` include at least one pair that are the same. */
export const collisionChance = (n: number, space: number) => 1 - Math.exp(-(n * (n - 1)) / (2 * space));

/** How many random codes give an even chance of a collision: about 1.18 √space. */
export const evenChance = (space: number) => Math.sqrt(2 * space * Math.LN2);

/** Expected number of pairs that collide among `n` random codes. */
export const expectedPairs = (n: number, space: number) => (n * (n - 1)) / (2 * space);

/** The service's numbers, worked from 100 million new links a month. */
export function shortenerEstimate(newPerMonth = 100e6, readsPerWrite = 100, bytesPerRow = 500, years = 5) {
  const writes = newPerMonth / (30 * 86_400);
  const reads = writes * readsPerWrite;
  const rows = newPerMonth * 12 * years;
  return { writes, reads, rows, bytes: rows * bytesPerRow };
}

const say = (n: number) => (n >= 1e12 ? `${Number((n / 1e12).toPrecision(2))} trillion` : n >= 1e9 ? `${Number((n / 1e9).toPrecision(2))} billion` : n >= 1e6 ? `${Number((n / 1e6).toPrecision(2))} million` : n >= 1e3 ? `${Number((n / 1e3).toPrecision(2))} thousand` : `${Math.round(n)}`);

const W = 440;
const ALPHABETS = [10, 36, 62] as const;

export const FIGS = {
  'tinyurl-keys': figure(['guess'], (_ctx, t) => {
    const f = frame(W, 236, 3);
    const g = svg('g');
    f.svg.append(g);
    let alpha = 62;
    let len = 7;
    let links = 6e9;
    const ax = axes({
      x: 50, y: 24, w: 350, h: 170, xmin: 3, xmax: 13, ymin: 0, ymax: 1,
      xticks: [3, 5, 7, 9, 11, 13], yticks: [0, 0.5, 1],
      xfmt: (v) => say(10 ** v), yfmt: (v) => `${v * 100}%`,
      xlabel: 'codes handed out at random', ylabel: 'chance any two match', ink: COL.ink, grid: COL.grid,
    });
    const paint = () => {
      const N = keySpace(alpha, len);
      const curve = Array.from({ length: 201 }, (_, i) => {
        const lx = 3 + i * 0.05;
        return [lx, collisionChance(10 ** lx, N)] as [number, number];
      });
      const half = evenChance(N);
      const lx = Math.log10(links);
      const parts: SVGElement[] = [...ax.parts];
      if (open()) {
        parts.push(ax.path(curve, COL.error, 2));
        if (Math.log10(half) <= 13) parts.push(line(ax.X(Math.log10(half)), 24, ax.X(Math.log10(half)), 194, COL.error, 1, { 'stroke-dasharray': '3 3' }), small(ax.X(Math.log10(half)) + 4, 36, `50% at ${say(half)}`, { fill: COL.error }));
        parts.push(line(ax.X(lx), 24, ax.X(lx), 194, COL.request, 1.5), small(ax.X(lx) - 4, 186, `${say(links)} links`, { anchor: 'end', fill: COL.request, halo: COL.paper }));
        f.readout.textContent = `${alpha}^${len} = ${say(N)} codes. Drawn at random, the chance that any two match reaches 50% after ${say(half)}. At ${say(links)} links: ${Math.round(collisionChance(links, N) * 1000) / 10}% chance of at least one repeat, about ${say(expectedPairs(links, N))} repeats expected.`;
      }
      redraw(g, ...parts);
    };
    const ab = named(pick(ALPHABETS.map((a) => (a === 10 ? '0–9' : a === 36 ? 'a–z, 0–9' : 'a–z, A–Z, 0–9')), 2, (i) => { alpha = ALPHABETS[i]; paint(); }), 'Symbols:');
    const ls = slider('Code length', 4, 10, 1, len, (v) => `${v} characters`, (v) => { len = v; paint(); }, 'data');
    const ns = slider('Links handed out', { min: 1e3, max: 1e13, value: links, scale: 'log', show: say, onInput: (v) => { links = v; paint(); }, color: 'request' });
    f.controls.append(ab.node, ls.node, ns.node);
    const open = guessFirst(t, f, {
      ask: 'Seven characters from 62 symbols make 3.5 trillion codes. If each new link gets a code at random, after how many links is there an even chance that any two of them share a code?',
      options: ['About 2,000', 'About 2 million', 'About 2 billion', 'About 1.7 trillion'],
      answer: 1,
      sliders: [ls, ns],
      hidden: [ab.node],
      after: () => {
        paint();
        if (t.goal === 'guess') t.done();
      },
    });
    paint();
    return f.node;
  }),

  'tinyurl-api': () => {
    const s = still(W, 300);
    const mono = { attrs: { style: 'font-family: ui-monospace, Menlo, Consolas, monospace' } };
    const p: SVGElement[] = [
      small(16, 20, 'Create', { bold: true }),
      small(16, 40, 'POST /links   {"url": "https://example.org/a/long/path?with=args"}', { ...mono, fill: COL.write }),
      small(16, 58, '← 201 Created   {"code": "aZ3kQ9x"}', { ...mono, fill: COL.answer }),
      small(16, 88, 'Redirect', { bold: true }),
      small(16, 108, 'GET /aZ3kQ9x', { ...mono, fill: COL.request }),
      small(16, 126, '← 301 Moved Permanently   Location: https://example.org/a/long/…', { ...mono, fill: COL.answer }),
      line(16, 146, W - 16, 146, COL.grid, 1),
      small(16, 166, 'Table links, one row per code, read by its primary key', { bold: true, fill: COL.data }),
    ];
    const rows: [string, string, string][] = [
      ['code', 'CHAR(7), primary key', '7 B'],
      ['url', 'TEXT', 'about 200 B'],
      ['owner', 'BIGINT, may be empty', '8 B'],
      ['created', 'TIMESTAMP', '8 B'],
      ['expires', 'TIMESTAMP, may be empty', '8 B'],
    ];
    rows.forEach(([a, b, c], i) => {
      const y = 188 + i * 18;
      p.push(small(28, y, a, { ...mono, bold: true }), small(110, y, b, mono), small(W - 16, y, c, { anchor: 'end', soft: true }));
    });
    p.push(small(16, 290, 'With the index and the database\'s own overhead, call it 500 B a row.', { soft: true }));
    s.svg.append(...p);
    return { node: s.node };
  },

  'tinyurl-flow': figure(['both'], (ctx, t) => {
    let mode = 0;
    const apps = [0, 1, 2];
    const common = (): PartSpec[] => [
      { id: 'lb', kind: 'lb', label: 'Balancer', x: 140, y: 120, health: true, servers: 8 },
      ...apps.map((i): PartSpec => ({ id: `a${i}`, kind: 'server', label: `App ${i + 1}`, x: 250, y: 50 + i * 70, serviceMs: 3, servers: 4 })),
      { id: 'db', kind: 'db', label: 'Database', x: 395, y: 190, serviceMs: 4, servers: 4 },
      { id: 'keys', kind: 'service', label: 'Key ranges', x: 395, y: 50, serviceMs: 2 },
    ];
    const reads = () => ({
      parts: [
        { id: 'users', kind: 'client', label: 'Readers', x: 44, y: 120, rps: 40, keys: 5000, skew: 1.1 } as PartSpec,
        ...common().map((p) => (p.id.startsWith('a') ? { ...p, policy: { type: 'spread' as const } } : p)),
        { id: 'cache', kind: 'cache', label: 'Cache', x: 395, y: 120, policy: { type: 'cache', hit: 0.9 }, serviceMs: 0.5, servers: 4 } as PartSpec,
      ],
      links: [
        { from: 'users', to: 'lb', ms: 25 },
        ...apps.map((i) => ({ from: 'lb', to: `a${i}`, ms: 12 })),
        ...apps.map((i) => ({ from: `a${i}`, to: 'cache', ms: 12 })),
        { from: 'cache', to: 'db', ms: 12 },
      ],
      seed: 4,
    });
    const writes = () => ({
      parts: [
        { id: 'users', kind: 'client', label: 'Writers', x: 44, y: 120, rps: 10 } as PartSpec,
        ...common().map((p) => (p.id.startsWith('a') ? { ...p, policy: { type: 'hash' as const, ring: (k: number) => (k % 20 === 0 ? 'keys' : 'db') } } : p)),
        { id: 'cache', kind: 'cache', label: 'Cache', x: 395, y: 120 } as PartSpec,
      ],
      links: [
        { from: 'users', to: 'lb', ms: 25 },
        ...apps.map((i) => ({ from: 'lb', to: `a${i}`, ms: 12 })),
        ...apps.map((i) => ({ from: `a${i}`, to: 'db', ms: 12 })),
        ...apps.map((i) => ({ from: `a${i}`, to: 'keys', ms: 12 })),
      ],
      seed: 5,
    });
    const d = liveDiagram(ctx, reads(), {
      w: W, h: 240, lines: 3, speed: 120, tap: 'parts', fixed: ['users'],
      onFrame: (sys) => {
        const lead = mode === 0
          ? 'Redirects: the cache answers nine in ten, so the database sees a tenth of the reads.'
          : 'New links: each app server takes codes from a block it holds and asks for a new block when it runs out.';
        d.f.readout.textContent = `${lead} ${statsLine(sys.stats(3000))}`;
      },
    });
    const m = named(pick(['Redirects', 'New links'], 0, (i) => {
      mode = i;
      d.rebuild(i ? writes() : reads());
      if (i === 1 && t.goal === 'both') t.done();
    }), 'Show:');
    d.f.controls.append(m.node);
    return d.f.node;
  }),
};
