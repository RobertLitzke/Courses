// Lesson 13: cloth in the 18th-century Atlantic and Indian Ocean trades, as
// a still. Indian cloth went to London and on to West Africa, with Manchester
// imitations beside it; captives were carried from West Africa to the
// Americas; sugar and, later, raw cotton went to Britain. Gujarati cloth also
// went directly to East Africa. Arrows show the direction of each flow.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL } from './kit';
import { route, worldMap, type LonLat } from './world';

const W = 560;
const MAP = worldMap({ lon: [-100, 92], lat: [-42, 60] }, W);

interface Flow { path: LonLat[]; color: string; text: string; at: LonLat; width?: number }

export const FLOWS: readonly Flow[] = [
  { path: [[72.8, 19], [62, 8], [52, -8], [42, -30], [20, -38], [2, -30], [-12, -12], [-22, 8], [-22, 32], [-12, 46], [-4, 50.5]], color: COL.yarn, text: 'Indian cloth to London', at: [12, -24] },
  { path: [[-3, 51], [-10, 40], [-17, 20], [-8, 5]], color: COL.yarn, text: 'Indian cloth re-exported', at: [-48, 30], width: 4 },
  { path: [[-5, 50], [-14, 38], [-19, 19], [-12, 7]], color: COL.overland, text: 'and Manchester imitations', at: [-48, 25] },
  { path: [[-2, 4], [-30, 4], [-60, 14], [-74, 18]], color: COL.enslaved, text: 'captives to the Americas', at: [-38, -1], width: 4 },
  { path: [[-70, 22], [-50, 34], [-25, 46], [-6, 51]], color: COL.gold, text: 'sugar, later raw cotton', at: [-45, 42] },
  { path: [[69, 22], [58, 10], [42, -3]], color: COL.yarn, text: 'Gujarati cloth', at: [62, 0] }, { path: [], color: COL.yarn, text: 'to East Africa', at: [62, -5] },
];

function ends(f: Flow): SVGElement {
  // An arrowhead at the end of the path, pointing along its last segment.
  const [ax, ay] = MAP.xy(f.path.at(-2)!);
  const [bx, by] = MAP.xy(f.path.at(-1)!);
  const a = Math.atan2(by - ay, bx - ax);
  const p = (da: number, r: number) => `${bx - r * Math.cos(a + da)},${by - r * Math.sin(a + da)}`;
  return svg('polygon', { points: `${bx},${by} ${p(0.5, 10)} ${p(-0.5, 10)}`, fill: f.color });
}

export function flowsStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, MAP.h);
  s.append(MAP.base);
  for (const f of FLOWS) {
    if (f.path.length > 1) s.append(route(MAP, f.path, f.color, f.width ?? 3), ends(f));
    const [x, y] = MAP.xy(f.at);
    s.append(label(x, y, f.text, { size: 'small', anchor: 'middle', bold: true, fill: f.color === COL.gold ? '#8a6a12' : f.color, halo: COL.paper, haloWidth: 3 }));
  }
  return { node };
}
