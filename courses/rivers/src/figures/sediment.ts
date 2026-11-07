// Lesson 4, Why the river runs brown in November: a river's three loads (a
// still), Hjulström's chart with a grain on the bed below it (live, guess
// first: does clay move at a speed that moves sand?), and the Elwha's delta
// shrinking behind its dams and growing back once they are gone (live, guess
// first, with Play).

import { svg } from 'didactics/dom';
import { arrow, curve, label, line, polyline, redraw, small, still, type P } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { Replay, Table, noise } from 'sandtable/table';
import { laidDown, sandLapse, type SandLapse } from './sand';
import { animate, axes, COL, figure, frame, guessFirst, pick, player, sig, slider, tint, type FigureFactory } from './kit';

const W = 400;

// ---- What a river carries (a still) -------------------------------------------------------

export function loadsStill() {
  const H = 210;
  const s = still(W, H);
  const rng = makeRng(4);
  const top = 40;
  const bed = (x: number) => 150 + 34 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - 20) / 220)));
  const bank: P[] = [];
  for (let x = 20; x <= 240; x += 5) bank.push([x, bed(x)]);
  const parts: SVGElement[] = [
    svg('polygon', { points: [[0, top], [20, top], ...bank, [240, top], [260, top], [260, H], [0, H]].map((p) => p.join(',')).join(' '), fill: tint(COL.land, 0.45) }),
    svg('polygon', { points: [[20, top + 8], ...bank, [240, top + 8]].map((p) => p.join(',')).join(' '), fill: tint(COL.water, 0.3) }),
    line(20, top + 8, 240, top + 8, COL.water, 2),
  ];
  // Suspended grains, thickest toward the bed.
  for (let i = 0; i < 160; i++) {
    const x = 30 + rng() * 200;
    const depth = rng() ** 0.6;
    const y = top + 12 + depth * (bed(x) - top - 18);
    parts.push(svg('circle', { cx: x, cy: y, r: 0.9 + rng() * 0.7, fill: COL.sediment, opacity: 0.8 }));
  }
  // Bed load: pebbles on the bottom, some on the move.
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 13 + rng() * 4;
    parts.push(svg('circle', { cx: x, cy: bed(x) - 5, r: 4 + rng() * 2, fill: COL.sediment, stroke: COL.ink, 'stroke-width': 0.6 }));
  }
  parts.push(
    svg('path', { d: `M96 ${bed(96) - 10} q8 -16 16 -2`, fill: 'none', stroke: COL.flow, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }),
    svg('path', { d: `M150 ${bed(150) - 10} q7 -12 14 -1`, fill: 'none', stroke: COL.flow, 'stroke-width': 1.2, 'stroke-dasharray': '2 2' }),
    // The dissolved load, magnified: ions in the water, too small to see.
    svg('circle', { cx: 62, cy: 82, r: 20, fill: COL.paper, stroke: COL.ink, 'stroke-width': 1.2 }),
    ...[[54, 74, '+'], [68, 76, '−'], [60, 90, '+'], [72, 88, '−'], [50, 86, '−']].map(([x, y, c]) => small(x as number, y as number, c as string, { bold: true, fill: COL.salt })),
    line(80, 92, 96, 104, COL.ink, 0.8),
    svg('circle', { cx: 30, cy: 22, r: 7, fill: COL.paper, stroke: COL.flow, 'stroke-width': 1.5 }),
    line(25, 17, 35, 27, COL.flow, 1.5),
    line(35, 17, 25, 27, COL.flow, 1.5),
    small(42, 26, 'the current flows away from you', { fill: COL.flow }),
  );
  const tx = 268;
  parts.push(
    label(tx, 50, 'Dissolved load', { bold: true }),
    small(tx, 63, 'minerals in solution;'),
    small(tx, 74, 'invisible'),
    label(tx, 100, 'Suspended load', { bold: true, fill: COL.sediment }),
    small(tx, 113, 'clay, silt, fine sand held'),
    small(tx, 124, 'up by eddies; the brown'),
    label(tx, 152, 'Bed load', { bold: true, fill: COL.sediment }),
    small(tx, 165, 'sand, gravel, stones rolling,'),
    small(tx, 176, 'sliding and bouncing'),
    line(tx - 4, 60, 84, 78, tint(COL.ink, 0.35), 0.8),
    line(tx - 4, 110, 200, 120, tint(COL.ink, 0.35), 0.8),
    line(tx - 4, 162, 182, 170, tint(COL.ink, 0.35), 0.8),
  );
  s.svg.append(...parts);
  return { node: s.node };
}

