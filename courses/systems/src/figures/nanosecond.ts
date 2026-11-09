// Lesson 1, How long is a nanosecond?: the ladder of costs (Jeff Dean's 2009
// table and 2026 hardware, with a human-scale reading), and turning a daily
// count into the rate a server must carry.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, guessFirst, named, pick, slider, toggles, type ColorKey } from './kit';

export interface Rung {
  what: string;
  /** Nanoseconds in Dean's 2009 table; undefined where the table had no row. */
  y2009?: number;
  /** Nanoseconds on typical 2026 hardware (a round figure, good to a factor of two or three). */
  y2026: number;
  color: ColorKey;
}

/** The ladder. 2009 values are Dean's; 2026 values are round figures for ordinary servers. */
export const LADDER: readonly Rung[] = [
  { what: 'L1 cache reference', y2009: 0.5, y2026: 1, color: 'cache' },
  { what: 'Branch mispredict', y2009: 5, y2026: 3, color: 'soft' },
  { what: 'Main memory reference', y2009: 100, y2026: 100, color: 'ink' },
  { what: 'Compress 1 KB', y2009: 3_000, y2026: 1_000, color: 'soft' },
  { what: 'Send 2 KB over the network', y2009: 20_000, y2026: 200, color: 'request' },
  { what: 'Read 4 KB at random from flash', y2026: 80_000, color: 'data' },
  { what: 'Read 1 MB in a row from memory', y2009: 250_000, y2026: 50_000, color: 'ink' },
  { what: 'Round trip inside a datacentre', y2009: 500_000, y2026: 200_000, color: 'request' },
  { what: 'Read 1 MB in a row from flash', y2026: 200_000, color: 'data' },
  { what: 'Disk seek', y2009: 10_000_000, y2026: 8_000_000, color: 'data' },
  { what: 'Read 1 MB in a row from disk', y2009: 20_000_000, y2026: 5_000_000, color: 'data' },
  { what: 'California to the Netherlands and back', y2009: 150_000_000, y2026: 150_000_000, color: 'request' },
];

/** How much longer everything takes on the human scale, where a main memory reference takes one second. */
export const HUMAN = 1e9 / 100;

/** A time in nanoseconds in the unit that reads best. */
export function sayNs(ns: number): string {
  const r = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(0) : v >= 1 ? Number(v.toFixed(1)).toString() : Number(v.toPrecision(2)).toString());
  if (ns < 1000) return `${r(ns)} ns`;
  if (ns < 1e6) return `${r(ns / 1e3)} µs`;
  if (ns < 1e9) return `${r(ns / 1e6)} ms`;
  return `${r(ns / 1e9)} s`;
}

/** A time in seconds as a person would say it: 0.05 s, 30 s, 8 minutes, 23 hours, 17 days, 5 months. */
export function sayHuman(sec: number): string {
  const r = (v: number) => (v >= 10 ? Math.round(v).toLocaleString('en-US') : Number(v.toPrecision(2)).toString());
  if (sec < 60) return `${r(sec)} s`;
  if (sec < 3600) return `${r(sec / 60)} minutes`;
  if (sec < 86_400 * 2) return `${r(sec / 3600)} hours`;
  if (sec < 86_400 * 60) return `${r(sec / 86_400)} days`;
  if (sec < 86_400 * 365 * 2) return `${r(sec / (86_400 * 30.4))} months`;
  return `${r(sec / (86_400 * 365))} years`;
}

/** The average and peak rate a second of a daily count, taking a day as 10⁵ seconds (86,400 rounded up, the course's one convention). */
export function dailyRate(users: number, perUser: number, peak: number): { perDay: number; mean: number; peak: number } {
  const perDay = users * perUser;
  const mean = perDay / 1e5;
  return { perDay, mean, peak: mean * peak };
}

const W = 440;

