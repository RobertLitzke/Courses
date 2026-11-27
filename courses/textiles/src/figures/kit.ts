// The colours that always mean the same thing, in every figure and in the
// text ([[words|key]]), and the figure kit with them filled in.

import { courseKit } from 'didactics/kit';

export * from 'didactics/figure';

export const COL = {
  ink: '#26211d',
  soft: '#625a52',
  paper: '#fbf8f2',
  grid: 'rgba(38, 33, 29, 0.14)',
  /** The reader's own guess or choice, wherever it is shown. */
  you: '#d98a3c',
  good: '#3f8f5a',
  bad: '#b4372f',
  /** Loose fibre, before it is spun. */
  fibre: '#b89a6a',
  /** Yarn. */
  yarn: '#c0697b',
  /** Woven or knitted cloth. */
  cloth: '#2f5d8a',
  /** The warp: the threads held under tension on the loom. Indigo, as in denim. */
  warp: '#2f5d8a',
  /** The weft: the thread passed across the warp. */
  weft: '#d9b98a',
  /** S twist and Z twist, the two directions a yarn can be twisted. */
  s: '#c0697b',
  z: '#2f7f8a',
  /** Dyes: madder red, indigo blue, indigo before it meets the air, and the dark of an iron mordant. */
  madder: '#b8342e',
  indigo: '#2b4a8a',
  leuco: '#a9b84a',
  iron: '#5a3d4a',
  /** Tyrian purple. */
  purple: '#6b2a5e',
  /** Gold, and the costliest cloth. */
  gold: '#c9a13a',
  /** Who did the work, in the hours bar: in the household, for wages, enslaved, or overseas. */
  household: '#c0697b',
  waged: '#d98a3c',
  enslaved: '#6b3a26',
  overseas: '#4d8fa3',
  /** Fibre recovered by shredding old cloth. */
  recycled: '#7a8c3a',
  /** Liquid water: rain, sweat that has condensed. */
  water: '#3f7fb5',
  /** Maps: sea, land and coastline. */
  sea: '#dfe8ea',
  land: '#f1ead9',
  coast: '#b9ad94',
  /** Trade routes over land and by sea. */
  overland: '#9a6324',
  bysea: '#1f6f8f',
  /** Where silkworms are raised. */
  silk: '#c9a13a',
  /** Where cotton or cloth came from, in charts. */
  usa: '#9c3b2f',
  india: '#3c7d4e',
  egypt: '#b38a1d',
  elsewhere: '#8c8279',
  britain: '#4a5f8f',
  japan: '#c2456b',
  /** Synthetic fibre in charts, and the two building blocks of a synthetic polymer chain. */
  synthetic: '#5b7fa8',
  unitA: '#5b7fa8',
  unitB: '#a86b9c',
  /** Regenerated cellulose (rayon, viscose) in charts. */
  wood: '#8a6d4f',
  china: '#7d5ba6',
  brazil: '#3a8fb7',
  uzbekistan: '#a0785a',
} as const;
export type ColorKey = keyof typeof COL;

/** The slider coloured by a palette key, prose with the palette filled in, and tint for a translucent fill (didactics/kit). */
export const { slider, prose, tint } = courseKit(COL);
