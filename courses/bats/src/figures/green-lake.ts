// Lesson N1, Dusk at Green Lake: who flies when and where over a Seattle
// lake after sunset, by the month (live, a time lapse), what the bats over
// the water eat (guess first), and how many insects a colony eats in a
// night (an estimate, live).

import { svg } from 'didactics/dom';
import { label, redraw, small } from 'didactics/draw';
import { COL, animate, figure, frame, guessFirst, named, pick, player, slider, tint, big, count, type FigureFactory } from './kit';

const W = 400;

// ---- Who flies when -------------------------------------------------------------------------------

export const MONTHS = ['May', 'Late July', 'September', 'January'] as const;

/** Where over the lake a bat hunts. */
export type Where = 'trees' | 'water' | 'sky';

export interface Flyer {
  name: string;
  /** Where its calls end, kHz. */
  call: string;
  where: Where;
  /** Minutes after sunset it first shows over the lake. */
  from: number;
  /** How many to draw in each of MONTHS. */
  n: readonly number[];
}

/** Rounded from bat walks and surveys around Seattle lakes; numbers drawn are a sketch, not a count. */
export const FLYERS: readonly Flyer[] = [
  { name: 'Big brown', call: '25 to 28 kHz', where: 'trees', from: 15, n: [2, 3, 2, 1] },
  { name: 'Silver-haired', call: '25 to 28 kHz', where: 'trees', from: 20, n: [1, 2, 2, 1] },
  { name: 'Yuma myotis', call: 'about 50 kHz', where: 'water', from: 30, n: [3, 8, 5, 0] },
  { name: 'Little brown', call: 'about 40 kHz', where: 'water', from: 32, n: [2, 5, 3, 0] },
  { name: 'Hoary', call: 'about 20 kHz', where: 'sky', from: 45, n: [0, 1, 1, 0] },
];

/** The bats over the lake in `month` (index into MONTHS) at `minute` after sunset. */
export const flying = (month: number, minute: number) =>
  FLYERS.filter((b) => b.n[month] > 0 && minute >= b.from).map((b) => ({ ...b, count: b.n[month] }));

/** How light the sky is, 1 at sunset to 0 at full dark, about 80 minutes later in a Seattle summer. */
export const skyLight = (minute: number): number => Math.max(0, Math.min(1, 1 - minute / 80));

/** Insects over the water, 0 to 1: midges and caddisflies rise from the lake around dusk. */
export const hatch = (month: number, minute: number): number => (month === 3 ? 0 : Math.max(0, Math.min(1, (minute + 10) / 40))) * [0.6, 1, 0.6, 0][month];

/** Where each kind flies in the drawing: high sky, along the far tree tops, low over the near water. */
const HEIGHT: Record<Where, [number, number]> = { sky: [28, 40], trees: [58, 84], water: [150, 182] };
const SHORE = 120;

/** A bat in flight, wings up or down, `s` times normal size. */
function batGlyph(x: number, y: number, flap: number, s: number, color: string): SVGElement {
  const up = 4 * flap * s;
  return svg('path', {
    d: `M${x - 8 * s},${y - up} Q${x - 4 * s},${y - 2 * s} ${x},${y} Q${x + 4 * s},${y - 2 * s} ${x + 8 * s},${y - up} Q${x + 4 * s},${y + 1 * s} ${x},${y + 2 * s} Q${x - 4 * s},${y + 1 * s} ${x - 8 * s},${y - up} Z`,
    fill: color,
  });
}

