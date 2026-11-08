// Lesson 14, A river that cuts through a mountain: a ridge rising across a
// river's path, and whether the river can cut down as fast as the ridge
// rises; and a fall in base level, working its way upstream as a knickpoint.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small, type P } from 'didactics/draw';
import { Replay, Table } from 'sandtable/table';
import { mixHex, sandLapse, type SandLapse } from 'sandtable/lapse';
import { COL, figure, frame, player, slider } from './kit';

const W = 400;

// ---- Uplift against incision ----------------------------------------------------------

/** How deep the river's valley is below the plain when the ridge starts to rise, metres, unless the reader changes it: its lead. */
export const LEAD = 200;

export interface Race {
  /** Height the ridge has risen above the plain, metres. */
  ridge: number;
  /** Height of the river's bed where it crosses the ridge, metres above the valley floor upstream. */
  bed: number;
  /** Depth of the cut through the ridge, from its crest down to the bed in the gap, metres. */
  canyon: number;
  /** The river gave up its gap and went round, this many years ago (or null). */
  diverted: number | null;
}

/**
 * After `years` with the ridge rising `uplift` mm a year and the river able to cut `cut` mm a year,
 * the river starting in a valley `lead` metres below the plain. A lake behind the ridge fills that
 * valley; once it reaches the plain it spills round the ridge's end.
 */
export function race(uplift: number, cut: number, years: number, lead = LEAD): Race {
  const ridge = (uplift / 1000) * years;
  const climb = Math.max(0, uplift - cut) / 1000; // m a year the river's bed rises in the gap
  const tSpill = climb > 0 ? lead / climb : Infinity;
  const r = years < tSpill
    ? { bed: climb * years, diverted: null }
    // Abandoned: the gap rises with the ridge from then on, a dry notch.
    : { bed: lead + (uplift / 1000) * (years - tSpill), diverted: years - tSpill };
  return { ridge, ...r, canyon: lead + ridge - r.bed };
}

/** The steps of the race, in order: which the river is headed for depends only on the two rates. */
export function raceSteps(uplift: number, cut: number): string[] {
  return uplift <= cut
    ? ['Ridge rises', 'River keeps pace', 'Deep canyon']
    : ['Ridge rises', 'Lake fills', 'Spills round', 'Wind gap'];
}

/** How far along those steps the race is (−1 before it starts). */
export function raceStep(uplift: number, cut: number, years: number, lead = LEAD): number {
  if (years <= 0) return -1;
  const r = race(uplift, cut, years, lead);
  if (uplift <= cut) return r.canyon >= 700 ? 2 : r.ridge >= 100 ? 1 : 0;
  if (r.diverted !== null) return r.bed - lead >= 40 ? 3 : 2;
  return r.bed >= 15 ? 1 : 0;
}

const SKY = '#eef2f0';

