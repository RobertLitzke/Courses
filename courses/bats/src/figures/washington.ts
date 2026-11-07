// Lesson N2, Washington's fifteen. The sort by where each species lives and
// the identification key are live charts from the lesson's JSON; the bat
// house is drawn here: its colour, the hours of sun on it, what it is
// mounted on and how high, and the temperature inside over a July day in
// Seattle (a model).

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, axes, figure, frame, named, pick, slider, tint, type FigureFactory } from './kit';

const W = 400;

/** Paint colours and the share of sunlight each absorbs (rounded). */
export const PAINTS = [
  { name: 'Black', absorb: 0.95 },
  { name: 'Dark brown', absorb: 0.85 },
  { name: 'Mid grey', absorb: 0.6 },
  { name: 'White', absorb: 0.25 },
] as const;

/**
 * What a box is fixed to: how much of the sun reaches it, how slowly it
 * warms and cools (hours), and the warmth a heated house wall adds (°C).
 */
export const MOUNTS = [
  { name: 'Pole', sun: 1, lag: 1.5, wall: 0 },
  { name: 'House wall', sun: 1, lag: 3, wall: 2 },
  { name: 'Tree trunk', sun: 0.3, lag: 2, wall: 0 },
] as const;

/** Where a maternity colony is comfortable, °C, and where a box gets dangerously hot. */
export const COMFORT = { lo: 27, hi: 38, tooHot: 40 } as const;

/** Two Julys: Seattle's, about 13 °C at 4 am to 25 at 4 pm, and Yakima's, east of the Cascades, about 12 to 32. */
export const PLACES = [
  { name: 'Seattle', mid: 19, swing: 6 },
  { name: 'Yakima', mid: 22, swing: 10 },
] as const;
export type Place = (typeof PLACES)[number];

/** Air temperature on a fair July day, °C, at hour `h`. */
export const airTemp = (h: number, place: Place = PLACES[0]): number => place.mid - place.swing * Math.cos((2 * Math.PI * (h - 4)) / 24);

/** How much full sun on a black box raises the inside above the air, once it has caught up, °C. */
export const SUN_RISE = 16;

/**
 * The temperature inside a bat house each hour of a July day, °C (24
 * values, hour 0 first): air temperature, plus sunlight absorbed while the
 * sun is on it (from 6 am, for `sunHours` hours: an east-facing box gets
 * the morning), plus a warm wall, all reached slowly through the box's lag.
 */
export function insideDay(absorb: number, sunHours: number, mount: (typeof MOUNTS)[number], place: Place = PLACES[0]): number[] {
  const dt = 0.05;
  let T = airTemp(0, place);
  const out: number[] = [];
  for (let step = 0; step < (72 / dt); step++) {
    const h = (step * dt) % 24;
    const inSun = h >= 6 && h < 6 + sunHours ? 1 : 0;
    const target = airTemp(h, place) + SUN_RISE * absorb * mount.sun * inSun + mount.wall;
    T += ((target - T) / mount.lag) * dt;
    if (step * dt >= 48 && Math.abs(h - Math.round(h)) < dt / 2 && out.length < 24) out.push(T);
  }
  return out;
}

/** Hours of the day inside the comfortable band. */
export const comfyHours = (temps: readonly number[]): number => temps.filter((v) => v >= COMFORT.lo && v <= COMFORT.hi).length;

/** Whether a box of this paint, sun and mount, at `height` metres, would suit a nursery colony. */
export function suits(absorb: number, sunHours: number, mount: (typeof MOUNTS)[number], height: number, place: Place = PLACES[0]): boolean {
  const temps = insideDay(absorb, sunHours, mount, place);
  return comfyHours(temps) >= 6 && Math.max(...temps) <= COMFORT.tooHot && height >= 3;
}

