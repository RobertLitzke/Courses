// Lesson 9, Blood, nectar and fruit: why a gift of blood costs a vampire bat
// less time than it gives (a still), a roost of vampires sharing or not
// sharing over a year, and fruit bats' seeds regrowing a cleared patch.

import { svg } from 'didactics/dom';
import { arrow, line, note, redraw, small, still } from 'didactics/draw';
import { makeRng, shuffle } from 'didactics/rng';
import { axes, COL, figure, frame, guessFirst, legend, named, pick, player, slider, tint, toggles, wrapped, type FigureFactory } from './kit';

const W = 400;

// ---- How a vampire starves ------------------------------------------------------------------------

/**
 * An illustrative weight curve for a common vampire bat after a full meal:
 * 42 g just fed, falling quickly at first (it sheds the meal's water and
 * burns the blood) and then more slowly toward about 25 g. It reaches
 * `STARVE_GRAMS` 60 hours after the meal, which is about when an unfed
 * vampire dies (Wilkinson 1984).
 */
export const VAMPIRE = { fed: 42, floor: 25, tau: 24, hours: 60 } as const;

/** Weight in grams `h` hours after a full meal. */
export const weightAt = (h: number): number => VAMPIRE.floor + (VAMPIRE.fed - VAMPIRE.floor) * Math.exp(-h / VAMPIRE.tau);

/** The weight at which the bat starves. */
export const STARVE_GRAMS = weightAt(VAMPIRE.hours);

/** How many hours after a full meal the bat weighs `g` grams (0 if heavier than just fed). */
export const hoursAt = (g: number): number => (g >= VAMPIRE.fed ? 0 : -VAMPIRE.tau * Math.log((g - VAMPIRE.floor) / (VAMPIRE.fed - VAMPIRE.floor)));

/**
 * A gift of `grams` of blood from a donor `donorH` hours after its meal to a
 * bat `takerH` hours after its last one: the hours of life the donor loses
 * and the hours the taker gains.
 */
export function gift(donorH: number, takerH: number, grams = 5): { lost: number; gained: number } {
  const lost = hoursAt(weightAt(donorH) - grams) - donorH;
  const gained = takerH - hoursAt(weightAt(takerH) + grams);
  return { lost, gained };
}

export const hoursStill = () => {
  const s = still(W, 230);
  const ax = axes({ x: 46, y: 26, w: 330, h: 150, xmin: 0, xmax: 66, ymin: 22, ymax: 44, xticks: [0, 12, 24, 36, 48, 60], yticks: [25, 30, 35, 40], xlabel: 'hours since its last meal', ylabel: 'weight, grams', ink: COL.ink, grid: COL.grid });
  const curve = Array.from({ length: 67 }, (_, h) => [h, weightAt(h)] as const);
  const donor = 2;
  const taker = 48;
  const g = gift(donor, taker);
  const dAfter = donor + g.lost;
  const tAfter = taker - g.gained;
  s.svg.append(
    ...ax.parts,
    ax.path(curve, COL.blood, 2.4),
    line(ax.X(60), ax.Y(44), ax.X(60), ax.Y(22), COL.bad, 1, { 'stroke-dasharray': '3 3' }),
    small(ax.X(60) - 3, ax.Y(43), 'starves', { anchor: 'end', fill: COL.bad }),
    // The donor, just fed, on the steep part: 5 g moves it a few hours on.
    svg('circle', { cx: ax.X(donor), cy: ax.Y(weightAt(donor)), r: 4, fill: COL.bat }),
    arrow(ax.X(donor) + 3, ax.Y(weightAt(donor)) + 4, ax.X(dAfter), ax.Y(weightAt(dAfter)) - 3, COL.cost, 1.6),
    small(ax.X(dAfter) + 6, ax.Y(weightAt(dAfter)) + 2, `donor gives 5 g: ${Math.round(g.lost)} hours nearer starving`, { fill: COL.cost }),
    // The hungry bat, on the flat part: the same 5 g moves it back most of a day.
    svg('circle', { cx: ax.X(taker), cy: ax.Y(weightAt(taker)), r: 4, fill: COL.bat }),
    arrow(ax.X(taker) - 2, ax.Y(weightAt(taker)) - 4, ax.X(tAfter) + 3, ax.Y(weightAt(tAfter)) + 3, COL.blood, 1.6),
    ...wrapped(ax.X(tAfter) - 64, ax.Y(weightAt(tAfter)) - 30, `hungry bat takes 5 g: ${Math.round(g.gained)} hours further from starving`, 30, { fill: COL.blood }),
    ...wrapped(46, 214, 'An illustrative curve with the shape Wilkinson measured: a fed bat loses weight fast, a hungry one slowly.', 76, { soft: true }),
  );
  return { node: s.node };
};

