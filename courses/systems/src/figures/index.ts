// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the live charts (hotspots, compare, timeline-live,
// scale-guess, groups, id-key, id-drill, clue-board, loop, regroup) are drawn
// from a lesson's JSON alone. Each lesson's own figures are in
// src/figures/<lesson id>.ts, which exports them as FIGS; the system diagrams
// they draw with are models/sysdiagram, in this course's colours (diagram.ts).

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';

/** Every lesson's figures file (src/figures/<lesson id>.ts), each exporting FIGS. */
const lessonFigures = import.meta.glob<Record<string, FigureFactory>>(['./*.ts', '!./index.ts', '!./kit.ts', '!./plot.ts', '!./check.ts', '!./photo.ts', '!./diagram.ts'], { eager: true, import: 'FIGS' });

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  photo: photoFigure,
  check: checkFigure,
  ...Object.assign({}, ...Object.values(lessonFigures).filter(Boolean)),
};
