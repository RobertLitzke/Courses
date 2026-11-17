// Lesson M5, When the world changes: a day of proposed map changes in three
// tiers of risk; the reader sets how confident a low-risk change must be to
// publish without a person, how many reviewers there are, and whether the top
// tier needs two of them, and watches the review queue and the bad changes
// that reach people's screens.

import { svg } from 'didactics/dom';
import { line, redraw, small } from 'didactics/draw';
import { COL, figure, frame, named, pick, slider, tint } from './kit';

export const PER_DAY = 10_000;
/** Share of proposed changes in each tier: a moved shop, a changed road rule, a closed road or a renamed city. */
export const TIERS = [
  { name: 'Low: a shop moved', share: 0.8, views: 100 },
  { name: 'Medium: a turn banned', share: 0.18, views: 10_000 },
  { name: 'High: a road closed, a city renamed', share: 0.02, views: 1_000_000 },
] as const;
/** Share of proposals that are wrong (mistakes, stale observations, vandalism). */
export const BAD = 0.05;
/** A reviewer misses this share of wrong changes; two independent reviewers miss its square. */
export const MISS = 0.05;
/** Changes one reviewer can check in a working day. */
export const PER_REVIEWER = 400;

/** Share of low-risk changes whose evidence reaches confidence c, and how often those are still wrong. */
export const eligible = (c: number) => Math.max(0, Math.min(1, (1 - c) / 0.4));
export const autoBad = (c: number) => 0.2 * (1 - c);

export interface Triage {
  /** Share of all changes published without a person. */
  autoShare: number;
  /** Reviews needed a day, and what the reviewers can do. */
  demand: number;
  capacity: number;
  /** Changes waiting for review at the end of each of seven days. */
  backlog: number[];
  /** Hours a change waits for review at the end of the week (Little's law: queue ÷ rate). */
  waitHours: number;
  /** Views of wrong map data a day, summed over the wrong changes that got through. */
  badViews: number;
}

export function triage(c: number, reviewers: number, twoPerson: boolean): Triage {
  const low = PER_DAY * TIERS[0].share;
  const autoN = low * eligible(c);
  const reviewedLow = low - autoN;
  const med = PER_DAY * TIERS[1].share;
  const high = PER_DAY * TIERS[2].share;
  const demand = reviewedLow + med + high * (twoPerson ? 2 : 1);
  const capacity = reviewers * PER_REVIEWER;
  const backlog: number[] = [];
  let q = 0;
  for (let d = 0; d < 7; d++) {
    q = Math.max(0, q + demand - capacity);
    backlog.push(q);
  }
  // A change waits behind the backlog, plus about half a day of ordinary turnaround.
  const waitHours = 12 + (q / capacity) * 24;
  const badViews =
    autoN * autoBad(c) * TIERS[0].views +
    reviewedLow * BAD * MISS * TIERS[0].views +
    med * BAD * MISS * TIERS[1].views +
    high * BAD * (twoPerson ? MISS * MISS : MISS) * TIERS[2].views;
  return { autoShare: autoN / PER_DAY, demand, capacity, backlog, waitHours, badViews };
}

const count = (n: number) => Math.round(n).toLocaleString('en-US');

export const FIGS = {
  'changes-triage': figure(['balanced'], (_ctx, t) => {
    const W = 600;
    const H = 210;
    const f = frame(W, H, 3);
    const g = svg('g');
    f.svg.append(g);
    f.readout.style.whiteSpace = 'pre-line';
    let c = 0.95;
    let reviewers = 15;
    let two = false;
    let moved = false;
    const paint = () => {
      const r = triage(c, reviewers, two);
      const parts: SVGElement[] = [];
      // Where the day's changes go.
      parts.push(small(14, 16, `Today's ${count(PER_DAY)} proposed changes`, { bold: true }));
      const bw = W - 28;
      const segs: [number, string, string][] = [
        [r.autoShare, COL.answer, 'published automatically'],
        [TIERS[0].share - r.autoShare, COL.busy, 'low risk, to a reviewer'],
        [TIERS[1].share, COL.busy, 'medium'],
        [TIERS[2].share, COL.error, two ? 'high, two reviewers' : 'high, one reviewer'],
      ];
      let x = 14;
      segs.forEach(([share, col, name], i) => {
        const w = share * bw;
        parts.push(svg('rect', { x, y: 24, width: Math.max(0, w), height: 18, fill: tint(col, i === 3 ? 0.9 : 0.5) }));
        if (w > 70) parts.push(small(x + 4, 37, name));
        x += w;
      });
      // The queue over a week.
      const qx = 64;
      const qw = W - qx - 20;
      const top = 70;
      const hgt = 100;
      const maxQ = Math.max(PER_REVIEWER * 15, ...r.backlog);
      parts.push(small(14, top - 6, 'Changes waiting for review, end of each day', { soft: true }));
      parts.push(line(qx, top + hgt, qx + qw, top + hgt, COL.ink, 1), line(qx, top, qx, top + hgt, COL.ink, 1));
      r.backlog.forEach((q, d) => {
        const bh = (q / maxQ) * hgt;
        const bx = qx + 8 + d * (qw / 7);
        parts.push(svg('rect', { x: bx, y: top + hgt - bh, width: qw / 7 - 16, height: bh, fill: tint(q > r.capacity ? COL.error : COL.busy, 0.6) }));
        parts.push(small(bx + (qw / 7 - 16) / 2, top + hgt + 14, `day ${d + 1}`, { anchor: 'middle', soft: true }));
        if (q > 0) parts.push(small(bx + (qw / 7 - 16) / 2, top + hgt - bh - 4, count(q), { anchor: 'middle', soft: true }));
      });
      if (r.backlog[6] === 0) parts.push(small(qx + qw / 2, top + hgt / 2, 'The reviewers keep up: no queue builds.', { anchor: 'middle', fill: COL.good, bold: true }));
      parts.push(small(14, 204, `Reviews needed: ${count(r.demand)} a day. Reviewers can do: ${count(r.capacity)}.`, { soft: true }));
      redraw(g, ...parts);
      f.readout.textContent = [
        `${Math.round(r.autoShare * 100)}% published without a person; a change for review waits about ${r.waitHours < 48 ? `${Math.round(r.waitHours)} hours` : `${(r.waitHours / 24).toFixed(0)} days`}.`,
        `Wrong data shown about ${count(r.badViews)} times a day.`,
        two ? 'High-risk changes need two reviewers who decide independently.' : 'One reviewer\'s mistake on a high-risk change reaches a million screens.',
      ].join('\n');
      if (moved && two && r.waitHours <= 24 && r.badViews <= 100_000) t.done();
    };
    const conf = slider('Low-risk change publishes alone at confidence', { min: 0.6, max: 0.99, step: 0.01, value: c, show: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { c = v; moved = true; paint(); }, color: 'answer' });
    const rev = slider('Reviewers', { min: 5, max: 40, step: 1, value: reviewers, show: (v) => String(v), onInput: (v) => { reviewers = v; moved = true; paint(); }, color: 'busy' });
    const two_ = named(pick(['One reviewer', 'Two reviewers'], 0, (i) => { two = i === 1; moved = true; paint(); }), 'High risk:');
    f.controls.append(conf.node, rev.node, two_.node);
    paint();
    return f.node;
  }),
};
