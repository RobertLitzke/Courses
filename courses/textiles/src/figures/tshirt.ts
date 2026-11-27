// Lesson 25: where the price of a T-shirt goes, and what a pay rise for the
// people who sew it would do to that price. The split is a rounded version of
// the breakdowns campaigners and researchers publish for a €29 branded
// T-shirt. Brands and shops usually price as a multiple of what they paid, so
// a cost rise at the factory can be passed on with their markup on top.
// Goal 'triple': sewing wages at three times or more, seen with both kinds of
// markup.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

export const PRICE = 29;
export const SHARES: readonly { part: string; share: number; color: string }[] = [
  { part: 'Shop', share: 0.59, color: COL.britain },
  { part: 'Brand', share: 0.12, color: COL.unitB },
  { part: 'Cloth', share: 0.13, color: COL.fibre },
  { part: 'Transport, duties', share: 0.09, color: COL.soft },
  { part: 'Factory costs, profit', share: 0.064, color: COL.waged },
  { part: 'Sewing wages', share: 0.006, color: COL.overseas },
];
const WAGES = SHARES.at(-1)!.share * PRICE;
/** What the factory charges: cloth, factory costs and wages. */
const FACTORY = (SHARES[2].share + SHARES[4].share + SHARES[5].share) * PRICE;

/** The shop price when sewing wages are multiplied by k, with markups that are a fixed sum or a percentage of cost. */
export function priceWith(k: number, markup: 'fixed' | 'percent'): number {
  const extra = WAGES * (k - 1);
  return markup === 'fixed' ? PRICE + extra : PRICE * (1 + extra / FACTORY);
}

const W = 520;
const H = 200;
const X0 = 20;
const X1 = 500;

export const tshirtFigure = figure(['triple'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let k = 1;
  let markup: 'fixed' | 'percent' = 'fixed';
  const seen = new Set<string>();

  const paint = () => {
    const p = priceWith(k, markup);
    const scale = (X1 - X0) / 34;
    const r = markup === 'percent' ? (FACTORY + WAGES * (k - 1)) / FACTORY : 1;
    const amounts = (after: boolean) => SHARES.map((sh, i) => {
      const a = sh.share * PRICE;
      if (!after) return a;
      if (i === SHARES.length - 1) return a * k;
      return i === 0 || i === 1 || i === 3 ? a * r : a;
    });
    const bar = (y: number, title: string, after: boolean) => {
      const out: SVGElement[] = [label(X0, y - 8, title, { size: 'note', bold: true })];
      let x = X0;
      amounts(after).forEach((a, i) => {
        const w = a * scale;
        out.push(svg('rect', { x, y, width: Math.max(1.5, w), height: 26, fill: SHARES[i].color, stroke: COL.paper, 'stroke-width': 0.5 }));
        if (w > 44) out.push(label(x + 4, y + 17, SHARES[i].part, { size: 'small', fill: COL.paper }));
        x += w;
      });
      out.push(label(x + 4, y + 17, `€${(after ? p : PRICE).toFixed(2)}`, { size: 'small', bold: true }));
      return out;
    };
    const parts: SVGElement[] = [
      ...bar(28, 'Today', false),
      ...bar(92, `Sewing wages ×${k}`, true),
      label(X0, 140, `Sewing wages: €${WAGES.toFixed(2)} a shirt today, €${(WAGES * k).toFixed(2)} after the rise.`, { size: 'small', fill: COL.overseas }),
      label(X0, 156, 'Narrow strips, left to right after the brand: cloth, transport, factory, wages.', { size: 'small', soft: true }),
      label(X0, 182, `Shop price: €${p.toFixed(2)}, ${p > PRICE + 0.004 ? `up ${(((p - PRICE) / PRICE) * 100).toFixed(1)}%` : 'unchanged'}`, { bold: true }),
    ];
    redraw(g, ...parts);
    f.readout.textContent = k === 1
      ? 'The people who sew the shirt get well under 1% of its price. Raise their pay and see what happens to the price.'
      : markup === 'fixed'
        ? `If the brand and shop pass on only the extra cost, the shirt costs €${(p - PRICE).toFixed(2)} more.`
        : `Brands and shops usually price as a multiple of cost, so the extra €${(WAGES * (k - 1)).toFixed(2)} at the factory becomes €${(p - PRICE).toFixed(2)} in the shop, a rise of ${(((p - PRICE) / PRICE) * 100).toFixed(1)}% in the price.`;
    if (k >= 3) seen.add(markup);
    if (seen.size === 2) t.done();
  };

  const s = slider('Sewing wages', { min: 1, max: 5, step: 0.5, value: 1, show: (v) => `×${v}`, onInput: (v) => { k = v; paint(); }, color: 'overseas' });
  const m = choices(['Markup: same euros', 'Markup: same percentage'], (i) => { markup = i === 0 ? 'fixed' : 'percent'; paint(); });
  m.pick(0);
  f.controls.append(s.node, m.node);
  paint();
  return f.node;
});
