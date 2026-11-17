// Lesson P1, Is the new model better?: the workbench where a rare slice gets
// worse while the overall score improves, and the gate can or cannot see it
// depending on how many of the slice's examples the evaluation set holds; and
// the split of frames, drives and places between training and evaluation.

import { svg } from 'didactics/dom';
import { label, line, redraw, small } from 'didactics/draw';
import { makeRng } from 'didactics/rng';
import { COL, figure, frame, guessFirst, named, pick, slider, tint } from './kit';

// ---------------------------------------------------------------------------
// Slices, noise and the gate.

/** Share of examples on which two versions of a model give different answers, when they are close. */
export const DISAGREE = 0.06;
/** Accuracy of the current model, round. */
export const BASE_ACC = 0.9;
/** The gate's margin: a protected slice may be at most this much worse. */
export const MARGIN = 0.01;
/** The candidate's change on most driving. */
export const COMMON_GAIN = 0.01;
/** Examples of most driving in the evaluation set. */
export const COMMON_N = 20_000;

/**
 * Half the width of a 95% interval on the difference in accuracy between two
 * models, from n examples. Paired: both models scored on the same examples, so
 * only the examples where they disagree carry noise (McNemar). Separate: each
 * score has its own sampling noise.
 */
export function halfWidth(n: number, delta: number, paired: boolean): number {
  if (!paired) return 1.96 * Math.sqrt((2 * BASE_ACC * (1 - BASE_ACC)) / n);
  const d = Math.max(DISAGREE, Math.abs(delta) + 0.02);
  return 1.96 * Math.sqrt((d - delta * delta) / n);
}

export type Verdict = 'worse' | 'unclear' | 'fine';

/** Clearly worse (the whole interval below zero), clearly no worse than the margin, or too few examples to say. */
export function verdictOf(delta: number, half: number, margin = MARGIN): Verdict {
  if (delta + half < 0) return 'worse';
  if (delta - half > -margin) return 'fine';
  return 'unclear';
}

/** The overall change, each slice weighted by its share of real driving. */
export const overallChange = (share: number, sliceChange: number, commonChange = COMMON_GAIN) => (1 - share) * commonChange + share * sliceChange;

/** Examples needed for a 95% interval of ±`half` on a difference: separate scores, and paired with `disagree` of examples differing. */
export function examplesFor(half: number, paired: boolean, disagree = 0.04): number {
  return paired ? (1.96 ** 2 * disagree) / half ** 2 : (1.96 ** 2 * 2 * BASE_ACC * (1 - BASE_ACC)) / half ** 2;
}

