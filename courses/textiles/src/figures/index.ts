// Each diagram id the lessons name, to its code. The charts (timeline, tree,
// scale, plate) and the live charts (hotspots, groups, loop and the rest) are
// drawn from a lesson's JSON alone; the course's own figures are below them.

import { charts } from 'didactics/charts';
import { liveCharts } from 'didactics/live-charts';
import type { FigureFactory } from 'didactics/figure';
import { asset } from '../asset';
import { photoById } from '../photos';
import { checkFigure } from './check';
import { COL } from './kit';
import { photoFigure } from './photo';
import { twistFigure } from './twist';
import { fibresStill } from './fibres';
import { spinHoursFigure } from './spin-hours';
import { weaveFigure } from './weave';
import { knitFigure } from './knit';
import { vatFigure, washFigure } from './dye';
import { silkRoutesFigure } from './silk-routes';
import { sericultureStill } from './sericulture';
import { patternFigure } from './pattern-loom';
import { wordsStill } from './words';
import { woolMapStill } from './wool-map';
import { incaMapStill, khipuStill } from './inca';
import { monsoonFigure } from './monsoon';
import { hoursFigure } from './hours';
import { flowsStill } from './flows';
import { workshopFigure } from './workshop';
import { jennyPaysFigure } from './jenny-pays';

export const FIGURES: Readonly<Record<string, FigureFactory>> = {
  ...charts({ palette: COL, asset }),
  ...liveCharts({ palette: COL, asset, photos: { find: photoById, src: (p) => asset(p.file) } }),
  photo: photoFigure,
  check: checkFigure,
  twist: twistFigure,
  fibres: fibresStill,
  'spin-hours': spinHoursFigure,
  weave: weaveFigure,
  knit: knitFigure,
  wash: washFigure,
  vat: vatFigure,
  'silk-routes': silkRoutesFigure,
  sericulture: sericultureStill,
  'pattern-loom': patternFigure,
  'cloth-words': wordsStill,
  'wool-map': woolMapStill,
  'inca-map': incaMapStill,
  khipu: khipuStill,
  monsoon: monsoonFigure,
  hours: hoursFigure,
  'trade-flows': flowsStill,
  workshop: workshopFigure,
  'jenny-pays': jennyPaysFigure,
};
