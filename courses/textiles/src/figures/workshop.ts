// The bottleneck workshop (lessons 14 to 16): a cotton district with a fixed
// number of workers at each of three stages (preparing fibre, spinning,
// weaving). Each stage needs some hours of work per yard of cloth; the
// district makes as much cloth a week as its slowest stage allows, and
// workers at the other stages stand idle for part of the week. The reader
// adds inventions in any order, each cutting the hours one stage needs, and
// can then move workers between stages so that no stage waits, which is what
// happened over years as people changed trades.
//
// The numbers are round and illustrative: 60-hour weeks, and hand work in
// the ratio of lesson 3 (about five spinners to each weaver). Each machine's
// speed-up is a rough figure for its early decades.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame, guessFirst } from './kit';

export type StageId = 'prep' | 'spin' | 'weave';
export const STAGES: readonly { id: StageId; name: string; hours: number; workers: number }[] = [
  { id: 'prep', name: 'Preparing', hours: 1.5, workers: 20 },
  { id: 'spin', name: 'Spinning', hours: 10, workers: 100 },
  { id: 'weave', name: 'Weaving', hours: 2, workers: 20 },
];
export const WEEK = 60;

export interface Invention { id: string; name: string; year: string; stage: StageId; speed: number }
export const INVENTIONS: readonly Invention[] = [
  { id: 'shuttle', name: 'Flying shuttle', year: '1733', stage: 'weave', speed: 2 },
  { id: 'jenny', name: 'Spinning jenny', year: 'about 1765', stage: 'spin', speed: 6 },
  { id: 'frame', name: 'Water frame', year: '1769', stage: 'spin', speed: 20 },
  { id: 'mule', name: 'Mule', year: '1779', stage: 'spin', speed: 30 },
  { id: 'carding', name: 'Carding engine', year: '1775', stage: 'prep', speed: 10 },
  { id: 'loom', name: 'Power loom', year: '1785', stage: 'weave', speed: 8 },
];

export interface Shop { hours: Record<StageId, number>; workers: Record<StageId, number> }

/** Hours per yard at each stage with these inventions in use (the best machine at a stage sets its speed). */
export function hoursWith(ids: ReadonlySet<string>): Record<StageId, number> {
  const h = Object.fromEntries(STAGES.map((s) => [s.id, s.hours])) as Record<StageId, number>;
  for (const s of STAGES) {
    const best = Math.max(1, ...INVENTIONS.filter((i) => i.stage === s.id && ids.has(i.id)).map((i) => i.speed));
    h[s.id] = s.hours / best;
  }
  return h;
}

export const startWorkers = (): Record<StageId, number> => Object.fromEntries(STAGES.map((s) => [s.id, s.workers])) as Record<StageId, number>;

/** Yards a week each stage could handle. */
export const capacity = (shop: Shop, s: StageId) => (shop.workers[s] * WEEK) / shop.hours[s];

/** Yards a week the district makes: its slowest stage. */
export const output = (shop: Shop) => Math.min(...STAGES.map((s) => capacity(shop, s.id)));

/** The share of each stage's working week spent waiting. */
export const idle = (shop: Shop, s: StageId) => 1 - output(shop) / capacity(shop, s);

/** Move the same number of workers between stages so every stage keeps pace (whole people, at least one each). */
export function rebalance(shop: Shop): Record<StageId, number> {
  const total = STAGES.reduce((a, s) => a + shop.workers[s.id], 0);
  const sum = STAGES.reduce((a, s) => a + shop.hours[s.id], 0);
  const w = Object.fromEntries(STAGES.map((s) => [s.id, Math.max(1, Math.round((total * shop.hours[s.id]) / sum))])) as Record<StageId, number>;
  return w;
}

const W = 540;
const H = 250;
const BOX = 150;
const GAP = 30;
const X = (i: number) => 15 + i * (BOX + GAP);