// ---- Hjulström's chart ----------------------------------------------------------------------

/** Grains to choose, with a typical size in millimetres. */
export const SIZES = [
  { name: 'Clay', d: 0.002 },
  { name: 'Silt', d: 0.02 },
  { name: 'Fine sand', d: 0.2 },
  { name: 'Coarse sand', d: 1 },
  { name: 'Pebble', d: 10 },
  { name: 'Cobble', d: 100 },
] as const;

/**
 * The mean current (m/s, in water about a metre deep) that starts a loose
 * grain of `d` mm moving off the bed: Hjulström's upper line, redrawn as a
 * smooth model. Weight sets it for large grains, cohesion and the slow layer
 * at the bed for small ones, with the lowest near a quarter of a millimetre.
 */
export function startSpeed(d: number): number {
  return 0.28 * Math.sqrt(d) + 0.0361 * d ** -0.6;
}

/** The mean current (m/s) below which a moving grain of `d` mm settles out: Hjulström's lower line, as a model. */
export function settleSpeed(d: number): number {
  const fine = 0.1 * d;
  const coarse = 0.196 * Math.sqrt(d);
  return (fine ** -3 + coarse ** -3) ** (-1 / 3);
}

/** How fast a quartz grain of `d` mm sinks through still water, m/s (Ferguson and Church's formula; Stokes's law for the smallest). */
export function sinkSpeed(d: number): number {
  const D = d / 1000;
  const R = 1.65;
  const g = 9.81;
  const nu = 1e-6;
  return (R * g * D * D) / (18 * nu + Math.sqrt(0.75 * R * g * D ** 3));
}

export type GrainState = 'rest' | 'bed' | 'suspended';

/**
 * What a grain does in a current of `v` m/s, given whether it was already
 * moving: it starts at startSpeed, keeps going down to settleSpeed, and rides
 * in the water (suspended) when it sinks slower than the eddies lift, about a
 * tenth of the current; otherwise it rolls and hops along the bed.
 */
export function grainState(d: number, v: number, moving: boolean): GrainState {
  const going = moving ? v >= settleSpeed(d) : v >= startSpeed(d);
  if (!going) return 'rest';
  return sinkSpeed(d) < 0.1 * v ? 'suspended' : 'bed';
}

const speedWords = (v: number) => (v >= 1 ? `${sig(v, 2)} m/s` : `${sig(v * 100, 2)} cm/s`);

