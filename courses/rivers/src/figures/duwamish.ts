// Branch S3, Straightening the Duwamish: the lower river as it wound across
// its tideflats in 1900 and as the dredged waterway it is now, with how far
// salt water creeps up its bed as the river's flow changes.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { length } from 'didactics/units';
import { Replay, Table, noise } from 'sandtable/table';
import { laidDown, sandLapse, type SandLapse } from './sand';
import { big, COL, figure, frame, guessFirst, pick, sig, slider, type FigureFactory } from './kit';

const W = 400;

/** How far up the valley the figure runs, km: from Elliott Bay to about Tukwila. */
export const VALLEY = 12;

/** Mean tide in Elliott Bay, metres above low tide (the river's surface near the mouth, in the model). */
export const MEAN_TIDE = 2;

/** The river's height at the top of the figure, m, for its fall. */
export const HEAD = 5;

export type Era = 'old' | 'now';

/**
 * The model channel at `s` km up the valley: how much longer the channel is
 * than the valley there (its sinuosity), its bed's height in metres above low
 * tide, and its width in metres. In 1900 the river wound across the lower
 * 8 km of valley in meanders, its bed shallow. The waterway runs straight
 * over that stretch, dredged to about 9 m below low tide at the mouth and
 * wider, then climbs back to the river's own bed by about 9.5 km.
 */
export function channelAt(era: Era, s: number): { sinuosity: number; bed: number; width: number } {
  const natural = -1 + (5 * s) / VALLEY;
  if (era === 'old') return { sinuosity: s < 8 ? 1.8 : 1.3, bed: natural, width: s < 8 ? 60 : 50 };
  if (s < 8) return { sinuosity: 1, bed: -9 + (4.5 * s) / 8, width: 120 };
  if (s < 9.5) {
    const top = -1 + (5 * 9.5) / VALLEY;
    return { sinuosity: 1.3, bed: -4.5 + ((top + 4.5) * (s - 8)) / 1.5, width: 50 };
  }
  return { sinuosity: 1.3, bed: natural, width: 50 };
}

/** The channel's length, km, from the mouth to `s` km up the valley. */
export function channelLength(era: Era, s: number = VALLEY): number {
  let km = 0;
  const ds = 0.01;
  for (let x = 0; x < s - 1e-9; x += ds) km += channelAt(era, x + ds / 2).sinuosity * Math.min(ds, s - x);
  return km;
}

/** The river's fall along its channel, metres per km, from HEAD at the top of the figure to mean tide at the mouth. */
export const fallPerKm = (era: Era) => (HEAD - MEAN_TIDE) / channelLength(era);

/**
 * How far up the valley salt water reaches along the bed, km, with the river
 * running `flow` m³/s. Sea water is heavier than river water (lesson 12) and
 * slides upstream under it wherever the river is too slow to push it back. In
 * this model it stops where the channel has grown too shallow: where the
 * river, squeezed into the depth left, would run faster than about a third of
 * the speed a wave runs along the boundary between the two layers. That speed
 * is √(g′d), with g′ the pull of gravity scaled by the difference in density.
 */
export function saltReach(era: Era, flow: number): number {
  const gPrime = 0.15;
  const ds = 0.01;
  for (let s = 0; s <= VALLEY; s += ds) {
    const c = channelAt(era, s);
    const depth = MEAN_TIDE - c.bed;
    if (depth <= 0) return s;
    const speed = flow / (c.width * depth);
    if (speed > 0.3 * Math.sqrt(gPrime * depth)) return s;
  }
  return VALLEY;
}

