// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';

export const COL = {
  ink: '#26211d',
  soft: '#625a52',
  paper: '#fbf8f2',
  grid: 'rgba(38, 33, 29, 0.14)',
  /** The reader's own answer, wherever it is shown. */
  you: '#d9824a',
  /** What professional philosophers answered (the PhilPapers Survey). */
  pros: '#4d8fa3',
  /** A claim being argued for. */
  claim: '#3f6f8f',
  /** An objection or counterexample against it. */
  objection: '#b0546a',
  /** Socrates and his questions. */
  socrates: '#a8492c',
  /** Anyone else in a dialogue: Euthyphro, Thrasymachus, a prisoner. */
  other: '#4d7a5a',
  /** Light: the fire, the sun, the truth in Plato's cave. */
  light: '#e3a632',
  /** Shadow and illusion. */
  shadow: '#5a5560',
  rock: '#9a8f80',
  good: '#3f8f5a',
  bad: '#b4372f',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);
