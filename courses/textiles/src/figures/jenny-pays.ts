// Lesson 16: does a spinning jenny pay? The logic of Robert Allen's argument,
// with round, illustrative numbers. A jenny saves a household a number of
// days of hand spinning a year; those days are worth the spinner's daily
// earnings. Against that, the jenny costs money to buy and wears out. The
// return is the yearly saving, less wear, as a share of the price. Where
// spinners earn little, or machines cost a lot, the jenny does not pay.
// Presets set the wage to the direction of each argument; they are not the
// historians' own estimates.
// Goal 'compare': the reader has looked at all four presets.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

/** Days of hand spinning a jenny saves a household in a year (spinning was part-time work). */
export const DAYS_SAVED = 70;
/** Share of the price lost each year to wear. */
export const WEAR = 0.1;
/** The return an investment had to beat, for interest and risk. */
export const HURDLE = 0.1;

/** The yearly return on a jenny: wage in pence a day, price in shillings. */
export const jennyReturn = (wage: number, priceShillings: number) => (DAYS_SAVED * wage - WEAR * priceShillings * 12) / (priceShillings * 12);

export const PRESETS: readonly { name: string; wage: number; price: number; say: string }[] = [
  { name: 'Lancashire (Allen)', wage: 6, price: 70, say: 'Allen takes Lancashire spinners to have earned relatively well, so the days a jenny saved were worth a lot, and the jenny paid handsomely.' },
  { name: 'Lancashire (Humphries and Schneider)', wage: 3, price: 70, say: 'Humphries and Schneider find hand spinners earned far less than Allen assumed. The jenny still pays, but by much less, so high wages alone may not explain it.' },
  { name: 'France', wage: 3, price: 90, say: 'With lower wages and dearer machines, the jenny only just pays. French spinning was mechanised later, often with British machines and mechanics.' },
  { name: 'Bengal', wage: 1, price: 70, say: 'Where spinners earned very little, the days saved were worth less than the jenny wore out. Buying one did not pay.' },
];

const W = 480;
const H = 190;
const X0 = 40;
const X1 = 450;
const LO = -0.2;
const HI = 0.6;
const xr = (r: number) => X0 + ((Math.max(LO, Math.min(HI, r)) - LO) / (HI - LO)) * (X1 - X0);

export const jennyPaysFigure = figure(['compare'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let wage = 6;
  let price = 70;
  let say = '';
  const seen = new Set<number>();

  const paint = () => {
    const r = jennyReturn(wage, price);
    const pays = r > HURDLE;
    const saved = DAYS_SAVED * wage;
    const parts: SVGElement[] = [
      label(W / 2, 22, `A jenny saves ${DAYS_SAVED} days of spinning a year, worth ${saved} pence (${(saved / 12).toFixed(0)} shillings)`, { size: 'note', anchor: 'middle' }),
      label(W / 2, 40, `It costs ${price} shillings and wears out by a tenth a year`, { size: 'note', anchor: 'middle', soft: true }),
      line(X0, 110, X1, 110, COL.grid, 10),
      svg('rect', { x: xr(HURDLE), y: 105, width: X1 - xr(HURDLE), height: 10, fill: COL.good, opacity: 0.25 }),
      line(xr(0), 92, xr(0), 128, COL.soft, 1),
      line(xr(HURDLE), 92, xr(HURDLE), 128, COL.good, 1.5),
      label(xr(0), 144, '0%', { size: 'small', anchor: 'middle', soft: true }),
      label(xr(HURDLE), 86, 'worth it above 10%', { size: 'small', anchor: 'middle', fill: COL.good }),
      label(X1, 144, '60%', { size: 'small', anchor: 'end', soft: true }),
      label(X0, 144, '−20%', { size: 'small', soft: true }),
      svg('circle', { cx: xr(r), cy: 110, r: 9, fill: pays ? COL.good : COL.bad }),
      label(W / 2, 172, `Return on the jenny: ${Math.round(r * 100)}% a year. ${pays ? 'It pays.' : r > 0 ? 'Barely worth it.' : 'It loses money.'}`, { bold: true, anchor: 'middle', fill: pays ? COL.good : COL.bad }),
    ];
    redraw(g, ...parts);
    f.readout.textContent = say || 'Move the sliders, or pick a place and an argument.';
    if (seen.size === PRESETS.length) t.done();
  };

  const w = slider("Spinner's earnings", { min: 0.5, max: 8, step: 0.5, value: wage, show: (v) => `${v} pence a day`, onInput: (v) => { wage = v; say = ''; paint(); }, color: 'household' });
  const p = slider('Price of a jenny', { min: 40, max: 160, step: 10, value: price, show: (v) => `${v} shillings`, onInput: (v) => { price = v; say = ''; paint(); }, color: 'soft' });
  const presets = choices(PRESETS.map((x) => x.name), (i) => {
    const x = PRESETS[i];
    wage = x.wage;
    price = x.price;
    w.set(wage);
    p.set(price);
    say = x.say;
    seen.add(i);
    paint();
  });
  f.controls.append(presets.node, w.node, p.node);
  paint();
  return f.node;
});
