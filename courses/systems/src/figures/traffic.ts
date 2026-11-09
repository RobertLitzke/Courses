// Lesson M4, Ninety-nine phones in a handcart: matching noisy positions to
// roads (nearest road against a hidden Markov model), turning a segment's
// samples into a published speed (window, phones a minute, a privacy
// threshold), and a handcart of phones on an empty street against a real jam.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { axes, button, COL, figure, frame, legend, named, pick, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// Map matching on a small map. Coordinates in metres, y down.

export interface Pt { x: number; y: number }

/** Junctions: a main road along y = 0, a parallel side road 30 m away joined to it at both ends, and a street turning off the side road. */
export const JUNCTIONS: readonly Pt[] = [
  { x: 0, y: 0 }, { x: 600, y: 0 },
  { x: 0, y: 30 }, { x: 400, y: 30 }, { x: 600, y: 30 },
  { x: 400, y: 230 },
];
/** Roads between junctions: 0 the main road, 1 and 2 the side road, 3 the turning, 4 and 5 the links. */
export const ROADS: readonly [number, number][] = [[0, 1], [2, 3], [3, 4], [3, 5], [0, 2], [1, 4]];
export const ROAD_NAMES = ['main road', 'side road', 'side road', 'turning', 'link', 'link'];

/** All-pairs driving distances between junctions, m. */
const DIST: number[][] = (() => {
  const n = JUNCTIONS.length;
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const [a, b] of ROADS) {
    const l = Math.hypot(JUNCTIONS[a].x - JUNCTIONS[b].x, JUNCTIONS[a].y - JUNCTIONS[b].y);
    d[a][b] = d[b][a] = l;
  }
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);
  return d;
})();

/** A place on a road: which road, how far along it from its first junction, and the point. */
export interface OnRoad { road: number; along: number; at: Pt }

/** The nearest point on a road to `p`. */
export function project(road: number, p: Pt): OnRoad {
  const a = JUNCTIONS[ROADS[road][0]];
  const b = JUNCTIONS[ROADS[road][1]];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
  return { road, along: u * len, at: { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) } };
}

const roadLength = (r: number) => Math.hypot(JUNCTIONS[ROADS[r][0]].x - JUNCTIONS[ROADS[r][1]].x, JUNCTIONS[ROADS[r][0]].y - JUNCTIONS[ROADS[r][1]].y);

/** Driving distance from one place on the map to another. */
export function driveBetween(p: OnRoad, q: OnRoad): number {
  if (p.road === q.road) return Math.abs(p.along - q.along);
  const [pa, pb] = ROADS[p.road];
  const [qa, qb] = ROADS[q.road];
  const pl = roadLength(p.road);
  const ql = roadLength(q.road);
  let best = Infinity;
  for (const [u, du] of [[pa, p.along], [pb, pl - p.along]] as const) for (const [v, dv] of [[qa, q.along], [qb, ql - q.along]] as const) best = Math.min(best, du + DIST[u][v] + dv);
  return best;
}

/** The phone's true path: along the side road from its west end, then down the turning. One sample every 25 m; `truth` is the road each was on. */
export function samples(noise: number, seed = 3): { pts: Pt[]; truth: number[] } {
  const rng = makeRng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const pts: Pt[] = [];
  const truth: number[] = [];
  for (let s = 10; s <= 590; s += 25) {
    const on = s <= 400 ? { x: s, y: 30 } : { x: 400, y: 30 + (s - 400) };
    truth.push(s <= 400 ? 1 : 3);
    pts.push({ x: on.x + noise * gauss(), y: on.y + noise * gauss() });
  }
  return { pts, truth };
}

