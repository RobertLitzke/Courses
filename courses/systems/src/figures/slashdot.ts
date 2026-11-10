// Lesson 2, The link that took a website down: one HTTPS request laid out in
// time, a single server whose waiting time grows as it nears full load, and
// a web tier in front of a database where one box saturates first.

import { svg } from 'didactics/dom';
import { line, redraw, small, still } from 'didactics/draw';
import { mm1Quantile, mm1Time } from 'sysdiagram/queueing';
import { duration } from 'sysdiagram/numbers';
import { liveDiagram, statsLine, System, type PartSpec } from './diagram';
import { axes, COL, figure, guessFirst, legend, slider, type ColorKey } from './kit';

/** One HTTPS request from Seattle to a server in Virginia, ms: [label, start, end, colour]. */
export const REQUEST: readonly (readonly [string, number, number, ColorKey])[] = [
  ['DNS lookup', 0, 30, 'request'],
  ['TCP handshake: one round trip', 30, 100, 'request'],
  ['TLS 1.3 handshake: one more', 100, 170, 'request'],
  ['The request crosses the country', 170, 205, 'request'],
  ['The server works', 205, 217, 'busy'],
  ['   of which a database query', 209, 212, 'data'],
  ['The reply comes back', 217, 252, 'answer'],
];

/** Utilisation over a recent window: how busy each part was in the last `windowMs` of system time. */
export class Busy {
  private marks: { t: number; busy: Map<string, number> }[] = [];
  constructor(private windowMs = 2000) {}
  sample(sys: System): Map<string, number> {
    const now = { t: sys.now, busy: new Map([...sys.parts.values()].map((p) => [p.id, p.busyMs])) };
    this.marks.push(now);
    while (this.marks.length > 2 && this.marks[1].t <= sys.now - this.windowMs) this.marks.shift();
    const old = this.marks[0];
    const out = new Map<string, number>();
    const dt = now.t - old.t;
    for (const p of sys.parts.values()) out.set(p.id, dt > 0 ? (p.busyMs - (old.busy.get(p.id) ?? 0)) / (p.servers * dt) : 0);
    return out;
  }
}

/** Time a request spends at a server that is busy a share `rho` of the time, as a multiple of its service time: 1 / (1 − ρ). */
export const slowdown = (rho: number) => mm1Time(rho, 1);

/** Little's law, solved for what a pool must hold: requests a second × seconds each. */
export const inFlight = (perSec: number, seconds: number) => perSec * seconds;

const W = 440;

/**
 * What a server doing `serviceMs` of work on requests arriving at random `rate` a second really delivers,
 * measured by running the same model for `seconds` of its own clock. A few seconds of a busy server are too
 * few to show the long-run curve (the line it builds takes seconds to come and go), so the live figure
 * measures this way, not from the slow-motion run on screen.
 */
export function measureServer(rate: number, serviceMs: number, linkMs: number, seconds = 1800, seed = 2) {
  const sys = new System({
    parts: [
      { id: 'users', kind: 'client', x: 0, y: 0, rps: rate, timeoutMs: 1e9 },
      { id: 'srv', kind: 'server', x: 1, y: 0, serviceMs, servers: 1 },
    ],
    links: [{ from: 'users', to: 'srv', ms: linkMs }],
    seed,
    keepMs: seconds * 1000,
  });
  sys.run(seconds * 1000);
  const s = sys.stats(seconds * 1000);
  return { median: s.p50 - 2 * linkMs, p99: s.p99 - 2 * linkMs, mean: s.mean - 2 * linkMs, count: s.count };
}
const SERVICE = 20;
const LINK = 25;
/** How many requests the database will hold waiting; the next one is turned away. */
export const DB_QUEUE = 40;

