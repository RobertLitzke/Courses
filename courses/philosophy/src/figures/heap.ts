// Branch K3, the sorites. A heap of sand loses grains, and three theories of
// vague words say what becomes of "this is a heap" as it shrinks: degrees of
// truth (a smooth slope), supervaluationism (true, borderline, false) and
// epistemicism (a sharp line at a place nobody can know). The reader first
// guesses where the heap stops being one, then moves the count and switches
// theory. Goal 'borderline': all three theories seen with the count in the
// borderline zone.

import { svg } from 'didactics/dom';
import { label, line, polyline, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, guessFirst, slider, tint } from './kit';

export const COUNTS = [1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 1000, 2000, 5000, 10000];
/** The borderline zone used for the drawing: clear cases below and above. */
export const LOW = 20;
export const HIGH = 200;
/** Degrees of truth, rising smoothly over the borderline zone (on a log scale). */
export function degree(n: number): number {
  const mid = Math.log10(Math.sqrt(LOW * HIGH));
  return 1 / (1 + Math.exp(-5 * (Math.log10(n) - mid)));
}
/** The hidden sharp line the epistemicist believes in; drawn only as a question mark. */
const SECRET = 63;

type Theory = 'fuzzy' | 'superval' | 'epistemic';
const THEORIES: Theory[] = ['fuzzy', 'superval', 'epistemic'];
const NAMES: Record<Theory, string> = { fuzzy: 'Degrees of truth', superval: 'Supervaluation', epistemic: 'Epistemicism' };

const W = 400;
const H = 230;
const X0 = 40;
const X1 = 388;
const Y0 = 206;
const Y1 = 120;

export const heapFigure = figure(['borderline'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const pile = svg('g');
  const chart = svg('g');
  f.svg.append(pile, chart);
  const x = (n: number) => X0 + ((X1 - X0) * Math.log10(n)) / 4;
  const y = (v: number) => Y0 - (Y0 - Y1) * v;
  let n = 10000;
  let theory: Theory | null = null;
  const seen = new Set<Theory>();

  const grains = (count: number) => {
    // Grains stacked in a triangle: each row one grain narrower than the one below.
    const shown = Math.min(count, 400);
    const r = 2;
    const out: SVGElement[] = [];
    let width = Math.max(1, Math.ceil((Math.sqrt(8 * shown + 1) - 1) / 2));
    let left = shown;
    for (let row = 0; left > 0; row++) {
      const k = Math.min(left, width);
      for (let i = 0; i < k; i++) out.push(svg('circle', { cx: W / 2 + (i - (k - 1) / 2) * 2 * r, cy: 92 - row * 1.6 * r, r, fill: COL.light, stroke: tint(COL.ink, 0.35), 'stroke-width': 0.5 }));
      left -= k;
      width = Math.max(1, width - 1);
    }
    out.push(label(W / 2, 106, count > shown ? `showing 400 of ${count.toLocaleString('en-GB')} grains` : `${count} ${count === 1 ? 'grain' : 'grains'}`, { size: 'small', anchor: 'middle', soft: true }));
    return out;
  };

  const paint = () => {
    redraw(pile, ...grains(n));
    const parts: SVGElement[] = [line(X0, Y0, X1, Y0, COL.grid, 1), line(X0, Y1, X1, Y1, COL.grid, 1),
      label(X0 - 4, Y1 + 4, 'true', { size: 'small', anchor: 'end', soft: true }), label(X0 - 4, Y0 + 4, 'false', { size: 'small', anchor: 'end', soft: true })];
    for (const c of [1, 10, 100, 1000, 10000]) parts.push(label(x(c), Y0 + 14, c.toLocaleString('en-GB'), { size: 'small', anchor: c === 10000 ? 'end' : 'middle', soft: true }));
    if (theory) {
      const col = COL[theory];
      if (theory === 'fuzzy') {
        const pts: [number, number][] = [];
        for (let e = 0; e <= 4.0001; e += 0.05) pts.push([x(10 ** e), y(degree(10 ** e))]);
        parts.push(polyline(pts, col, 2.5));
      } else if (theory === 'superval') {
        parts.push(svg('rect', { x: x(LOW), y: Y1, width: x(HIGH) - x(LOW), height: Y0 - Y1, fill: tint(col, 0.18) }),
          line(X0, Y0, x(LOW), Y0, col, 3), line(x(HIGH), Y1, X1, Y1, col, 3),
          label((x(LOW) + x(HIGH)) / 2, Y1 + 14, 'borderline', { size: 'small', anchor: 'middle', fill: col, bold: true }));
      } else {
        parts.push(line(X0, Y0, x(SECRET), Y0, col, 3), line(x(SECRET), Y1, X1, Y1, col, 3),
          svg('rect', { x: x(LOW), y: Y1, width: x(HIGH) - x(LOW), height: Y0 - Y1, fill: tint(COL.ink, 0.08) }),
          label((x(LOW) + x(HIGH)) / 2, Y1 + 14, 'a sharp line somewhere here', { size: 'small', anchor: 'middle', fill: col, bold: true }));
      }
      const v = theory === 'fuzzy' ? degree(n) : n < LOW ? 0 : n > HIGH ? 1 : 0.5;
      parts.push(svg('circle', { cx: x(n), cy: y(v), r: 5, fill: COL.you, stroke: COL.paper, 'stroke-width': 1.5 }));
    }
    parts.push(line(x(n), Y1 - 4, x(n), Y0, tint(COL.you, 0.6), 1, { 'stroke-dasharray': '3 3' }));
    redraw(chart, ...parts);
    const mid = n >= LOW && n <= HIGH;
    const s = `"${n.toLocaleString('en-GB')} ${n === 1 ? 'grain is' : 'grains are'} a heap"`;
    f.readout.textContent = !theory ? 'Now choose a theory of vague words to see what it says as the heap shrinks.'
      : theory === 'fuzzy' ? `Degrees of truth: ${s} is true to degree ${degree(n).toFixed(2)}. Each grain lowers it a tiny amount, so no single grain makes the difference, and the paradox's second premise is almost true, not true.`
      : theory === 'superval' ? (mid ? `Supervaluation: ${s} is borderline, neither true nor false. But "there is a last heap" is true, since it holds on every sharp way of drawing the line.` : `Supervaluation: ${s} is ${n > HIGH ? 'true' : 'false'}, a clear case on any way of drawing the line.`)
      : mid ? `Epistemicism: ${s} is either true or false, and one grain does make the difference somewhere near here. Nobody can know where, because our use of the word does not reveal it.` : `Epistemicism: ${s} is ${n > HIGH ? 'true' : 'false'}, and we know it.`;
    if (theory && mid) seen.add(theory);
    if (THEORIES.every((th) => seen.has(th))) t.done();
  };

  const count = slider('Grains of sand', { steps: COUNTS, value: n, show: (v) => v.toLocaleString('en-GB'), onInput: (v) => { n = v; paint(); }, color: 'ink' });
  const pick = choices(THEORIES.map((th) => NAMES[th]), (i) => { theory = THEORIES[i]; paint(); });
  f.controls.append(count.node, pick.node);
  guessFirst(t, f, {
    ask: 'You have a heap of 10,000 grains of sand and take away one grain at a time. At what point does it stop being a heap?',
    options: ['Around 1,000 grains', 'Around 100 grains', 'Around 10 grains', 'There is no exact point'],
    sliders: [count],
    hidden: [pick.node],
    after: () => paint(),
  });
  redraw(pile, ...grains(n));
  return f.node;
});