export const hjulstromFigure = figure(['clay'], (ctx, t) => {
  const H = 250;
  const f = frame(W, H, 4);
  const g = svg('g');
  const scene = svg('g');
  f.svg.append(g, scene);
  let size = 2;
  let v = 0.3;
  let moving = grainState(SIZES[size].d, v, false) !== 'rest';
  let open = false;
  let settledNow = false;
  const ax = axes({
    x: 48, y: 16, w: 336, h: 124,
    xmin: -3, xmax: 2, ymin: 0.001, ymax: 10, ylog: true,
    xticks: [-3, -2, -1, 0, 1, 2], yticks: [0.001, 0.01, 0.1, 1, 10],
    xfmt: (x) => `${Number((10 ** x).toPrecision(1))}${x === 2 ? ' mm' : ''}`,
    ylabel: 'current (m/s)', ink: COL.ink, grid: COL.grid,
  });
  const trace = (fn: (d: number) => number): [number, number][] => Array.from({ length: 101 }, (_, i) => {
    const lx = -3 + i * 0.05;
    return [lx, fn(10 ** lx)] as [number, number];
  });
  const bands = [[-3, Math.log10(0.004), 'clay'], [Math.log10(0.004), Math.log10(0.063), 'silt'], [Math.log10(0.063), Math.log10(2), 'sand'], [Math.log10(2), 2, 'gravel']] as const;
  const sceneTop = 180;
  const sceneBed = 238;
  let gx = 40;
  let gy = sceneBed - 4;
  let phase = 0;
  const paint = () => {
    const d = SIZES[size].d;
    const state = grainState(d, v, moving);
    const dotColor = state === 'rest' ? COL.sediment : COL.flow;
    redraw(g,
      ...ax.parts,
      ...bands.map(([a, b, n]) => small(ax.X((a + b) / 2), 168, n, { anchor: 'middle', soft: true })),
      ...bands.slice(1).map(([a]) => line(ax.X(a), 160, ax.X(a), 170, COL.soft, 1)),
      open ? ax.path(trace(startSpeed), COL.flow, 2.2) : null,
      open ? ax.path(trace(settleSpeed), COL.sediment, 2, { 'stroke-dasharray': '5 3' }) : null,
      open ? small(ax.X(1.1), ax.Y(startSpeed(12.6)) - 8, 'starts moving', { fill: COL.flow, bold: true, anchor: 'end' }) : null,
      open ? small(ax.X(0.7), ax.Y(settleSpeed(5)) + 14, 'settles out', { fill: COL.sediment, bold: true }) : null,
      open ? small(ax.X(-1), ax.Y(3), 'carried', { soft: true }) : null,
      open ? small(ax.X(-1.6), ax.Y(0.04), 'kept moving if', { soft: true }) : null,
      open ? small(ax.X(-1.6), ax.Y(0.04) + 11, 'already moving', { soft: true }) : null,
      open ? small(ax.X(0.2), ax.Y(0.003), 'settles', { soft: true }) : null,
      line(ax.X(Math.log10(d)), ax.Y(0.001), ax.X(Math.log10(d)), ax.Y(10), tint(COL.ink, 0.2), 1, { 'stroke-dasharray': '2 3' }),
      svg('circle', { cx: ax.X(Math.log10(d)), cy: ax.Y(v), r: 5, fill: dotColor, stroke: COL.paper, 'stroke-width': 1.5 }),
      // The river bed below the chart.
      svg('rect', { x: 0, y: sceneTop, width: W, height: sceneBed - sceneTop, fill: tint(COL.water, 0.22) }),
      svg('rect', { x: 0, y: sceneBed, width: W, height: H - sceneBed, fill: tint(COL.sediment, 0.6) }),
      small(6, sceneTop + 12, `${SIZES[size].name}, ${d} mm, in a current of ${speedWords(v)}`, { bold: true }),
    );
    if (!open) return;
    const name = SIZES[size].name;
    const lower = name.toLowerCase();
    const start = speedWords(startSpeed(d));
    const stop = speedWords(settleSpeed(d));
    f.readout.textContent = state === 'rest'
      ? settledNow
        ? `Too slow to carry it: the ${lower} settles back to the bed. It will not move again until the current reaches ${start}.`
        : `The ${lower} sits on the bed. It needs a current of ${start} to start moving.`
      : v < startSpeed(d)
        ? `Already moving, the ${lower} keeps going in a current too slow to have started it: it needed ${start}, and stays up until the current drops below ${stop}.`
        : state === 'suspended'
          ? `The ${lower} lifts off the bed and rides in the water, held up by the eddies: suspended load. It started moving at ${start}.`
          : `The ${lower} rolls and hops along the bed, too heavy for the eddies to hold up: bed load. It started moving at ${start}.`;
    if (size === 0 && state !== 'rest' && t.goal === 'clay') t.done();
  };
  const update = () => {
    const d = SIZES[size].d;
    const was = moving;
    moving = grainState(d, v, moving) !== 'rest';
    settledNow = was && !moving;
    paint();
  };
  // The grain itself: resting, rolling and hopping, riding in the water, or sinking back.
  animate(f.node, ctx, (dt) => {
    const d = SIZES[size].d;
    const state = grainState(d, v, moving);
    const r = 1.6 + 1.6 * (Math.log10(d) + 3);
    const floor = sceneBed - r;
    const pace = Math.min(140, 30 + 40 * Math.log10(1 + v * 10));
    phase += dt * 6;
    if (state === 'rest') gy = Math.min(floor, gy + dt * 60);
    else if (state === 'bed') {
      gx += dt * pace * 0.5;
      gy = floor - Math.abs(Math.sin(phase)) * Math.min(10, 3 + v * 4);
    } else {
      gx += dt * pace;
      gy += (sceneTop + 30 + 8 * Math.sin(phase / 2) - gy) * Math.min(1, dt * 2);
    }
    if (gx > W - 10) gx = 20;
    const streaks = Array.from({ length: 5 }, (_, i) => {
      const x = ((phase * pace * 0.15 + i * 90) % (W + 40)) - 20;
      return line(x, sceneTop + 22 + i * 6, x + Math.min(30, 6 + v * 12), sceneTop + 22 + i * 6, COL.flow, 1, { opacity: v < 0.02 ? 0 : 0.35 });
    });
    redraw(scene, ...streaks, svg('circle', { cx: gx, cy: gy, r, fill: COL.sediment, stroke: COL.ink, 'stroke-width': 0.8 }));
  });
  const grains = pick(SIZES.map((s) => s.name), size, (i) => {
    size = i;
    moving = grainState(SIZES[i].d, v, false) !== 'rest';
    settledNow = false;
    paint();
  });
  const s = slider('Current', { min: 0.005, max: 5, scale: 'log', value: v, show: speedWords, onInput: (x) => { v = x; update(); }, color: 'flow' });
  f.controls.append(s.node, grains.node);
  guessFirst(t, f, {
    ask: 'Fine sand, a quarter of a millimetre across, starts moving in a current of about 20 cm/s, a slow walk. Clay grains are a hundred times smaller. Does a current that moves the sand also lift a bed of clay?',
    options: ['Yes, and an even slower one would', 'No, clay needs a faster current', 'Clay never rests on the bed at all'],
    answer: 1,
    sliders: [s],
    buttons: grains.buttons,
    after: () => {
      open = true;
      paint();
      f.readout.textContent = `${f.readout.textContent} Choose clay and find the current that lifts it.`;
    },
  });
  paint();
  return f.node;
});