export const raceFigure = figure(['gorge'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let uplift = 0.6;
  let cut = 0.3;
  let lead = LEAD;
  let myr = 0;
  const BASE = 236; // the valley floor upstream, where the river runs at the start
  const Z = (m: number) => BASE - m * 0.1;
  const XR = 150; // where the river crosses
  const FLOOR = 7; // half the width of the valley floor, px
  const VALLEY = 11; // metres the valley side climbs per px
  const WALL = 45; // metres a canyon wall climbs per px
  const END = 300; // the ridge runs full height to here, and is gone by END + 50
  const along = (x: number) => (x <= END ? 1 : x >= END + 50 ? 0 : 0.5 + 0.5 * Math.cos(((x - END) / 50) * Math.PI));
  /** Half the width of the valley at height m above its floor, px. */
  const half = (m: number) => FLOOR + m / VALLEY;
  const paint = () => {
    const r = race(uplift, cut, myr * 1e6, lead);
    const crest = lead + r.ridge;
    // The ridge, far off: its skyline, notched where the river crosses it.
    const sky: string[] = [];
    for (let x = 0; x <= W; x += 2) {
      const top = lead + r.ridge * along(x);
      const notch = r.bed + Math.max(0, Math.abs(x - XR) - FLOOR) * WALL;
      sky.push(`${x},${Z(Math.min(top, notch)).toFixed(1)}`);
    }
    // The valley in front, cut into the plain: unchanged by the ridge.
    const ground = (x: number) => Math.min(lead, Math.max(0, Math.abs(x - XR) - FLOOR) * VALLEY);
    const front: string[] = [];
    for (let x = 0; x <= W; x += 1) front.push(`${x},${Z(ground(x)).toFixed(1)}`);
    const water = r.diverted !== null ? lead : Math.max(r.bed, 6);
    const ponded = r.diverted !== null || r.bed > 6;
    const parts: (SVGElement | null)[] = [
      svg('rect', { width: W, height: H, fill: SKY }),
      svg('polygon', { points: `0,${H} ${sky.join(' ')} ${W},${H}`, fill: COL.shell }),
      svg('polygon', { points: `0,${H} ${front.join(' ')} ${W},${H}`, fill: COL.mud, stroke: COL.ink, 'stroke-width': 0.8, 'stroke-opacity': 0.5 }),
    ];
    // Water in the valley: the river, or a lake filling it up to the lip of the gap.
    parts.push(svg('polygon', { points: `${XR - half(water)},${Z(water)} ${XR + half(water)},${Z(water)} ${XR + FLOOR},${Z(0)} ${XR - FLOOR},${Z(0)}`, fill: COL.water, opacity: ponded ? 0.75 : 0.9 }));
    if (r.ridge >= 60) parts.push(small(60, Z(crest) - 6, 'the rising ridge', { anchor: 'middle', bold: true, fill: COL.ink, halo: SKY }));
    // The river's lead: how far below the plain it runs.
    const lx = XR - half(lead) - 14;
    parts.push(
      line(lx, Z(0), lx, Z(lead), COL.paper, 1.2),
      line(lx - 4, Z(0), lx + 4, Z(0), COL.paper, 1.2),
      line(lx - 4, Z(lead), lx + 4, Z(lead), COL.paper, 1.2),
      small(lx - 6, (Z(0) + Z(lead)) / 2 + 3, `lead ${lead} m`, { anchor: 'end', bold: true, fill: COL.paper }),
      small(W - 6, Z(lead) + 14, 'the plain', { anchor: 'end', fill: COL.paper }),
    );
    if (r.diverted === null) {
      if (ponded && r.bed > 35) parts.push(small(XR, Z(r.bed / 2) + 3, 'lake', { anchor: 'middle', bold: true, fill: COL.paper }));
      else parts.push(small(XR, Z(0) + 13, 'the river', { anchor: 'middle', bold: true, fill: COL.paper }));
      if (r.ridge >= 60) {
        const mx = XR + 34;
        parts.push(
          line(mx, Z(crest), mx, Z(r.bed), COL.ink, 1),
          small(mx + 5, Math.min(Z(crest) + 14, (Z(crest) + Z(lead)) / 2 + 3), `canyon ${Math.round(r.canyon)} m deep`, { bold: true, halo: COL.shell }),
        );
      }
    } else {
      const y = Z(lead) - 6;
      parts.push(
        small(XR, Z(lead / 2) + 3, 'lake', { anchor: 'middle', bold: true, fill: COL.paper }),
        arrow(XR + half(lead) + 4, y, W - 14, y, COL.water, 2.2),
        small(W - 14, y - 7, 'spills round the ridge’s end', { anchor: 'end', bold: true, fill: COL.water, halo: SKY }),
        small(XR, Z(r.bed) - 8, 'wind gap', { anchor: 'middle', bold: true, fill: COL.ink, halo: SKY }),
      );
    }
    // The steps across the top, the one it has reached in bold.
    const steps = raceSteps(uplift, cut);
    const at = raceStep(uplift, cut, myr * 1e6, lead);
    const w = (W - 12) / steps.length;
    steps.forEach((name, i) => {
      const x = 6 + i * w;
      const done = i < at;
      const now = i === at;
      parts.push(
        svg('rect', { x: x + 2, y: 6, width: w - 4, height: 20, rx: 10, fill: now ? COL.ink : done ? COL.paper : 'none', stroke: i > at ? COL.soft : COL.ink, 'stroke-width': 1, 'stroke-dasharray': i > at ? '3 3' : 'none' }),
        small(x + w / 2, 20, `${done ? '✓ ' : `${i + 1} `}${name}`, { anchor: 'middle', bold: now, fill: now ? COL.paper : i > at ? COL.soft : COL.ink }),
      );
    });
    redraw(g, ...parts);
    const left = lead - r.bed;
    f.readout.textContent = myr === 0
      ? `Looking down the valley from upstream. The river runs ${lead} m below the plain: its lead. A ridge is about to rise across its path. Press Play.`
      : r.diverted !== null
        ? `The lake filled the valley and spilled round the ridge’s end ${(r.diverted / 1e6).toFixed(2)} million years ago. The old gap rises with the ridge: a wind gap ${Math.round(r.bed - lead)} m above the plain.`
        : uplift <= cut
          ? `The river cuts as fast as the ridge rises, so its bed stays put while the ridge grows around it: a canyon ${Math.round(r.canyon)} m deep, through a ridge younger than the river.`
          : myr >= 1
            ? `Still holding after a million years, but the lake is ${Math.round(r.bed)} m deep and rising. A lead only buys time: about ${(left / (uplift - cut) / 1000).toFixed(1)} million years more at these rates.`
            : `The ridge is winning: the river’s bed in the gap has been lifted ${Math.round(r.bed)} m and a lake fills the valley behind it. ${Math.round(left)} m more and it reaches the plain and spills.`;
    if (r.diverted === null && uplift <= cut && r.canyon >= 700 && t.goal === 'gorge') t.done();
  };
  const us = slider('Ridge rises', 0.1, 1.2, 0.05, uplift, (v) => `${v.toFixed(2)} mm a year`, (v) => { uplift = v; paint(); }, 'pressure');
  const cs = slider('River can cut down', 0.1, 1.2, 0.05, cut, (v) => `${v.toFixed(2)} mm a year`, (v) => { cut = v; paint(); }, 'water');
  const ls = slider('River’s lead', 50, 600, 25, lead, (v) => `a valley ${v} m deep`, (v) => { lead = v; paint(); }, 'mud');
  const ts = slider('Time', 0, 1, 0.01, 0, (v) => `${v.toFixed(2)} million years`, (v) => { myr = v; paint(); }, 'old');
  f.controls.append(us.node, cs.node, ls.node, player(ts, ctx).node, ts.node);
  paint();
  return f.node;
});

