// Branch F6: a year of British clothes rationing, from June 1941. Every
// adult had 66 coupons for the year; each garment cost a set number of
// coupons as well as its price. Coupon values are those of the 1941 list as
// commonly quoted, rounded for the figure; they changed later in the war, and
// the allowance was cut.
// Goal 'year': coupons spent down to 6 or fewer, after a purchase was refused.

import { el, svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame } from './kit';

export const ALLOWANCE = 66;
export const ITEMS: readonly [string, number][] = [
  ["Man's suit", 26],
  ["Woman's coat", 14],
  ['Dress', 11],
  ['Skirt', 7],
  ['Pair of shoes', 5],
  ['Shirt or blouse', 5],
  ['Pyjamas', 8],
  ['Pair of stockings', 2],
];

const W = 520;
const H = 150;

export const couponsFigure = figure(['year'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let bought: number[] = [];
  let refused = false;
  let last = '';

  const spent = () => bought.reduce((s, i) => s + ITEMS[i][1], 0);

  const paint = () => {
    const sp = spent();
    const parts: SVGElement[] = [];
    const x0 = 20;
    const cw = 7;
    for (let k = 0; k < ALLOWANCE; k++) {
      const col = k % 33;
      const row = Math.floor(k / 33);
      parts.push(svg('rect', { x: x0 + col * (cw + 7) * 1.03, y: 40 + row * 24, width: cw + 5, height: 18, rx: 2, fill: k < sp ? '#e6dfd2' : COL.cloth, stroke: COL.soft, 'stroke-width': 0.5 }));
    }
    parts.push(label(x0, 24, `${ALLOWANCE - sp} of ${ALLOWANCE} coupons left for the year`, { bold: true }));
    const list = ITEMS.map(([n], i) => [n, bought.filter((x) => x === i).length] as const).filter(([, c]) => c > 0).map(([n, c]) => (c > 1 ? `${c} × ${n}` : n));
    parts.push(label(x0, 110, list.length ? `Bought: ${list.join(', ')}` : 'Nothing bought yet', { size: 'small' }));
    if (last) parts.push(label(x0, 132, last, { size: 'small', fill: COL.bad }));
    redraw(g, ...parts);
    f.readout.textContent = sp === 0
      ? 'Buy clothes for the year. Each costs coupons as well as money, and the coupons cannot be topped up.'
      : `A man's suit alone took ${Math.round((26 / ALLOWANCE) * 100)}% of a year's coupons. ${refused ? 'Most families mended, altered and handed down clothes rather than buy new.' : 'Keep buying until the coupons run out.'}`;
    if (refused && ALLOWANCE - sp <= 6) t.done();
  };

  const buttons = ITEMS.map(([name, c], i) => el('button.chip', { type: 'button', onclick: () => {
    if (spent() + c > ALLOWANCE) { refused = true; last = `Not enough coupons for: ${name} (${c})`; } else { bought = [...bought, i]; last = ''; }
    paint();
  } }, `${name} · ${c}`));
  const reset = el('button.btn.btn-small', { type: 'button', onclick: () => { bought = []; last = ''; paint(); } }, 'Start the year again');
  f.controls.append(el('div.row', { style: 'flex-wrap:wrap;gap:6px' }, ...buttons), el('div.row', {}, reset));
  paint();
  return f.node;
});
