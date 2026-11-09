// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#1f2430',
  soft: '#5b6170',
  paper: '#fbfaf6',
  grid: 'rgba(31, 36, 48, 0.13)',
  /** A request on its way, and reads. */
  request: '#2f6fb8',
  /** A good answer coming back. */
  answer: '#2f9a6a',
  /** A failure: an error, a lost message, a part that is down. */
  error: '#c0392b',
  /** Load: how busy a part is, a queue backing up, waiting. */
  busy: '#d48a1e',
  /** A write: data being changed, a log being appended to. */
  write: '#b5562f',
  /** Data at rest: on disk, in a table, in a file. */
  data: '#6b5ca5',
  /** A cache, and anything served from memory. */
  cache: '#2a9aa0',
  /** Time and clocks: timestamps, versions, leases. */
  clock: '#8a6d2f',
  /** A leader, a primary, a master: the one in charge. */
  leader: '#a0458a',
  /** Money and cost. */
  cost: '#7a8a2a',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  good: '#3f8f5a',
  bad: '#c0392b',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);

/** A number with thousands separated: 40,000. */
export const big = (n: number) => Math.round(n).toLocaleString('en-US');

/** A number to `d` significant figures, without a run of zeros after the point. */
export const sig = (n: number, d = 2) => Number(n.toPrecision(d)).toLocaleString('en-US', { maximumFractionDigits: 6 });


/** Put a short name in front of a row of chips ("Rule:"), so it does not pass for a row of guesses. Returns the row. */
export function named<T extends { node: HTMLElement }>(row: T, name: string): T {
  const tag = document.createElement('span');
  tag.className = 'chip-label';
  tag.textContent = name;
  row.node.prepend(tag);
  return row;
}
