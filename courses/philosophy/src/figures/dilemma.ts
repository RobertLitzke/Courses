// Lesson 11, the prisoner's dilemma as a population over time, in the manner
// of Axelrod's tournaments. A hundred players are always cooperators, always
// defectors or tit for tat players (cooperate first, then copy the partner's
// last move). Every pair meets a set number of times per generation; each
// strategy then grows in proportion to its average score (the replicator
// rule). Payoffs per meeting: both cooperate 3 each, both defect 1 each, a
// defector against a cooperator 5 and 0.
//
// The reader first guesses who takes over when pairs meet only once, then
// finds how often they must meet for tit for tat to win. Goal 'cooperate':
// tit for tat ends with most of the population.

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider } from './kit';

export type Strategy = 'coop' | 'defect' | 'tft';
export const STRATEGIES: readonly Strategy[] = ['coop', 'defect', 'tft'];
export const NAMES: Record<Strategy, string> = { coop: 'always cooperate', defect: 'always defect', tft: 'tit for tat' };

/** Points to the first player for (their move, the partner's move); 1 is cooperate. */
const PAY = { cc: 3, cd: 0, dc: 5, dd: 1 } as const;
export const GENERATIONS = 40;
/** Defectors at the start, out of 100; the reader's slider sets tit for tat, and cooperators fill the rest. */
export const DEFECTORS = 40;

/** Average points per meeting for `a` playing `b` over `n` meetings. */
export function matchScore(a: Strategy, b: Strategy, n: number): number {
  let pa = 1;
  let pb = 1;
  let total = 0;
  for (let t = 0; t < n; t++) {
    const ma = a === 'coop' ? 1 : a === 'defect' ? 0 : t === 0 ? 1 : pb;
    const mb = b === 'coop' ? 1 : b === 'defect' ? 0 : t === 0 ? 1 : pa;
    total += ma && mb ? PAY.cc : ma ? PAY.cd : mb ? PAY.dc : PAY.dd;
    pa = ma;
    pb = mb;
  }
  return total / n;
}

/** Shares of each strategy, generation by generation, from a starting mix (shares summing to 1). */
export function evolve(start: Record<Strategy, number>, meetings: number, generations = GENERATIONS): Record<Strategy, number>[] {
  const m = (a: Strategy, b: Strategy) => matchScore(a, b, meetings);
  let sh = { ...start };
  const out = [sh];
  for (let g = 0; g < generations; g++) {
    const score = (a: Strategy) => STRATEGIES.reduce((s, b) => s + sh[b] * m(a, b), 0);
    const total = STRATEGIES.reduce((s, a) => s + sh[a] * score(a), 0);
    const next = { ...sh };
    for (const a of STRATEGIES) next[a] = total > 0 ? (sh[a] * score(a)) / total : sh[a];
    sh = next;
    out.push(sh);
  }
  return out;
}

export const mixOf = (tft: number): Record<Strategy, number> => ({ tft: tft / 100, defect: DEFECTORS / 100, coop: (100 - DEFECTORS - tft) / 100 });

const W = 400;
const H = 210;
const X0 = 36;
const X1 = 262;
const Y0 = 180;
const Y1 = 16;

export const dilemmaFigure = figure(['cooperate'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const grid = svg('g');
  const lines = svg('g');
  f.svg.append(grid, lines);
  const x = (g: number) => X0 + ((X1 - X0) * g) / GENERATIONS;
  const y = (s: number) => Y0 - (Y0 - Y1) * s;
  for (const s of [0, 0.5, 1]) grid.append(line(X0, y(s), X1, y(s), COL.grid, 1), label(X0 - 4, y(s) + 4, `${s * 100}%`, { size: 'small', anchor: 'end', soft: true }));
  grid.append(label((X0 + X1) / 2, H - 6, 'generations', { size: 'small', anchor: 'middle', soft: true }));

  let meetings = 1;
  let tft = 30;
  const paint = () => {
    const run = evolve(mixOf(tft), meetings);
    const last = run[run.length - 1];
    const ends = STRATEGIES.map((s) => ({ s, y: y(last[s]) })).sort((a, b) => a.y - b.y);
    // Keep the end labels apart.
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 12) ends[i].y = ends[i - 1].y + 12;
    redraw(lines,
      ...STRATEGIES.map((s) => polyline(run.map((r, g) => [x(g), y(r[s])] as [number, number]), COL[s], 2.5)),
      ...ends.map((e) => label(X1 + 6, e.y + 4, `${NAMES[e.s]} ${Math.round(last[e.s] * 100)}%`, { size: 'small', fill: COL[e.s], bold: true })),
    );
    f.readout.textContent = `With 40 defectors, ${tft} tit for tat players and ${60 - tft} cooperators, and each pair meeting ${meetings === 1 ? 'once' : `${meetings} times`}: after ${GENERATIONS} generations tit for tat is ${Math.round(last.tft * 100)}% of the population and always defect ${Math.round(last.defect * 100)}%.`;
    if (last.tft > 0.5) t.done();
  };
  const meet = slider('Meetings per pair', { steps: [1, 2, 3, 4, 5, 6, 8, 10, 20, 50], value: meetings, show: (v) => `${v}`, onInput: (v) => { meetings = v; paint(); }, color: 'ink' });
  const start = slider('Tit for tat at the start', { min: 0, max: 60, step: 5, value: tft, show: (v) => `${v} of 100`, onInput: (v) => { tft = v; paint(); }, color: 'tft' });
  f.controls.append(meet.node, start.node);
  guessFirst(t, f, {
    ask: 'A hundred players: 40 always defect, 30 always cooperate, 30 play tit for tat. Each pair meets once per generation. Which strategy takes over?',
    options: ['Always defect', 'Always cooperate', 'Tit for tat', 'They stay mixed'],
    answer: 0,
    sliders: [meet, start],
    after: () => paint(),
  });
  return f.node;
});
