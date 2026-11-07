// Branch P1, Bats and people: the Congress Avenue Bridge colony's nightly
// catch through the season (a live figure with a time lapse), and how a
// one-way door shuts bats out of a house, and when (a still). The bat bomb's
// timeline and the "I found a bat" key are live charts in the lesson's JSON.

import { svg } from 'didactics/dom';
import { arrow, label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, count, figure, type FigureFactory, frame, guessFirst, player, slider, tint, wrapped } from './kit';

const W = 400;

/** Days from 1 March to 30 November. */
export const SEASON_DAYS = 274;

/**
 * The bridge colony through the season, month by month from March to
 * November (values at mid month): the share of the spring's mothers present,
 * flying young per mother, and grams of insects a mother and a young bat eat
 * a night. Mexican free-tailed bats weigh about 12 g; a mother nursing in
 * July eats some 70% of her weight a night (Kunz et al. 1995). Rounded
 * figures for a model, not counts.
 */
export const BRIDGE = {
  mothers: [0.4, 0.85, 1, 1, 1, 0.97, 0.9, 0.6, 0.1],
  young: [0, 0, 0, 0, 0.35, 0.85, 0.8, 0.5, 0.08],
  motherGrams: [4, 5, 6, 7.5, 8.4, 6.5, 6, 5, 4],
  youngGrams: 6,
} as const;

