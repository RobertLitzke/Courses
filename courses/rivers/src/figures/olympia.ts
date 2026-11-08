// Lesson 10, Why Olympia's tide is nearly twice Port Townsend's: the tide as
// a long wave in a closed channel that reflects and resonates (guess first,
// with a Play button for the wave), and sea level rising under the king tides.
//
// The channel is the textbook model: a channel of even depth, open to the sea
// at one end and closed at the other, driven at the mouth by a tide of one
// period (M2, 12.42 h). The water's height is the standing wave
// η(x) = A cos k(L − x) / cos kL, with a little friction (k slightly complex)
// so the range at resonance is large but finite.

import { svg } from 'didactics/dom';
import { line, polyline, redraw, small, type P } from 'didactics/draw';
import { COL, axes, button, figure, frame, guessFirst, pick, player, slider, tint, type FigureFactory } from './kit';
import { CONSTITUENTS, turns, tideAt, type Amps } from './inequality';

const W = 400;
const G = 9.81;
/** The Moon's twice-daily tide, seconds. */
export const M2_SECONDS = 12.4206 * 3600;
/** Port Townsend's great diurnal range, metres (about 8.5 ft). */
export const MOUTH_RANGE = 2.6;
/** The model's Puget Sound: about 150 km from Admiralty Inlet to Olympia, about 60 m deep on average. */
export const SOUND = { km: 150, depth: 60 };

/** A long wave's speed in water `h` metres deep, m/s. */
export const waveSpeed = (h: number) => Math.sqrt(G * h);

/** The tide's wavelength in water `h` deep, km. */
export const wavelength = (h: number, period = M2_SECONDS) => (waveSpeed(h) * period) / 1000;

// Complex numbers, just enough for cos of a complex angle.
type C = [number, number];
const ccos = ([a, b]: C): C => [Math.cos(a) * Math.cosh(b), -Math.sin(a) * Math.sinh(b)];
const cdiv = ([a, b]: C, [c, d]: C): C => {
  const n = c * c + d * d;
  return [(a * c + b * d) / n, (b * c - a * d) / n];
};

/** Friction in the model: the fraction by which the wave weakens per radian it travels. */
export const FRICTION = 0.04;

/** The standing wave at `x` km from the mouth of a channel `L` km long and `h` m deep, as a complex amplitude per metre at the mouth. */
function shape(x: number, L: number, h: number): C {
  const k = (2 * Math.PI) / wavelength(h);
  const at = (d: number): C => [k * d, -FRICTION * k * d];
  return cdiv(ccos(at(L - x)), ccos(at(L)));
}

/** How many times the mouth's range the tide has at the closed end. */
export const headGain = (L: number, h: number) => Math.hypot(...shape(L, L, h));

/** The range at `x` km along, as a multiple of the mouth's. */
export const gainAt = (x: number, L: number, h: number) => Math.hypot(...shape(x, L, h));

/** The water's height (m) at `x` km along, `hours` into the tide, for a mouth range of `range` metres. */
export function heightAt(x: number, L: number, h: number, hours: number, range = MOUTH_RANGE): number {
  const [re, im] = shape(x, L, h);
  const w = (2 * Math.PI * hours * 3600) / M2_SECONDS;
  return (range / 2) * (re * Math.cos(w) - im * Math.sin(w));
}

/** The channel length (km) at which the closed end's range peaks: a quarter of a wavelength. */
export const resonantKm = (h: number) => wavelength(h) / 4;

/** Hours for the tide wave to travel `km` in water `h` m deep. */
export const travelHours = (km: number, h: number) => (km * 1000) / waveSpeed(h) / 3600;

/** How many centimetres a low of `hPa` lifts the sea above an average day's (1013 hPa): about one per hectopascal. */
export const inverseBarometer = (hPa: number) => (1013.25 - hPa) / (1025 * G) * 100 * 100;

const ft = (m: number) => m * 3.28084;

// ---- The channel (live, guess first) ---------------------------------------------------------

