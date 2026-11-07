// Lesson 10, The way home: Egyptian fruit bats tracked by GPS after being
// carried to places they had never seen, big brown bats whose compass is set
// by the sunset, and wind turbines that start later on calm nights.

import { svg } from 'didactics/dom';
import { arrow, line, note, polyline, redraw, small, type P } from 'didactics/draw';
import { animate, axes, button, COL, figure, frame, guessFirst, legend, named, pick, player, slider, tint, wrapped, type FigureFactory } from './kit';

const W = 400;

// ---- Fruit bats over Israel -----------------------------------------------------------------------

/** Kilometres east and north of the colony's cave (Sgafim cave, about 31.67° N, 34.90° E). */
type Km = readonly [number, number];

/** A degree of latitude and of longitude here, in kilometres. */
const KM_LAT = 111;
const KM_LON = 111.32 * Math.cos((31.4 * Math.PI) / 180);
/** A place given in degrees, in kilometres from the cave. */
export const fromCave = (lat: number, lon: number): Km => [(lon - 34.9) * KM_LON, (lat - 31.667) * KM_LAT];

export const PLACES = {
  cave: fromCave(31.667, 34.9),
  tree: fromCave(31.56, 34.82),
  negev: fromCave(31.27, 34.93),
  crater: fromCave(30.93, 35.02),
  rim: fromCave(30.97, 34.99),
  jerusalem: fromCave(31.78, 35.22),
  beersheba: fromCave(31.25, 34.79),
} as const;

export const dist = (a: Km, b: Km) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** How straight a track is: the distance from start to end over the length flown (1 is a straight line). */
export function straightness(track: readonly Km[]): number {
  let flown = 0;
  for (let i = 1; i < track.length; i++) flown += dist(track[i - 1], track[i]);
  return flown ? dist(track[0], track[track.length - 1]) / flown : 1;
}

/** A line from a to b in `n` steps, wavering sideways by up to `wobble` km. */
function leg(a: Km, b: Km, n: number, wobble: number, phase = 0): Km[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const k = i / n;
    const side = wobble * Math.sin(k * Math.PI) * Math.sin(phase + k * 17);
    return [a[0] + dx * k - (dy / len) * side, a[1] + dy * k + (dx / len) * side] as Km;
  });
}

/** Loops inside the crater, about 34 km of them, before the bat climbs out to the north. */
function craterLoops(): Km[] {
  const [cx, cy] = PLACES.crater;
  const out: Km[] = [];
  for (let k = 0; k <= 70; k++) {
    const a = k * 0.5;
    const r = 0.35 + 0.65 * Math.abs(Math.sin(k * 0.23));
    // An ellipse 9 km by 4, its long axis running north-east.
    const u = 4.5 * r * Math.cos(a);
    const v = 2 * r * Math.sin(a);
    out.push([cx + u * 0.6 - v * 0.8, cy + u * 0.8 + v * 0.6]);
  }
  return out;
}

/** The four flights, drawn from the published distances and straightness (Tsoar et al. 2011); each a schematic track. */
export const FLIGHTS: readonly { name: string; track: Km[]; text: string }[] = [
  {
    name: 'A night out',
    track: [...leg(PLACES.cave, PLACES.tree, 20, 0.5), ...leg(PLACES.tree, [PLACES.tree[0] + 0.6, PLACES.tree[1] - 0.4], 4, 0.3), ...leg([PLACES.tree[0] + 0.6, PLACES.tree[1] - 0.4], PLACES.cave, 20, 0.6, 2)],
    text: 'An ordinary night: out of the cave at dusk, about 15 km in a nearly straight line to one particular tree, and straight back before dawn. Night after night most bats went back to the same tree.',
  },
  {
    name: '44 km south',
    track: [...leg(PLACES.negev, [PLACES.negev[0] + 1.5, PLACES.negev[1] + 2], 6, 0.8), ...leg([PLACES.negev[0] + 1.5, PLACES.negev[1] + 2], PLACES.cave, 30, 2.2, 1)],
    text: 'Carried in a closed box 44 km south into the desert and let go at night: the bats flew fast and fairly straight, home to the cave, or to their usual tree if they had not been fed.',
  },
  {
    name: 'Crater floor',
    track: [...craterLoops(), ...leg(craterLoops().at(-1)!, PLACES.cave, 40, 2.5, 3)],
    text: 'Let go on the floor of a deep crater, walled in by cliffs, 84 km from home. They flew in loops for a long time, one for 34 km, before climbing out. Every one left heading north, towards home.',
  },
  {
    name: 'Crater rim',
    track: leg(PLACES.rim, PLACES.cave, 40, 3.5, 5),
    text: 'Let go on the rim of the same crater, 79 km away and only a few kilometres from the floor site, where distant hills and lights are in view: they turned north at once and flew almost straight.',
  },
];

