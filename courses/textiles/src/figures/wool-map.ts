// Lesson 10: where England's wool went in the 14th century. A still map:
// the wool regions, the export ports, the Calais staple, the Flemish cloth
// towns, and the routes to Florence overland through France and by sea in
// Italian galleys. Line width shows roughly how much went each way.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL } from './kit';
import { place, route, worldMap, type LonLat } from './world';

const W = 520;
const MAP = worldMap({ lon: [-8, 16], lat: [42, 55] }, W);

const AT = {
  cotswolds: [-1.9, 51.8], lincs: [-0.4, 53.2], marches: [-2.9, 52.3], london: [-0.1, 51.5], boston: [0.0, 53.0],
  southampton: [-1.4, 50.9], calais: [1.86, 50.95], bruges: [3.22, 51.21], ghent: [3.72, 51.05], ypres: [2.88, 50.85],
  dordrecht: [4.67, 51.81], troyes: [4.07, 48.3], florence: [11.25, 43.77], genoa: [8.93, 44.4],
} satisfies Record<string, LonLat>;

export function woolMapStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, MAP.h);
  s.append(MAP.base);
  // Wool country.
  for (const k of ['cotswolds', 'lincs', 'marches'] as const) {
    const [x, y] = MAP.xy(AT[k]);
    s.append(svg('ellipse', { cx: x, cy: y, rx: 22, ry: 14, fill: COL.fibre, opacity: 0.5 }));
  }
  s.append(
    route(MAP, [AT.boston, [1.5, 52.6], [2.6, 51.6], AT.bruges], COL.fibre, 6),
    route(MAP, [AT.london, [1.2, 51.5], AT.calais], COL.fibre, 7),
    route(MAP, [AT.calais, [2.6, 51.0], AT.bruges], COL.fibre, 4),
    route(MAP, [AT.london, [2.2, 51.9], AT.dordrecht], COL.fibre, 2.5, true),
    route(MAP, [AT.bruges, [4.2, 49.8], AT.troyes, [6.5, 46.5], [9.2, 45.5], AT.genoa, AT.florence], COL.overland, 2.5),
    route(MAP, [AT.southampton, [-3, 50.2], [-5.6, 49.4], [-7, 47.8], [-7.8, 45.5]], COL.bysea, 2.5, true),
  );
  const names: [keyof typeof AT, string, { left?: boolean; up?: boolean }][] = [
    ['london', 'London', { left: true }], ['boston', 'Boston', { up: true }], ['southampton', 'Southampton', { left: true, up: true }],
    ['calais', 'Calais (staple)', { left: true }], ['bruges', 'Bruges', { up: true }], ['ghent', 'Ghent', {}], ['ypres', 'Ypres', {}],
    ['dordrecht', 'Dordrecht', { up: true }], ['troyes', 'Troyes', {}], ['florence', 'Florence', {}], ['genoa', 'Genoa', { left: true }],
  ];
  for (const [k, name, o] of names) s.append(place(MAP, AT[k], name, o));
  const [gx, gy] = MAP.xy([-7.8, 45.3]);
  s.append(label(gx, gy + 16, 'Italian galleys', { size: 'small', halo: COL.sea }), label(gx, gy + 28, 'to Italy', { size: 'small', halo: COL.sea }));
  const [wx, wy] = MAP.xy([-5.6, 54.6]);
  s.append(
    svg('ellipse', { cx: wx + 8, cy: wy, rx: 9, ry: 6, fill: COL.fibre, opacity: 0.5 }), label(wx + 22, wy + 4, 'best wool country', { size: 'small' }),
    svg('line', { x1: wx, y1: wy + 18, x2: wx + 16, y2: wy + 18, stroke: COL.fibre, 'stroke-width': 5 }), label(wx + 22, wy + 22, 'raw wool shipped', { size: 'small' }),
    svg('line', { x1: wx, y1: wy + 36, x2: wx + 16, y2: wy + 36, stroke: COL.overland, 'stroke-width': 2.5 }), label(wx + 22, wy + 40, 'overland to Italy', { size: 'small' }),
  );
  return { node };
}
