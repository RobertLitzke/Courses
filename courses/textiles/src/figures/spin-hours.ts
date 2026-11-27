// Lesson 3: how many hours of spinning a piece of cloth needs, estimated from
// first principles. A square metre of plain cloth with n threads per
// centimetre each way holds n × 100 warp threads a metre long and as many
// weft threads a metre wide: 200 × n metres of yarn. Divide by how many
// metres a spinner makes in an hour. Weaving the same square metre takes one
// pass of the weft (a pick) per weft thread. The ratio of the two is how many
// spinners one weaver needs. Goal 'sail': the reader has looked at the sail.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, slider } from './kit';

export interface Piece {
  name: string;
  /** The name inside a sentence. */
  phrase: string;
  /** Area of cloth in square metres. */
  area: number;
  /** Threads per centimetre, each way. */
  threads: number;
}

export const PIECES: Piece[] = [
  { name: 'Linen shirt', phrase: 'a linen shirt', area: 2, threads: 20 },
  { name: 'Wool cloak', phrase: 'a wool cloak', area: 4, threads: 10 },
  { name: 'Viking sail', phrase: 'a Viking sail', area: 120, threads: 10 },
];

/** Metres of yarn in a piece. */
export const yarnMetres = (area: number, threads: number) => area * threads * 200;
/** Hours to spin it at `rate` metres an hour. */
export const spinHours = (area: number, threads: number, rate: number) => yarnMetres(area, threads) / rate;
/** Picks (weft passes, each with its change of shed and beat) a hand weaver makes in an hour on a loom without a flying shuttle: a round figure for the estimate. */
export const PICKS_PER_HOUR = 150;
/** Hours to weave it: one pick per weft thread across a metre-wide cloth. */
export const weaveHours = (area: number, threads: number) => (area * threads * 100) / PICKS_PER_HOUR;

const W = 400;
const H = 200;
const X0 = 96;
const X1 = 370;

export const spinHoursFigure = figure(['sail'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let piece = PIECES[0];
  let threads = piece.threads;
  let rate = 60;

  // A log scale from 1 hour to 100,000 hours.
  const x = (hours: number) => X0 + ((X1 - X0) * Math.log10(Math.max(1, hours))) / 5;

  const paint = () => {
    const spin = spinHours(piece.area, threads, rate);
    const weave = weaveHours(piece.area, threads);
    const parts: SVGElement[] = [];
    for (const [v, s] of [[1, '1 h'], [10, '10'], [100, '100'], [1000, '1,000'], [10000, '10,000'], [100000, '100,000']] as const) {
      parts.push(line(x(v), 30, x(v), 150, COL.grid, 1), label(x(v), 166, s, { size: 'small', anchor: v === 100000 ? 'end' : 'middle', soft: true }));
    }
    parts.push(label(X0, 182, 'hours of work, on a log scale: each line is ten times the last', { size: 'small', soft: true }));
    const bar = (y: number, name: string, hours: number, color: string) => [
      label(X0 - 8, y + 14, name, { anchor: 'end', size: 'small', bold: true }),
      svg('rect', { x: X0, y, width: Math.max(2, x(hours) - X0), height: 20, rx: 3, fill: color }),
      label(Math.min(x(hours) + 6, X1 - 4), y + 14, `${Math.round(hours).toLocaleString('en-GB')} h`, { size: 'small', anchor: x(hours) + 60 > X1 ? 'end' : undefined, fill: x(hours) + 60 > X1 ? COL.paper : COL.ink, bold: true }),
    ];
    parts.push(...bar(44, 'Spinning', spin, COL.yarn), ...bar(84, 'Weaving', weave, COL.cloth));
    const metres = yarnMetres(piece.area, threads);
    parts.push(label(X0, 132, `${metres.toLocaleString('en-GB')} m of yarn in ${piece.area} m² of cloth`, { size: 'small' }));
    parts.push(label(12, 20, piece.name, { bold: true }));
    redraw(g, ...parts);
    const ratio = spin / weave;
    const days = spin / 10;
    f.readout.textContent = `Spinning ${piece.phrase} takes about ${Math.round(spin).toLocaleString('en-GB')} hours, ${days >= 365 ? `${(days / 300).toFixed(1)} working years` : `${Math.round(days)} ten-hour days`}, at ${rate} m an hour. Weaving it takes about ${Math.round(weave).toLocaleString('en-GB')} hours, so one weaver needs about ${Math.round(ratio)} spinners to keep busy.`;
    if (piece === PIECES[2]) t.done();
  };

  const pick = choices(PIECES.map((p) => p.name), (i) => { piece = PIECES[i]; threads = piece.threads; dens.set(threads); paint(); });
  const dens = slider('Threads per cm', { min: 4, max: 40, step: 1, value: threads, show: (v) => `${v} each way`, onInput: (v) => { threads = v; paint(); }, color: 'cloth' });
  const speed = slider('Spinning speed', { steps: [20, 30, 40, 60, 80, 100, 150, 200], value: rate, show: (v) => `${v} m an hour`, onInput: (v) => { rate = v; paint(); }, color: 'yarn' });
  pick.pick(0);
  f.controls.append(pick.node, dens.node, speed.node);
  paint();
  return f.node;
});