export const FIGS = {
  'slashdot-request': () => {
    const s = still(W, 250);
    const x0 = 150;
    const x1 = W - 14;
    const X = (ms: number) => x0 + (ms / 290) * (x1 - x0);
    const parts: SVGElement[] = [];
    for (const t of [0, 50, 100, 150, 200, 250]) parts.push(line(X(t), 14, X(t), 196, COL.grid, 1), small(X(t), 210, `${t} ms`, { anchor: 'middle', soft: true }));
    REQUEST.forEach(([what, a, b, c], i) => {
      const y = 20 + i * 25;
      parts.push(small(x0 - 6, y + 11, what.trim(), { anchor: 'end', soft: what.startsWith(' ') }));
      parts.push(svg('rect', { x: X(a), y: y + 2, width: Math.max(2, X(b) - X(a)), height: 13, rx: 2, fill: COL[c], opacity: 0.85 }));
      parts.push(small(X(b) + 4, y + 12, `${b - a} ms`, { fill: COL[c], bold: true }));
    });
    parts.push(small(x0, 236, 'A second request on the same connection: 82 ms.', { soft: true }));
    s.svg.append(...parts);
    return { node: s.node };
  },

  'slashdot-queue': figure(['ninety'], (ctx, t) => {
    let rate = 15;
    const parts: PartSpec[] = [
      { id: 'users', kind: 'client', label: 'Readers', x: 60, y: 46, rps: rate, timeoutMs: 20_000 },
      { id: 'srv', kind: 'server', label: 'Server', x: 330, y: 46, serviceMs: SERVICE, servers: 1 },
    ];
    const ax = axes({
      x: 46, y: 112, w: 370, h: 150, xmin: 0, xmax: 1, ymin: 10, ymax: 3000, ylog: true,
      xticks: [0, 0.25, 0.5, 0.75, 0.9, 1], yticks: [10, 30, 100, 300, 1000, 3000],
      xfmt: (v) => `${Math.round(v * 100)}%`, yfmt: (v) => duration(v),
      xlabel: 'how busy the server is', ylabel: 'time at the server', ink: COL.ink, grid: COL.grid,
    });
    const curve = (q: number | 'mean') => Array.from({ length: 99 }, (_, i) => {
      const rho = i / 100;
      return [rho, q === 'mean' ? mm1Time(rho, SERVICE) : mm1Quantile(rho, SERVICE, q)] as [number, number];
    });
    const chart = svg('g');
    const marks = svg('g');
    chart.append(
      ...ax.parts,
      ax.path(curve(0.5), COL.model, 1.6, { 'stroke-dasharray': '5 3' }),
      ax.path(curve(0.99), COL.busy, 1.6, { 'stroke-dasharray': '5 3' }),
      ...legend(52, 300, [
        { text: 'median, theory', color: COL.model, dash: true },
        { text: '99th percentile, theory', color: COL.busy, dash: true },
        { text: 'measured', color: COL.ink, dot: true },
      ]),
    );
    const busy = new Busy(6000);
    let meas = measureServer(rate, SERVICE, LINK);
    const d = liveDiagram(ctx, { parts, links: [{ from: 'users', to: 'srv', ms: LINK }], seed: 2 }, {
      w: W, h: 310, lines: 4, speed: 200,
      onFrame: (sys) => {
        const rho = (rate * SERVICE) / 1000;
        const m50 = meas.median;
        const m99 = meas.p99;
        const u = busy.sample(sys).get('srv') ?? 0;
        redraw(marks, ...(meas.count > 20 ? ax.dots([[rho, Math.max(m50, 10)], [rho, Math.max(m99, 10)]], COL.ink, 3.4) : []), line(ax.X(rho), 112, ax.X(rho), 262, COL.request, 1, { 'stroke-dasharray': '2 3' }));
        if (!open()) return;
        d.f.readout.textContent = `${Math.round(rho * 100)}% busy (measured ${Math.round(u * 100)}%): on average a request spends ${slowdown(rho).toFixed(1)}× its 20 ms of work at the server. `
          + `Theory: median ${duration(mm1Quantile(rho, SERVICE, 0.5))}, 99th percentile ${duration(mm1Quantile(rho, SERVICE, 0.99))}. `
          + (meas.count > 20 ? `Measured over 30 simulated minutes: ${duration(Math.max(m50, 0))} and ${duration(Math.max(m99, 0))}.` : 'Measuring.');
      },
    });
    d.f.svg.append(chart, marks);
    const rs = slider('Requests a second', 2, 49, 1, rate, (v) => `${v} a second (${Math.round(v * SERVICE / 10)}% busy)`, (v) => {
      rate = v;
      d.sys.setRate('users', v);
      meas = measureServer(v, SERVICE, LINK);
      if (v * SERVICE >= 900 && t.goal === 'ninety') t.done();
    }, 'request');
    d.f.controls.append(rs.node);
    const open = guessFirst(t, d.f, {
      ask: 'A server takes 20 ms to handle a request. How busy must it be before a request\'s average time there doubles to 40 ms?',
      options: ['50% busy', '75% busy', '90% busy', '99% busy'],
      answer: 0,
      sliders: [rs],
      after: () => {},
    });
    return d.f.node;
  }),

  'slashdot-flow': figure(['database'], (ctx, t) => {
    let rate = 150;
    let webs = 2;
    const spec = () => {
      const ws = Array.from({ length: webs }, (_, i) => i);
      const top = 170 - ((webs - 1) * 54) / 2;
      const parts: PartSpec[] = [
        { id: 'users', kind: 'client', label: 'Readers', x: 50, y: 170, rps: rate, timeoutMs: 3000 },
        { id: 'lb', kind: 'lb', label: 'Balancer', x: 152, y: 170, servers: 8, policy: { type: 'spread', mode: 'least' } },
        ...ws.map((i): PartSpec => ({ id: `w${i}`, kind: 'server', label: `Web ${i + 1}`, x: 272, y: top + i * 54, serviceMs: 20, servers: 2, queue: 60 })),
        { id: 'db', kind: 'db', label: 'Database', x: 388, y: 170, serviceMs: 8, servers: 4, queue: DB_QUEUE },
      ];
      const links = [
        { from: 'users', to: 'lb', ms: 20 },
        ...ws.map((i) => ({ from: 'lb', to: `w${i}`, ms: 12 })),
        ...ws.map((i) => ({ from: `w${i}`, to: 'db', ms: 12 })),
      ];
      return { parts, links, seed: 3 };
    };
    let busy = new Busy(2000);
    const d = liveDiagram(ctx, spec(), {
      w: W, h: 340, lines: 7, speed: 70,
      onFrame: (sys) => {
        const u = busy.sample(sys);
        const web = [...u].filter(([id]) => id.startsWith('w')).map(([, v]) => v);
        const webAvg = web.reduce((a, b) => a + b, 0) / Math.max(1, web.length);
        const db = u.get('db') ?? 0;
        const s = sys.stats(2000);
        const flight = Number.isFinite(s.mean) ? inFlight(s.goodput, s.mean / 1000) : 0;
        const dbPart = sys.part('db');
        const dbLine = dbPart.waiting.length >= DB_QUEUE ? `Database FULL: its waiting line is at its limit of ${DB_QUEUE}, so new requests are turned away. `
          : `Database waiting line ${dbPart.waiting.length} of ${DB_QUEUE}. `;
        d.f.readout.textContent = dbLine + `Web servers ${Math.round(webAvg * 100)}% busy, database ${Math.round(db * 100)}% busy. ${statsLine(s)} `
          + (flight ? `Inside at once: ${Math.round(s.goodput)} a second × ${duration(s.mean)} ≈ ${Math.round(flight)}.` : '');
        if (dbPart.waiting.length >= DB_QUEUE && webAvg < 0.9 && t.goal === 'database') t.done();
      },
    });
    const rs = slider('Requests a second', 50, 700, 10, rate, (v) => `${v}`, (v) => { rate = v; d.sys.setRate('users', v); }, 'request');
    const ws = slider('Web servers', 1, 6, 1, webs, (v) => `${v} (${v * 100} a second between them)`, (v) => {
      webs = v;
      d.rebuild(spec());
      busy = new Busy(2000);
    }, 'busy');
    d.f.controls.append(rs.node, ws.node);
    return d.f.node;
  }),
};