// ---- Base level and a knickpoint --------------------------------------------------------

const L = 60; // km of river, mouth to source
const HEAD = 600; // m, height of the source above the old base level
/** The river's old graded profile: concave, steep near the source. */
const graded = (x: number) => HEAD * (x / L) ** 1.8;
/** How fast the knickpoint climbs, km per thousand years, at distance x from the mouth: slower as the river shrinks upstream. */
const climbRate = (x: number) => 0.9 * Math.max(0.03, 1 - x / L) ** 0.85;

/** Where the knickpoint is after `kyr` thousand years, km from the mouth. */
export function knickAt(kyr: number): number {
  let x = 0;
  const dt = 0.1;
  for (let s = 0; s < kyr; s += dt) x = Math.min(L, x + climbRate(x) * dt);
  return x;
}

export const knickFigure = figure(['knick'], (ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let drop = 0;
  let kyr = 0;
  const X = (km: number) => 380 - (km / L) * 350; // mouth at the right
  const Y = (m: number) => 170 - ((m + 120) / (HEAD + 120)) * 150;
  const paint = () => {
    const xk = drop > 0 ? knickAt(kyr) : 0;
    const old: P[] = [];
    const now: P[] = [];
    for (let x = 0; x <= L; x += 0.5) {
      old.push([X(x), Y(graded(x))]);
      now.push([X(x), Y(graded(x) - (x < xk ? drop : 0))]);
    }
    const ground = `${now.map((p) => p.join(',')).join(' ')} ${X(L)},${Y(-120)} ${X(0)},${Y(-120)}`;
    redraw(g,
      svg('rect', { width: W, height: 200, fill: '#eef2f0' }),
      svg('polygon', { points: ground, fill: '#b9a183' }),
      svg('polyline', { points: old.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.soft, 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
      svg('polyline', { points: now.map((p) => p.join(',')).join(' '), fill: 'none', stroke: COL.water, 'stroke-width': 2.5 }),
      svg('rect', { x: X(0), y: Y(-drop), width: 20, height: Y(-120) - Y(-drop), fill: COL.water, opacity: 0.45 }),
      small(X(0) + 10, Y(-drop) - 5, 'base level', { anchor: 'end', fill: COL.water, bold: true }),
      drop > 0 && xk > 0.5 && xk < L ? small(X(xk), Y(graded(xk)) - 8, 'knickpoint: a waterfall or rapids', { anchor: 'middle', bold: true, fill: COL.heat, halo: '#eef2f0' }) : null,
      drop > 0 && xk > 0.5 && xk < L ? svg('circle', { cx: X(xk), cy: Y(graded(xk) - drop / 2), r: 4, fill: COL.heat }) : null,
      small(X(L), 190, 'source', { soft: true }), small(X(0), 190, 'mouth', { anchor: 'end', soft: true }),
      small(X(L / 2), 190, `${L} km`, { anchor: 'middle', soft: true }),
    );
    f.readout.textContent = drop === 0
      ? 'A river graded to its base level: the level of the lake or sea it flows into, below which it cannot cut. Lower the base level.'
      : kyr === 0
        ? `Base level has dropped ${drop} m. Only the very mouth feels it yet. Move time forward.`
        : xk >= L
          ? `After ${kyr} thousand years the step has climbed all the way to the source: the whole river now runs ${drop} m lower.`
          : `After ${kyr} thousand years the step has climbed ${xk.toFixed(1)} km upstream. Below it the river has cut down ${drop} m; above it, the river does not yet know base level fell. It climbs more slowly as the river gets smaller.`;
    if (drop > 0 && xk >= L * 0.4 && t.goal === 'knick') t.done();
  };
  const ds = slider('Fall in base level', 0, 120, 5, 0, (v) => `${v} m`, (v) => { drop = v; paint(); }, 'water');
  const ts = slider('Time since', 0, 150, 1, 0, (v) => `${v} thousand years`, (v) => { kyr = v; paint(); }, 'old');
  f.controls.append(ds.node, player(ts, ctx).node, ts.node);
  paint();
  return f.node;
});

// ---- Powell's saw on the sand table --------------------------------------------------------

/** A plain sloping down the page with a river in a shallow valley, the land lower to the east, and a ridge rising across it (a model, sped up). */
export const SAW = { nx: 96, ny: 64, row: 32, end: 76, stop: 150, slow: 0.004, fast: 0.012 } as const;
const sawBase = (j: number) => 1.6 - j * 0.025;
export function sawBed(i: number, j: number): number {
  return sawBase(j) + 0.008 * (48 - i) + 0.01 * Math.max(0, 48 - i) - 0.25 * Math.exp(-(((i - 48) / 3) ** 2)) + 0.008 * Math.sin(i * 0.7 + j * 0.3);
}
/** How much of the uplift each cell takes: a ridge across the page that ends at column `SAW.end`. */
export const sawRise = (i: number, j: number) =>
  Math.exp(-(((j - SAW.row) / 4) ** 2)) * (i < SAW.end ? 1 : Math.max(0, 1 - (i - SAW.end) / 4)) * (i < 8 ? i / 8 : 1);

export function sawTable(uplift: number): Table {
  const t = new Table({
    nx: SAW.nx, ny: SAW.ny, bed: sawBed, rises: sawRise,
    edges: { bottom: 'open' },
    params: { uplift, drag: 0.15, carry: 0.8, pickUp: 0.6, settle: 1, start: 0.1 },
  });
  t.sources.push({ k: t.k(48, 0), flow: 0.8 });
  return t;
}

/** Water crossing a line below the ridge: through the ridge, or around its eastern end. */
export function sawFlow(t: Table): { through: number; around: number } {
  let through = 0;
  let around = 0;
  const j = SAW.row + 6;
  for (let i = 0; i < t.nx; i++) {
    const k = t.k(i, j);
    const q = t.fb[k] - t.ft[k + t.nx];
    if (i < SAW.end) through += q;
    else around += q;
  }
  return { through, around };
}

export function sawRun(uplift: number, to: number = SAW.stop): { through: number; around: number; lake: number; cut: number } {
  const t = new Replay(() => sawTable(uplift), { every: 1000 }).to(to);
  let lake = 0;
  for (let k = 0; k < t.n; k++) if (Math.floor(k / t.nx) < SAW.row && t.h[k] > 0.15) lake++;
  const g = t.k(48, SAW.row);
  return { ...sawFlow(t), lake, cut: t.z0[g] - t.z[g] };
}

export const sawFigure = figure(['through', 'around'], (ctx, t) => {
  let uplift: number = t.goal === 'around' ? SAW.fast : SAW.slow;
  const marks = svg('g');
  let lapse: SandLapse;
  const paint = (tb: Table) => {
    const v = lapse.view;
    const now = lapse.now();
    const rose = uplift * tb.t * sawRise(30, SAW.row);
    const gap = tb.k(48, SAW.row);
    const cut = tb.z0[gap] - tb.z[gap];
    const { through, around } = sawFlow(tb);
    const [rx, ry] = v.xy(14, SAW.row);
    redraw(marks,
      small(v.w / 2 + 8, 12, 'the river', { halo: COL.paper }),
      rose > 0.2 ? small(rx, ry + 3, 'the ridge', { bold: true, halo: COL.paper }) : null,
      small(v.w - 6, v.h - 8, 'lower ground', { anchor: 'end', soft: true, halo: COL.paper }),
    );
    lapse.readout.textContent = now < 2
      ? 'A river runs down a plain in a shallow valley. A ridge is about to rise across its path. Press Play.'
      : rose < 0.15
        ? 'The ridge begins to rise across the river.'
        : through > 0.3 && cut > 0.5 * rose
          ? `The river saws down as fast as the ridge rises: it keeps its course and cuts a gorge through the ridge.`
          : around > 0.02
            ? 'The ridge rose faster than the river could cut. A lake fills behind it, spills over the low ground to the east, and the river goes around the ridge\'s end.'
            : 'The ridge is rising faster than the river can cut. The water ponds behind it in a lake that keeps rising.';
    if (now >= SAW.stop - 0.5) {
      if (t.goal === 'through' && uplift === SAW.slow) t.done();
      if (t.goal === 'around' && uplift === SAW.fast) t.done();
    }
  };
  lapse = sandLapse(ctx, {
    slider: (label, min, max, step, value, show, onInput) => slider(label, min, max, step, value, show, onInput, 'water'),
    colors: { low: mixHex(COL.landCrust, COL.paper, 0.35), high: mixHex(COL.mud, COL.ink, 0.25), sand: COL.sand, water: COL.water, salt: COL.pressure, works: COL.rose },
    make: () => sawTable(uplift),
    end: SAW.stop,
    lines: 3,
    show: (x) => `${Math.round(x)}`,
    paint: (tb) => paint(tb),
    heights: [-0.5, 3],
  });
  lapse.view.overlay.append(marks);
  const rate = slider('Uplift', {
    steps: [SAW.slow, SAW.fast],
    value: uplift,
    show: (u) => (u === SAW.slow ? 'slow' : 'three times faster'),
    onInput: (u) => {
      uplift = u;
      lapse.restart();
    },
    color: 'mud',
  });
  lapse.controls.append(rate.node);
  lapse.draw();
  return lapse.node;
});