// ---- The Elwha's delta --------------------------------------------------------------------

/** The sediment reaching the river mouth in `year`, as a share of the supply before the dams (a model). */
export function supply(year: number, damsOut: boolean): number {
  if (year < 1913) return 1;
  if (year < 1927) return 0.3;
  if (!damsOut || year < 2012) return 0.1;
  const pulse: Record<number, number> = { 2012: 3, 2013: 6, 2014: 5, 2015: 3, 2016: 2 };
  if (pulse[year] !== undefined) return pulse[year];
  return 1 + Math.exp(-(year - 2016) / 4);
}

/** Years over which waves would carry a delta away with nothing coming in. */
export const WAVE_YEARS = 20;

/** The delta's size each year from 1900 (1900 = 1), supply against waves: it grows by what comes in and loses a share each year to the waves. */
export function deltaHistory(damsOut: boolean, to = 2030): number[] {
  const out: number[] = [];
  let size = 1;
  for (let y = 1900; y <= to; y++) {
    out.push(size);
    const steps = 10;
    for (let k = 0; k < steps; k++) size += (supply(y, damsOut) - size) / WAVE_YEARS / steps;
  }
  return out;
}

export const deltaFigure = figure(['grown'], (ctx, t) => {
  const H = 230;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let year = 1900;
  let out = true;
  let open = false;
  const hist = { true: deltaHistory(true), false: deltaHistory(false) };
  const coast = 104;
  const mouth = 150;
  const river = curve([mouth, coast + 2], [mouth + 30, 170], [mouth - 10, H], 30);
  /** Where the river crosses height y. */
  const at = (y: number) => river.reduce((a, b) => (Math.abs(b[1] - y) < Math.abs(a[1] - y) ? b : a))[0];
  const paint = () => {
    const h = hist[String(out) as 'true' | 'false'];
    const size = h[year - 1900];
    const sup = supply(year, out);
    const dams = year >= 1913 && (!out || year < 2012);
    const rx = 18 + 62 * size;
    const ry = 6 + 30 * size;
    const parts: (SVGElement | null)[] = [
      svg('rect', { x: 0, y: 0, width: W, height: coast, fill: tint(COL.salt, 0.55) }),
      svg('rect', { x: 0, y: coast, width: W, height: H - coast, fill: tint(COL.land, 0.35) }),
      // The plume, while the river brings more than usual.
      sup > 1.4 ? svg('ellipse', { cx: mouth + 40, cy: coast - 20 - 4 * sup, rx: 30 + 18 * sup, ry: 10 + 5 * sup, fill: COL.sediment, opacity: Math.min(0.55, 0.12 * sup) }) : null,
      // The delta: a lobe of sand and gravel at the mouth.
      svg('path', { d: `M${mouth - rx} ${coast} A${rx} ${ry} 0 0 1 ${mouth + rx} ${coast} Z`, fill: tint(COL.sediment, 0.85) }),
      line(0, coast, W, coast, COL.land, 1.5),
      // The river, and the dams on it when they stand.
      polyline(river, COL.water, 5),
      dams ? line(at(150) - 12, 150, at(150) + 12, 150, COL.works, 5) : null,
      dams && year >= 1927 ? line(at(205) - 12, 205, at(205) + 12, 205, COL.works, 5) : null,
      dams ? small(at(150) + 18, 153, 'Elwha Dam', { fill: COL.works, bold: true }) : null,
      dams && year >= 1927 ? small(at(205) + 18, 208, 'Glines Canyon Dam', { fill: COL.works, bold: true }) : null,
      // Waves come in from the open Strait; the drift carries sand east.
      ...[0, 1, 2, 3].map((i) => svg('path', { d: `M${20 + i * 22} ${30 + i * 16} q16 -12 34 -6`, fill: 'none', stroke: COL.wind, 'stroke-width': 1.8 })),
      small(14, 96, 'waves from the Strait', { fill: COL.paper }),
      arrow(250, coast - 8, 385, coast - 8, COL.flow, 1.5),
      small(385, coast - 14, 'sand drifts east to Ediz Hook', { fill: COL.paper, anchor: 'end' }),
      small(mouth, coast - ry - 6, 'delta', { anchor: 'middle', bold: true, halo: tint(COL.salt, 0.55), fill: COL.paper }),
      label(10, 20 + 4, `${year}`, { bold: true, fill: COL.paper }),
    ];
    // A small record of the delta's size so far.
    const sx = 240, sy = 140, sw = 148, sh = 68;
    const X = (y: number) => sx + ((y - 1900) / 130) * sw;
    const Y = (v: number) => sy + sh - (v / 1.3) * sh;
    const pts: [number, number][] = h.slice(0, year - 1900 + 1).map((v, i) => [X(1900 + i), Y(v)]);
    parts.push(
      svg('rect', { x: sx - 6, y: sy - 16, width: sw + 12, height: sh + 30, rx: 4, fill: COL.paper, opacity: 0.9 }),
      small(sx, sy - 5, 'size of the delta (model)', { soft: true }),
      line(sx, sy + sh, sx + sw, sy + sh, COL.ink, 1),
      line(X(1913), sy, X(1913), sy + sh, tint(COL.works, 0.5), 1, { 'stroke-dasharray': '2 2' }),
      line(X(2012), sy, X(2012), sy + sh, tint(COL.works, 0.5), 1, { 'stroke-dasharray': '2 2' }),
      small(X(1900), sy + sh + 10, '1900', { soft: true }),
      small(X(2012), sy + sh + 10, '2012', { anchor: 'middle', soft: true }),
      polyline(pts, COL.model, 2),
    );
    redraw(g, ...parts);
    if (!open) return;
    f.readout.textContent = year < 1913
      ? 'Before the dams the river brings sand and gravel about as fast as the waves carry it off along the shore, and the delta holds its size.'
      : year < 1927
        ? 'The Elwha Dam (1913) traps the river\'s sand and gravel in Lake Aldwell. The waves keep taking sand from the delta, and the river no longer replaces it.'
        : year < 2012 || !out
          ? `${year < 2012 ? 'Glines Canyon Dam (1927) adds a second trap upstream.' : 'With the dams left in place, nothing changes.'} The delta keeps wearing back, and what is left of the beach turns to cobbles.`
          : year <= 2016
            ? 'The dams are out. A century of stored sediment comes down: mud in a brown plume, and sand and gravel onto the delta faster than the waves can take it away.'
            : 'The pulse is passing and the delta has grown back within a few years. Supply and waves are settling toward a balance, and the extra sand drifts east along the shore.';
    if (out && year >= 2016 && t.goal === 'grown') t.done();
  };
  const s = slider('Year', 1900, 2030, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'sediment');
  const play = player(s, ctx, { seconds: 12 });
  const which = pick(['Dams come out in 2011', 'Dams stay in'], 0, (i) => { out = i === 0; paint(); });
  f.controls.append(play.node, s.node, which.node);
  guessFirst(t, f, {
    ask: 'From 1913 the dams trap the river\'s sand, and the delta wears back for a century. When the dams come out, how long does it take to grow back?',
    options: ['About a century', 'A few years', 'It never does'],
    answer: 1,
    sliders: [s],
    buttons: which.buttons,
    after: () => {
      open = true;
      paint();
      f.readout.textContent = 'Press Play to run the century, or move the year yourself.';
    },
  });
  paint();
  return f.node;
});