/** Each sample to the nearest road. */
export function matchNearest(pts: readonly Pt[]): OnRoad[] {
  return pts.map((p) => {
    let best: OnRoad | null = null;
    let bd = Infinity;
    for (let r = 0; r < ROADS.length; r++) {
      const c = project(r, p);
      const d = Math.hypot(c.at.x - p.x, c.at.y - p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best!;
  });
}

/**
 * Newson and Krumm's hidden Markov model, solved by Viterbi. A possible match is
 * the nearest point on each road within reach; it is likely if it is near the
 * sample (`sigma`, the GPS error, m) and if driving to it from the last
 * match is about as far as the straight line between the samples (`beta`, m).
 */
export function matchViterbi(pts: readonly Pt[], sigma: number, beta = 15): OnRoad[] {
  const reach = Math.max(60, 4 * sigma);
  const options = pts.map((p) => {
    const cs: { c: OnRoad; e: number }[] = [];
    for (let r = 0; r < ROADS.length; r++) {
      const c = project(r, p);
      const d = Math.hypot(c.at.x - p.x, c.at.y - p.y);
      if (d <= reach) cs.push({ c, e: -0.5 * (d / sigma) ** 2 });
    }
    return cs.length ? cs : [{ c: matchNearest([p])[0], e: 0 }];
  });
  let score = options[0].map((k) => k.e);
  const back: number[][] = [];
  for (let i = 1; i < pts.length; i++) {
    const straight = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const next: number[] = [];
    const from: number[] = [];
    for (const k of options[i]) {
      let best = -Infinity;
      let arg = 0;
      options[i - 1].forEach((j, jj) => {
        const s = score[jj] - Math.abs(driveBetween(j.c, k.c) - straight) / beta;
        if (s > best) { best = s; arg = jj; }
      });
      next.push(best + k.e);
      from.push(arg);
    }
    score = next;
    back.push(from);
  }
  let at = score.indexOf(Math.max(...score));
  const out: OnRoad[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    out.unshift(options[i][at].c);
    if (i > 0) at = back[i - 1][at];
  }
  return out;
}

/** The share of samples put on the road the phone was really on. The side road's two halves count as one road, and within 15 m of the corner either road the phone used is right. */
export function rightShare(m: readonly OnRoad[], truth: readonly number[]): number {
  const corner = JUNCTIONS[3];
  const ok = (x: OnRoad, r: number) => {
    if (x.road === r || ((x.road === 1 || x.road === 2) && (r === 1 || r === 2))) return true;
    const near = Math.hypot(x.at.x - corner.x, x.at.y - corner.y) < 15;
    return near && [1, 2, 3].includes(x.road) && [1, 2, 3].includes(r);
  };
  return m.filter((x, i) => ok(x, truth[i])).length / m.length;
}

const matchFigure = figure(['viterbi'], (_ctx, t) => {
  const W = 480;
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const S = 0.7;
  const X = (x: number) => 30 + x * S;
  const Y = (y: number) => 50 + y * S;
  let noise = 10;
  let seed = 6;
  let hmm = false;
  const paint = () => {
    const { pts, truth } = samples(noise, seed);
    const m = hmm ? matchViterbi(pts, Math.max(noise, 4)) : matchNearest(pts);
    const parts: SVGElement[] = [];
    ROADS.forEach(([a, b], r) => {
      const main = r === 0;
      parts.push(line(X(JUNCTIONS[a].x), Y(JUNCTIONS[a].y), X(JUNCTIONS[b].x), Y(JUNCTIONS[b].y), main ? tint(COL.ink, 0.35) : tint(COL.ink, 0.18), main ? 9 : 6));
    });
    parts.push(small(X(600), Y(0) - 9, 'main road', { soft: true, anchor: 'end' }), small(X(600), Y(30) + 18, 'side road', { soft: true, anchor: 'end' }), small(X(408), Y(222), 'turning', { soft: true }));
    pts.forEach((p, i) => {
      const at = m[i].at;
      const ok = rightShare([m[i]], [truth[i]]) === 1;
      const c = ok ? COL.answer : COL.error;
      parts.push(line(X(p.x), Y(p.y), X(at.x), Y(at.y), c, 1.2));
      parts.push(svg('circle', { cx: X(p.x), cy: Y(p.y), r: 3, fill: COL.request }));
      parts.push(svg('circle', { cx: X(at.x), cy: Y(at.y), r: 2.6, fill: c }));
    });
    parts.push(...legend(30, 16, [{ text: 'GPS sample', color: COL.request }, { text: 'matched, right road', color: COL.answer }, { text: 'matched, wrong road', color: COL.error }]));
    redraw(g, ...parts);
    const share = rightShare(m, truth);
    const wrong = m.length - Math.round(share * m.length);
    f.readout.textContent = `${hmm ? 'Hidden Markov model' : 'Nearest road'}, GPS error about ${noise} m: ${wrong} of ${m.length} samples put on the wrong road. ${hmm ? 'Jumping between the parallel roads would mean driving round by a link, so the model keeps the trace on one road.' : 'Each sample is matched alone, so the trace hops between roads it could not have driven.'}`;
    if (hmm && noise >= 15) t.done();
  };
  const err = slider('GPS error', 0, 40, 5, noise, (v) => `${v} m`, (v) => { noise = v; paint(); }, 'error');
  const how = named(pick(['Nearest road', 'Hidden Markov model'], 0, (i) => { hmm = i === 1; paint(); }), 'Match:');
  const again = button('Another trip', () => { seed = (seed % 12) + 1; paint(); });
  f.controls.append(err.node, how.node, again);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// One road segment's hour: samples in, published speed out.

/** A speed report from one phone: minute, km/h, metres along the 500 m segment, which phone. */
export interface Sample { t: number; kmh: number; pos: number; phone: number }

/** Free flow and the jam on the busy road, km/h. */
export const FREE = 50;
export const JAM = 12;
/** The usual speed at this hour of the week, from past weeks. */
export const HISTORY = 44;

/** The true speed at minute `m`: a jam from minute 20 to 40, building and clearing over two minutes. */
export function trueSpeed(m: number, jam: [number, number] = [20, 40], low = JAM): number {
  const [a, b] = jam;
  if (m < a || m >= b + 2) return FREE;
  if (m < a + 2) return FREE + ((low - FREE) * (m - a)) / 2;
  if (m < b) return low;
  return low + ((FREE - low) * (m - b)) / 2;
}

/** An hour of reports from ordinary traffic: `perMinute` phones a minute, each a few km/h off the true speed, anywhere on the segment. */
export function traffic(perMinute: number, seed = 7, jam: [number, number] | null = [20, 40]): Sample[] {
  const rng = makeRng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const out: Sample[] = [];
  let phone = 0;
  let next = -Math.log(1 - rng()) / perMinute;
  while (next < 60) {
    const v = jam ? trueSpeed(next, jam) : FREE;
    out.push({ t: next, kmh: Math.max(2, v * (1 + 0.15 * gauss())), pos: rng() * 500, phone: phone++ });
    next += -Math.log(1 - rng()) / perMinute;
  }
  return out;
}

/** Weckert's handcart: `n` phones in one spot, walking pace, from minute `from` to `to`, each reporting once a minute. */
export function handcart(n = 99, from = 20, to = 40, seed = 9): Sample[] {
  const rng = makeRng(seed);
  const out: Sample[] = [];
  for (let m = from; m < to; m++) {
    const pos = 40 + (((m - from) * 70) % 420);
    for (let p = 0; p < n; p++) out.push({ t: m + rng(), kmh: 4 + rng(), pos: pos + rng() * 3, phone: 10000 + p });
  }
  return out;
}

export interface Rules {
  /** Window length, minutes. */
  window: number;
  /** Fewest separate reports in a window before live data is published. */
  fewest: number;
  /** Count a tight group moving together as one report. */
  groups: boolean;
}

/** Reports in the window ending at `m`. With grouping, phones seen within 20 m and 2 km/h of each other in the same minute are joined, and each joined group is one observer for the whole window, reporting its median speed. */
function inWindow(all: readonly Sample[], m: number, r: Rules): number[] {
  const got = all.filter((s) => s.t > m - r.window && s.t <= m);
  if (!r.groups) return got.map((s) => s.kmh);
  const parent = new Map<number, number>();
  const find = (p: number): number => {
    while (parent.get(p)! !== p) p = parent.get(p)!;
    return p;
  };
  for (const s of got) if (!parent.has(s.phone)) parent.set(s.phone, s.phone);
  for (let i = 0; i < got.length; i++) for (let j = i + 1; j < got.length; j++) {
    const a = got[i];
    const b = got[j];
    if (Math.floor(a.t) === Math.floor(b.t) && Math.abs(a.pos - b.pos) < 20 && Math.abs(a.kmh - b.kmh) < 2) parent.set(find(a.phone), find(b.phone));
  }
  const groups = new Map<number, number[]>();
  for (const s of got) {
    const k = find(s.phone);
    groups.set(k, [...(groups.get(k) ?? []), s.kmh]);
  }
  return [...groups.values()].map(median);
}

export const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/** Pseudo-reports the history counts for in the blend. */
export const PRIOR = 2;

/**
 * The published speed each minute: the median of the window's reports
 * blended with the usual speed for the hour (history counts as `PRIOR`
 * reports), or the usual speed alone when fewer than `fewest` phones reported.
 */
export function publish(all: readonly Sample[], r: Rules): { speed: number[]; live: boolean[]; counts: number[] } {
  const speed: number[] = [];
  const live: boolean[] = [];
  const counts: number[] = [];
  for (let m = 1; m <= 60; m++) {
    const xs = inWindow(all, m, r);
    counts.push(xs.length);
    if (xs.length < Math.max(1, r.fewest)) {
      speed.push(HISTORY);
      live.push(false);
    } else {
      speed.push((xs.length * median(xs) + PRIOR * HISTORY) / (xs.length + PRIOR));
      live.push(true);
    }
  }
  return { speed, live, counts };
}

/** The colour a map would draw: 0 flowing, 1 slow, 2 jammed. */
export const band = (kmh: number) => (kmh >= 32 ? 0 : kmh >= 20 ? 1 : 2);
const BAND_COL = [COL.good, COL.busy, COL.bad];

/** How the published speed did against the truth: minutes late to show the jam and to clear it, and how many times the colour changed. */
export function score(speed: readonly number[], jam: [number, number] = [20, 40]): { late: number | null; clearLate: number | null; changes: number } {
  const [a, b] = jam;
  let late: number | null = null;
  let clearLate: number | null = null;
  for (let m = a; m <= 60; m++) if (band(speed[m - 1]) === 2) { late = m - a; break; }
  for (let m = b; m <= 60; m++) if (band(speed[m - 1]) === 0) { clearLate = m - b; break; }
  let changes = 0;
  for (let i = 1; i < speed.length; i++) if (band(speed[i]) !== band(speed[i - 1])) changes++;
  return { late, clearLate, changes };
}

/** The chart of one segment's hour, shared by the two figures. */
function hourChart(W: number, all: readonly Sample[], pub: { speed: number[]; live: boolean[] }, truth: (m: number) => number, top = 24): SVGElement[] {
  const A = axes({ x: 44, y: top, w: W - 60, h: 140, xmin: 0, xmax: 60, ymin: 0, ymax: 60, xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 20, 40, 60], ylabel: 'km/h', xlabel: 'minute', ink: COL.ink, grid: COL.grid });
  const parts: SVGElement[] = [...A.parts];
  parts.push(A.path([[0, HISTORY], [60, HISTORY]], COL.soft, 1, { 'stroke-dasharray': '4 3' }));
  const tr: [number, number][] = [];
  for (let m = 0; m <= 60; m += 0.5) tr.push([m, truth(m)]);
  parts.push(A.path(tr, tint(COL.ink, 0.35), 5));
  // Reports, thinned to keep the drawing light.
  const step = Math.max(1, Math.floor(all.length / 900));
  for (let i = 0; i < all.length; i += step) parts.push(svg('circle', { cx: A.X(all[i].t), cy: A.Y(Math.min(60, all[i].kmh)), r: 1.6, fill: tint(COL.request, 0.55) }));
  parts.push(A.path(pub.speed.map((v, i) => [i + 1, v] as [number, number]), COL.answer, 2.2));
  // The colour the map would show, minute by minute; hatched where only history was published.
  const by = top + 140 + 30;
  parts.push(small(8, by + 9, 'map', { soft: true }));
  pub.speed.forEach((v, i) => {
    const x0 = A.X(i);
    const x1 = A.X(i + 1);
    parts.push(svg('rect', { x: x0, y: by, width: x1 - x0 + 0.3, height: 12, fill: pub.live[i] ? BAND_COL[band(v)] : tint(BAND_COL[band(v)], 0.35) }));
  });
  return parts;
}

const windowFigure = figure(['window'], (_ctx, t) => {
  const W = 480;
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let r: Rules = { window: 5, fewest: 3, groups: false };
  let rate = 5;
  let all = traffic(rate);
  let sawShort = false;
  let sawLong = false;
  const paint = () => {
    const pub = publish(all, r);
    const parts = hourChart(W, all, pub, (m) => trueSpeed(m));
    parts.push(...legend(W - 300, 12, [{ text: 'true speed', color: tint(COL.ink, 0.35) }, { text: 'phones', color: COL.request }, { text: 'published', color: COL.answer }, { text: 'usual', color: COL.soft }]));
    redraw(g, ...parts);
    const s = score(pub.speed);
    const off = pub.live.filter((x) => !x).length;
    const lateText = s.late === null ? 'never showed the jam' : `showed the jam ${s.late} min after it formed`;
    const clearText = s.clearLate === null ? 'never showed it clear' : `showed it clear ${s.clearLate} min after it cleared`;
    f.readout.textContent = `${r.window}-minute window, ${rate} phones a minute: the map ${lateText} and ${clearText}; its colour changed ${s.changes} times (the road changed twice). ${off ? `${off} minutes had fewer than ${r.fewest} phones, so the usual speed was shown.` : `Every minute had at least ${r.fewest} phones.`}`;
    if (r.window <= 2) sawShort = true;
    if (r.window >= 10) sawLong = true;
    if (sawShort && sawLong) t.done();
  };
  const win = slider('Window', 1, 15, 1, r.window, (v) => `${v} min`, (v) => { r = { ...r, window: v }; paint(); }, 'clock');
  const phones = slider('Phones a minute', { steps: [0.2, 0.5, 1, 2, 5, 10, 20], value: rate, show: (v) => String(v), onInput: (v) => { rate = v; all = traffic(rate); paint(); }, color: 'request' });
  const fewest = slider('Fewest phones', 1, 10, 1, r.fewest, (v) => String(v), (v) => { r = { ...r, fewest: v }; paint(); }, 'data');
  f.controls.append(win.node, phones.node, fewest.node);
  paint();
  return f.node;
});

// ---------------------------------------------------------------------------
// The handcart on an empty street, against a real jam.

export type Day = 'handcart' | 'jam';

/** The quiet street's hour: two phones every five minutes at free flow, plus the handcart or a real jam (ten cars a minute, spread along the street, at 10 km/h) from minute 20 to 40. */
export function quietStreet(day: Day): { all: Sample[]; truth: (m: number) => number } {
  if (day === 'handcart') {
    const all = [...traffic(0.4, 5, null), ...handcart()].sort((a, b) => a.t - b.t);
    return { all, truth: () => FREE };
  }
  const base = traffic(0.4, 5, null).filter((s) => s.t < 20 || s.t >= 42);
  const jam = traffic(10, 6, [20, 40]).filter((s) => s.t >= 20 && s.t < 42).map((s) => ({ ...s, kmh: Math.max(2, s.kmh * (10 / JAM)) }));
  return { all: [...base, ...jam].sort((a, b) => a.t - b.t), truth: (m) => trueSpeed(m, [20, 40], 10) };
}

const HAND_RULES: Rules = { window: 5, fewest: 3, groups: false };

const handcartFigure = figure(['check'], (_ctx, t) => {
  const W = 480;
  const H = 240;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let day: Day = 'handcart';
  let groups = false;
  const seen = new Set<Day>();
  const paint = () => {
    const { all, truth } = quietStreet(day);
    const pub = publish(all, { ...HAND_RULES, groups });
    const parts = hourChart(W, all, pub, truth);
    parts.push(...legend(W - 300, 12, [{ text: 'true speed', color: tint(COL.ink, 0.35) }, { text: 'phones', color: COL.request }, { text: 'published', color: COL.answer }, { text: 'usual', color: COL.soft }]));
    redraw(g, ...parts);
    const red = pub.speed.filter((v, i) => pub.live[i] && band(v) === 2).length;
    const peak = Math.max(...pub.speed.map((_, i) => publishCount(all, i + 1)));
    f.readout.textContent = day === 'handcart'
      ? `An empty street and 99 phones walking down it. ${red ? `The map showed a jam for ${red} minutes.` : 'The map never showed a jam: the cart counted as one observer, too few to publish, so the street kept its usual colour.'} At most ${peak} reports arrived in one 5-minute window.`
      : `A real jam: ten cars a minute crawling, spread along the street. ${red ? `The map showed it for ${red} minutes${groups ? ', grouping or not, because the cars are not in one spot' : ''}.` : 'The map never showed it.'}`;
    seen.add(day);
    if (groups && seen.has('handcart') && seen.has('jam')) t.done();
  };
  const days = named(pick(['Handcart', 'Real jam'], 0, (i) => { day = i ? 'jam' : 'handcart'; paint(); }), 'Today:');
  const rule = named(pick(['Every phone counts', 'A group counts once'], 0, (i) => { groups = i === 1; seen.clear(); paint(); }), 'Rule:');
  f.controls.append(days.node, rule.node);
  paint();
  return f.node;
});

const publishCount = (all: readonly Sample[], m: number) => all.filter((s) => s.t > m - HAND_RULES.window && s.t <= m).length;

export const FIGS = {
  'traffic-match': matchFigure,
  'traffic-window': windowFigure,
  'traffic-handcart': handcartFigure,
};