export const FIGS = {
  'nanosecond-ladder': figure(['human'], (_ctx, t) => {
    const rowH = 25;
    const top = 30;
    const H = top + LADDER.length * rowH + 30;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let year: 2009 | 2026 = 2009;
    let human = false;
    // Log axis: 0.1 ns to 1 s.
    const x0 = 196;
    const x1 = W - 12;
    const lo = -1;
    const hi = 9;
    const X = (ns: number) => x0 + ((Math.log10(ns) - lo) / (hi - lo)) * (x1 - x0);
    const paint = () => {
      const parts: SVGElement[] = [];
      const ticks: readonly (readonly [number, string])[] = human
        ? [[100, '1 s'], [6000, '1 min'], [360_000, '1 hour'], [8.64e6, '1 day'], [1e9, '4 months']]
        : [[1, '1 ns'], [1e3, '1 µs'], [1e6, '1 ms'], [1e9, '1 s']];
      for (const [v, s] of ticks) {
        parts.push(line(X(v), top - 6, X(v), H - 22, COL.grid, 1), small(X(v), H - 8, s, { anchor: 'middle', soft: true }));
      }
      LADDER.forEach((r, i) => {
        const y = top + i * rowH;
        const ns = year === 2009 ? r.y2009 : r.y2026;
        parts.push(small(x0 - 8, y + 12, r.what, { anchor: 'end' }));
        if (ns === undefined) {
          parts.push(small(x0 + 4, y + 12, 'not in the 2009 table', { soft: true }));
          return;
        }
        const w = Math.max(2, X(ns) - x0);
        parts.push(svg('rect', { x: x0, y: y + 3, width: w, height: 13, rx: 2, fill: COL[r.color], opacity: 0.85 }));
        const say = human ? sayHuman((ns * HUMAN) / 1e9) : sayNs(ns);
        const inside = w > 70;
        parts.push(small(inside ? x0 + w - 4 : x0 + w + 4, y + 13, say, { anchor: inside ? 'end' : undefined, fill: inside ? COL.paper : COL.ink, bold: true }));
      });
      parts.push(small(x0, 16, human ? 'If a main memory reference took one second' : year === 2009 ? 'Dean\'s table, 2009 (each line ten times the last)' : 'Ordinary servers, 2026 (each line ten times the last)', { bold: true }));
      redraw(g, ...parts);
      const at = (what: string) => {
        const r = LADDER.find((x) => x.what === what)!;
        return sayHuman(((year === 2009 ? r.y2009! : r.y2026) * HUMAN) / 1e9);
      };
      f.readout.textContent = human
        ? `If a memory reference took a second, a round trip inside the datacentre would take ${at('Round trip inside a datacentre')}, a disk seek ${at('Disk seek')}, and a packet to Europe and back ${at('California to the Netherlands and back')}.`
        : year === 2009
          ? 'Nine powers of ten from top to bottom. The network inside a building beats a disk seek by a factor of twenty.'
          : 'Flash and fast networks moved the middle of the ladder; memory, disk seeks and the speed of light hardly moved.';
    };
    const era = named(pick(['2009', '2026'], 0, (i) => { year = i ? 2026 : 2009; paint(); }), 'Hardware:');
    const scale = toggles(['Human scale'], [false], ([on]) => {
      human = on;
      paint();
      if (on && t.goal === 'human') t.done();
    });
    f.controls.append(era.node, scale.node);
    paint();
    return f.node;
  }),

  'nanosecond-estimate': figure(['guess'], (_ctx, t) => {
    const f = frame(W, 172, 3);
    const g = svg('g');
    f.svg.append(g);
    let users = 1e6;
    let per = 10;
    let peak = 3;
    const paint = () => {
      const r = dailyRate(users, per, peak);
      const big = (n: number) => (n >= 1e9 ? `${Number((n / 1e9).toPrecision(2))} billion` : n >= 1e6 ? `${Number((n / 1e6).toPrecision(2))} million` : Math.round(n).toLocaleString('en-US'));
      const rows: [string, string, ColorKey][] = [
        ['Users a day', big(users), 'ink'],
        ['× requests each', `${per}`, 'ink'],
        ['= requests a day', big(r.perDay), 'request'],
        ['÷ 10⁵ seconds (a day is 86,400)', `${big(r.mean)} a second`, 'request'],
        [`× peak over average (${peak})`, `${big(r.peak)} a second`, 'busy'],
      ];
      const parts: SVGElement[] = [];
      rows.forEach(([a, b, c], i) => {
        const y = 28 + i * 32;
        parts.push(small(20, y, a, { soft: i < 2 }), small(W - 20, y, i >= 2 && !open() ? '?' : b, { anchor: 'end', bold: true, fill: COL[c] }));
        if (i === 1 || i === 3) parts.push(line(20, y + 10, W - 20, y + 10, COL.grid, 1));
      });
      redraw(g, ...parts);
      if (open()) {
        f.readout.textContent = `${big(r.perDay)} requests a day is about ${big(r.mean)} a second on average. Build for the peak, about ${big(r.peak)} a second, not the average.`;
      }
    };
    const us = slider('Users a day', { min: 1e4, max: 1e9, value: users, scale: 'log', show: (v) => (v >= 1e6 ? `${Number((v / 1e6).toPrecision(2))} million` : `${Math.round(v / 1000)} thousand`), onInput: (v) => { users = v; paint(); }, color: 'request' });
    const ps = slider('Requests per user a day', 1, 100, 1, per, (v) => `${v}`, (v) => { per = v; paint(); }, 'request');
    const pk = slider('Peak over average', 1, 10, 0.5, peak, (v) => `${v}×`, (v) => { peak = v; paint(); }, 'busy');
    f.controls.append(us.node, ps.node, pk.node);
    const open = guessFirst(t, f, {
      ask: 'A million people use a service each day, ten requests each. About how many requests a second does it get on average?',
      options: ['About 10', 'About 100', 'About 1,000', 'About 10,000'],
      answer: 1,
      sliders: [us, ps, pk],
      after: () => {
        paint();
        if (t.goal === 'guess') t.done();
      },
    });
    paint();
    return f.node;
  }),
};