// ---- A dam on a sand table ---------------------------------------------------------------------

/** The valley on the sand table: mountains at the top, a winding valley, a coast and a sea below. */
export const DAM = { nx: 96, ny: 64, shore: 44, row: 18, out: 50, end: 120, sea: 0.5 } as const;
const damNoise = noise(3, 10, 3);
const valleyAt = (j: number) => 48 + 6 * Math.sin(j / 8);
export function damBed(i: number, j: number): number {
  const r = damNoise(i, j);
  const d = Math.abs(i - valleyAt(j));
  if (j > DAM.shore) return 0.4 - (j - DAM.shore) * 0.08 + (r - 0.5) * 0.15;
  const u = Math.min(1, (DAM.shore - j) / 16);
  const fade = u * u * (3 - 2 * u);
  return 0.4 + (DAM.shore - j) * 0.04 + fade * Math.min(2.5, Math.max(0, d - 3) * 0.15) + (r - 0.5) * 0.3 + 0.05 * Math.min(d, 3);
}
/** The dam's crest, and the cells it stands on (across the valley floor, wherever the ground is lower than the crest). */
export const DAM_TOP = damBed(Math.round(valleyAt(DAM.row)), DAM.row) + 1.2;
const damCells = (t: Table) => {
  const out: number[] = [];
  for (let i = 0; i < DAM.nx; i++) if (damBed(i, DAM.row) < DAM_TOP + 0.2) out.push(t.k(i, DAM.row));
  return out;
};