export const duskFigure = figure(['hoary'], (ctx, t) => {
  const f = frame(W, 232, 3);
  const back = svg('g');
  const front = svg('g');
  f.svg.append(back, front);
  let month = 1;
  let minute = -5;
  let clock = 0;

  const paintBack = () => {
    const light = skyLight(minute);
    const trees: SVGElement[] = [];
    for (let i = 0; i < 18; i++) {
      const x = i * 23 + (i % 3) * 5;
      const h = 26 + ((i * 37) % 19);
      trees.push(svg('path', { d: `M${x - 12},${SHORE} Q${x - 7},${SHORE - h * 0.6} ${x},${SHORE - h} Q${x + 7},${SHORE - h * 0.6} ${x + 12},${SHORE} Z`, fill: COL.plant, opacity: 0.6 + 0.4 * (1 - light) }));
    }
    const soft = light > 0.5 ? COL.soft : COL.paper;
    redraw(back,
      svg('rect', { x: 0, y: 0, width: W, height: SHORE, fill: COL.paper }),
      svg('rect', { x: 0, y: SHORE - 50, width: W, height: 50, fill: COL.fat, opacity: 0.35 * light }),
      svg('rect', { x: 0, y: 0, width: W, height: SHORE, fill: COL.ink, opacity: 0.85 * (1 - light) }),
      ...trees,
      svg('rect', { x: 0, y: SHORE, width: W, height: 232 - SHORE, fill: COL.water, opacity: 0.55 + 0.35 * (1 - light) }),
      label(6, 16, minute < 0 ? `${-minute} min before sunset` : `${minute} min after sunset`, { bold: true, fill: light > 0.5 ? COL.ink : COL.paper }),
      small(6, 30, MONTHS[month], { fill: soft }),
      small(W - 6, 136, 'a metre over the water', { anchor: 'end', fill: COL.paper }),
    );
  };

  const paintFront = () => {
    const light = skyLight(minute);
    const ink = light > 0.45 ? COL.bat : COL.paper;
    const parts: SVGElement[] = [];
    const bugs = Math.round(40 * hatch(month, minute));
    for (let i = 0; i < bugs; i++) {
      const x = (i * 97 + 13) % W + 3 * Math.sin(clock * 3 + i);
      const y = 142 + ((i * 53) % 44) + 2 * Math.cos(clock * 4 + i * 2);
      parts.push(svg('circle', { cx: x, cy: y, r: 1.1, fill: COL.moth }));
    }
    for (const b of flying(month, minute)) {
      const [y0, y1] = HEIGHT[b.where];
      const speed = b.where === 'sky' ? 0.5 : b.where === 'trees' ? 0.3 : 0.45;
      const size = b.where === 'sky' ? 1.3 : b.where === 'trees' ? 1.05 : 0.75;
      for (let k = 0; k < b.count; k++) {
        const seed = b.name.length * 31 + k * 71;
        const x = W / 2 + (W / 2 - 24) * Math.sin(clock * speed + seed);
        const y = y0 + ((seed * 7) % Math.max(1, y1 - y0)) + 3 * Math.sin(clock * 1.7 + seed);
        parts.push(batGlyph(x, y, Math.sin(clock * 14 + seed), size, ink));
      }
      const lx = b.where === 'sky' ? W - 6 : b.name === 'Big brown' || b.name === 'Yuma myotis' ? 8 : 200;
      const ly = b.where === 'sky' ? 16 : b.where === 'trees' ? 52 : 224;
      const over = b.where === 'water' ? COL.paper : ink;
      parts.push(small(lx, ly, `${b.name}, ${b.call}`, { anchor: b.where === 'sky' ? 'end' : undefined, fill: over }));
    }
    redraw(front, ...parts);
  };

  const say = () => {
    const out = flying(month, minute);
    const has = (n: string) => out.some((b) => b.name === n);
    const m = MONTHS[month];
    let text: string;
    if (month === 3) text = minute < 15 ? 'January. The Myotis are asleep in torpor, and most nights nothing flies.' : 'On a mild January night a big brown or a silver-haired bat may wake and hunt briefly along the trees. No Myotis: they are deep in torpor.';
    else if (minute < 15) text = `${m}, ${minute < 0 ? 'before sunset' : 'just after sunset'}. Swifts and swallows have the insects. Midges begin to rise from the water.${minute <= -5 ? ' Press Play to run the evening.' : ''}`;
    else if (!has('Yuma myotis')) text = `${m}, ${minute} minutes after sunset. The first bats: big browns and silver-haired bats along the tops of the trees, 10 to 20 m up, calls near 25 to 28 kHz.`;
    else if (!has('Hoary')) text = `${m}, ${minute} minutes. Myotis drop to the water: Yuma and little brown bats skim a metre over the lake, calls ending near 50 and 40 kHz.${month === 1 ? ' This is the busiest month: the pups born in June are flying now.' : ''}${minute >= 60 ? ' No hoary bat tonight: try another month.' : ''}`;
    else text = `${minute} minutes, ${m}: the hoary bat, Washington's largest, fast and high, calling near 20 kHz. Some people can just hear its lowest calls.`;
    f.readout.textContent = text;
    if (has('Hoary')) t.done();
  };

  const months = named(pick(MONTHS, month, (i) => { month = i; paintBack(); paintFront(); say(); }), 'Month:');
  const time = slider('Minutes after sunset', -10, 70, 1, minute, (v) => `${v}`, (v) => { minute = v; paintBack(); paintFront(); say(); }, 'ink');
  const play = player(time, ctx, { seconds: 16 });
  f.controls.append(months.node, play.node, time.node);
  paintBack();
  paintFront();
  say();
  animate(f.node, ctx, (dt) => { clock += dt; paintFront(); });
  return f.node;
});

