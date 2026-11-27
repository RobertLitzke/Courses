// Lesson 22, the veil of ignorance. Five societies, each split into five
// equal fifths by income. The reader picks the society they would be born
// into, then lifts the veil once and is placed in a fifth at random. Then they
// switch between two rules for choosing behind the veil: Rawls's (pick the
// society whose worst-off fifth does best) and Harsanyi's (pick the society
// with the highest average). Goal 'compare': placed, and both rules seen.

import { el, svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { oneOf } from 'didactics/rng';
import { COL, choices, figure, frame, lockIn, startRng, tint } from './kit';

export interface Society { name: string; fifths: readonly number[] }

/** Incomes, in thousands a year, of each fifth from poorest to richest. */
export const SOCIETIES: readonly Society[] = [
  { name: 'Equal', fifths: [30, 30, 30, 30, 30] },
  { name: 'Narrow', fifths: [26, 30, 34, 40, 50] },
  { name: 'Lifted floor', fifths: [34, 38, 44, 54, 70] },
  { name: 'Wide', fifths: [14, 25, 40, 65, 110] },
  { name: 'Top-heavy', fifths: [6, 12, 24, 80, 180] },
];

export const average = (s: Society): number => s.fifths.reduce((a, b) => a + b, 0) / s.fifths.length;
export const worst = (s: Society): number => Math.min(...s.fifths);
const best = (score: (s: Society) => number): number => SOCIETIES.reduce((b, s, i) => (score(s) > score(SOCIETIES[b]) ? i : b), 0);
/** The society each rule picks: Rawls's maximin and Harsanyi's average. */
export const RAWLS = best(worst);
export const HARSANYI = best(average);

const FIFTHS = ['poorest', 'second', 'middle', 'fourth', 'richest'];
const W = 400;
const H = 220;
const TOP = 26;
const BASE = 172;
const MAX = 180;
const PW = 76;

export const veilFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const rng = startRng(t);
  const kept = t.kept as { pick?: number; place?: number; seen?: number[] } | undefined;
  let pick = kept?.pick ?? -1;
  let place = kept?.place ?? -1;
  let rule = -1;
  const seen = new Set<number>(kept?.seen ?? []);
  const px = (i: number) => 6 + i * (PW + 2);
  const yv = (v: number) => BASE - ((BASE - TOP) * v) / MAX;

  const paint = () => {
    const ruled = rule === 0 ? RAWLS : rule === 1 ? HARSANYI : -1;
    const ruleCol = rule === 0 ? COL.rawls : COL.harsanyi;
    const parts: SVGElement[] = [line(4, BASE, W - 4, BASE, COL.grid, 1)];
    SOCIETIES.forEach((s, i) => {
      const x0 = px(i);
      if (i === ruled) parts.push(svg('rect', { x: x0, y: 8, width: PW, height: BASE + 36, rx: 5, fill: tint(ruleCol, 0.12), stroke: ruleCol, 'stroke-width': 2 }));
      else if (i === pick) parts.push(svg('rect', { x: x0, y: 8, width: PW, height: BASE + 36, rx: 5, fill: 'none', stroke: COL.you, 'stroke-width': 2, 'stroke-dasharray': '4 3' }));
      s.fifths.forEach((v, k) => {
        const bx = x0 + 6 + k * 13.4;
        const mine = i === pick && k === place;
        parts.push(svg('rect', { x: bx, y: yv(v), width: 11, height: BASE - yv(v), fill: mine ? COL.you : i === pick ? tint(COL.you, 0.45) : tint(COL.ink, 0.28) }));
        if (k === 0 || k === 4) parts.push(label(bx + 5.5, yv(v) - 3, `${v}`, { size: 'small', anchor: 'middle', soft: !mine, bold: mine }));
      });
      parts.push(label(x0 + PW / 2, BASE + 15, s.name, { size: 'small', anchor: 'middle', bold: i === pick || i === ruled }));
      parts.push(label(x0 + PW / 2, BASE + 28, `average ${Math.round(average(s))}`, { size: 'small', anchor: 'middle', soft: true }));
    });
    redraw(g, ...parts);
    if (pick < 0) f.readout.textContent = 'Incomes in thousands a year, poorest fifth on the left of each society. You do not know which fifth you will be born into. Pick the society you would choose.';
    else if (place < 0) f.readout.textContent = `You chose ${SOCIETIES[pick].name}: its poorest fifth gets ${worst(SOCIETIES[pick])} thousand a year and its average is ${Math.round(average(SOCIETIES[pick]))} thousand. Now lift the veil. You only get one go.`;
    else {
      const you = `You were born into the ${FIFTHS[place]} fifth of ${SOCIETIES[pick].name}, on ${SOCIETIES[pick].fifths[place]} thousand a year.`;
      const why = rule === 0 ? ` Rawls's rule picks ${SOCIETIES[RAWLS].name}, whose poorest fifth, on ${worst(SOCIETIES[RAWLS])} thousand, does better than the poorest anywhere else, even in Equal.`
        : rule === 1 ? ` Harsanyi's rule picks ${SOCIETIES[HARSANYI].name}, with the highest average, ${Math.round(average(SOCIETIES[HARSANYI]))} thousand, though its poorest fifth gets only ${worst(SOCIETIES[HARSANYI])}.`
        : ' Now compare the two rules for choosing behind the veil.';
      f.readout.textContent = you + why;
    }
    if (place >= 0 && seen.has(0) && seen.has(1)) t.done();
    t.keep({ pick, place, seen: [...seen] });
  };

  // Disabled rather than frozen, since a frozen row is labelled as a guess.
  const stop = () => societies.node.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
  const societies = choices(SOCIETIES.map((s) => s.name), (i) => { pick = i; lift.disabled = false; paint(); });
  const lift = lockIn('Lift the veil', () => {
    place = oneOf(rng, [0, 1, 2, 3, 4]);
    lift.disabled = true;
    lift.textContent = 'Veil lifted';
    stop();
    rules.node.hidden = false;
    paint();
  });
  lift.disabled = true;
  const rules = choices(['Rawls: the best worst-off', 'Harsanyi: the best average'], (i) => { rule = i; seen.add(i); paint(); });
  rules.node.hidden = true;
  f.controls.append(societies.node, el('div', {}, lift), rules.node);
  if (pick >= 0) societies.pick(pick);
  if (pick >= 0 && place >= 0) {
    stop();
    lift.disabled = true;
    lift.textContent = 'Veil lifted';
    rules.node.hidden = false;
  }
  paint();
  return f.node;
});