export type DamCase = 'none' | 'stays' | 'out';

/** The table for one case: the river comes in at the top carrying sand, and a dam (if any) stands from the start with its lake full. */
export function damTable(c: DamCase): Table {
  const t = new Table({ nx: DAM.nx, ny: DAM.ny, bed: damBed,
    // Below the dam the river runs on cobbles and rock: it can cut only a little way into its bed.
    floor: (i, j) => (j > DAM.row ? damBed(i, j) - 0.02 : -1e9),
    erodibility: () => 0.12,
    sea: (_i, j) => j === DAM.ny - 1, params: { carry: 0.6, pickUp: 0.4, settle: 1.5, start: 0.2, sea: DAM.sea, drag: 0.15 } });
  t.sources.push({ k: t.k(Math.round(valleyAt(0)), 0), flow: 1, sand: 0.04 });
  if (c !== 'none') {
    t.build(damCells(t), DAM_TOP);
    for (let j = 0; j < DAM.row; j++) for (let i = 0; i < DAM.nx; i++) {
      const k = t.k(i, j);
      if (t.z[k] < DAM_TOP && Math.abs(i - valleyAt(j)) < 20) t.h[k] = DAM_TOP - t.z[k];
    }
  }
  return t;
}

/** What changes with time: the dam comes out halfway through, in the "out" case. */
export const damSchedule = (c: DamCase) => (t: Table, time: number) => {
  if (c === 'out' && time >= DAM.out && t.works.some((w) => w > 0)) t.remove(damCells(t));
};

