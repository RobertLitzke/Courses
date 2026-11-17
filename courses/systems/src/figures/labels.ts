// Lesson P2, A million labels, and which are wrong: a labelling line where the
// reader sets the overlap, how confident the model must be for its own label to
// skip people, how clear the guideline is, and whether a random sample is
// audited; and a still of the label record, an append-only history from which
// the current label is derived.

import { svg } from 'didactics/dom';
import { label, redraw, small, still } from 'didactics/draw';
import { COL, figure, frame, named, pick, slider, tint } from './kit';
import { drawBoard, type BoardBox, type BoardWire } from './limiter';

// ---------------------------------------------------------------------------
// The labelling line.

/** Share of items that are hard; error rates of one labeller on easy and on clear hard items. */
export const HARD = 0.2;
export const EASY_ERR = 0.03;
export const HARD_ERR = 0.15;
/** On an ambiguous item, labellers who read the guideline the same way give the same wrong answer this often. */
export const AMBIG_ERR = 0.5;
/** An expert who settles a disagreement, and how often the expert is wrong. */
export const EXPERT_ERR = 0.05;
/** Labeler-minutes: one label, one adjudication, one audited item. */
export const LABEL_MIN = 1;
export const EXPERT_MIN = 3;
/** Share of items audited when audits are on. */
export const AUDIT_SHARE = 0.02;
/** 300 labellers for 7 hours a day. */
export const WORKFORCE_MIN = 300 * 7 * 60;

export interface LabelChoices {
  /** Labelers per item: 1, 2 (an expert settles disagreements) or 3 (majority). */
  overlap: 1 | 2 | 3;
  /** The model's own label is accepted, unseen by people, when its confidence is at or above this. 1 means never. */
  skipAbove: number;
  /** Share of hard items the guideline leaves ambiguous. */
  ambiguity: number;
  /** Re-label a random sample with an expert. */
  audit: boolean;
}

/** Error after combining k independent labellers who each err with chance e. */
export function combined(e: number, k: 1 | 2 | 3): number {
  if (k === 1) return e;
  if (k === 2) return e * e + 2 * e * (1 - e) * EXPERT_ERR;
  return 3 * e * e * (1 - e) + e ** 3;
}

/** Share of items the model's label skips people at a threshold, and how often those labels are wrong. */
export function skipped(threshold: number): { share: number; err: number } {
  if (threshold >= 1) return { share: 0, err: 0 };
  return { share: (0.9 * (1 - threshold)) / 0.5, err: 0.5 * (1 - threshold) + 0.02 };
}

export interface LabelOutcome {
  /** Share of all labels that are wrong, from each source. */
  fromLabelers: number;
  fromAmbiguity: number;
  fromModel: number;
  trueErr: number;
  /** What the team's own measurement reports: gold questions alone see only clear items labelled by people; a random audit sees everything. */
  measuredErr: number;
  /** Labeler-minutes per 1,000 labels, and labels a day from the workforce. */
  costPer1000: number;
  perDay: number;
}

export function outcome(o: LabelChoices): LabelOutcome {
  const sk = skipped(o.skipAbove);
  const people = 1 - sk.share;
  const clear = (1 - HARD) * combined(EASY_ERR, o.overlap) + HARD * (1 - o.ambiguity) * combined(HARD_ERR, o.overlap);
  const fromLabelers = people * clear;
  const fromAmbiguity = people * HARD * o.ambiguity * AMBIG_ERR;
  const fromModel = sk.share * sk.err;
  const trueErr = fromLabelers + fromAmbiguity + fromModel;
  const goldOnly = (1 - HARD) * combined(EASY_ERR, o.overlap) + HARD * combined(HARD_ERR, o.overlap);
  // Two labellers disagree on clear items with chance 2e(1 − e); on ambiguous items they agree.
  const disagree = o.overlap === 2 ? (1 - HARD) * 2 * EASY_ERR * (1 - EASY_ERR) + HARD * (1 - o.ambiguity) * 2 * HARD_ERR * (1 - HARD_ERR) : 0;
  const costPer1000 = 1000 * people * (o.overlap * LABEL_MIN + disagree * EXPERT_MIN) + (o.audit ? 1000 * AUDIT_SHARE * EXPERT_MIN : 0);
  return { fromLabelers, fromAmbiguity, fromModel, trueErr, measuredErr: o.audit ? trueErr : goldOnly, costPer1000, perDay: (WORKFORCE_MIN / costPer1000) * 1000 };
}

