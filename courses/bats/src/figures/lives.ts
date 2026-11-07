// Lesson 8, Long lives, slow births: lifespan against body mass for ground
// mammals, bats and birds (guess first where a 7 g bat falls); how fast a bat
// colony and a mouse population recover from a loss; and rabies in plain
// numbers (a still).

import { svg } from 'didactics/dom';
import { label, line, redraw, small, still } from 'didactics/draw';
import { axes, COL, figure, type FigureFactory, frame, guessFirst, legend, slider, toggles, wrapped } from './kit';

const W = 400;

// ---- Lifespan against body mass ------------------------------------------------------------------------

/** [name, body mass in kg, longest known life in years]: rounded, mostly from the AnAge database. */
export type Animal = readonly [string, number, number];

export const GROUND: readonly Animal[] = [
  ['Common shrew', 0.009, 3.2], ['House mouse', 0.02, 4], ['Brown rat', 0.3, 3.8], ['Grey squirrel', 0.5, 24],
  ['Rabbit', 1.8, 9], ['Cat', 4, 30], ['Raccoon', 6, 21], ['Wolf', 40, 21], ['Chimpanzee', 45, 59],
  ['White-tailed deer', 70, 23], ['Horse', 400, 57], ['Giraffe', 800, 39], ['Hippopotamus', 1500, 61], ['African elephant', 4000, 70],
];

export const BATS: readonly Animal[] = [
  ["Brandt's bat", 0.007, 41], ['Little brown bat', 0.008, 34], ['Common pipistrelle', 0.005, 16], ['Mexican free-tailed bat', 0.012, 18],
  ['Big brown bat', 0.02, 19], ['Greater horseshoe bat', 0.023, 30], ['Common vampire bat', 0.035, 29], ['Egyptian fruit bat', 0.15, 25],
  ['Indian flying fox', 0.9, 31],
];

export const BIRDS: readonly Animal[] = [
  ['Ruby-throated hummingbird', 0.0035, 9], ['House sparrow', 0.028, 23], ['Budgerigar', 0.035, 21], ['Rock pigeon', 0.35, 35],
  ['Herring gull', 1, 49], ['Laysan albatross', 3, 70],
];

/** Ground mammals that also live long for their size, shown with the birds. */
export const ODD: readonly Animal[] = [['Naked mole-rat', 0.035, 31], ['Human', 70, 122]];

/** The line years = a × kg^b through `pts`, fitted on logarithms by least squares. */
export function fitLine(pts: readonly Animal[]): { a: number; b: number } {
  const xs = pts.map((p) => Math.log10(p[1]));
  const ys = pts.map((p) => Math.log10(p[2]));
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  const sxy = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  const sxx = xs.reduce((s, v) => s + (v - mx) ** 2, 0);
  const b = sxy / sxx;
  return { a: Math.pow(10, my - b * mx), b };
}

const LINE = fitLine(GROUND);

/** The lifespan the ground mammals' line expects for an animal of `kg`. */
export const expected = (kg: number) => LINE.a * Math.pow(kg, LINE.b);

/** How many times the line's lifespan an animal reaches. */
export const times = (a: Animal) => a[2] / expected(a[1]);

/** The geometric mean of `times` over a group. */
export const meanTimes = (g: readonly Animal[]) => Math.exp(g.reduce((s, a) => s + Math.log(times(a)), 0) / g.length);

const massText = (kg: number) => (kg < 1 ? `${Math.round(kg * 1000)} g` : kg < 1000 ? `${Math.round(kg)} kg` : `${Math.round(kg / 1000)} t`);