/** Sand laid down behind the dam (in its lake) and beyond the old shore (the delta). */
export function damStock(t: Table): { behind: number; delta: number } {
  return {
    behind: laidDown(t, (i, j) => j < DAM.row && Math.abs(i - valleyAt(j)) < 20),
    delta: laidDown(t, (_i, j) => j > DAM.shore - 2),
  };
}

/** Run a case to model time `to` and say what is where. */
export function damRun(c: DamCase, to: number = DAM.end): { behind: number; delta: number } {
  const r = new Replay(() => damTable(c), { every: 1000, schedule: damSchedule(c) });
  return damStock(r.to(to));
}

export const damFigure = figure(['trap', 'release'], (ctx, t) => {
  let which: DamCase = t.goal === 'release' ? 'out' : 'stays';
  const bars = svg('g');
  let lapse: SandLapse;
  const paint = (tb: Table) => {
    const { behind, delta } = damStock(tb);
    const now = lapse.now();
    const top = 12;
    const full = 60;
    const scale = (v: number) => Math.min(full, (v / 30) * full);
    const bx = 330;
    const dam = tb.works.some((w) => w > 0);
    const [lx, ly] = lapse.view.xy(Math.round(valleyAt(DAM.row)) + 10, DAM.row);
    redraw(bars,
      svg('rect', { x: bx - 8, y: top - 4, width: 78, height: full + 34, rx: 4, fill: COL.paper, opacity: 0.88 }),
      svg('rect', { x: bx, y: top + full - scale(behind), width: 22, height: scale(behind), fill: COL.sediment }),
      svg('rect', { x: bx + 38, y: top + full - scale(delta), width: 22, height: scale(delta), fill: COL.sediment }),
      line(bx - 4, top + full, bx + 64, top + full, COL.ink, 1),
      small(bx + 11, top + full + 11, 'lake', { anchor: 'middle' }),
      small(bx + 49, top + full + 11, 'delta', { anchor: 'middle' }),
      small(bx + 30, top + full + 22, 'sand laid down', { anchor: 'middle', soft: true }),
      dam ? small(lx, ly + 3, 'dam', { bold: true, fill: COL.works, halo: COL.paper }) : null,
    );
    const share = behind + delta > 0.5 ? behind / (behind + delta) : 0;
    lapse.readout.textContent = now < 2
      ? (which === 'none'
        ? 'No dam: the river runs from the mountains to the sea, carrying sand. Press Play.'
        : 'The dam stands across the valley and its lake is full of water. The river brings sand down from the mountains. Press Play.')
      : !dam && which === 'out' && now >= DAM.out
        ? `The dam is out. The river cuts down through the sand that filled the lake and carries it on, and the delta ${delta > 60 ? 'grows fast' : 'starts to grow'}.`
        : which === 'none'
          ? `With nothing in the way, the river lays its sand down where it slows, at the sea: a delta builds out from the shore.`
          : `The river slows in the lake and drops its sand there (${Math.round(share * 100)}% of all the sand laid down so far). Below the dam it runs clear, and the delta ${delta < 5 ? 'gets almost nothing' : 'grows only slowly'}.`;
    if (now >= DAM.end - 0.5) {
      if (t.goal === 'trap' && which === 'stays') t.done();
      if (t.goal === 'release' && which === 'out') t.done();
    }
  };
  lapse = sandLapse(ctx, {
    make: () => damTable(which),
    schedule: (tb, time) => damSchedule(which)(tb, time),
    end: DAM.end,
    lines: 3,
    show: (v) => (v >= DAM.out && which === 'out' ? `${Math.round(v)} (dam out)` : `${Math.round(v)}`),
    paint: (tb) => paint(tb),
    heights: [0, 3],
  });
  lapse.view.overlay.append(bars);
  const cases: DamCase[] = ['none', 'stays', 'out'];
  const choose = pick(['No dam', 'Dam stays', 'Dam comes out'], cases.indexOf(which), (i) => {
    which = cases[i];
    lapse.restart();
  });
  lapse.controls.append(choose.node);
  lapse.draw();
  return lapse.node;
});

export const figures: Record<string, FigureFactory> = {
  'sediment-loads': loadsStill,
  'sediment-hjulstrom': hjulstromFigure,
  'sediment-delta': deltaFigure,
  'sediment-table': damFigure,
};