export const gpsFigure = figure(['all'], (ctx, t) => {
  const f = frame(W, 300, 4);
  const g = svg('g');
  f.svg.append(g);
  // 2.55 px a kilometre; the cave at (180, 56).
  const S = 2.55;
  const X = (k: Km | readonly number[]) => 180 + k[0] * S;
  const Y = (k: Km | readonly number[]) => 56 - k[1] * S;
  const at = (k: Km): P => [X(k), Y(k)];
  let which = 2;
  let progress = 0;
  const seen = FLIGHTS.map(() => false);
  const sea: Km[] = [[-70, 30], [-17, 30], [-17.1, 20.3], [-23.8, 14.8], [-32.3, 0.3], [-42.8, -16.3], [-50.4, -29.6], [-60, -45], [-70, -45]];
  const dead: Km[] = [[58.9, 10.3], [54.2, -7.4], [49.4, -29.6], [47.5, -51.8], [49.4, -68.5], [55.1, -74], [61, -72], [63, -30], [65, 5], [62, 12]];
  const crater = craterOutline();
  const paint = () => {
    const fl = FLIGHTS[which];
    // The part of the track flown so far.
    const n = Math.max(2, Math.round(fl.track.length * progress));
    const shown = fl.track.slice(0, n);
    const end = shown[shown.length - 1];
    redraw(g,
      svg('polygon', { points: sea.map((k) => at(k).join(',')).join(' '), fill: tint(COL.water, 0.25) }),
      svg('polygon', { points: dead.map((k) => at(k).join(',')).join(' '), fill: tint(COL.water, 0.35) }),
      svg('polygon', { points: crater.map((k) => at(k).join(',')).join(' '), fill: tint(COL.rock, 0.35), stroke: COL.rock, 'stroke-width': 1 }),
      note(12, 120, 'Mediterranean', { fill: COL.water }),
      note(X([56, 0]), Y([56, -40]), 'Dead Sea', { fill: COL.water, anchor: 'middle' }),
      ...[PLACES.jerusalem, PLACES.beersheba].map((p) => svg('circle', { cx: X(p), cy: Y(p), r: 2, fill: COL.soft })),
      note(X(PLACES.jerusalem) + 4, Y(PLACES.jerusalem) + 3, 'Jerusalem', { soft: true }),
      note(X(PLACES.beersheba) - 4, Y(PLACES.beersheba) + 3, 'Beersheba', { soft: true, anchor: 'end' }),
      note(X(PLACES.crater) + 16, Y(PLACES.crater) + 14, 'the crater', { soft: true }),
      svg('circle', { cx: X(PLACES.tree), cy: Y(PLACES.tree), r: 4, fill: COL.plant }),
      polyline(shown.map(at), COL.bat, 1.8),
      svg('circle', { cx: X(fl.track[0]), cy: Y(fl.track[0]), r: 3.5, fill: COL.paper, stroke: COL.bat, 'stroke-width': 1.5 }),
      svg('circle', { cx: X(end), cy: Y(end), r: 3, fill: COL.bat }),
      svg('path', { d: `M${X(PLACES.cave) - 6},${Y(PLACES.cave) + 4} L${X(PLACES.cave)},${Y(PLACES.cave) - 6} L${X(PLACES.cave) + 6},${Y(PLACES.cave) + 4} Z`, fill: COL.ink }),
      small(X(PLACES.cave) + 8, Y(PLACES.cave) - 2, 'cave', { bold: true }),
      line(380, 40, 380, 16, COL.ink, 1.5), small(380, 12, 'N', { anchor: 'middle', bold: true }),
      line(300, 290, 300 + 20 * S, 290, COL.ink, 2), small(300 + 10 * S, 284, '20 km', { anchor: 'middle', soft: true }),
      ...legend(12, 290, [{ text: 'fruit tree', color: COL.plant, dot: true }, { text: 'GPS track (schematic)', color: COL.bat }]),
      open() ? small(12, 16, `${seen.filter(Boolean).length + (progress >= 1 && !seen[which] ? 1 : 0)} of 4 flights played${seen.every(Boolean) ? '' : ': play each to its end'}`, { bold: true }) : null,
    );
    if (!open()) return;
    f.readout.textContent = progress === 0 ? `${fl.name}: press Play.` : fl.text;
    if (progress >= 1) seen[which] = true;
    if (seen.every(Boolean)) t.done();
  };
  const flights = named(pick(FLIGHTS.map((x) => x.name), which, (i) => { which = i; prog.set(0); }), 'Flight:');
  const prog = slider('Progress', 0, 100, 1, 0, (v) => `${v}%`, (v) => { progress = v / 100; paint(); }, 'bat');
  const play = player(prog, ctx, { seconds: 6 });
  f.controls.append(flights.node, play.node, prog.node);
  const open = guessFirst(t, f, {
    ask: 'Bats are carried in a closed box to the floor of a deep crater 84 km from home, a place they have never been, and let go at night. What do they do?',
    options: ['Fly straight home', 'Fly in loops, then head home', 'Never find their way back'],
    answer: 1,
    sliders: [prog],
    buttons: flights.buttons,
    hidden: [flights.node, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

/** The crater's outline: an oval about 10 km by 5, its long axis north-east. */
function craterOutline(): Km[] {
  const [cx, cy] = PLACES.crater;
  return Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * 2 * Math.PI;
    const u = 5.5 * Math.cos(a);
    const v = 2.6 * Math.sin(a);
    return [cx + u * 0.6 - v * 0.8, cy + u * 0.8 + v * 0.6] as Km;
  });
}

// ---- A compass set by the sunset ------------------------------------------------------------------

/**
 * The direction (degrees clockwise from north) a big brown bat flies to get
 * home, 20 km due south, after the magnetic field around it was turned
 * `shift` degrees clockwise (negative: anticlockwise), either for the 45
 * minutes each side of sunset or only after dark. At sunset the bat notes
 * where the sun went down against the field it feels; later, in the true
 * field, it steers by that setting, so every heading is off by the shift
 * (Holland et al. 2006). Turned after dark, the field changes nothing
 * (Holland, Borissov and Siemers 2010, in mouse-eared bats).
 */
export function homeHeading(shift: number, atSunset: boolean): number {
  const h = atSunset ? 180 - shift : 180;
  return ((h % 360) + 360) % 360;
}

const compassWord = (deg: number) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];

export const sunsetFigure = figure(['both'], (ctx, t) => {
  const f = frame(W, 230, 5);
  const g = svg('g');
  const flyer = svg('g');
  f.svg.append(g, flyer);
  let shift = 90;
  let sunset = true;
  let progress = 1;
  let tracks: { heading: number; sunset: boolean; shift: number }[] = [];
  let sawSunset = false;
  let sawDark = false;
  // The map: release point at top, home 20 km south, 7.5 px a kilometre.
  const RX = 290;
  const RY = 50;
  const K = 7.5;
  const end = (h: number, p: number): P => [RX + Math.sin((h * Math.PI) / 180) * 18 * K * p, RY - Math.cos((h * Math.PI) / 180) * 18 * K * p];
  const paint = () => {
    // The tent where the bat waited: a horizon, the sun, the needle as the bat felt it.
    const cx = 75;
    const cy = 120;
    const needle = ((sunset ? shift : 0) * Math.PI) / 180;
    const nx = Math.sin(needle) * 34;
    const ny = -Math.cos(needle) * 34;
    redraw(g,
      svg('circle', { cx, cy, r: 46, fill: tint(sunset ? COL.fat : COL.cold, 0.15), stroke: COL.grid }),
      line(cx - 46, cy + 30, cx + 46, cy + 30, COL.rock, 1.5),
      sunset ? svg('circle', { cx: cx - 38, cy: cy + 28, r: 7, fill: COL.fat }) : null,
      sunset ? note(8, cy + 48, 'sun sets in the west', { fill: COL.fat }) : note(cx, cy + 48, 'after dark', { anchor: 'middle', fill: COL.cold }),
      arrow(cx - nx * 0.4, cy - ny * 0.4, cx + nx, cy + ny, COL.bad, 2.5),
      note(cx + nx * 1.25, cy + ny * 1.25 + 3, 'N', { anchor: 'middle', fill: COL.bad, bold: true }),
      ...wrapped(14, 22, sunset ? `In the box at sunset, the field turned ${Math.abs(shift)}° ${shift >= 0 ? 'clockwise' : 'anticlockwise'}` : `Field turned ${Math.abs(shift)}° only after dark`, 26, { bold: true }),
      small(cx, 190, 'magnetic north as the bat felt it', { anchor: 'middle', soft: true }),
      // The release map.
      svg('path', { d: `M${RX - 6},${RY + 20 * K + 4} L${RX},${RY + 20 * K - 6} L${RX + 6},${RY + 20 * K + 4} Z`, fill: COL.ink }),
      small(RX + 9, RY + 20 * K + 2, 'roost', { bold: true }),
      line(RX, RY, RX, RY + 20 * K, COL.grid, 1, { 'stroke-dasharray': '3 3' }),
      small(RX + 4, RY + 10 * K, '20 km', { soft: true }),
      svg('circle', { cx: RX, cy: RY, r: 4, fill: COL.paper, stroke: COL.bat, 'stroke-width': 1.5 }),
      small(RX + 8, RY - 6, 'released here', { soft: true }),
      line(388, 36, 388, 14, COL.ink, 1.5), small(388, 10, 'N', { anchor: 'middle', bold: true }),
      open() ? small(RX, 224, `90° turn: ${sawSunset ? '✓' : '○'} at sunset   ${sawDark ? '✓' : '○'} after dark`, { anchor: 'middle', bold: true, fill: sawSunset && sawDark ? COL.good : COL.ink }) : null,
      ...tracks.slice(0, -1).map((tr) => polyline([[RX, RY], end(tr.heading, 1)], tint(COL.bat, 0.35), 1.5)),
    );
    const last = tracks.at(-1);
    redraw(flyer, ...(last ? [polyline([[RX, RY], end(last.heading, progress)], COL.bat, 2.2), svg('circle', { cx: end(last.heading, progress)[0], cy: end(last.heading, progress)[1], r: 3.5, fill: COL.bat })] : []));
    if (!open()) return;
    if (!last) {
      f.readout.textContent = 'Set how far the field was turned and when, then tap Let it go. The real field is back to normal when it flies. Try a 90° turn at sunset and one after dark.';
      return;
    }
    f.readout.textContent = !last.sunset || last.shift === 0
      ? `It flies ${compassWord(last.heading)}, straight home. ${last.shift !== 0 ? 'A field turned only after dark changes nothing: the setting was made at sunset, in the true field.' : 'This is the control: an untouched bat.'}`
      : `It flies ${compassWord(last.heading)}, ${Math.abs(last.shift)}° off course. At sunset the field told it north lay ${Math.abs(last.shift)}° ${last.shift > 0 ? 'clockwise' : 'anticlockwise'} of true north, and it set its compass against the setting sun by that. In the true field later, every heading it chose came out turned the other way.`;
  };
  const turn = slider('Field turned', -90, 90, 15, shift, (v) => (v === 0 ? 'not turned' : `${Math.abs(v)}° ${v > 0 ? 'clockwise' : 'anticlockwise'}`), (v) => { shift = v; paint(); }, 'bad');
  const when = named(pick(['At sunset', 'After dark'], 0, (i) => { sunset = i === 0; paint(); }), 'Turned:');
  const go = button('Let it go', () => {
    tracks = [...tracks.slice(-3), { heading: homeHeading(shift, sunset), sunset, shift }];
    progress = 0;
    if (sunset && Math.abs(shift) >= 90) sawSunset = true;
    if (!sunset && Math.abs(shift) >= 90) sawDark = true;
    paint();
    if (sawSunset && sawDark) t.done();
  }, false);
  animate(f.svg, ctx, (dt) => {
    if (progress >= 1) return;
    progress = Math.min(1, progress + dt / 1.6);
    paint();
  });
  f.controls.append(when.node, turn.node, go);
  const open = guessFirst(t, f, {
    ask: 'A big brown bat sits in a box where the magnetic field is turned 90° clockwise for the 45 minutes either side of sunset. Let go that night 20 km north of home, in the normal field, which way does it fly?',
    options: ['South, straight home', 'East', 'West'],
    answer: 1,
    sliders: [turn],
    buttons: [...when.buttons, go],
    hidden: [when.node, go],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Turbines that wait for the wind --------------------------------------------------------------

/** Share of night hours with hub-height wind of `v` m/s: a Weibull spread, shape 2, scale 7 m/s. */
export const windShare = (v: number): number => (v <= 0 ? 0 : (2 / 7) * (v / 7) * Math.exp(-((v / 7) ** 2)));

/** A turbine's output as a share of its rated power, cutting in at 3.5 m/s and full at 12. */
export const power = (v: number, cutIn = 3.5): number => (v < cutIn || v > 25 ? 0 : v >= 12 ? 1 : (v ** 3 - 3.5 ** 3) / (12 ** 3 - 3.5 ** 3));

/** Bats flying at rotor height in wind `v`, relative: most on calm nights, few above 6 or 7 m/s. */
export const batsAloft = (v: number): number => Math.exp(-v / 1.6);

/** The nights when turbines are slowed: late summer and autumn, when tree bats migrate (11 weeks, nights only). */
export const SEASON = (11 * 7 * 11) / 8760;

const integrate = (fn: (v: number) => number, a: number, b: number, n = 400) => {
  let s = 0;
  const h = (b - a) / n;
  for (let i = 0; i < n; i++) s += fn(a + (i + 0.5) * h) * h;
  return s;
};

/**
 * Raising the cut-in speed from 3.5 m/s to `cutIn` on migration-season
 * nights: the share of bat kills prevented (kills need the blades turning
 * with bats about) and the share of the whole year's power given up. An
 * illustrative model scaled to Arnett et al. (2011): kills down by half or
 * more, about 1% of the year's power or less.
 */
export function curtail(cutIn: number): { saved: number; lost: number } {
  const kills = (c: number) => integrate((v) => windShare(v) * batsAloft(v), c, 25);
  const saved = 1 - kills(cutIn) / kills(3.5);
  const year = integrate((v) => windShare(v) * power(v), 0, 25);
  const lost = (SEASON * integrate((v) => windShare(v) * power(v), 3.5, Math.max(3.5, cutIn))) / year;
  return { saved, lost };
}

export const turbineFigure = figure(['half'], (_ctx, t) => {
  const f = frame(W, 230, 3);
  const g = svg('g');
  f.svg.append(g);
  let cutIn = 3.5;
  const paint = () => {
    const ax = axes({ x: 40, y: 24, w: 340, h: 150, xmin: 0, xmax: 16, ymin: 0, ymax: 1, xticks: [0, 2, 4, 6, 8, 10, 12, 14, 16], yticks: [], xlabel: 'wind speed at the rotor, m/s', ink: COL.ink, grid: COL.grid });
    const vs = Array.from({ length: 161 }, (_, i) => i / 10);
    const windMax = windShare(7 / Math.SQRT2);
    const batCurve = vs.map((v) => [v, windShare(v) * batsAloft(v)] as const);
    const peakBat = Math.max(...batCurve.map((p) => p[1]));
    const c = curtail(cutIn);
    redraw(g,
      svg('rect', { x: ax.X(0), y: ax.Y(1), width: ax.X(cutIn) - ax.X(0), height: ax.Y(0) - ax.Y(1), fill: tint(COL.cold, 0.12) }),
      ...ax.parts,
      ax.path(vs.map((v) => [v, windShare(v) / windMax * 0.9] as const), COL.water, 2, { 'stroke-dasharray': '4 3' }),
      ax.path(vs.map((v) => [v, power(v, cutIn) * 0.95] as const), COL.cost, 2.2),
      ax.path(batCurve.map(([v, b]) => [v, (b / peakBat) * 0.85] as const), COL.bat, 2.4),
      line(ax.X(cutIn), ax.Y(1), ax.X(cutIn), ax.Y(0), COL.ink, 1.5),
      small(ax.X(cutIn) + 4, ax.Y(0.98), `blades start at ${cutIn.toFixed(1)} m/s`, { bold: true }),
      small(ax.X(cutIn) - 4, ax.Y(0.5), 'feathered', { anchor: 'end', fill: COL.cold }),
      ...legend(40, 216, [{ text: 'bats at rotor height', color: COL.bat }, { text: 'turbine output', color: COL.cost }, { text: 'hours of wind', color: COL.water, dash: true }]),
    );
    if (!open()) return;
    const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
    f.readout.textContent = cutIn <= 3.6
      ? 'Normal running: the blades turn from 3.5 m/s, just when most bats are flying. Raise the speed at which they start, on late-summer and autumn nights only.'
      : `Starting at ${cutIn.toFixed(1)} m/s on migration-season nights: about ${pct(c.saved)} fewer bats killed, for ${pct(c.lost, c.lost < 0.01 ? 1 : 0)} of the year's power. The calm hours given up make little electricity, since output grows with the cube of wind speed.`;
    if (c.saved >= 0.5 && c.lost <= 0.011) t.done();
  };
  const s = slider('Speed the blades start at', 3.5, 8, 0.5, cutIn, (v) => `${v.toFixed(1)} m/s`, (v) => { cutIn = v; paint(); }, 'cost');
  f.controls.append(s.node);
  const open = guessFirst(t, f, {
    ask: 'A wind farm raises the speed at which its blades start turning, from 3.5 to 6.5 m/s, but only on late-summer and autumn nights. How much of the year’s electricity does it give up?',
    options: ['About 1%', 'About 10%', 'About a quarter'],
    answer: 0,
    sliders: [s],
    after: () => paint(),
  });
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'fruitbat-gps': gpsFigure,
  'sunset-compass': sunsetFigure,
  'turbine-cutin': turbineFigure,
};
