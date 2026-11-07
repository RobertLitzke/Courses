// Lesson 14, Where the beach comes from: the zigzag of swash and backwash
// that moves a pebble along the shore, and a drift cell from a feeder bluff to
// a spit, with a bulkhead the reader builds.

import { svg } from 'didactics/dom';
import { arrow, line, redraw, small, still } from 'didactics/draw';
import { Replay, Table } from 'sandtable/table';
import { laidDown, sandLapse, type SandLapse } from './sand';
import { COL, figure, frame, guessFirst, pick, player, slider, tint, toggles, wrapped, type FigureFactory } from './kit';

const W = 400;

// ---- The zigzag (a still) ------------------------------------------------------------------------

function swashStill(): { node: HTMLElement } {
  const H = 200;
  const s = still(W, H);
  const shore = 92; // the water's edge
  const top = 150; // the top of the swash
  const parts: SVGElement[] = [
    svg('rect', { x: 0, y: 0, width: W, height: shore, fill: tint(COL.salt, 0.18) }),
    svg('rect', { x: 0, y: shore, width: W, height: top + 12 - shore, fill: tint(COL.sediment, 0.28) }),
    svg('rect', { x: 0, y: top + 12, width: W, height: H - top - 12, fill: tint(COL.sediment, 0.5) }),
    small(8, 14, 'Sea', { bold: true, fill: COL.salt }),
    small(8, top + 30, 'Dry beach', { bold: true, fill: COL.sediment }),
  ];
  // Wave crests coming in from the upper left, at an angle to the shore; each travels square to its crest.
  for (let k = 0; k < 8; k++) {
    const x = -30 + k * 58;
    parts.push(line(x, shore - 8, x + 52, shore - 66, COL.wind, 2, { opacity: 0.8 }));
  }
  parts.push(arrow(196, 26, 226, 52, COL.wind, 2.5), small(W - 8, 14, 'waves arrive at an angle', { anchor: 'end', fill: COL.wind, bold: true }));
  // The pebble's path: up slantwise, straight down, four times.
  let x = 60;
  for (let k = 0; k < 4; k++) {
    const up = x + 46;
    parts.push(
      arrow(x, shore + 4, up, top, COL.flow, 2),
      line(up, top, up, shore + 10, COL.flow, 2, { 'stroke-dasharray': '4 3' }),
      svg('path', { d: `M ${up - 4} ${shore + 12} L ${up} ${shore + 5} L ${up + 4} ${shore + 12} z`, fill: COL.flow }),
      svg('circle', { cx: x, cy: shore + 4, r: 3.5, fill: COL.rock }),
    );
    x = up;
  }
  parts.push(svg('circle', { cx: x, cy: shore + 4, r: 3.5, fill: COL.rock }));
  parts.push(
    ...wrapped(262, 108, 'Swash: up the slope in the waves’ direction (solid). Backwash: straight down (dashed).', 30, { fill: COL.ink }),
    arrow(70, H - 14, 250, H - 14, COL.flow, 3),
    small(258, H - 10, 'longshore drift', { bold: true, fill: COL.flow }),
  );
  s.svg.append(...parts);
  return { node: s.node };
}

// ---- A drift cell ----------------------------------------------------------------------------------

/** Cells along the shore, from the up-drift end (0) to the spit (N - 1). */
export const N = 40;
/** The length of shore the model covers, metres. */
export const SHORE_M = 5000;
/** Where the feeder bluff runs, as fractions of the shore. */
export const BLUFF = [0.06, 0.55] as const;
/** Where the houses stand on a low bank down-drift. */
export const HOUSES = [0.6, 0.86] as const;
/** The bluff's height in metres, and the share of what falls that is sand and gravel. */
export const BLUFF_HEIGHT = 30;
export const SAND_SHARE = 0.5;
/** Drift the waves can carry at 45 degrees, cubic metres a year. */
export const CAPACITY = 8000;
/** Sand a cell holds when the waves carry it at full capacity, cubic metres. */
export const FULL = 8000;
/** Width of a full beach, metres. */
export const FULL_WIDTH = 40;
/** The bulkhead's length, as a fraction of the shore. */
export const WALL = 0.14;