export const houseFigure = figure(['warm'], (_ctx, t) => {
  const f = frame(W, 214, 3);
  const g = svg('g');
  f.svg.append(g);
  let paint = 2;
  let mount = 0;
  let sunHours = 3;
  let height = 2;
  let where = 0;
  const draw = () => {
    const m = MOUNTS[mount];
    const place = PLACES[where];
    const temps = insideDay(PAINTS[paint].absorb, sunHours, m, place);
    const air = Array.from({ length: 24 }, (_, h) => airTemp(h, place));
    const A = axes({ x: 170, y: 20, w: 220, h: 150, xmin: 0, xmax: 23, ymin: 10, ymax: 46, xticks: [0, 6, 12, 18], yticks: [10, 20, 30, 40], xfmt: (v) => (v === 0 ? 'midnight' : v === 12 ? 'noon' : `${v}:00`), ylabel: 'Inside the box, °C', ink: COL.ink, grid: COL.grid });
    const groundY = 196;
    const perM = 26;
    const boxY = groundY - height * perM;
    const boxFill = paint === 3 ? COL.paper : paint === 2 ? COL.rock : paint === 1 ? COL.cost : COL.ink;
    const support = mount === 0
      ? [line(60, groundY, 60, boxY - 4, COL.rock, 5)]
      : mount === 1
        ? [svg('rect', { x: 74, y: 40, width: 60, height: groundY - 40, fill: tint(COL.rock, 0.35) }), small(104, 56, 'house', { anchor: 'middle', soft: true })]
        : [svg('rect', { x: 52, y: 30, width: 16, height: groundY - 30, fill: COL.cost, opacity: 0.6 }), svg('circle', { cx: 60, cy: 40, r: 40, fill: COL.plant, opacity: 0.55 })];
    const ruler = [1, 2, 3, 4, 5, 6].map((mm) => small(8, groundY - mm * perM + 3, `${mm} m`, { soft: true }));
    const peak = Math.max(...temps);
    redraw(g,
      line(0, groundY, 150, groundY, COL.rock, 2),
      ...ruler,
      ...support,
      svg('rect', { x: 46, y: boxY - 34, width: 28, height: 34, fill: boxFill, stroke: COL.ink, 'stroke-width': 1 }),
      ...(height < 3 ? [small(108, groundY - 20, 'cats and', { anchor: 'middle', fill: COL.bad }), small(108, groundY - 8, 'raccoons reach', { anchor: 'middle', fill: COL.bad })] : []),
      ...(sunHours > 0 ? [svg('circle', { cx: 140, cy: 20, r: 9, fill: COL.fat, opacity: mount === 2 ? 0.4 : 1 })] : []),
      ...A.parts,
      svg('rect', { x: A.X(0), y: A.Y(COMFORT.hi), width: A.X(23) - A.X(0), height: A.Y(COMFORT.lo) - A.Y(COMFORT.hi), fill: tint(COL.heat, 0.12) }),
      svg('rect', { x: A.X(0), y: A.Y(46), width: A.X(23) - A.X(0), height: A.Y(COMFORT.tooHot) - A.Y(46), fill: tint(COL.bad, 0.12) }),
      small(A.X(23) - 2, A.Y(COMFORT.lo) - 4, 'mothers and pups', { anchor: 'end', fill: COL.heat }),
      small(A.X(23) - 2, A.Y(44.5), 'too hot', { anchor: 'end', fill: COL.bad }),
      ...(sunHours > 0 ? [svg('rect', { x: A.X(6), y: A.Y(46), width: A.X(Math.min(23, 6 + sunHours)) - A.X(6), height: 4, fill: COL.fat })] : []),
      A.path(air.map((v, h) => [h, v] as const), COL.soft, 1.5, { 'stroke-dasharray': '4 3' }),
      A.path(temps.map((v, h) => [h, v] as const), COL.heat, 2.5),
      small(A.X(0) + 2, A.Y(airTemp(0, place)) + 16, `air, ${place.name}`, { soft: true }),
    );
    const hrs = comfyHours(temps);
    const ok = suits(PAINTS[paint].absorb, sunHours, m, height, place);
    f.readout.textContent = ok
      ? `${hrs} hours a day between ${COMFORT.lo} and ${COMFORT.hi} °C, never above ${COMFORT.tooHot}, and ${height} m up: a box a nursery colony could use in ${place.name}.`
      : peak > COMFORT.tooHot
        ? `It reaches ${Math.round(peak)} °C by mid afternoon. Bats leave a box that hot, or die in it. East of the Cascades a box needs a lighter colour or less sun.`
        : hrs < 6
          ? `Only ${hrs} hours in the band mothers need; the box peaks at ${Math.round(peak)} °C. Pups grow slowly in a cool roost. Try a darker paint, more sun or a house wall.`
          : `Warm enough, but at ${height} m a box is within reach of cats and raccoons and hard for bats to drop from into flight. Raise it to 3 to 5 m.`;
    if (ok) t.done();
  };
  const town = named(pick(PLACES.map((p) => p.name), where, (i) => { where = i; draw(); }), 'Town:');
  const colour = named(pick(PAINTS.map((p) => p.name), paint, (i) => { paint = i; draw(); }), 'Paint:');
  const on = named(pick(MOUNTS.map((m) => m.name), mount, (i) => { mount = i; draw(); }), 'On a:');
  const sun = slider('Direct sun from 6 am', 0, 10, 1, sunHours, (v) => `${v} hours`, (v) => { sunHours = v; draw(); }, 'fat');
  const high = slider('Mounted', 1, 6, 0.5, height, (v) => `${v} m up`, (v) => { height = v; draw(); }, 'rock');
  f.controls.append(town.node, colour.node, on.node, sun.node, high.node);
  draw();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'wa-house': houseFigure,
};

