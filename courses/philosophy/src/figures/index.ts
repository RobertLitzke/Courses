// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the live charts (hotspots, groups, clue-board and the
// rest) are drawn from a lesson's JSON alone. The course's own figures: the
// verdict (every lesson), the dialogue, and the drawings of single lessons.

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { verdictFigure } from './verdict';
import { dialogueFigure } from './dialogue';
import { caveFigure } from './cave';

// The verdict and the dialogue are drawn from their options, so the gallery shows each block that uses them.
const each = (f: FigureFactory): FigureFactory => Object.assign(f, { each: true as const });

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  photo: photoFigure,
  check: checkFigure,
  verdict: each(verdictFigure),
  dialogue: each(dialogueFigure),
  cave: caveFigure,
};