/** What the waves can carry along the shore at `angle` degrees between crest and shore, cubic metres a year (CERC: sin 2θ). */
export function capacity(angle: number): number {
  return CAPACITY * Math.sin((2 * angle * Math.PI) / 180);
}

const centre = (i: number) => (i + 0.5) / N;
const inside = (x: number, r: readonly [number, number]) => x >= r[0] && x < r[1];

export interface Cell {
  angle: number;
  /** Bluff retreat, metres a year. */
  retreat: number;
  /** The bulkhead's middle, as a fraction of the shore, or null for none. */
  wall: number | null;
}

/** Whether cell i lies behind the bulkhead. */
export const walled = (c: Cell, i: number) => c.wall !== null && Math.abs(centre(i) - c.wall) < WALL / 2 && inside(centre(i), BLUFF);

/** Sand and gravel a cell's bluff gives the beach each year, cubic metres. */
export function supply(c: Cell, i: number): number {
  if (!inside(centre(i), BLUFF) || walled(c, i)) return 0;
  return BLUFF_HEIGHT * c.retreat * (SHORE_M / N) * SAND_SHARE;
}

/** The waves' carrying power at cell i: waves reflected off a wall scour harder. */
const power = (c: Cell, i: number) => capacity(c.angle) * (walled(c, i) ? 1.6 : 1);

/** Drift out of each cell, cubic metres a year, given the sand each holds. */
export function drift(c: Cell, v: readonly number[]): number[] {
  return v.map((vi, i) => power(c, i) * Math.min(1, vi / FULL));
}

/** The steady beach the cell settles to with no wall: each cell carries all the supply from up-drift. */
export function steady(c: Cell): number[] {
  const open = { ...c, wall: null };
  let q = 0;
  return Array.from({ length: N }, (_, i) => {
    q += supply(open, i);
    const p = power(open, i);
    return p > 0 && q < p ? (FULL * q) / p : FULL * 2;
  });
}

/** The beach `years` after the wall is built, from the steady beach without it. Also the spit's growth, metres. */
export function evolve(c: Cell, years: number, dt = 0.02): { v: number[]; spit: number; out: number } {
  let v = steady(c);
  let spit = 0;
  let out = 0;
  const steps = Math.round(years / dt);
  for (let s = 0; s < steps; s++) {
    const q = drift(c, v);
    v = v.map((vi, i) => Math.max(0, vi + dt * (supply(c, i) + (i > 0 ? q[i - 1] : 0) - q[i])));
    out = q[N - 1];
    spit += (dt * out) / SPIT_SECTION;
  }
  if (steps === 0) out = drift(c, v)[N - 1];
  return { v, spit, out };
}

/** Sand per metre of a spit's length, cubic metres: what it takes to build one more metre. */
export const SPIT_SECTION = 400;

/** Beach width in metres for the sand a cell holds. */
export const width = (v: number) => 6 + (FULL_WIDTH - 6) * Math.min(1.6, v / FULL);

/** The mean width of the beach in front of the houses. */
export function housesBeach(v: readonly number[]): number {
  const w = v.map(width).filter((_, i) => inside(centre(i), HOUSES));
  return w.reduce((a, b) => a + b, 0) / w.length;
}