// ---- A roost over a year --------------------------------------------------------------------------

export type ShareRule = 'never' | 'kin' | 'payback' | 'everyone';
export const RULES: readonly ShareRule[] = ['never', 'kin', 'payback', 'everyone'];
const RULE_NAMES = ['Never', 'Kin only', 'Pay back', 'Everyone'];

/** Chance that a bat fails to find blood on a night: about 1 in 14 adults, 1 in 3 young (Wilkinson 1984). */
export const FAIL = { adult: 0.07, young: 0.33 } as const;

/** One bat in the roost: its family (a mother line), whether it is young, and whether it cheats. */
export interface Vampire { family: number; young: boolean; cheat: boolean }

/** Six families of five: four adult females and one young each. With cheats, one adult in each family never gives. */
export function roostOf(cheats: boolean): Vampire[] {
  const out: Vampire[] = [];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 5; k++) out.push({ family: f, young: k === 4, cheat: cheats && k === 3 });
  return out;
}

export interface Night {
  alive: boolean[];
  /** Bats that failed to feed tonight. */
  hungry: boolean[];
  /** Gifts tonight, donor to taker. */
  gifts: [number, number][];
}

/**
 * A roost through `nights` nights under one rule for sharing. Each bat's
 * clock is hours since its last full meal; it dies at 60. A bat that fails
 * tonight begs from roost-mates that fed, one after another, and a donor
 * gives 5 g if the rule lets it, by the weight curve above. Cheats never
 * give. Under "payback" a bat gives to its family's young and to any
 * roost-mate that has given to it within the last `MEMORY` nights; the roost
 * starts with a history, every bat counting as having given to every other.
 */
/** How many nights a bat remembers a gift, under the pay back rule. */
export const MEMORY = 120;

export function year(rule: ShareRule, cheats: boolean, seed: number, nights = 365): Night[] {
  const rng = makeRng(seed);
  const bats = roostOf(cheats);
  const n = bats.length;
  const since = bats.map(() => 0);
  const alive = bats.map(() => true);
  // gave[a][b]: the last night a gave to b.
  const gave = bats.map(() => bats.map(() => 0));
  const out: Night[] = [{ alive: alive.slice(), hungry: bats.map(() => false), gifts: [] }];
  for (let night = 1; night <= nights; night++) {
    const hungry = bats.map(() => false);
    const gifts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      since[i] += 24;
      if (since[i] >= VAMPIRE.hours) {
        alive[i] = false;
        continue;
      }
      if (rng() < (bats[i].young ? FAIL.young : FAIL.adult)) hungry[i] = true;
      else since[i] = 0;
    }
    if (rule !== 'never') {
      const order = shuffle(Array.from({ length: n }, (_, i) => i), rng);
      for (const i of order) {
        if (!alive[i] || !hungry[i]) continue;
        // It asks roost-mates that fed tonight, in no particular order.
        const fed = shuffle(order.filter((j) => j !== i && alive[j] && !hungry[j]), rng);
        for (const j of fed) {
          if (rule === 'kin' && bats[j].family !== bats[i].family) continue;
          const ownYoung = bats[i].young && bats[i].family === bats[j].family;
          if (rule === 'payback' && !ownYoung && night - gave[i][j] > MEMORY) continue;
          if (bats[j].cheat) continue;
          if (since[j] > 12) continue;
          const g = gift(since[j], since[i]);
          since[j] += g.lost;
          since[i] -= g.gained;
          gifts.push([j, i]);
          gave[j][i] = night;
          break;
        }
      }
    }
    out.push({ alive: alive.slice(), hungry, gifts });
  }
  return out;
}