export const channelFigure = figure(['peak'], (ctx, t) => {
  const f = frame(W, 204, 4);
  const g = svg('g');
  f.svg.append(g);
  let L = 50;
  let depth = SOUND.depth;
  let hours = 0;
  let reached = false;
  const x0 = 30;
  const pxPerKm = 340 / 400;
  const sea = 84;
  const vScale = 14; // drawing units per metre of tide
  const paint = () => {
    const X = (km: number) => x0 + km * pxPerKm;
    const end = X(L);
    const floor = sea + 18 + depth * 0.32;
    const surf: P[] = [];
    const up: P[] = [];
    const down: P[] = [];
    const clampY = (y: number) => Math.max(8, Math.min(floor - 4, y));
    for (let i = 0; i <= 80; i++) {
      const km = (L * i) / 80;
      surf.push([X(km), clampY(sea - heightAt(km, L, depth, hours) * vScale)]);
      const a = (gainAt(km, L, depth) * MOUTH_RANGE) / 2;
      up.push([X(km), clampY(sea - a * vScale)]);
      down.push([X(km), clampY(sea + a * vScale)]);
    }
    const lam = wavelength(depth);
    const quarter = lam / 4;
    const gain = headGain(L, depth);
    const water = [...surf, [end, floor], [x0, floor]] as P[];
    redraw(g,
      svg('path', { d: `M${water.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L')}Z`, fill: tint(COL.salt, 0.45) }),
      polyline(surf, COL.salt, 2),
      polyline(up, COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      polyline(down, COL.soft, 1, { 'stroke-dasharray': '3 3' }),
      line(x0, floor, end, floor, COL.land, 3),
      svg('rect', { x: 0, y: sea - 22, width: x0, height: floor - sea + 22, fill: tint(COL.salt, 0.25) }),
      small(6, sea - 28, 'sea', { soft: true }),
      svg('rect', { x: end, y: 14, width: 9, height: floor - 10, fill: COL.land }),
      end < 300 ? small(end + 13, 22, 'closed end') : small(end - 4, 22, 'closed end', { anchor: 'end', halo: COL.paper }),
      // The km scale, with a quarter wavelength marked.
      line(x0, 176, X(400), 176, COL.ink, 1),
      ...[0, 100, 200, 300, 400].map((km) => small(X(km), 188, `${km} km`, { anchor: 'middle', soft: true })),
      ...(quarter <= 400 ? [line(X(quarter), 170, X(quarter), 182, COL.flow, 2), small(X(quarter), 166, '¼ wavelength', { anchor: 'middle', fill: COL.flow, halo: COL.paper })] : []),
    );
    if (!open()) return;
    if (gain > 4) reached = true;
    const c = waveSpeed(depth);
    f.readout.textContent = `Wave speed √(g h): ${Math.round(c)} m/s (${Math.round(c * 3.6)} km/h). Wavelength ${Math.round(lam).toLocaleString('en-US')} km; the channel is ${(L / lam).toFixed(2)} of it. Range at the closed end: ${gain.toFixed(1)} × the mouth's, ${(gain * MOUTH_RANGE).toFixed(1)} m (${Math.round(ft(gain * MOUTH_RANGE))} ft).`;
    if (reached && t.goal === 'peak') t.done();
  };
  const len = slider('Length', 20, 400, 5, L, (v) => `${v} km`, (v) => { L = v; paint(); }, 'flow');
  const deep = slider('Depth', 10, 200, 5, depth, (v) => `${v} m`, (v) => { depth = v; paint(); }, 'salt');
  const clock = slider('Hours', 0, 24.84, 0.05, hours, (v) => `${v.toFixed(1)} h`, (v) => { hours = v; paint(); }, 'ink');
  const play = player(clock, ctx, { seconds: 10 });
  const sound = button('Puget Sound', () => {
    len.set(SOUND.km);
    deep.set(SOUND.depth);
  });
  f.controls.append(len.node, deep.node, play.node, clock.node, sound);
  const open = guessFirst(t, f, {
    ask: 'The channel is 50 km long. Make it longer, bit by bit. What happens to the range at the closed end?',
    options: ['It shrinks: the wave wears out', 'It grows steadily with length', 'It peaks at one length, then falls'],
    answer: 2,
    reveal: 'done',
    sliders: [len, deep, clock],
    buttons: [sound, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Sea level under the king tides (live) ---------------------------------------------------

/** The gauge's year of reference: heights in the figure are above today's chart zero. */
export const NOW = 2025;
/** Seattle's trend since 1899, metres a year (about 2 mm). */
export const TREND = 0.002;
/** Seattle's record high water, 27 December 2022, metres above mean lower low water (15.12 ft at the gauge, NOAA 9447130). */
export const RECORD = 15.12 / 3.28084;

const SEATTLE_ALL: Amps = Object.fromEntries(CONSTITUENTS.map((c) => [c.name, c.seattle]));

/**
 * The model's datums for a year of Seattle tides: mean sea level, mean higher
 * high water and the year's highest predicted high (the king tides), as
 * metres above mean lower low water.
 */
export function datums(amps: Amps = SEATTLE_ALL): { msl: number; mhhw: number; king: number } {
  const { lows, highs } = turns(amps, 0, 365 * 24, 0.1);
  const pairs = (xs: [number, number][], f: (a: number, b: number) => number) => {
    let s = 0;
    let n = 0;
    for (let i = 0; i + 1 < xs.length; i += 2, n++) s += f(xs[i][1], xs[i + 1][1]);
    return s / n;
  };
  const mllw = pairs(lows, Math.min);
  const mhhw = pairs(highs, Math.max);
  const king = Math.max(...highs.map((h) => h[1]));
  return { msl: -mllw, mhhw: mhhw - mllw, king: king - mllw };
}

/** Sea level in `year` above today's, metres, at `rate` metres a year from NOW (and the trend before it). */
export const riseBy = (year: number, rate: number) => (year <= NOW ? (year - NOW) * TREND : (year - NOW) * rate);

/** The first year in which an ordinary day's higher high water reaches today's king tides, at `rate` m a year. */
export function yearOrdinaryReachesKing(rate: number, d = datums()): number {
  return NOW + (d.king - d.mhhw) / rate;
}

export const riseFigure = figure(['reach'], (ctx, t) => {
  const f = frame(W, 262, 4);
  const g = svg('g');
  f.svg.append(g);
  const d = datums();
  const rates = [0.002, 0.005, 0.01];
  let rate = rates[0];
  let year = NOW;
  let reached = false;
  const top = axes({ x: 44, y: 18, w: 340, h: 70, xmin: 1900, xmax: 2150, ymin: -0.3, ymax: 1.3, xticks: [1900, 1950, 2000, 2050, 2100, 2150], yticks: [0, 0.5, 1], yfmt: (v) => `${v} m`, ylabel: 'sea level compared with today', ink: COL.ink, grid: COL.grid });
  const bottom = axes({ x: 44, y: 126, w: 340, h: 108, xmin: 0, xmax: 3, ymin: 0, ymax: 16, xticks: [0, 1, 2, 3], yticks: [0, 4, 8, 12, 16], xfmt: (v) => `${v}`, xlabel: 'days', yfmt: (v) => `${v} ft`, ylabel: 'an ordinary few days at Seattle, feet above today\'s chart zero', ink: COL.ink, grid: COL.grid });
  // Three ordinary days of the model (mid March), lifted by the sea's rise.
  const from = 74 * 24;
  const paint = () => {
    const past: [number, number][] = [[1900, riseBy(1900, rate)], [NOW, 0]];
    const future: [number, number][] = [[NOW, 0], [2150, riseBy(2150, rate)]];
    const lift = riseBy(year, rate);
    const days: [number, number][] = [];
    for (let h = 0; h <= 72; h += 0.5) days.push([h / 24, ft(tideAt(from + h, SEATTLE_ALL) + d.msl + lift)]);
    const mhhw = d.mhhw + lift;
    redraw(g,
      ...top.parts,
      top.path(past, COL.model, 2),
      top.path(future, COL.model, 2, { 'stroke-dasharray': '4 3' }),
      svg('circle', { cx: top.X(year), cy: top.Y(lift), r: 4, fill: COL.ink }),
      small(top.X(1905), top.Y(0.05) - 6, 'the gauge\'s trend since 1898', { soft: true }),
      ...bottom.parts,
      line(bottom.X(0), bottom.Y(ft(RECORD)), bottom.X(3), bottom.Y(ft(RECORD)), COL.bad, 1.2, { 'stroke-dasharray': '4 3' }),
      small(bottom.X(0) + 4, bottom.Y(ft(RECORD)) - 3, 'record, Dec 2022', { fill: COL.bad, halo: COL.paper }),
      line(bottom.X(0), bottom.Y(ft(d.king)), bottom.X(3), bottom.Y(ft(d.king)), COL.warm, 1.2, { 'stroke-dasharray': '4 3' }),
      small(bottom.X(3), bottom.Y(ft(d.king)) - 3, "today's king tides", { anchor: 'end', fill: COL.warm, halo: COL.paper }),
      bottom.path(days, COL.salt, 1.8),
      line(bottom.X(0), bottom.Y(ft(mhhw)), bottom.X(3), bottom.Y(ft(mhhw)), COL.salt, 1, { 'stroke-dasharray': '1 3' }),
    );
    if (mhhw >= d.king - 0.005) reached = true;
    const when = yearOrdinaryReachesKing(rate, d);
    const rise = lift >= 0 ? `${Math.round(lift * 100)} cm (${Math.round(ft(lift) * 12)} in) above today` : `${Math.round(-lift * 100)} cm (${Math.round(-ft(lift) * 12)} in) below today`;
    f.readout.textContent = `${year}: the sea ${year === NOW ? 'as it is today' : rise}. Ordinary higher high water (dotted) ${ft(mhhw).toFixed(1)} ft, ${mhhw < d.king ? `${Math.round((d.king - mhhw) * 100)} cm below` : 'level with'} today's king tides (${ft(d.king).toFixed(1)} ft). At this pace the two meet around ${Math.round(when / 10) * 10}.`;
    if (reached && t.goal === 'reach') t.done();
  };
  const years = slider('Year', 1900, 2150, 1, year, (v) => `${v}`, (v) => { year = v; paint(); }, 'ink');
  const play = player(years, ctx, { seconds: 12 });
  const pace = pick(['2 mm a year', '5 mm', '10 mm'], 0, (i) => { rate = rates[i]; paint(); });
  f.controls.append(pace.node, play.node, years.node);
  paint();
  return f.node;
});

export const figures: Record<string, FigureFactory> = {
  'olympia-channel': channelFigure,
  'olympia-rise': riseFigure,
};