const pc = (v: number) => `${(v * 100).toFixed(1)}%`;
const count = (n: number) => Math.round(n).toLocaleString('en-US');

export const FIGS = {
  'labels-bench': figure(['trusted'], (_ctx, t) => {
    const W = 600;
    const H = 250;
    const f = frame(W, H, 3);
    const g = svg('g');
    const bars = svg('g');
    f.svg.append(g, bars);
    f.readout.style.whiteSpace = 'pre-line';
    const o: LabelChoices = { overlap: 1, skipAbove: 1, ambiguity: 0.3, audit: false };
    let moved = false;
    const paint = () => {
      const r = outcome(o);
      const sk = skipped(o.skipAbove);
      const boxes: BoardBox[] = [
        { id: 'items', x: 62, y: 60, label: 'New items', sub: '1,000', shape: 'pill', color: 'request', w: 100 },
        { id: 'model', x: 200, y: 60, label: 'Model pre-labels', sub: 'with a confidence', color: 'model', w: 120 },
        { id: 'people', x: 360, y: 30, label: `${o.overlap} labeller${o.overlap > 1 ? 's' : ''} each`, sub: o.overlap === 2 ? 'expert settles disputes' : o.overlap === 3 ? 'majority wins' : 'one answer', color: 'busy', stack: o.overlap > 1, w: 130 },
        { id: 'labels', x: 530, y: 60, label: 'Labels', sub: 'to training and evaluation', shape: 'store', color: 'data', w: 120, h: 40 },
        { id: 'audit', x: 360, y: 104, label: 'Random audit', sub: '2% re-labelled by experts', color: 'answer', faded: !o.audit, w: 130 },
      ];
      const wires: BoardWire[] = [
        { from: 'items', to: 'model', weight: 0.3, color: 'request' },
        { from: 'model', to: 'people', text: `${Math.round((1 - sk.share) * 100)}%`, weight: 0.3 * (1 - sk.share) + 0.02, color: 'busy' },
        { from: 'people', to: 'labels', weight: 0.25, color: 'write' },
        { from: 'model', to: 'labels', text: sk.share ? `${Math.round(sk.share * 100)}% skip people` : '', weight: 0.3 * sk.share, color: 'model', faded: !sk.share, lift: -40 },
        { from: 'labels', to: 'audit', weight: 0.08, color: 'answer', faded: !o.audit, dashed: true },
      ];
      drawBoard(g, boxes, wires);
      // Two bars: the error the team measures, and the true error, split by where it comes from.
      const parts: SVGElement[] = [];
      const x0 = 150;
      const scale = (W - x0 - 30) / 0.12;
      const row = (y: number, name: string, segs: [number, string, string][]) => {
        parts.push(label(14, y + 12, name, { size: 'note', bold: true }));
        let x = x0;
        for (const [v, col] of segs) {
          const w = Math.min(v, 0.12) * scale;
          parts.push(svg('rect', { x, y, width: Math.max(0, w), height: 16, fill: tint(col, 0.6) }));
          x += w;
        }
        const total = segs.reduce((s, [v]) => s + v, 0);
        parts.push(small(Math.min(x, W - 60) + 6, y + 12, pc(total), { bold: true }));
      };
      row(160, 'Measured error', [[r.measuredErr, o.audit ? COL.answer : COL.soft, '']]);
      row(188, 'True error', [[r.fromLabelers, COL.busy, ''], [r.fromAmbiguity, COL.error, ''], [r.fromModel, COL.model, '']]);
      const key: [string, string][] = [['labellers\' slips', COL.busy], ['same wrong reading', COL.error], ['model labels unseen', COL.model]];
      key.forEach(([text, col], i) => parts.push(svg('rect', { x: x0 + i * 140, y: 218, width: 10, height: 10, fill: tint(col, 0.6) }), small(x0 + 14 + i * 140, 227, text)));
      redraw(bars, ...parts);
      f.readout.textContent = [
        `${count(r.costPer1000)} labeller-minutes per 1,000 labels: about ${count(r.perDay)} labels a day from 300 labellers.`,
        o.audit ? `The audit measures ${pc(r.measuredErr)} wrong, which is the true figure.` : `Gold questions report ${pc(r.measuredErr)} wrong; the true figure is ${pc(r.trueErr)}.`,
        r.fromAmbiguity > r.fromLabelers ? 'Most errors are agreed on: labellers share one wrong reading of the guideline.' : r.fromModel > r.fromLabelers ? 'Most errors are the model\'s own labels, accepted without anyone looking.' : 'Most errors are individual slips, which overlap and adjudication can catch.',
      ].join('\n');
      if (moved && o.audit && r.trueErr <= 0.03 && r.perDay >= 33_000) t.done();
    };
    const overlap = named(pick(['1', '2', '3'], 0, (i) => { o.overlap = (i + 1) as 1 | 2 | 3; moved = true; paint(); }), 'Labelers per item:');
    const skip = slider('Model label skips people above', { min: 0.8, max: 1, step: 0.01, value: o.skipAbove, show: (v) => (v >= 1 ? 'never' : `${Math.round(v * 100)}% confidence`), onInput: (v) => { o.skipAbove = v; moved = true; paint(); }, color: 'model' });
    const amb = slider('Hard items the guideline leaves unclear', { min: 0, max: 0.6, step: 0.05, value: o.ambiguity, show: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { o.ambiguity = v; moved = true; paint(); }, color: 'error' });
    const audit = named(pick(['Gold questions only', 'Gold and a random audit'], 0, (i) => { o.audit = i === 1; moved = true; paint(); }), 'Measure by:');
    f.controls.append(overlap.node, skip.node, amb.node, audit.node);
    paint();
    return f.node;
  }),

  'labels-record': () => {
    const W = 600;
    const H = 236;
    const s = still(W, H);
    const g = svg('g');
    s.svg.append(g);
    const parts: SVGElement[] = [];
    parts.push(label(14, 20, 'Label events for one item (frame 88213, box 4), oldest first', { size: 'note', bold: true }));
    const cols = [14, 92, 180, 254, 350, 500];
    const head = ['When', 'Who', 'Guideline', 'Pre-label shown', 'Label', 'Kind'];
    head.forEach((h, i) => parts.push(small(cols[i], 40, h, { bold: true, soft: true })));
    const rows: [string, string, string, string, string, string, string][] = [
      ['3 Mar 10:02', 'labeller 141', 'v12', 'cyclist 0.71', 'cyclist', 'label', COL.busy],
      ['3 Mar 10:04', 'labeller 208', 'v12', 'cyclist 0.71', 'pedestrian', 'label', COL.busy],
      ['3 Mar 15:30', 'expert 9', 'v12', 'none', 'pedestrian', 'adjudication', COL.answer],
      ['20 Apr 09:12', 'policy', 'v13', 'none', 'pedestrian with bicycle', 'reclassified', COL.clock],
    ];
    rows.forEach((r, i) => {
      const y = 50 + i * 26;
      parts.push(svg('rect', { x: 8, y, width: W - 16, height: 22, rx: 3, fill: tint(r[6], 0.08) }));
      r.slice(0, 6).forEach((c, j) => parts.push(small(cols[j], y + 15, c, { fill: j === 4 ? r[6] : COL.ink, bold: j === 4 })));
    });
    parts.push(svg('rect', { x: 8, y: 168, width: W - 16, height: 56, rx: 6, fill: tint(COL.data, 0.1), stroke: COL.data }));
    parts.push(label(20, 188, 'The current label, derived from the events:', { size: 'note', bold: true, fill: COL.data }));
    parts.push(small(20, 206, 'pedestrian with bicycle (guideline v13, from the expert\'s decision, reclassified by policy).'));
    parts.push(small(20, 220, 'Nothing above is ever edited; a new guideline adds events and the view is computed again.', { soft: true }));
    redraw(g, ...parts);
    return { node: s.node };
  },
};