export const channelFigure = figure(['compare'], (ctx, t) => {
  const units = ctx.save.units;
  const f = frame(W, 256, 3);
  const g = svg('g');
  f.svg.append(g);
  let era: Era = 'old';
  let flow = 15;
  const seen = { old: false, now: false };
  const x0 = 22;
  const perKm = (W - x0 - 14) / VALLEY;
  const X = (s: number) => x0 + s * perKm;
  const mid = 70;
  // The plan: a wavy line whose sinuosity matches the model's.
  const planY = (e: Era, s: number) => {
    const c = channelAt(e, s);
    const amp = c.sinuosity > 1.5 ? 20 : c.sinuosity > 1.05 ? 10 : 0;
    return mid + amp * Math.sin((2 * Math.PI * s) / 1.6);
  };
  const Z = (z: number) => 146 + (5.5 - z) * 6.8;
  const paint = () => {
    const reach = saltReach(era, flow);
    const plan: SVGElement[] = [];
    const steps = 360;
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * VALLEY;
      const p: [number, number] = [X(s), planY(era, s)];
      if (prev) plan.push(line(prev[0], prev[1], p[0], p[1], s <= reach ? COL.salt : COL.water, era === 'now' && s < 8 ? 6 : 3.2));
      prev = p;
    }
    // The profile along the valley.
    const bed: [number, number][] = [];
    for (let i = 0; i <= 120; i++) {
      const s = (i / 120) * VALLEY;
      bed.push([X(s), Z(channelAt(era, s).bed)]);
    }
    const surfaceAt = (s: number) => MEAN_TIDE + ((HEAD - MEAN_TIDE) * Math.max(0, s - 6)) / (VALLEY - 6);
    const surf: [number, number][] = bed.map(([x], i) => [x, Z(surfaceAt((i / 120) * VALLEY))]);
    const wet = [...surf, ...bed.slice().reverse()];
    const wedge: [number, number][] = [[X(0), Z(MEAN_TIDE - 1)]];
    for (let i = 0; i <= 60; i++) {
      const s = (i / 60) * reach;
      const b = channelAt(era, s).bed;
      const top = MEAN_TIDE - 1 - (s / Math.max(reach, 0.01)) * (MEAN_TIDE - 1 - b);
      wedge.push([X(s), Z(Math.max(b, top))]);
    }
    for (let i = 60; i >= 0; i--) {
      const s = (i / 60) * reach;
      wedge.push([X(s), Z(channelAt(era, s).bed)]);
    }
    redraw(g,
      // Plan.
      svg('rect', { x: x0, y: 22, width: W - x0 - 14, height: 96, fill: COL.land, opacity: 0.18, rx: 4 }),
      svg('rect', { x: 0, y: 22, width: x0, height: 96, fill: COL.salt, opacity: 0.9 }),
      ...(era === 'now' ? [svg('rect', { x: x0, y: 30, width: 26, height: 30, fill: COL.works, opacity: 0.5 }), small(x0 + 2, 26, 'Harbor Island (fill)', { fill: COL.works })] : [small(x0 + 2, 26, 'tideflats', { soft: true })]),
      ...plan,
      small(6, 16, 'Elliott Bay', { bold: true, fill: COL.salt }),
      small(W - 8, 16, 'up the valley, toward Tukwila', { anchor: 'end', bold: true }),
      ...[0, 4, 8, 12].map((s) => small(X(s), 130, units === 'metric' ? `${s} km` : `${sig(s * 0.621, 2)} mi`, { anchor: s === 12 ? 'end' : s === 0 ? undefined : 'middle', soft: true })),
      // Profile.
      svg('polygon', { points: [...bed, [X(VALLEY), 252], [X(0), 252]].map((p) => p.join(',')).join(' '), fill: COL.sediment, opacity: 0.45 }),
      svg('polygon', { points: wet.map((p) => p.join(',')).join(' '), fill: COL.water, opacity: 0.8 }),
      ...(reach > 0.02 ? [svg('polygon', { points: wedge.map((p) => p.join(',')).join(' '), fill: COL.salt, opacity: 0.95 })] : []),
      svg('rect', { x: 0, y: Z(MEAN_TIDE), width: x0, height: 252 - Z(MEAN_TIDE), fill: COL.salt, opacity: 0.9 }),
      small(x0 + 4, 144, 'Along the bed: river water (light) over sea water (dark)', { bold: true }),
      line(X(reach), Z(MEAN_TIDE) - 4, X(reach), 252, COL.flow, 1.2, { 'stroke-dasharray': '3 2' }),
    );
    if (!open()) return;
    if (flow <= 20) seen[era] = true;
    const name = era === 'old' ? 'The river in 1900' : 'Today’s waterway';
    const lenWords = length(channelLength(era) * 1000, units);
    const fall = fallPerKm(era);
    const fallWords = units === 'metric' ? `${sig(fall * 100, 2)} cm per km` : `${sig(fall * 63.36, 2)} inches per mile`;
    const flowWords = units === 'metric' ? `${Math.round(flow)} m³/s` : `${big(flow * 35.31)} ft³/s`;
    f.readout.textContent = `${name}, carrying ${flowWords}: ${lenWords} of channel for ${length(VALLEY * 1000, units)} of valley, falling ${fallWords}. Salt water creeps ${reach < 0.05 ? 'no way up it; the river holds it at the mouth' : `${length(reach * 1000, units)} up the valley along the bed`}.`;
    if (t.goal === 'compare' && seen.old && seen.now) t.done();
  };
  const which = pick(['1900: meanders', 'Today: the waterway'], 0, (i) => { era = i === 0 ? 'old' : 'now'; paint(); });
  const fs = slider('River flow', { min: 5, max: 400, scale: 'log', value: flow, show: (v) => (units === 'metric' ? `${Math.round(v)} m³/s` : `${big(v * 35.31)} ft³/s`), onInput: (v) => { flow = v; paint(); }, color: 'water' });
  f.controls.append(which.node, fs.node);
  const open = guessFirst(t, f, {
    ask: 'Late summer, the river at its lowest. Compared with the winding river of 1900, how far up the valley does salt water creep along the bed of today’s straight, dredged waterway?',
    options: ['Less far', 'About as far', 'Much farther'],
    answer: 2,
    reveal: 'done',
    sliders: [fs],
    buttons: which.buttons,
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- The tide on the flats, and the turning basin (the sand table) ---------------------------------

/** An estuary on the sand table: a valley of tideflats with a river winding across them to a bay that rises and falls with the tide (a model, sped up). */
export const FLATS = { nx: 96, ny: 64, mouth: 44, tide: 0.6, period: 40, end: 160, basin: 12 } as const;
const flatsNoise = noise(5, 8, 2);
const windAt = (j: number) => 48 + 10 * Math.sin(j / 5);
export type Estuary = 'flats' | 'waterway';
export const flatsBed = (c: Estuary) => (i: number, j: number): number => {
  if (j > FLATS.mouth) return -1.5 - (j - FLATS.mouth) * 0.05;
  const side = Math.abs(i - 48);
  // The valley's sides, rising gently from the flats.
  if (side > 28) return 0.8 + (side - 28) * 0.12;
  if (c === 'waterway') {
    // The dredged waterway, its turning basin at the top, and fill on either side.
    if (side <= 3 || (j < FLATS.basin - 2 && j > 3 && side <= 8)) return -1.4;
    return 1;
  }
  const r = (flatsNoise(i, j) - 0.5) * 0.15;
  if (Math.abs(i - windAt(j)) <= 1.5) return -0.5 + r;
  return -0.25 + (FLATS.mouth - j) * 0.01 + r;
};

export function flatsTable(c: Estuary): Table {
  const t = new Table({
    nx: FLATS.nx, ny: FLATS.ny, bed: flatsBed(c),
    sea: (_i, j) => j === FLATS.ny - 1,
    erodibility: () => 0.3,
    params: { tide: FLATS.tide, tidePeriod: FLATS.period, drag: 0.15, carry: 0.6, pickUp: 0.4, settle: 1.5, start: 0.2 },
  });
  t.sources.push({ k: t.k(48, 0), flow: 0.6, sand: 0.05 });
  return t;
}

/** Sand laid down at the head of the estuary (where the turning basin is dug) and on the rest of it. */
export function flatsStock(t: Table): { head: number; rest: number } {
  return {
    head: laidDown(t, (_i, j) => j < FLATS.basin),
    rest: laidDown(t, (_i, j) => j >= FLATS.basin && j <= FLATS.mouth),
  };
}

export function flatsRun(c: Estuary, to: number = FLATS.end): { head: number; rest: number } {
  return flatsStock(new Replay(() => flatsTable(c), { every: 1000 }).to(to));
}

export const flatsFigure = figure(['basin'], (ctx, t) => {
  let which: Estuary = 'flats';
  const marks = svg('g');
  let lapse: SandLapse;
  const paint = (tb: Table) => {
    const v = lapse.view;
    const now = lapse.now();
    const phase = Math.sin((2 * Math.PI * now) / FLATS.period);
    const rising = Math.cos((2 * Math.PI * now) / FLATS.period) > 0;
    const tide = phase > 0.8 ? 'high tide' : phase < -0.8 ? 'low tide' : rising ? 'the tide rising' : 'the tide falling';
    const { head, rest } = flatsStock(tb);
    const [bx, by] = v.xy(48, FLATS.basin / 2);
    redraw(marks,
      small(v.w / 2, v.h - 8, 'the bay', { anchor: 'middle', bold: true, fill: COL.paper }),
      small(v.w / 2, 10, 'the river comes in', { anchor: 'middle', halo: COL.paper }),
      which === 'waterway' ? small(bx + 40, by + 4, 'turning basin', { bold: true, halo: COL.paper }) : null,
      small(8, 14, tide, { bold: true, halo: COL.paper }),
    );
    lapse.readout.textContent = now < 2
      ? (which === 'flats'
        ? 'The river winds across wide, low tideflats to the bay. The tide is rising. Press Play.'
        : 'The flats are filled above the tide, and a straight, deep waterway runs from the bay to a turning basin at its head. Press Play.')
      : which === 'flats'
        ? `At high tide the sea spreads over the flats; at low tide they drain and the river winds across them. The river's mud settles over the flats and in the old channel (${Math.round((rest / Math.max(0.01, head + rest)) * 100)}% of it below the head of the estuary).`
        : `The tide rises and falls in the waterway, but has no flats to spread over. The river meets deep, slow water in the turning basin and drops ${Math.round((head / Math.max(0.01, head + rest)) * 100)}% of its mud there.`;
    if (which === 'waterway' && now >= FLATS.end - 0.5 && t.goal === 'basin') t.done();
  };
  lapse = sandLapse(ctx, {
    make: () => flatsTable(which),
    end: FLATS.end,
    lines: 4,
    label: 'Tides',
    show: (x) => `${Math.floor(x / FLATS.period)}`,
    paint: (tb) => paint(tb),
    heights: [-0.5, 2.5],
    salt: true,
    seconds: 16,
  });
  lapse.view.overlay.append(marks);
  const choose = pick(['Tideflats (1900)', 'Waterway (1920)'], 0, (i) => {
    which = i === 0 ? 'flats' : 'waterway';
    lapse.restart();
  });
  lapse.controls.append(choose.node);
  lapse.draw();
  return lapse.node;
});

export const figures: Record<string, FigureFactory> = {
  'duwamish-channel': channelFigure,
  'duwamish-flats': flatsFigure,
};