const cellFigure = figure(['starve'], (ctx, t) => {
  const H = 228;
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const X0 = 12;
  const X1 = 340;
  const SHORE = 108; // the shoreline's y
  const xs = (x: number) => X0 + x * (X1 - X0);
  let angle = 30;
  let retreat = 0.1;
  let wallOn = true;
  let wallAt = 0.32;
  let year = 0;
  const cell = (): Cell => ({ angle, retreat, wall: wallOn ? wallAt : null });
  const paint = () => {
    const c = cell();
    const before = steady({ ...c, wall: null });
    const now = evolve(c, year);
    const q = drift(c, now.v);
    const parts: SVGElement[] = [
      svg('rect', { x: 0, y: 0, width: W, height: SHORE, fill: tint(COL.salt, 0.16) }),
      svg('rect', { x: 0, y: SHORE, width: W, height: H - SHORE, fill: tint(COL.land, 0.28) }),
      svg('rect', { x: xs(BLUFF[0]), y: SHORE + 46, width: xs(BLUFF[1]) - xs(BLUFF[0]), height: 26, fill: tint(COL.land, 0.75) }),
      small((xs(BLUFF[0]) + xs(BLUFF[1])) / 2, SHORE + 86, 'feeder bluff', { anchor: 'middle', bold: true, fill: COL.ink }),
      small((xs(HOUSES[0]) + xs(HOUSES[1])) / 2, SHORE + 86, 'houses, low bank', { anchor: 'middle', bold: true, fill: COL.ink }),
    ];
    // Wave crests at the angle, coming from the left.
    const a = (angle * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (const cy of [34, 62, 90]) {
      for (let cx = 30 + (cy % 3) * 12; cx < W; cx += 74) {
        parts.push(line(cx - 26 * ca, cy + 26 * sa, cx + 26 * ca, cy - 26 * sa, COL.wind, 1.6, { opacity: 0.75 }));
      }
    }
    parts.push(arrow(24, 22, 24 + 26 * sa, 22 + 26 * ca, COL.wind, 2));
    // The beach, as wide as the sand it holds, with the starting edge dashed.
    for (let i = 0; i < N; i++) {
      const x = xs(i / N);
      const wd = width(now.v[i]) * 0.9;
      parts.push(svg('rect', { x, y: SHORE, width: (X1 - X0) / N + 0.5, height: Math.max(1, wd), fill: COL.sediment }));
      const was = width(before[i]) * 0.9;
      parts.push(line(x, SHORE + was, x + (X1 - X0) / N, SHORE + was, COL.ink, 1.1, { 'stroke-dasharray': '3 2', opacity: 0.75 }));
    }
    // Houses.
    for (let x = HOUSES[0] + 0.03; x < HOUSES[1]; x += 0.07) {
      const hx = xs(x);
      parts.push(svg('path', { d: `M ${hx - 6} ${SHORE + 66} v -9 l 6 -6 l 6 6 v 9 z`, fill: COL.soft }));
    }
    // The bulkhead.
    if (c.wall !== null) {
      const lo = Math.max(BLUFF[0], c.wall - WALL / 2);
      const hi = Math.min(BLUFF[1], c.wall + WALL / 2);
      parts.push(svg('rect', { x: xs(lo), y: SHORE + 41, width: xs(hi) - xs(lo), height: 5, fill: COL.works }), small(xs(c.wall), SHORE + 100, 'bulkhead', { anchor: 'middle', bold: true, fill: COL.works }));
    }
    // The spit, growing out from the end of the shore.
    const spitLen = 40 + Math.min(70, now.spit / 12);
    const sx = xs(1);
    parts.push(
      svg('path', { d: `M ${sx - 4} ${SHORE + 4} L ${sx + spitLen * 0.7} ${SHORE - spitLen * 0.55} q 10 -6 8 6 L ${sx + 6} ${SHORE + 8} z`, fill: COL.sediment }),
      small(W - 6, SHORE + 18, 'spit', { anchor: 'end', bold: true, fill: COL.sediment }),
    );
    // Drift arrows along the beach, as thick as the drift.
    for (const x of [0.2, 0.45, 0.7, 0.92]) {
      const i = Math.min(N - 1, Math.floor(x * N));
      const qq = q[i];
      if (qq > 50) parts.push(arrow(xs(x) - 22, SHORE - 14, xs(x) + 22, SHORE - 14, COL.flow, 1 + Math.min(5, qq / 1200)));
    }
    parts.push(
      small(8, 14, `${year === 0 ? 'Start' : `${year} year${year === 1 ? '' : 's'} later`}`, { bold: true }),
      small(W - 8, 14, `drift past the houses: ${Math.round(q[Math.floor(0.75 * N)] / 100) * 100} m³ a year`, { anchor: 'end', fill: COL.flow, bold: true }),
      small(W - 8, H - 8, 'dashed: the beach before', { anchor: 'end', soft: true }),
    );
    redraw(g, ...parts);
    if (!open()) return;
    const wasW = housesBeach(before);
    const nowW = housesBeach(now.v);
    const cap = capacity(angle);
    f.readout.textContent = angle < 2
      ? 'Waves arriving head-on move sand up and down the beach but not along it. No drift: the spit gets nothing.'
      : nowW < wasW * 0.92
        ? `The beach in front of the houses is ${nowW.toFixed(0)} m wide, down from ${wasW.toFixed(0)} m. The waves still carry sand away, but less arrives from the bluff.`
        : supply({ angle, retreat, wall: null }, Math.floor(0.3 * N)) * (BLUFF[1] - BLUFF[0]) * N > cap
          ? `The bluff gives more than the waves can carry (${Math.round(cap / 100) * 100} m³ a year at this angle), so sand piles up along the beach.`
          : `The beach in front of the houses is ${nowW.toFixed(0)} m wide. Everything the bluff gives travels along it to the spit, which grows ${(now.out / SPIT_SECTION).toFixed(0)} m a year.`;
    if (c.wall !== null && nowW < wasW * 0.85) t.done();
  };
  const tg = toggles(['Bulkhead'], [wallOn], (on) => { wallOn = on[0]; paint(); });
  const ang = slider('Wave angle', 0, 80, 1, angle, (v) => `${v}°`, (v) => { angle = v; paint(); }, 'wind');
  const sup = slider('Bluff retreat', 0.02, 0.3, 0.01, retreat, (v) => `${Math.round(v * 100)} cm a year`, (v) => { retreat = v; paint(); }, 'sediment');
  const pos = slider('Bulkhead at', 0.12, 0.49, 0.01, wallAt, (v) => `${(v * SHORE_M / 1000).toFixed(1)} km`, (v) => { wallAt = v; paint(); }, 'works');
  const yr = slider('Years', 0, 30, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'ink');
  const play = player(yr, ctx, { seconds: 8 });
  const row = document.createElement('div');
  row.className = 'fig-row';
  row.append(yr.node, play.node);
  f.controls.append(row, tg.node, pos.node, ang.node, sup.node);
  const open = guessFirst(t, f, {
    ask: 'A bulkhead is built at the foot of the bluff. Over the years, what happens to the beach down-drift, in front of the houses?',
    options: ['It narrows', 'It widens', 'It stays the same'],
    answer: 0,
    sliders: [yr, ang, sup, pos],
    buttons: tg.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- A drift cell on the sand table --------------------------------------------------------------

/** A straight coast of feeder bluffs between two sheltered bays, waves coming in at an angle (a model). */
export const COAST = { nx: 96, ny: 64, west: 22, east: 74, shore: 24, end: 120 } as const;
export const coastShore = (i: number) => (i < COAST.west ? COAST.shore - (COAST.west - i) * 0.9 : i > COAST.east ? COAST.shore - (i - COAST.east) * 0.9 : COAST.shore);
export function coastBed(i: number, j: number): number {
  const s = coastShore(i);
  if (j < s) return Math.min(1.4, 0.2 + (s - j) * 0.35);
  const bay = i < COAST.west ? COAST.west - i : i > COAST.east ? i - COAST.east : 0;
  return -0.05 - Math.min(2, (j - s) * 0.08) - Math.min(1, bay * 0.05);
}

export type WavesFrom = 'west' | 'east';

export function coastTable(from: WavesFrom): Table {
  const { nx, ny } = COAST;
  const t = new Table({
    nx, ny, bed: coastBed,
    sea: (_i, j) => j === ny - 1,
    // The bluffs are loose glacial sand and gravel; the sea floor is harder.
    erodibility: (i, j) => (j >= coastShore(i) ? 0.15 : 1),
    params: { waves: 0.6, surf: 0.5, driftTo: [from === 'west' ? 1 : -1, 0], drift: 1.2, cliff: 0.15, carry: 0.6, pickUp: 0.5, settle: 1, start: 0.1, swash: 2 },
  });
  // The bays are sheltered: the waves reach only their mouths.
  t.waveOn = new Float32Array(nx * ny).map((_, k) => {
    const i = k % nx;
    const j = Math.floor(k / nx);
    return (i > COAST.east || i < COAST.west) && j < COAST.shore ? Math.max(0, 1 - (COAST.shore - j) / 4) : 1;
  });
  return t;
}

/** Sand laid down in each bay so far. */
export function bays(t: Table): { west: number; east: number } {
  return { west: laidDown(t, (i) => i < COAST.west), east: laidDown(t, (i) => i > COAST.east) };
}

export function coastRun(from: WavesFrom, to: number = COAST.end): { west: number; east: number } {
  return bays(new Replay(() => coastTable(from), { every: 1000 }).to(to));
}

export const coastFigure = figure(['downdrift'], (ctx, t) => {
  let from: WavesFrom = 'west';
  let open = false;
  const marks = svg('g');
  let lapse: SandLapse;
  const paint = (tb: Table) => {
    const v = lapse.view;
    const { west, east } = bays(tb);
    const dir = from === 'west' ? 1 : -1;
    const sy = v.xy(0, COAST.shore + 6)[1];
    // Crests square to the waves' travel, which is up the page and slanting downdrift.
    const tx = dir * 0.45;
    const ty = -1;
    const crest = (cx: number, cy: number) => svg('line', { x1: cx - 22, y1: cy - 22 * tx, x2: cx + 22, y2: cy + 22 * tx, stroke: COL.paper, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.9 });
    const x0 = from === 'west' ? 110 : 290;
    redraw(marks,
      // Wave crests marching in at an angle from offshore.
      ...[0, 1, 2, 3].map((n) => crest(x0 + n * 18 * tx, v.h - 22 + n * 18 * ty)),
      small(from === 'west' ? 10 : v.w - 10, v.h - 10, `waves from the ${from}`, { anchor: from === 'west' ? undefined : 'end', bold: true, fill: COL.paper }),
      arrow(v.w / 2 - dir * 50, sy, v.w / 2 + dir * 50, sy, COL.flow, 2),
      small(v.w / 2, sy + 14, 'drift', { anchor: 'middle', bold: true, fill: COL.paper }),
      small(v.w / 2, v.xy(0, 6)[1], 'feeder bluffs', { anchor: 'middle', bold: true, halo: COL.paper }),
      small(v.xy(6, 0)[0], v.xy(0, 4)[1], 'bay', { anchor: 'middle', fill: COL.paper }),
      small(v.xy(89, 0)[0], v.xy(0, 4)[1], 'bay', { anchor: 'middle', fill: COL.paper }),
    );
    if (!open) return;
    const now = lapse.now();
    const ends = west + east;
    lapse.readout.textContent = now < 2
      ? `Waves from the ${from} wear at the bluffs and wash their sand along the shore. Press Play.`
      : ends < 3
        ? 'The waves cut into the foot of the bluffs, and a beach of their sand and gravel forms along the shore.'
        : `Sand laid down at the ${from === 'west' ? 'east' : 'west'} end so far: ${Math.round((Math.max(west, east) / ends) * 100)}% of what reached either bay. It builds out across the bay mouth as a bar, the start of a spit.`;
    if (now >= COAST.end - 0.5 && t.goal === 'downdrift') t.done();
  };
  lapse = sandLapse(ctx, {
    make: () => coastTable(from),
    end: COAST.end,
    lines: 3,
    show: (x) => `${Math.round(x)}`,
    paint: (tb) => paint(tb),
    heights: [0, 1.4],
  });
  lapse.view.overlay.append(marks);
  const which = pick(['Waves from the west', 'Waves from the east'], 0, (i) => {
    from = i === 0 ? 'west' : 'east';
    lapse.restart();
  });
  lapse.controls.append(which.node);
  guessFirst(t, { controls: lapse.controls, readout: lapse.readout }, {
    ask: 'Waves come in from the west, at an angle to the shore, day after day. Where does the sand from the bluffs end up?',
    options: ['Spread evenly along the beach', 'Piled up at the east end', 'Carried out to deep water'],
    answer: 1,
    sliders: [lapse.time],
    buttons: which.buttons,
    after: () => {
      open = true;
      lapse.draw();
    },
  });
  lapse.draw();
  return lapse.node;
});

export const figures: Record<string, FigureFactory> = {
  'beach-swash': swashStill,
  'beach-cell': cellFigure,
  'beach-table': coastFigure,
};
