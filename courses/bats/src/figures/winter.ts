// Lesson 7, The winter fat budget: a little brown bat's fat over a winter of
// torpor and wakings, with the white-nose fungus waking it more and more often
// (a live figure with a time lapse), and a still of a bat awake against one in
// torpor. The spread of white-nose and the cost of a waking are live charts in
// the lesson's JSON.

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, type FigureFactory, frame, guessFirst, player, slider, tint, toggles, wrapped } from './kit';

const W = 400;

/**
 * A little brown bat's winter, after Thomas, Dorais and Bergeron (1990):
 * about 2 g (2,000 mg) of fat at the start; about 1.6 mg a day in torpor in a
 * cave near 5 °C; about 108 mg for each waking. Winter runs `days` days from
 * 15 October. With white-nose the bat wakes, at worst, every 3.5 days
 * (Reeder et al. 2012 found every 3 to 4).
 */
export const BUDGET = { fat: 2000, torpor: 1.6, arousal: 108, days: 190, worst: 3.5 } as const;

/**
 * Milligrams of fat a torpid bat burns a day in a cave at `temp` °C. Above
 * about 2 °C a cold body's chemistry runs slower the colder it is (the cost
 * falls by about 2.5 times for each 10 °C cooler); below 2 °C the bat must burn
 * fuel to keep its tissues from freezing, and the colder the dearer.
 */
export function torporCost(temp: number): number {
  const at = (T: number) => BUDGET.torpor * Math.pow(2.5, (T - 5) / 10);
  return temp >= 2 ? at(temp) : at(2) + 0.6 * (2 - temp);
}

/**
 * How fast the white-nose fungus spreads over a torpid bat, as a share of the
 * skin it can still take a day, at cave temperature `temp` °C. Pseudogymnoascus
 * destructans grows from about 3 °C, fastest near 14 °C, and not above about
 * 20 °C (Verant et al. 2012). The shape is a model; the peak rate is set so a
 * bat in a 7 °C cave runs out of fat in February.
 */
export function fungusRate(temp: number): number {
  if (temp <= 3 || temp >= 20) return 0;
  return 0.15 * (temp <= 14 ? (temp - 3) / 11 : (20 - temp) / 6);
}

export interface WinterDay {
  day: number;
  /** Fat left, in milligrams, at the end of the day. */
  fat: number;
  /** Whether the bat woke that day. */
  woke: boolean;
  /** Days between wakings, as things stand that day. */
  interval: number;
}

export interface Winter {
  days: WinterDay[];
  /** The day the fat ran out, or null if it lasted. */
  diedOn: number | null;
  wakings: number;
  /** The share of the fat burned that went on wakings. */
  wakingShare: number;
}

/**
 * One winter, day by day, for a bat in a cave at `temp` °C that wakes every
 * `interval` days when healthy. With `wns`, the fungus covers more of the bat
 * each day (logistic growth from 1% at `fungusRate`), and the time between
 * wakings shrinks from `interval` toward BUDGET.worst as it does.
 */