export const lifespanFigure = figure(['placed'], (_ctx, t) => {
  const f = frame(W, 250, 3);
  const g = svg('g');
  f.svg.append(g);
  let birds = false;
  let odd = false;
  const brandt = BATS[0];
  const paint = () => {
    const ax = axes({
      x: 44, y: 22, w: 340, h: 180, xmin: -2.6, xmax: 3.8, ymin: 2, ymax: 150, ylog: true,
      xticks: [-2, -1, 0, 1, 2, 3], xfmt: (v) => massText(Math.pow(10, v)), yticks: [2, 5, 10, 20, 50, 100], yfmt: (v) => `${v}`,
      xlabel: 'body mass', ylabel: 'longest known life, years', ink: COL.ink, grid: COL.grid,
    });
    const at = (a: Animal) => [Math.log10(a[1]), a[2]] as const;
    const shown = open();
    const curve = Array.from({ length: 30 }, (_, i) => {
      const lx = -2.6 + (6.4 * i) / 29;
      return [lx, expected(Math.pow(10, lx))] as const;
    });
    const name = (a: Animal, colour: string, dx = 5, anchor?: 'end') => small(ax.X(Math.log10(a[1])) + dx, ax.Y(a[2]) + 3, a[0], { fill: colour, anchor });
    redraw(g,
      ...ax.parts,
      ax.path(curve, COL.model, 1.8, { 'stroke-dasharray': '5 3' }),
      ...ax.dots(GROUND.map(at), COL.data, 2.8),
      name(GROUND[1], COL.soft, 5),
      name(GROUND[13], COL.soft, -5, 'end'),
      ...(shown ? ax.dots(BATS.map(at), COL.bat, 3.4) : []),
      shown ? name(brandt, COL.bat, 6) : null,
      !shown ? line(ax.X(Math.log10(brandt[1])), ax.Y(2), ax.X(Math.log10(brandt[1])), ax.Y(150), COL.bat, 1.2, { 'stroke-dasharray': '2 3' }) : null,
      !shown ? small(ax.X(Math.log10(brandt[1])) + 4, ax.Y(100), "Brandt's bat, 7 g: where?", { fill: COL.bat, bold: true }) : null,
      ...(shown && birds ? ax.dots(BIRDS.map(at), COL.bird, 3) : []),
      shown && birds ? name(BIRDS[5], COL.bird, -5, 'end') : null,
      ...(shown && odd ? ax.dots(ODD.map(at), COL.noise, 3) : []),
      ...(shown && odd ? ODD.map((a) => name(a, COL.noise, -5, 'end')) : []),
      ...legend(44, 240, [
        { text: 'ground mammals', color: COL.data, dot: true },
        { text: 'bats', color: COL.bat, dot: true },
        { text: 'birds', color: COL.bird, dot: true },
        { text: 'line', color: COL.model, dash: true },
      ], 6),
    );
    if (!shown) return;
    const b = meanTimes(BATS);
    f.readout.textContent = odd
      ? `The naked mole-rat lives underground in guarded colonies, and people live in groups that protect them: two other animals that are seldom killed by predators, both far above the line.`
      : birds
        ? `Birds sit above the line too, about ${meanTimes(BIRDS).toFixed(1)} times it on average. Flight is the thing bats and birds share.`
        : `Brandt's bat reaches 41 years, about ${Math.round(times(brandt))} times what the line gives a 7 g mammal. The bats here average ${b.toFixed(1)} times the line; a mouse falls a little below it.`;
    t.done();
  };
  const which = toggles(['Add birds', 'Add two odd ones out'], [false, false], (on) => { birds = on[0]; odd = on[1]; paint(); });
  f.controls.append(which.node);
  const open = guessFirst(t, f, {
    ask: "The dashed line is how long a ground mammal of each size can live. How long can a 7 g Brandt's bat live?",
    options: ['About 4 years, on the line', 'About 10 years', 'About 40 years'],
    answer: 2,
    sliders: [],
    buttons: which.buttons,
    hidden: [which.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Colony recovery ---------------------------------------------------------------------------------------

/**
 * A colony of little brown bats, counted as a share of what its roost can
 * hold. Each year 85% of adult females survive; each has `pups` pups, half of
 * them female, and at low numbers half the young survive their first year.
 * So the colony can grow at most by r = pups × 0.25 - 0.15 a year (10% with
 * one pup), slowing as it fills the roost (logistic growth).
 */
export const COLONY = { survival: 0.85, firstYear: 0.5, lossAt: 5, years: 60 } as const;

export const growthRate = (pups: number) => pups * 0.5 * COLONY.firstYear - (1 - COLONY.survival);

/**
 * The colony at the start of each year for COLONY.years years: `loss` (a
 * share) dies at once in year COLONY.lossAt, and from then on `extra` (a
 * share) more die every year.
 */
export function colony(pups: number, loss: number, extra: number): number[] {
  const r = growthRate(pups);
  let n = 1;
  const out: number[] = [];
  for (let y = 0; y <= COLONY.years; y++) {
    if (y === COLONY.lossAt) n *= 1 - loss;
    out.push(n);
    const hit = y >= COLONY.lossAt ? extra : 0;
    n = Math.max(0, n + r * n * (1 - n) - hit * n);
  }
  return out;
}

/** Years after the loss until the colony is back to 90%, or null if it never is. */
export function recovery(run: readonly number[]): number | null {
  const k = run.findIndex((v, y) => y > COLONY.lossAt && v >= 0.9);
  return k < 0 ? null : k - COLONY.lossAt;
}

/**
 * Mice after the same loss: a female can breed at six weeks and raise a
 * litter of five or six a month, so at low numbers the population can more
 * than double in a month (logistic growth at 0.8 a month). Months to 90%.
 */
export function mouseMonths(loss: number): number {
  let n = 1 - loss;
  let m = 0;
  while (n < 0.9 && m < 600) {
    n += 0.8 * n * (1 - n);
    m++;
  }
  return m;
}

export const colonyFigure = figure(['fail'], (_ctx, t) => {
  const f = frame(W, 220, 4);
  const g = svg('g');
  f.svg.append(g);
  let pups = 1;
  let loss = 0.9;
  let extra = 0;
  const paint = () => {
    const run = colony(pups, loss, extra);
    const ax = axes({
      x: 44, y: 22, w: 340, h: 160, xmin: 0, xmax: COLONY.years, ymin: 0, ymax: 1.1,
      xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 0.5, 1], yfmt: (v) => `${Math.round(v * 100)}%`,
      xlabel: 'years', ylabel: 'colony, share of its old size', ink: COL.ink, grid: COL.grid,
    });
    const mouse = mouseMonths(loss);
    const mousePts: (readonly [number, number])[] = [[0, 1], [COLONY.lossAt, 1], [COLONY.lossAt, 1 - loss], [COLONY.lossAt + Math.max(mouse, 1) / 12, 0.9], [COLONY.lossAt + 1.5, 1], [COLONY.years, 1]];
    const back = recovery(run);
    const r = growthRate(pups);
    redraw(g,
      ...ax.parts,
      ax.path(mousePts, COL.soft, 1.6, { 'stroke-dasharray': '4 3' }),
      // Before the guess, only the years up to the loss: the recovery is the answer.
      ax.path(run.slice(0, open() ? run.length : COLONY.lossAt + 1).map((v, y) => [y, v] as const), COL.bat, 2.6),
      line(ax.X(COLONY.lossAt), ax.Y(0), ax.X(COLONY.lossAt), ax.Y(1.1), COL.fungus, 1, { 'stroke-dasharray': '2 3' }),
      small(ax.X(COLONY.lossAt) + 4, ax.Y(1.06), `loss of ${Math.round(loss * 100)}%`, { fill: COL.fungus }),
      open() && back !== null ? svg('circle', { cx: ax.X(COLONY.lossAt + back), cy: ax.Y(run[COLONY.lossAt + back]), r: 3.5, fill: COL.good }) : null,
      ...legend(44, 212, [{ text: 'bat colony', color: COL.bat }, { text: 'mice', color: COL.soft, dash: true }]),
    );
    if (!open()) return;
    const fails = extra >= r;
    const next = extra === 0 ? ' Now raise the extra deaths each year until it never comes back.' : '';
    f.readout.textContent = fails
      ? `The colony can add at most ${Math.round(r * 100)}% a year, and ${Math.round(extra * 100)}% more die every year: it dwindles away however long you wait.`
      : back === null
        ? `With ${pups} pup${pups === 1 ? '' : 's'} a year and ${Math.round(extra * 100)}% extra deaths, the colony is still below 90% after ${COLONY.years - COLONY.lossAt} years. Mice are back in ${mouse} months.${next}`
        : `Back to 90% after ${back} years${extra > 0 ? `, settling lower because of the extra deaths` : ''}. Mice, with litters every month, are back in ${mouse} month${mouse === 1 ? '' : 's'}.${next}`;
    if (fails) t.done();
  };
  const ps = slider('Pups per female a year', 1, 4, 0.5, pups, (v) => `${v}`, (v) => { pups = v; paint(); }, 'bat');
  const ls = slider('One bad winter kills', 0, 0.95, 0.05, loss, (v) => `${Math.round(v * 100)}%`, (v) => { loss = v; paint(); }, 'fungus');
  const xs = slider('Then extra deaths each year', 0, 0.2, 0.01, extra, (v) => `${Math.round(v * 100)}%`, (v) => { extra = v; paint(); }, 'cost');
  f.controls.append(ps.node, ls.node, xs.node);
  const open = guessFirst(t, f, {
    ask: 'A colony of little brown bats, one pup a year each, loses 90% of its members in one bad winter. Then the disease is gone. How long until it is back to 90% of its old size?',
    options: ['A few years', 'About ten years', 'Several decades'],
    answer: 2,
    sliders: [ps, ls, xs],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Rabies in plain numbers (still) -----------------------------------------------------------------------

/** Out of 200 bats: how many have rabies among wild bats caught at random, and among bats sent in for testing. */
export const RABIES = { wild: 1, submitted: 11, of: 200 } as const;

export const rabiesStill = () => {
  const s = still(W, 250);
  const parts: SVGElement[] = [];
  const grid = (x0: number, y0: number, sick: number, title: string, note: string) => {
    parts.push(label(x0, y0, title, { bold: true }));
    // Spread the sick ones through the grid, not in one corner.
    const marked = new Set(Array.from({ length: sick }, (_, k) => Math.floor(((k + 0.5) * RABIES.of) / sick)));
    for (let k = 0; k < RABIES.of; k++) {
      const cx = x0 + 5 + (k % 20) * 8.6;
      const cy = y0 + 14 + Math.floor(k / 20) * 8.6;
      const ill = marked.has(k);
      parts.push(svg('circle', { cx, cy, r: 3, fill: ill ? COL.fungus : 'none', stroke: ill ? COL.ink : COL.wing, 'stroke-width': ill ? 1 : 0.8 }));
    }
    parts.push(...wrapped(x0, y0 + 108, note, 34, { soft: true }));
  };
  grid(8, 16, RABIES.wild, 'Wild bats caught at random', `Under 1%: about one bat in 200 has rabies (filled).`);
  grid(208, 16, RABIES.submitted, 'Bats sent in for testing', 'About 5 to 6%: these are bats found grounded, sick or in houses, so more of them are ill.');
  parts.push(
    line(8, 168, 392, 168, COL.grid, 1),
    label(8, 188, 'People in the United States who die of rabies:', { bold: true }),
    label(8, 206, 'one to three a year, most of them infected by bats.'),
    ...wrapped(8, 226, 'Rabies can be prevented after a bite with vaccine, but not cured once symptoms start. Never pick up a bat with bare hands.', 74, { soft: true }),
  );
  s.svg.append(...parts);
  return { node: s.node };
};

export const FIGS: Record<string, FigureFactory> = {
  lifespan: lifespanFigure,
  'colony-recovery': colonyFigure,
  'rabies-numbers': rabiesStill,
};
