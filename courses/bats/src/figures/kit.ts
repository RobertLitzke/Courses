// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';
export * from './plot';

export const COL = {
  ink: '#22232b',
  soft: '#5d5f6b',
  paper: '#fbf9f3',
  grid: 'rgba(34, 35, 43, 0.14)',
  /** The bat itself: body, wings, a bat on a map. */
  bat: '#3f3550',
  /** Wing membrane, drawn lighter than the body. */
  wing: '#8a7a9c',
  /** The bat's own call, going out. */
  call: '#7a4fb8',
  /** The echo coming back. */
  echo: '#2b8f8c',
  /** Prey: moths and other insects. */
  moth: '#c98a2e',
  /** Other animals' sound: a moth's clicks, another bat's call (jamming). */
  noise: '#d0507a',
  /** Stored energy: fat, sugar, food eaten. */
  fat: '#e0a83a',
  /** Energy spent: metabolism, flight, the cost of warming up. */
  cost: '#b4553a',
  /** Cold: the cave, a bat in torpor. */
  cold: '#4a88b8',
  /** Warmth: a bat awake, a fever. */
  heat: '#c4462f',
  /** The white-nose fungus, and any pathogen. */
  fungus: '#9c9a6a',
  /** Flowers, fruit, forest: whatever a plant-eating bat visits. */
  plant: '#4f8a3c',
  /** Blood, in the vampire lesson. */
  blood: '#9b1d2a',
  water: '#2f6f8f',
  rock: '#9a917f',
  /** Birds, beside bats on the same chart. */
  bird: '#6b8f3a',
  /** A model's line, wherever it runs beside real numbers. */
  model: '#5b4b8a',
  /** Real counts and measurements: always dots, in ink. */
  data: '#22232b',
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

/** A count in words a reader takes in at a glance: 2,400, 1.3 million, 19 million. */
export function count(n: number): string {
  if (n >= 1e9) return `${sig(n / 1e9, 2)} billion`;
  if (n >= 1e6) return `${sig(n / 1e6, 2)} million`;
  return big(n);
}

/** Put a short name in front of a row of chips ("Rule:"), so it does not pass for a row of guesses. Returns the row. */
export function named<T extends { node: HTMLElement }>(row: T, name: string): T {
  const tag = document.createElement('span');
  tag.className = 'chip-label';
  tag.textContent = name;
  row.node.prepend(tag);
  return row;
}