export function winter(temp: number, interval: number, wns: boolean): Winter {
  let fat: number = BUDGET.fat;
  let cover = 0.01;
  let clock = 0;
  let wakings = 0;
  let onWaking = 0;
  const days: WinterDay[] = [{ day: 0, fat, woke: false, interval }];
  let diedOn: number | null = null;
  for (let d = 1; d <= BUDGET.days; d++) {
    if (wns) cover += fungusRate(temp) * cover * (1 - cover);
    const now = wns ? interval / (1 + (interval / BUDGET.worst - 1) * cover) : interval;
    clock += 1 / now;
    fat -= torporCost(temp);
    let woke = false;
    if (clock >= 1) {
      clock -= 1;
      fat -= BUDGET.arousal;
      onWaking += BUDGET.arousal;
      wakings++;
      woke = true;
    }
    if (fat <= 0) {
      days.push({ day: d, fat: 0, woke, interval: now });
      diedOn = d;
      break;
    }
    days.push({ day: d, fat, woke, interval: now });
  }
  const burned = BUDGET.fat - days[days.length - 1].fat;
  return { days, diedOn, wakings, wakingShare: burned > 0 ? Math.min(1, onWaking / burned) : 0 };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The date `day` days after 15 October: "14 February". */
export function dateOf(day: number): string {
  const d = new Date(Date.UTC(2025, 9, 15) + Math.round(day) * 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** The first of each month from November to April, in days after 15 October. */
const MONTH_STARTS: readonly (readonly [number, string])[] = [[17, 'Nov'], [47, 'Dec'], [78, 'Jan'], [109, 'Feb'], [137, 'Mar'], [168, 'Apr']];

export const fatFigure = figure(['starve'], (ctx, t) => {
  const f = frame(W, 236, 3);
  const g = svg('g');
  f.svg.append(g);
  let temp = 7;
  let interval = 14;
  let wns = false;
  let now: number = BUDGET.days;
  const paint = () => {
    const run = winter(temp, interval, wns);
    const healthy = wns ? winter(temp, interval, false) : null;
    const ax = axes({
      x: 44, y: 86, w: 340, h: 112, xmin: 0, xmax: BUDGET.days, ymin: 0, ymax: 2,
      xticks: MONTH_STARTS.map(([d]) => d), xfmt: (d) => MONTH_STARTS.find(([x]) => x === d)?.[1] ?? '',
      yticks: [0, 1, 2], yfmt: (v) => `${v} g`, ylabel: 'fat left', ink: COL.ink, grid: COL.grid,
    });
    const shown = run.days.filter((d) => d.day <= now);
    const last = shown[shown.length - 1];
    const pts = shown.map((d) => [d.day, d.fat / 1000] as const);
    // Body temperature: a strip over the chart, near the cave's temperature, with a spike for each waking.
    const T = (c: number) => 62 - (c / 40) * 40;
    const body: SVGElement[] = [
      line(ax.X(0), T(temp), ax.X(Math.min(now, run.diedOn ?? now)), T(temp), COL.cold, 1.6),
      ...shown.filter((d) => d.woke).map((d) => line(ax.X(d.day), T(temp), ax.X(d.day), T(37), COL.heat, 1.6)),
      small(4, T(37) + 3, '37 °C', { fill: COL.heat }),
      small(4, T(temp) + 3, `${temp} °C`, { fill: COL.cold }),
      small(ax.X(BUDGET.days), 14, 'body temperature', { anchor: 'end', soft: true }),
    ];
    const area = pts.length > 1
      ? svg('path', { d: `M${ax.X(0)},${ax.Y(0)} ${pts.map(([x, y]) => `L${ax.X(x)},${ax.Y(y)}`).join(' ')} L${ax.X(last.day)},${ax.Y(0)} Z`, fill: tint(COL.fat, 0.35) })
      : null;
    const dead = run.diedOn !== null && now >= run.diedOn;
    redraw(g,
      ...ax.parts,
      ...body,
      healthy ? ax.path(healthy.days.map((d) => [d.day, d.fat / 1000] as const), COL.soft, 1.2, { 'stroke-dasharray': '4 3' }) : null,
      healthy ? small(ax.X(BUDGET.days) - 2, ax.Y(healthy.days[healthy.days.length - 1].fat / 1000) - 6, 'healthy', { anchor: 'end', soft: true }) : null,
      area,
      ax.path(pts, COL.fat, 2.2),
      ...shown.filter((d) => d.woke).map((d) => svg('circle', { cx: ax.X(d.day), cy: ax.Y(d.fat / 1000), r: 1.8, fill: COL.cost })),
      line(ax.X(last.day), ax.o.y, ax.X(last.day), ax.o.y + ax.o.h, COL.soft, 1, { 'stroke-dasharray': '2 3' }),
      dead ? label(ax.X(run.diedOn!), ax.Y(0) - 8, '✕', { anchor: 'middle', bold: true, fill: COL.cost }) : null,
      dead ? small(Math.min(ax.X(run.diedOn!) + 8, 300), ax.Y(0) - 22, `out of fat, ${dateOf(run.diedOn!)}`, { bold: true, fill: COL.cost }) : null,
      ...wrapped(44, 226, wns ? 'Dots: each waking. Dashed: the same bat without the fungus.' : 'Each step down is a waking; dots mark them.', 70, { soft: true }),
    );
    if (!open()) return;
    const share = Math.round(run.wakingShare * 100);
    f.readout.textContent = dead
      ? `${dateOf(run.diedOn!)}: the fat is gone after ${run.wakings} wakings, the last ones every ${last.interval.toFixed(1)} days. The bat flies out to look for insects that are not there.`
      : now >= BUDGET.days
        ? `Spring (${dateOf(now)}): ${(last.fat / 1000).toFixed(2)} g of fat left after ${run.wakings} wakings, which used ${share}% of the fat burned. In torpor the bat burned ${torporCost(temp).toFixed(1)} mg a day.${wns ? '' : ' Now tap White-nose.'}`
        : `${dateOf(now)}: ${(last.fat / 1000).toFixed(2)} g left after ${shown.filter((d) => d.woke).length} wakings. ${wns ? `The fungus now wakes the bat every ${last.interval.toFixed(1)} days.` : `It wakes about every ${interval} days.`}`;
    if (wns && dead) t.done();
  };
  const ts = slider('Cave temperature', 0, 14, 1, temp, (v) => `${v} °C`, (v) => { temp = v; paint(); }, 'cold');
  const is = slider('Healthy bat wakes every', 7, 28, 1, interval, (v) => `${v} days`, (v) => { interval = v; paint(); }, 'cost');
  const ds = slider('Date', 0, BUDGET.days, 1, now, (v) => dateOf(v), (v) => { now = v; paint(); }, 'fat');
  const play = player(ds, ctx, { seconds: 14 });
  const sick = toggles(['White-nose'], [false], (on) => { wns = on[0]; paint(); });
  f.controls.append(sick.node, play.node, ds.node, ts.node, is.node);
  const open = guessFirst(t, f, {
    ask: 'A healthy bat in a 7 °C cave, waking every two weeks, ends the winter with fat to spare. Give it white-nose. When does its fat run out?',
    options: ['Before Christmas', 'In February', 'It lasts until spring'],
    answer: 1,
    sliders: [ts, is, ds],
    buttons: sick.buttons,
    hidden: [sick.node, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Awake and in torpor (still) ---------------------------------------------------------------------

/** A little brown bat awake at rest and in torpor in a 5 °C cave: round numbers for the still. */
export const STATES = [
  { name: 'Awake, at rest', body: 37, beats: 300, energy: 100 },
  { name: 'In torpor, cave at 5 °C', body: 6, beats: 15, energy: 2 },
] as const;

export const torporStill = () => {
  const s = still(W, 232);
  const parts: SVGElement[] = [];
  STATES.forEach((st, i) => {
    const y0 = 20 + i * 106;
    const warm = i === 0;
    const colour = warm ? COL.heat : COL.cold;
    parts.push(label(10, y0, st.name, { bold: true, fill: colour }));
    // A thermometer: 0 to 40 °C.
    const tx = 24;
    const top = y0 + 12;
    const h = 70;
    parts.push(
      svg('rect', { x: tx - 5, y: top, width: 10, height: h, rx: 5, fill: 'none', stroke: COL.soft, 'stroke-width': 1 }),
      svg('rect', { x: tx - 3, y: top + h - (st.body / 40) * h, width: 6, height: (st.body / 40) * h, rx: 3, fill: colour }),
      small(tx + 10, top + h - (st.body / 40) * h + 4, `${st.body} °C`, { bold: true }),
    );
    // Ten seconds of heartbeats.
    const hx = 92;
    const hw = 200;
    const beats = Math.round((st.beats / 60) * 10);
    const pulse: SVGElement[] = [line(hx, top + 30, hx + hw, top + 30, COL.grid, 1)];
    for (let k = 0; k < beats; k++) {
      const x = hx + ((k + 0.5) / beats) * hw;
      pulse.push(line(x, top + 30, x, top + 12, COL.blood, warm ? 0.9 : 1.6));
    }
    parts.push(...pulse, small(hx, top + 46, `heart: about ${st.beats} beats a minute`, { soft: false }), small(hx, top + 58, '(ten seconds shown)', { soft: true }));
    // Energy used, against the awake bat at rest.
    const ex = 310;
    const ew = 80;
    parts.push(
      svg('rect', { x: ex, y: top + 16, width: ew, height: 14, fill: 'none', stroke: COL.soft, 'stroke-width': 0.8 }),
      svg('rect', { x: ex, y: top + 16, width: Math.max(1.5, (st.energy / 100) * ew), height: 14, fill: COL.cost }),
      small(ex, top + 46, warm ? 'energy use: 100' : 'energy use: about 2', { soft: false }),
      small(ex, top + 58, '(awake at rest = 100)', { soft: true }),
    );
  });
  s.svg.append(...parts);
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  'fat-budget': fatFigure,
  'torpor-still': torporStill,
};