// ---- What they eat ------------------------------------------------------------------------------

export const PREY = ['Midges', 'Caddisflies', 'Mayflies', 'Moths', 'Beetles', 'Mosquitoes'] as const;

/**
 * How much of each prey turns up in droppings, 0 (rarely) to 3 (most of the
 * diet), rounded from diet studies of these bats over lakes and rivers in
 * British Columbia and Washington. Real shares change by the night and the lake.
 */
export const DIET: Record<string, readonly number[]> = {
  'Yuma myotis': [3, 2, 2, 1, 0, 1],
  'Little brown': [3, 2, 1, 2, 1, 1],
  'Big brown': [0, 1, 0, 2, 3, 0],
};

const LEVEL = ['rarely', 'a little', 'often', 'most'];

export const dietFigure = figure(['diet'], (_ctx, t) => {
  const f = frame(W, 186, 3);
  const g = svg('g');
  f.svg.append(g);
  let bat = 0;
  const seen = new Set<number>();
  const names = Object.keys(DIET);
  const paint = () => {
    const rows = PREY.map((p, i) => {
      const y = 22 + i * 26;
      const v = open() ? DIET[names[bat]][i] : -1;
      return [
        label(98, y + 12, p, { anchor: 'end' }),
        svg('rect', { x: 106, y, width: 240, height: 16, fill: tint(COL.ink, 0.05) }),
        ...(v >= 0
          ? [svg('rect', { x: 106, y, width: Math.max(4, (v / 3) * 240), height: 16, fill: COL.moth, opacity: 0.4 + 0.2 * v }), small(352, y + 12, LEVEL[v], { soft: true })]
          : [small(226, y + 12, '?', { anchor: 'middle', soft: true })]),
      ];
    }).flat();
    redraw(g, small(4, 12, open() ? `${names[bat]}: what turns up in its droppings` : 'What the bats over the water eat', { bold: true }), ...rows);
  };
  const bats = named(pick(names, 0, (i) => {
    bat = i;
    seen.add(i);
    paint();
    if (!open()) return;
    f.readout.textContent = i === 2
      ? 'The big brown hunts higher and has heavier jaws: beetles and moths, hard-bodied insects a Myotis would struggle to chew. It eats few midges.'
      : i === 0
        ? 'The Yuma myotis takes midges and caddisflies as they rise off the water, with mayflies when they hatch. Mosquitoes turn up, but as a small share.'
        : 'Little browns take the same aquatic insects, with more moths. A nursing female can eat close to her own weight in a night.';
    if (seen.has(2)) t.done();
  }), 'Bat:');
  for (const b of bats.buttons) b.disabled = true;
  f.controls.append(bats.node);
  const open = guessFirst(t, f, {
    ask: 'The small bats skimming a metre over the lake at dusk: what makes up most of their diet?',
    options: ['Mosquitoes', 'Midges and caddisflies', 'Moths', 'Beetles'],
    answer: 1,
    sliders: [],
    buttons: bats.buttons,
    hidden: [bats.node],
    after: () => { seen.add(0); paint(); f.readout.textContent = 'Mostly midges, small non-biting flies that rise from the lake bottom in huge numbers, and caddisflies. Now tap Big brown, a bat that hunts above the trees.'; },
  });
  paint();
  return f.node;
});