/** Share of the honest adults and of the cheats alive after a year, averaged over `runs` roosts. */
export function survival(rule: ShareRule, cheats: boolean, runs = 40): { honest: number; cheats: number; young: number } {
  let h = 0, hn = 0, c = 0, cn = 0, y = 0, yn = 0;
  for (let s = 1; s <= runs; s++) {
    const bats = roostOf(cheats);
    const last = year(rule, cheats, s * 7919).at(-1)!;
    bats.forEach((b, i) => {
      const a = last.alive[i] ? 1 : 0;
      if (b.young) { y += a; yn++; } else if (b.cheat) { c += a; cn++; } else { h += a; hn++; }
    });
  }
  return { honest: h / hn, cheats: cn ? c / cn : 0, young: y / yn };
}

export const shareFigure = figure(['cheats'], (ctx, t) => {
  const f = frame(W, 250, 4);
  const g = svg('g');
  f.svg.append(g);
  let rule: ShareRule = 'never';
  let cheats = false;
  let night = 0;
  const runs = new Map<string, Night[]>();
  const means = new Map<string, ReturnType<typeof survival>>();
  const key = () => `${rule}${cheats}`;
  const run = () => {
    if (!runs.has(key())) runs.set(key(), year(rule, cheats, 7919));
    return runs.get(key())!;
  };
  const mean = () => {
    if (!means.has(key())) means.set(key(), survival(rule, cheats));
    return means.get(key())!;
  };
  // The roost: a row for each family, the young bat at the end of its row.
  const at = (i: number) => [22 + (i % 5) * 30, 40 + Math.floor(i / 5) * 30] as const;
  const paint = () => {
    const nights = run();
    const now = nights[night];
    const bats = roostOf(cheats);
    const honest = bats.map((b, i) => (!b.cheat && !b.young ? i : -1)).filter((i) => i >= 0);
    const cheatIds = bats.map((b, i) => (b.cheat ? i : -1)).filter((i) => i >= 0);
    const share = (ids: number[], k: number) => (ids.length ? ids.filter((i) => nights[k].alive[i]).length / ids.length : 0);
    const ax = axes({ x: 200, y: 32, w: 186, h: 150, xmin: 0, xmax: 365, ymin: 0, ymax: 1, xticks: [0, 120, 240, 365], yticks: [0, 0.5, 1], yfmt: (v) => `${Math.round(v * 100)}%`, xlabel: 'nights', ylabel: 'adults alive', ink: COL.ink, grid: COL.grid });
    const upTo = nights.slice(0, night + 1);
    const pts = (ids: number[]) => upTo.map((_, k) => [k, share(ids, k)] as const).filter((_, k) => k % 3 === 0 || k === night);
    const dots: SVGElement[] = [];
    bats.forEach((b, i) => {
      const [x, y] = at(i);
      const r = b.young ? 6 : 9;
      if (!now.alive[i]) {
        dots.push(line(x - 5, y - 5, x + 5, y + 5, COL.soft, 1.5), line(x - 5, y + 5, x + 5, y - 5, COL.soft, 1.5));
        return;
      }
      dots.push(svg('circle', { cx: x, cy: y, r, fill: b.cheat ? COL.paper : COL.bat, stroke: now.hungry[i] ? COL.cost : COL.bat, 'stroke-width': now.hungry[i] ? 2.5 : 1.5 }));
    });
    const gifts = now.gifts.map(([a, b]) => {
      const [x1, y1] = at(a);
      const [x2, y2] = at(b);
      const d = Math.hypot(x2 - x1, y2 - y1) || 1;
      return arrow(x1 + ((x2 - x1) / d) * 9, y1 + ((y2 - y1) / d) * 9, x2 - ((x2 - x1) / d) * 10, y2 - ((y2 - y1) / d) * 10, COL.blood, 1.6);
    });
    redraw(g,
      small(10, 16, `Night ${night}`, { bold: true }),
      small(10, 214, 'a row is a family; small = young', { soft: true }),
      ...dots,
      ...gifts,
      ...ax.parts,
      ax.path(pts(honest), COL.bat, 2.2),
      cheats ? ax.path(pts(cheatIds), COL.bat, 2, { 'stroke-dasharray': '4 3' }) : null,
      ...legend(10, 240, [
        { text: 'honest', color: COL.bat },
        ...(cheats ? [{ text: 'cheats (hollow)', color: COL.bat, dash: true }] : []),
        { text: 'unfed tonight', color: COL.cost, dot: true },
        { text: 'gift of blood', color: COL.blood },
      ]),
    );
    if (!open()) return;
    const m = mean();
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const head = `${RULE_NAMES[RULES.indexOf(rule)]}, night ${night}: ${now.alive.filter(Boolean).length} of 30 alive, ${now.gifts.length} gift${now.gifts.length === 1 ? '' : 's'} tonight.`;
    const end = night === 0
      ? ' Press Play to run the year.'
      : night < 365
      ? ' Play on to the end of the year.'
      : ` Averaged over 40 roosts a year: ${pct(m.honest)} of honest adults survive${cheats ? `, ${pct(m.cheats)} of cheats` : ''}, ${pct(m.young)} of young.${rule === 'never' ? ' Two missed nights in a row kill a bat.' : rule === 'everyone' && cheats ? ' The cheats take and never pay, and do as well as anyone.' : rule === 'payback' && cheats ? ' Once the old debts run out, no bat gives to a cheat, and a cheat starves as if nobody shared.' : rule === 'kin' ? ' Families keep their own alive, cheats included.' : ''}`;
    f.readout.textContent = head + end;
    if (night >= 365 && rule === 'payback' && cheats && m.cheats < m.honest) t.done();
  };
  const rules = named(pick(RULE_NAMES, 0, (i) => { rule = RULES[i]; paint(); }), 'Rule:');
  const cheatChip = toggles(['Add six cheats'], [false], (on) => { cheats = on[0]; paint(); });
  const ns = slider('Night', 0, 365, 1, night, (v) => `${v}`, (v) => { night = v; paint(); }, 'bat');
  const play = player(ns, ctx, { seconds: 14 });
  f.controls.append(rules.node, cheatChip.node, play.node, ns.node);
  const open = guessFirst(t, f, {
    ask: 'On any night about one adult vampire in fourteen fails to find blood, and two hungry nights in a row kill it. If no bat ever shared, how many adults would still be alive after a year?',
    options: ['Nearly all', 'About half', 'Fewer than one in five'],
    answer: 2,
    sliders: [ns],
    buttons: [...rules.buttons, ...cheatChip.buttons],
    hidden: [rules.node, cheatChip.node, play.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});

// ---- Seeds dropped in flight ----------------------------------------------------------------------

/** The patch: 300 m of cleared pasture beyond the forest edge. */
export const PATCH = 300;

/**
 * Pioneer plants a year taking root at `d` metres from the forest edge, in
 * a cell of the patch (an illustrative model). Birds drop seeds mostly near
 * the edge or under a perch, because they fly from tree to tree and rarely
 * cross open ground; fruit bats drop seeds in flight, thinly but far out.
 */
export function seedRate(d: number, o: { bats: boolean; birds: boolean; tree: boolean }): { bats: number; birds: number } {
  const bats = o.bats ? 0.12 * Math.exp(-d / 250) : 0;
  let birds = o.birds ? 0.5 * Math.exp(-d / 30) : 0;
  if (o.birds && o.tree) birds += 0.4 * Math.exp(-Math.abs(d - 210) / 18);
  return { bats, birds };
}

/** The share of ground covered by pioneers at `d` metres after `years`. */
export const cover = (d: number, years: number, o: Parameters<typeof seedRate>[1]): number => {
  const r = seedRate(d, o);
  return 1 - Math.exp(-(r.bats + r.birds) * years);
};

export const seedFigure = figure(['far'], (ctx, t) => {
  const f = frame(W, 214, 4);
  const g = svg('g');
  f.svg.append(g);
  let years = 0;
  let on = { bats: true, birds: true, tree: false };
  let sawWith = false;
  let sawWithout = false;
  const cols = 20;
  const rows = 8;
  const cell = 15;
  const x0 = 70;
  const y0 = 30;
  // Each cell's own threshold, so a cell, once green, stays green as years pass.
  const rng = makeRng(42);
  const u = Array.from({ length: cols * rows }, () => rng());
  const paint = () => {
    const cells: SVGElement[] = [];
    for (let c = 0; c < cols; c++) {
      const d = (c + 0.5) * cell;
      const p = cover(d, years, on);
      for (let r = 0; r < rows; r++) {
        const green = u[c * rows + r] < p;
        cells.push(svg('rect', { x: x0 + c * cell, y: y0 + r * cell, width: cell - 1, height: cell - 1, fill: green ? COL.plant : tint(COL.rock, 0.25) }));
      }
    }
    const trees: SVGElement[] = [];
    for (let k = 0; k < 6; k++) trees.push(svg('circle', { cx: 18 + (k % 2) * 22, cy: y0 + 10 + k * 20, r: 12, fill: COL.plant }));
    const tx = x0 + (210 / cell) * cell;
    if (on.tree) trees.push(line(tx, y0 + 66, tx, y0 + 80, COL.rock, 3), svg('circle', { cx: tx, cy: y0 + 58, r: 9, fill: COL.plant, stroke: COL.ink, 'stroke-width': 0.8 }));
    const near = cover(30, years, on);
    const mid = cover(150, years, on);
    const far = cover(285, years, on);
    const r = seedRate(250, on);
    redraw(g,
      ...trees,
      small(28, y0 + rows * cell + 16, 'forest', { anchor: 'middle', fill: COL.plant }),
      ...cells,
      ...[0, 100, 200, 300].map((m) => small(x0 + (m / cell) * cell, y0 + rows * cell + 16, `${m} m`, { anchor: 'middle', soft: true })),
      small(x0, 18, `Year ${years}`, { bold: true }),
      small(x0 + cols * cell, 18, 'cleared pasture, seen from above', { anchor: 'end', soft: true }),
      ...legend(x0, 186, [{ text: 'pioneer plants', color: COL.plant, dot: true }, { text: 'bare pasture', color: tint(COL.rock, 0.6), dot: true }]),
      note(x0, 204, `Seeds landing 250 m out: ${r.bats + r.birds > 0 ? Math.round((r.bats / (r.bats + r.birds)) * 100) : 0}% from bats`, { soft: true }),
    );
    f.readout.textContent = years === 0
      ? `A strip of forest cleared for pasture and then left alone. Press Play to watch twenty years${on.bats ? ' with the bats' : ' without the bats'}.`
      : `Year ${years}: ${Math.round(near * 100)}% of the ground covered 30 m from the edge, ${Math.round(mid * 100)}% at 150 m, ${Math.round(far * 100)}% at the far side.${!on.bats && years >= 15 ? ' Without bats the far side stays almost bare: birds seldom cross open ground.' : on.bats && years >= 15 ? ` The far side fills from seeds bats dropped in flight.${sawWithout ? '' : ' Now tap Fruit bats off and play again.'}` : ''}`;
    if (years >= 15 && on.bats) sawWith = true;
    if (years >= 15 && !on.bats) sawWithout = true;
    if (sawWith && sawWithout) t.done();
  };
  const ys = slider('Years since clearing', 0, 20, 1, years, (v) => `${v}`, (v) => { years = v; paint(); }, 'plant');
  const play = player(ys, ctx, { seconds: 8 });
  const who = toggles(['Fruit bats', 'Birds', 'A lone tree left'], [true, true, false], (s) => { on = { bats: s[0], birds: s[1], tree: s[2] }; paint(); });
  f.controls.append(who.node, play.node, ys.node);
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'vampire-hours': hoursStill,
  'vampire-share': shareFigure,
  'seed-rain': seedFigure,
};