export const workshopFigure = figure(['tenfold', 'loom'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  // Lesson 15 starts in the 1800s: spinning and carding in mills, weaving still by hand, workers already moved.
  const loomGoal = t.goal === 'loom';
  const START = loomGoal ? ['mule', 'carding'] : [];
  const used = new Set<string>(START);
  const base = output({ hours: hoursWith(new Set()), workers: startWorkers() });
  const startShop = () => (loomGoal ? rebalance({ hours: hoursWith(new Set(START)), workers: startWorkers() }) : startWorkers());
  let workers = startShop();
  let guessed = false;

  const paint = () => {
    const shop: Shop = { hours: hoursWith(used), workers };
    const out = output(shop);
    const parts: SVGElement[] = [];
    STAGES.forEach((s, i) => {
      const x = X(i);
      const cap = capacity(shop, s.id);
      const busy = 1 - idle(shop, s.id);
      const neck = busy > 0.999;
      parts.push(
        svg('rect', { x, y: 20, width: BOX, height: 150, rx: 6, fill: COL.paper, stroke: neck ? COL.bad : COL.grid, 'stroke-width': neck ? 2.5 : 1 }),
        label(x + BOX / 2, 40, s.name, { bold: true, anchor: 'middle' }),
        label(x + BOX / 2, 58, `${workers[s.id]} workers`, { size: 'note', anchor: 'middle' }),
        label(x + BOX / 2, 74, `${shop.hours[s.id] < 1 ? shop.hours[s.id].toFixed(2) : shop.hours[s.id].toFixed(1)} h a yard`, { size: 'small', anchor: 'middle', soft: true }),
        // Busy and idle share of the week.
        svg('rect', { x: x + 15, y: 90, width: BOX - 30, height: 18, rx: 3, fill: COL.grid }),
        svg('rect', { x: x + 15, y: 90, width: (BOX - 30) * busy, height: 18, rx: 3, fill: neck ? COL.bad : COL.good }),
        label(x + BOX / 2, 124, neck ? 'busy all week: the bottleneck' : `idle ${Math.round((1 - busy) * 100)}% of the week`, { size: 'small', anchor: 'middle', fill: neck ? COL.bad : undefined }),
        label(x + BOX / 2, 150, `could do ${Math.round(cap).toLocaleString('en-GB')} yd`, { size: 'small', anchor: 'middle', soft: true }),
      );
      if (i < STAGES.length - 1) parts.push(svg('path', { d: `M${x + BOX + 4} 95 l${GAP - 10} 0 m-6 -5 l6 5 l-6 5`, fill: 'none', stroke: COL.soft, 'stroke-width': 2 }));
    });
    const total = STAGES.reduce((a, s) => a + workers[s.id], 0);
    const perYard = (total * WEEK) / out;
    parts.push(
      label(W / 2, 200, `Cloth: ${Math.round(out).toLocaleString('en-GB')} yards a week`, { bold: true, anchor: 'middle' }),
      label(W / 2, 220, `${(out / base).toFixed(1)} times the start, from ${total} workers: ${perYard < 1 ? perYard.toFixed(2) : perYard.toFixed(1)} working hours a yard`, { size: 'note', anchor: 'middle', soft: true }),
    );
    redraw(g, ...parts);
    for (const [id, b] of buttons) b.classList.toggle('on', used.has(id));
    if (!guessed) return;
    const neck = STAGES.find((s) => idle(shop, s.id) < 0.001)!;
    const idleOnes = STAGES.filter((s) => idle(shop, s.id) > 0.05);
    f.readout.textContent = used.size === 0
      ? 'Hand work: about five spinners for every weaver, and only the fibre preparers wait for part of the week. Add an invention to see where the work piles up.'
      : `${neck.name} is the bottleneck. ${idleOnes.length ? `${idleOnes.map((s) => s.name.toLowerCase()).join(' and ')} ${idleOnes.length > 1 ? 'stand' : 'stands'} idle part of the week, waiting.` : 'No stage is waiting.'} Moving workers to the bottleneck would raise output, but in reality it took years for people to change trades.`;
    if (loomGoal ? used.has('loom') && idle(shop, 'weave') > 0.5 : out >= base * 10) t.done();
  };

  const buttons = new Map<string, HTMLButtonElement>();
  const row = el('div.chips');
  for (const inv of INVENTIONS) {
    const b = el('button.chip', { type: 'button', onclick: () => { if (used.has(inv.id)) used.delete(inv.id); else used.add(inv.id); paint(); } }, `${inv.name}`) as HTMLButtonElement;
    b.title = `${inv.name}, ${inv.year}`;
    buttons.set(inv.id, b);
    row.append(b);
  }
  const shift = el('button.chip', { type: 'button', onclick: () => { workers = rebalance({ hours: hoursWith(used), workers }); paint(); } }, 'Move workers to keep pace') as HTMLButtonElement;
  const reset = el('button.chip', { type: 'button', onclick: () => { used.clear(); for (const id of START) used.add(id); workers = startShop(); paint(); } }, 'Start again') as HTMLButtonElement;
  const row2 = el('div.chips', {}, shift, reset);
  f.controls.append(row, row2);
  guessFirst(t, f, loomGoal ? {
    ask: 'Around 1810, spinning and carding are done in mills and weaving by hand, and many more people now weave. A power loom weaves about eight times as fast as a hand weaver. What happens to the handloom weavers?',
    options: ['They get more work, since cloth gets cheaper', 'They have far more weaving capacity than yarn, so work and piece rates fall', 'Nothing changes for them'],
    answer: 1,
    sliders: [],
    hidden: [row, row2],
    after: () => { guessed = true; used.add('loom'); paint(); },
  } : {
    ask: "In 1733 John Kay's flying shuttle lets a weaver weave about twice as fast. Spinning is still done by hand. What happens first?",
    options: ['Cloth output doubles', 'Weavers wait for yarn, and cloth output barely changes', 'Spinners lose their work'],
    answer: 1,
    sliders: [],
    hidden: [row, row2],
    after: () => { guessed = true; used.add('shuttle'); paint(); },
  });
  paint();
  return f.node;
});
