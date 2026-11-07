// The sand table (models/sandtable) in this course's colours: fresh and salt
// water, sediment, land and rock, and people's works keep their meaning.

import { sandLapse as lapse, mixHex, type LapseOptions, type SandLapse } from 'sandtable/lapse';
import { COL, slider, type FigureContext } from './kit';

export { laidDown, type SandLapse } from 'sandtable/lapse';

export const SAND_COLORS = {
  low: mixHex(COL.land, COL.paper, 0.45),
  high: mixHex(COL.rock, COL.ink, 0.2),
  sand: COL.sediment,
  water: COL.water,
  salt: COL.salt,
  works: COL.works,
  dye: COL.flow,
};

/** A time lapse of a table in this course's colours, its time slider in sediment brown. */
export const sandLapse = (ctx: FigureContext, o: Omit<LapseOptions, 'slider' | 'colors'>): SandLapse =>
  lapse(ctx, {
    ...o,
    colors: SAND_COLORS,
    slider: (label, min, max, step, value, show, onInput) => slider(label, min, max, step, value, show, onInput, 'sediment'),
  });