/** A monthly table read at `day` days after 1 March, straight lines between mid months. */
function at(table: readonly number[], day: number): number {
  const x = (day - 15) / 30.5;
  if (x <= 0) return table[0] * Math.max(0, Math.min(1, (day + 10) / 25));
  if (x >= table.length - 1) return table[table.length - 1];
  const i = Math.floor(x);
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

/** Bats under the bridge and kilograms of insects they eat on night `day`, for a colony of `mothers` in spring. */
export function bridgeNight(mothers: number, day: number): { bats: number; young: number; kg: number } {
  const m = mothers * at(BRIDGE.mothers, day);
  const y = mothers * at(BRIDGE.young, day);
  const kg = (m * at(BRIDGE.motherGrams, day) + y * BRIDGE.youngGrams) / 1000;
  return { bats: m + y, young: y, kg };
}

/** The night of the season with the biggest catch. */
export function peakNight(mothers: number): number {
  let best = 0;
  for (let d = 0; d <= SEASON_DAYS; d++) if (bridgeNight(mothers, d).kg > bridgeNight(mothers, best).kg) best = d;
  return best;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "14 August" for `day` days after 1 March. */
export function seasonDate(day: number): string {
  const d = new Date(Date.UTC(2025, 2, 1) + Math.round(day) * 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const phase = (day: number) =>
  day < 60 ? 'Pregnant mothers are arriving from Mexico.'
    : day < 105 ? 'The mothers are heavily pregnant.'
      : day < 135 ? 'Pups are born and nursed in the crevices; nursing mothers eat the most each.'
        : day < 200 ? 'The young are flying and hunting too.'
          : day < 245 ? 'The colony is leaving for Mexico.'
            : 'Nearly all have gone south.';

export const bridgeFigure = figure(['peak'], (ctx, t) => {
  const f = frame(W, 220, 3);
  const g = svg('g');
  f.svg.append(g);
  let mothers = 750_000;
  let now = 0;
  let passed = false;
  const paint = () => {
    const ax = axes({
      x: 44, y: 24, w: 316, h: 150, xmin: 0, xmax: SEASON_DAYS, ymin: 0, ymax: 12,
      xticks: [0, 31, 61, 92, 122, 153, 184, 214, 245], xfmt: (d) => ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][[0, 31, 61, 92, 122, 153, 184, 214, 245].indexOf(d)] ?? '',
      yticks: [0, 4, 8, 12], yfmt: (v) => `${v} t`, ylabel: 'insects eaten a night', ink: COL.ink, grid: COL.grid,
    });
    const days = Array.from({ length: SEASON_DAYS + 1 }, (_, d) => d);
    const nights = days.map((d) => bridgeNight(mothers, d));
    const shown = days.filter((d) => d <= now);
    const batY = (n: number) => ax.Y((n / 2_000_000) * 12);
    const area = shown.length > 1
      ? svg('path', { d: `M${ax.X(0)},${ax.Y(0)} ${shown.map((d) => `L${ax.X(d)},${ax.Y(nights[d].kg / 1000)}`).join(' ')} L${ax.X(now)},${ax.Y(0)} Z`, fill: tint(COL.moth, 0.35) })
      : null;
    const tonight = nights[Math.round(now)];
    redraw(g,
      ...ax.parts,
      area,
      ax.path(shown.map((d) => [d, nights[d].kg / 1000] as const), COL.moth, 2.2),
      ax.path(shown.map((d) => [d, (nights[d].bats / 2_000_000) * 12] as const), COL.bat, 1.6, { 'stroke-dasharray': '4 3' }),
      small(ax.X(SEASON_DAYS) + 4, batY(2_000_000) + 3, '2M', { fill: COL.bat }),
      small(ax.X(SEASON_DAYS) + 4, batY(1_000_000) + 3, '1M', { fill: COL.bat }),
      small(ax.X(SEASON_DAYS) + 4, ax.Y(0) + 3, '0', { fill: COL.bat }),
      small(ax.X(SEASON_DAYS), 14, 'bats (dashed)', { anchor: 'end', fill: COL.bat }),
      line(ax.X(now), ax.Y(0), ax.X(now), ax.Y(12), COL.soft, 1, { 'stroke-dasharray': '2 3' }),
      ...wrapped(44, 208, 'A model: arrivals, births and appetites in round numbers.', 70, { soft: true }),
    );
    if (!open()) return;
    const tonnes = tonight.kg / 1000;
    f.readout.textContent = `${seasonDate(now)}: about ${count(Math.round(tonight.bats / 10000) * 10000)} bats eat ${tonnes.toFixed(1)} tonnes (${count(Math.round(tonight.kg * 2.2046 / 100) * 100)} lb) of insects tonight. ${phase(now)}${now === 0 ? ' Press Play to run the season.' : ''}`;
    if (now >= peakNight(mothers)) passed = true;
    if (passed) t.done();
  };
  const ds = slider('Date', 0, SEASON_DAYS, 1, now, (v) => seasonDate(v), (v) => { now = v; paint(); }, 'moth');
  const play = player(ds, ctx, { seconds: 14 });
  const ms = slider('Mothers in spring', 100_000, 1_000_000, 50_000, mothers, (v) => count(v), (v) => { mothers = v; paint(); }, 'bat');
  f.controls.append(play.node, ds.node, ms.node);
  const open = guessFirst(t, f, {
    ask: 'When in the year does the bridge colony eat the most insects in a night?',
    options: ['April, as the mothers arrive', 'July, while they nurse', 'August, once the young fly'],
    answer: 2,
    sliders: [ds, ms],
    reveal: 'done',
    hidden: [play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Shutting bats out (still) -------------------------------------------------------------------------------

export const exclusionStill = () => {
  const s = still(W, 250);
  const parts: SVGElement[] = [];
  // A wall and the eave above it, with a gap the bats use.
  parts.push(
    svg('rect', { x: 20, y: 30, width: 150, height: 150, fill: tint(COL.rock, 0.25), stroke: COL.soft, 'stroke-width': 1 }),
    svg('path', { d: 'M10,30 L180,30 L180,22 L10,22 Z', fill: COL.rock }),
    line(20, 48, 170, 48, COL.ink, 1),
    small(26, 44, 'gap under the eave', { soft: true }),
    // The one-way tube: open at the bottom, bats drop out but cannot climb back.
    svg('path', { d: 'M110,48 L130,48 L136,120 L104,120 Z', fill: 'none', stroke: COL.ink, 'stroke-width': 1.4, 'stroke-dasharray': '3 2' }),
    small(140, 84, 'netting', { soft: true }),
    small(140, 96, 'or a tube', { soft: true }),
    arrow(120, 108, 120, 150, COL.good, 2),
    svg('ellipse', { cx: 120, cy: 160, rx: 9, ry: 4, fill: COL.bat }),
    small(40, 140, 'out at dusk', { fill: COL.good, bold: true }),
    arrow(62, 70, 100, 56, COL.bad, 1.6),
    label(76, 66, '✕', { fill: COL.bad, bold: true }),
    small(28, 82, 'no way back in', { fill: COL.bad }),
    ...wrapped(20, 198, 'A one-way door over the gap. Leave it a week, then seal every gap.', 30, { soft: true }),
  );
  // When to do it: a year in Washington.
  const x0 = 200;
  const w = 190;
  const mw = w / 12;
  parts.push(label(x0, 40, 'When to shut them out', { bold: true }));
  const not = [5, 6, 7];
  const winter = [10, 11, 0, 1, 2];
  for (let m = 0; m < 12; m++) {
    const fill = not.includes(m) ? COL.bad : winter.includes(m) ? COL.cold : COL.good;
    parts.push(
      svg('rect', { x: x0 + m * mw, y: 54, width: mw - 1, height: 22, fill: tint(fill, 0.55) }),
      small(x0 + m * mw + mw / 2, 90, 'JFMAMJJASOND'[m], { anchor: 'middle' }),
    );
  }
  parts.push(
    svg('rect', { x: x0, y: 110, width: 10, height: 10, fill: tint(COL.good, 0.55) }), small(x0 + 16, 119, 'yes: no pups, bats active'),
    svg('rect', { x: x0, y: 130, width: 10, height: 10, fill: tint(COL.bad, 0.55) }), small(x0 + 16, 139, 'no: pups that cannot fly yet'),
    svg('rect', { x: x0, y: 150, width: 10, height: 10, fill: tint(COL.cold, 0.55) }), small(x0 + 16, 159, 'no: bats may be hibernating'),
    ...wrapped(x0, 186, 'Roughly June to mid August in Washington; check local advice, since the dates shift with the climate.', 36, { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  'bridge-insects': bridgeFigure,
  exclusion: exclusionStill,
};