// ---- A colony's night (an estimate) ---------------------------------------------------------------

/** Rough fresh masses of single insects, milligrams. */
export const INSECT_MG: Record<string, number> = { Midge: 2, Mosquito: 2.5, Caddisfly: 10, Moth: 40 };

/** Insects eaten in a night by `bats` bats of `grams` each, each eating `share` (0 to 1) of its weight in insects of `mg` milligrams. */
export const insectsPerNight = (bats: number, grams: number, share: number, mg: number): number => (bats * grams * share * 1000) / mg;

export const colonyFigure = figure(['million'], (_ctx, t) => {
  const f = frame(W, 200, 3);
  const g = svg('g');
  f.svg.append(g);
  let bats = 100;
  let share = 0.5;
  let prey = 'Midge';
  const grams = 8;
  const paint = () => {
    const n = insectsPerNight(bats, grams, share, INSECT_MG[prey]);
    const perBat = n / bats;
    const filled = Math.min(100, Math.floor(n / 10000));
    const cells: SVGElement[] = [];
    for (let i = 0; i < 100; i++) {
      const x = 200 + (i % 10) * 18;
      const y = 24 + Math.floor(i / 10) * 14;
      cells.push(svg('rect', { x, y, width: 15, height: 11, rx: 2, fill: i < filled ? COL.moth : tint(COL.ink, 0.06) }));
    }
    const barMax = 120;
    redraw(g,
      small(8, 14, 'One little brown bat', { bold: true }),
      svg('rect', { x: 20, y: 160 - barMax * 0.8, width: 40, height: barMax * 0.8, fill: COL.bat }),
      small(40, 176, `${grams} g bat`, { anchor: 'middle' }),
      svg('rect', { x: 80, y: 160 - barMax * 0.8 * share, width: 40, height: barMax * 0.8 * share, fill: COL.fat }),
      small(100, 176, `${(grams * share).toFixed(1)} g food`, { anchor: 'middle' }),
      small(8, 192, `about ${big(perBat)} ${prey.toLowerCase()}s a night`, { soft: true }),
      small(200, 14, 'The colony: each square is 10,000 insects', { bold: true }),
      ...cells,
      label(200, 176, `${count(n)} a night`, { bold: true, fill: n >= 1e6 ? COL.good : COL.ink }),
      small(200, 192, `${count(n * 150)} over 150 summer nights`, { soft: true }),
    );
    f.readout.textContent = n >= 1e6
      ? `${big(bats)} bats eating ${Math.round(share * 100)}% of their weight in ${prey.toLowerCase()}s: ${count(n)} insects, ${sig1(bats * grams * share / 1000)} kg, in one night.`
      : `${big(bats)} bats, each eating ${(grams * share).toFixed(1)} g of ${prey.toLowerCase()}s: ${count(n)} insects in a night. ${prey === 'Moth' ? 'A moth weighs as much as twenty midges, so the count falls.' : 'Raise the colony or what each eats to fill all 100 squares.'}`;
    if (n >= 1e6) t.done();
  };
  const sig1 = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
  const colony = slider('Colony', { steps: [20, 50, 100, 200, 300, 500, 1000], value: bats, show: (v) => `${v} bats`, onInput: (v) => { bats = v; paint(); }, color: 'bat' });
  const eat = slider('Eaten each night', 20, 100, 5, share * 100, (v) => `${v}% of her weight`, (v) => { share = v / 100; paint(); }, 'fat');
  const kind = named(pick(Object.keys(INSECT_MG), 0, (i) => { prey = Object.keys(INSECT_MG)[i]; paint(); }), 'Insect:');
  f.controls.append(kind.node, colony.node, eat.node);
  paint();
  return f.node;
});

export const FIGS: Record<string, FigureFactory> = {
  'gl-dusk': duskFigure,
  'gl-diet': dietFigure,
  'gl-colony': colonyFigure,
};