const pts = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}`;
const pct = (v: number) => (v < 0.01 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);
const count = (n: number) => Math.round(n).toLocaleString('en-US');

const SAY: Record<Verdict, string> = { worse: 'clearly worse', unclear: "can't tell", fine: 'no worse than 1 point' };
const HUE: Record<Verdict, string> = { worse: COL.error, unclear: COL.soft, fine: COL.good };

// ---------------------------------------------------------------------------
// Splitting by frame, drive or place.

export type Split = 'frame' | 'drive' | 'place';
/** Ten drives, two through each of five places (A to E). */
export const DRIVES = 10;
export const FRAMES = 16;
export const placeOf = (drive: number) => 'ABCDE'[drive % 5];

/** Which frames are held out for evaluation: a fifth of them, chosen three ways. */
export function heldOut(split: Split, seed = 3): boolean[][] {
  const rng = makeRng(seed);
  return Array.from({ length: DRIVES }, (_, d) =>
    Array.from({ length: FRAMES }, () => {
      const r = rng();
      if (split === 'frame') return r < 0.2;
      if (split === 'drive') return d === 2 || d === 6;
      return placeOf(d) === 'E';
    }),
  );
}

export interface SplitScore {
  /** Share of held-out frames with a neighbouring frame from the same drive in training. */
  twins: number;
  /** Share of held-out frames whose place also appears in training. */
  seenPlace: number;
  /** Accuracy measured on the held-out frames, and on drives through places never seen. */
  measured: number;
  truth: number;
}

/** A model scores 86% on places it has never seen; a near-twin frame in training adds 8 points, a familiar place 3. */
export function splitScore(test: boolean[][]): SplitScore {
  let n = 0;
  let twins = 0;
  let seen = 0;
  const trainPlaces = new Set<string>();
  test.forEach((row, d) => row.forEach((t) => { if (!t) trainPlaces.add(placeOf(d)); }));
  test.forEach((row, d) =>
    row.forEach((t, i) => {
      if (!t) return;
      n++;
      if ((i > 0 && !row[i - 1]) || (i < row.length - 1 && !row[i + 1])) twins++;
      if (trainPlaces.has(placeOf(d))) seen++;
    }),
  );
  const tw = n ? twins / n : 0;
  const sp = n ? seen / n : 0;
  return { twins: tw, seenPlace: sp, measured: 0.86 + 0.08 * tw + 0.03 * sp, truth: 0.86 };
}

export const FIGS = {
  'evals-slices': figure(['caught'], (_ctx, t) => {
    const W = 600;
    const H = 214;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    const o = { share: 0.01, n: 200, change: -0.03, paired: true };
    let open = false;
    // The number line: −8 to +4 points.
    const X0 = 250;
    const X1 = W - 20;
    const X = (v: number) => X0 + ((Math.max(-0.08, Math.min(0.04, v)) + 0.08) / 0.12) * (X1 - X0);
    const paint = () => {
      const all = overallChange(o.share, o.change);
      const rows = [
        { name: `Most driving, ${pct(1 - o.share)} of it`, sub: `${count(COMMON_N)} examples`, change: COMMON_GAIN, n: COMMON_N },
        { name: `Cyclists at night, ${pct(o.share)} of it`, sub: `${count(o.n)} examples`, change: o.change, n: o.n },
      ];
      const parts: SVGElement[] = [];
      parts.push(label(14, 22, `Overall, weighted to real driving: ${all >= 0 ? '+' : '−'}${Math.abs(all * 100).toFixed(2)} points, so the new model ${all > 0 ? 'looks better' : 'looks worse'}`, { bold: true, fill: all > 0 ? COL.good : COL.error }));
      parts.push(line(14, 36, W - 14, 36, COL.grid, 1));
      for (const v of [-0.08, -0.06, -0.04, -0.02, 0, 0.02, 0.04]) {
        parts.push(line(X(v), 50, X(v), 170, v === 0 ? COL.ink : COL.grid, v === 0 ? 1.2 : 1), small(X(v), 186, `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100)}`, { anchor: 'middle', soft: true }));
      }
      parts.push(line(X(-MARGIN), 50, X(-MARGIN), 170, COL.error, 1, { 'stroke-dasharray': '4 3', opacity: 0.6 }));
      parts.push(small(X(-MARGIN) - 3, 60, 'allowed: 1 point worse', { anchor: 'end', fill: COL.error }));
      parts.push(small(X1, 204, 'change in accuracy, points (95% interval)', { anchor: 'end', soft: true }));
      const verdicts: Verdict[] = [];
      rows.forEach((r, i) => {
        const y = 92 + i * 50;
        const half = halfWidth(r.n, r.change, o.paired);
        const v = verdictOf(r.change, half);
        verdicts.push(v);
        const hue = HUE[v];
        parts.push(label(14, y, r.name, { size: 'note', bold: true }), small(14, y + 14, `${r.sub}, ${SAY[v]}`, { fill: hue }));
        parts.push(svg('rect', { x: X(r.change - half), y: y - 8, width: Math.max(2, X(r.change + half) - X(r.change - half)), height: 14, rx: 7, fill: tint(hue, 0.35), stroke: hue }));
        parts.push(svg('circle', { cx: X(r.change), cy: y - 1, r: 4, fill: hue }));
      });
      redraw(g, ...parts);
      const slice = verdicts[1];
      const gate = slice === 'worse' ? 'The gate blocks the release: a protected slice is clearly worse.' : slice === 'unclear' ? "The gate can't see this slice: its interval is wider than any change that matters." : 'The gate passes the release: every protected slice is no worse than the margin.';
      f.readout.textContent = [
        `Overall ${all >= 0 ? '+' : '−'}${Math.abs(all * 100).toFixed(2)} points; most driving ${pts(COMMON_GAIN)}; cyclists at night ${pts(o.change)}.`,
        gate,
        o.paired ? 'Paired: both models scored on the same examples.' : 'Separate scores: each model\'s noise counted on its own.',
      ].join('\n');
      if (open && all > 0 && o.change <= -0.02 && slice === 'worse' && o.share <= 0.02) t.done();
    };
    const share = slider('Slice share of real driving', { min: 0.005, max: 0.2, scale: 'log', value: o.share, show: pct, onInput: (v) => { o.share = v; paint(); }, color: COL.request });
    const n = slider('Slice examples in the eval set', { min: 100, max: 20_000, scale: 'log', step: 50, value: o.n, show: count, onInput: (v) => { o.n = v; paint(); }, color: COL.data });
    const change = slider('True change on the slice', { min: -0.06, max: 0.02, step: 0.005, value: o.change, show: (v) => `${pts(v)} points`, onInput: (v) => { o.change = v; paint(); }, color: COL.error });
    const how = named(pick(['Separate scores', 'Paired examples'], 1, (i) => { o.paired = i === 1; paint(); }), 'Compare:');
    f.controls.append(share.node, n.node, change.node, how.node);
    paint();
    guessFirst(t, f, {
      ask: 'The new model is 1 point better on most driving and 3 points worse on cyclists at night, 1% of driving. The eval set holds 200 night-cyclist examples, scored paired. What does the gate see on that slice?',
      options: ['Clearly worse', "Can't tell from 200 examples", 'No worse than 1 point'],
      answer: 1,
      sliders: [share, n, change],
      hidden: [how.node],
      after: () => { open = true; paint(); },
    });
    return f.node;
  }),

  'evals-split': figure(['split'], (_ctx, t) => {
    const W = 560;
    const H = 230;
    const f = frame(W, H, 2);
    const g = svg('g');
    f.svg.append(g);
    let split: Split = 'frame';
    const paint = () => {
      const test = heldOut(split);
      const s = splitScore(test);
      const parts: SVGElement[] = [];
      const cw = 22;
      const ch = 16;
      const x0 = 96;
      parts.push(label(14, 16, 'Ten drives, a frame a second (16 shown each)', { size: 'note', bold: true }));
      test.forEach((row, d) => {
        const y = 26 + d * (ch + 2);
        parts.push(small(14, y + 12, `Drive ${d + 1}, place ${placeOf(d)}`));
        row.forEach((held, i) => {
          parts.push(svg('rect', { x: x0 + i * cw, y, width: cw - 3, height: ch, rx: 2, fill: held ? COL.request : tint(COL.data, 0.3) }));
        });
      });
      const ky = 26 + DRIVES * (ch + 2) + 10;
      parts.push(svg('rect', { x: x0, y: ky - 9, width: 12, height: 12, fill: tint(COL.data, 0.3) }), small(x0 + 16, ky + 1, 'trains the model'));
      parts.push(svg('rect', { x: x0 + 130, y: ky - 9, width: 12, height: 12, fill: COL.request }), small(x0 + 146, ky + 1, 'held out to evaluate it'));
      redraw(g, ...parts);
      f.readout.textContent = [
        `Measured on the held-out frames: ${(s.measured * 100).toFixed(1)}%. On drives through places it has never seen: ${(s.truth * 100).toFixed(0)}%.`,
        split === 'frame' ? `${Math.round(s.twins * 100)}% of held-out frames have the frame one second before or after them in training.` : split === 'drive' ? 'No frame has a twin in training, but every held-out place was also driven in training.' : 'Nothing held out shares a drive or a place with training, so the score is what a new street would see.',
      ].join('\n');
      if (split === 'place') t.done();
    };
    const by = named(pick(['By frame', 'By drive', 'By place'], 0, (i) => { split = (['frame', 'drive', 'place'] as const)[i]; paint(); }), 'Hold out:');
    f.controls.append(by.node);
    paint();
    return f.node;
  }),
};
