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
  /** The prisoner's dilemma (lesson 11): always cooperate, always defect, tit for tat. */
  coop: '#3f8f5a',
  defect: '#b4372f',
  tft: '#3f6f8f',
  /** Lesson 21: nihilism, existentialism and absurdism told apart. */
  nihilism: '#5a5560',
  existentialism: '#3f6f8f',
  absurdism: '#8a5aa8',
  /** Lesson 22: Rawls's rule (the best worst-off) and Harsanyi's (the best average). */
  rawls: '#3f6f8f',
  harsanyi: '#b0546a',
  /** Where an idea stands now (lesson 25): still argued over, respected history, abandoned. */
  argued: '#3f8f5a',
  history: '#b08a3e',
  abandoned: '#7d7782',
  /** Branch E1: Stoic and Daoist advice. */
  stoic: '#3f6f8f',
  daoist: '#4d7a5a',
  /** Branch E2: the three kinds of debate in Nyaya. */
  vada: '#3f8f5a',
  jalpa: '#d4582a',
  vitanda: '#7d5a9a',
  /** What a text really says, and what it is wrongly quoted as saying. */
  said: '#3f6f8f',
  unsaid: '#a89a8a',
  /** Branch K1: four common fallacies. */
  strawman: '#d4582a',
  personal: '#b0546a',
  falsechoice: '#7d5a9a',
  circular: '#3f6f8f',
  /** Branch K3: three theories of vague words. */
  fuzzy: '#d4582a',
  superval: '#3f6f8f',
  epistemic: '#7d5a9a',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);
