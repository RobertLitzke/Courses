// Lesson 7: silk routes over 3,800 years. A slider steps through five
// periods. Gold dots are places where silkworms (or wild silk moths) were
// being used by then, and they accumulate; brown lines are the main overland
// routes, blue lines the main sea routes, dashed where traffic was thin. The
// point is that the network was many routes, that sea routes grew in
// importance, and that sericulture left China long before 1300.
// Goal 'mongol': the reader reaches the last period.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, figure, frame, slider } from './kit';
import { place, route, worldMap, type LonLat } from './world';

const W = 560;
const MAP = worldMap({ lon: [-10, 145], lat: [-12, 55] }, W);

const P = {
  changan: [108.9, 34.3], luoyang: [112.4, 34.6], dunhuang: [94.7, 40.1], kashgar: [76.0, 39.5], khotan: [79.9, 37.1],
  samarkand: [67.0, 39.6], merv: [61.8, 37.6], ctesiphon: [44.6, 33.1], baghdad: [44.4, 33.3], antioch: [36.2, 36.2],
  tyre: [35.2, 33.3], constantinople: [29.0, 41.0], rome: [12.5, 41.9], alexandria: [29.9, 31.2], berenike: [35.5, 23.9],
  muziris: [76.2, 10.2], barygaza: [73.0, 21.7], harappa: [72.9, 30.6], guangzhou: [113.3, 23.1], quanzhou: [118.6, 24.9],
  calicut: [75.8, 11.3], hormuz: [56.5, 27.1], silla: [129.2, 35.8], nara: [135.8, 34.7], henan: [113.3, 34.8],
  cordoba: [-4.8, 37.9], lucca: [10.5, 43.8], tabriz: [46.3, 38.1],
} satisfies Record<string, LonLat>;

// Waypoints that keep the sea routes at sea.
const RED_SEA: LonLat[] = [P.berenike, [38.5, 19], [43.4, 12.6], [52, 13]];
const TO_INDIA: LonLat[] = [...RED_SEA, [66, 12], P.muziris];
const INDIA_TO_CHINA: LonLat[] = [P.muziris, [77.5, 7], [82, 5.5], [95, 6], [100.5, 3.5], [104.5, 1.5], [108, 9], [112, 18], P.guangzhou];
const GULF: LonLat[] = [P.baghdad, [47.8, 30.2], [51, 27.5], P.hormuz, [59, 23], [66, 17], P.calicut];
const LAND_HAN: LonLat[] = [P.changan, [103.8, 36.1], P.dunhuang, [89, 40.5], P.kashgar, P.samarkand, P.merv, P.ctesiphon, P.antioch, P.tyre];
const LAND_WEST: LonLat[] = [P.merv, P.tabriz, [38, 40], P.constantinople];

interface Period {
  name: string;
  /** Places using silkworms or wild silk by now (they stay once added). */
  silk: (keyof typeof P)[];
  land: { pts: LonLat[]; thin?: boolean }[];
  sea: { pts: LonLat[]; thin?: boolean }[];
  towns: (keyof typeof P)[];
  say: string;
}

export const PERIODS: readonly Period[] = [
  {
    name: 'About 2500 BC',
    silk: ['henan', 'harappa'],
    land: [], sea: [], towns: [],
    say: 'Silk from the domestic silkworm is already being made in the Yellow River valley. Far to the west, people of the Indus cities are using silk from wild moths. No long-distance silk trade is known yet.',
  },
  {
    name: 'About 100 BC to AD 100',
    silk: ['changan'],
    land: [{ pts: LAND_HAN }, { pts: [P.alexandria, P.berenike], thin: true }],
    sea: [{ pts: TO_INDIA }, { pts: [[66, 12], P.barygaza] }],
    towns: ['changan', 'dunhuang', 'samarkand', 'merv', 'tyre', 'rome', 'alexandria', 'muziris'],
    say: 'Han China pushes its garrisons west to Dunhuang. Silk passes from hand to hand through Central Asia and Parthian Persia, and Roman ships sail from Egyptian Red Sea ports to India on the monsoon. Rome buys silk without knowing how it is made.',
  },
  {
    name: 'About AD 300 to 600',
    silk: ['silla', 'nara', 'khotan', 'constantinople'],
    land: [{ pts: LAND_HAN }, { pts: LAND_WEST }],
    sea: [{ pts: TO_INDIA }, { pts: INDIA_TO_CHINA, thin: true }],
    towns: ['changan', 'dunhuang', 'khotan', 'samarkand', 'merv', 'ctesiphon', 'constantinople', 'muziris', 'guangzhou'],
    say: 'Sogdian merchants from Samarkand run much of the overland trade. Silkworms are raised in Korea, Japan and the oasis kingdom of Khotan, and in about 552 eggs reach Constantinople. China no longer has the only silkworms.',
  },
  {
    name: 'About 750 to 1000',
    silk: ['merv', 'baghdad', 'cordoba'],
    land: [{ pts: LAND_HAN, thin: true }],
    sea: [{ pts: INDIA_TO_CHINA }, { pts: GULF }, { pts: TO_INDIA, thin: true }],
    towns: ['changan', 'guangzhou', 'calicut', 'baghdad', 'constantinople', 'cordoba', 'samarkand'],
    say: 'After the An Lushan rebellion of 755 the Tang state stops paying its western garrisons in silk, and overland traffic thins. Ships from the Persian Gulf sail to Guangzhou and back. Silk is woven from Persia to Spain.',
  },
  {
    name: 'About 1300',
    silk: ['lucca'],
    land: [{ pts: LAND_HAN }, { pts: LAND_WEST }],
    sea: [{ pts: [...INDIA_TO_CHINA.slice(0, -2), [116, 21], P.quanzhou] }, { pts: GULF }, { pts: TO_INDIA }],
    towns: ['luoyang', 'quanzhou', 'calicut', 'hormuz', 'tabriz', 'constantinople', 'lucca', 'samarkand'],
    say: 'Under Mongol rule one empire spans most of the land route, and Italian merchants travel it. Quanzhou is one of the largest ports in the world. Italian cities such as Lucca now raise silkworms and weave silk themselves.',
  },
];

const NAMES: Partial<Record<keyof typeof P, string>> = {
  changan: "Chang'an", luoyang: 'Luoyang', dunhuang: 'Dunhuang', kashgar: 'Kashgar', khotan: 'Khotan', samarkand: 'Samarkand',
  merv: 'Merv', ctesiphon: 'Ctesiphon', baghdad: 'Baghdad', tyre: 'Tyre', constantinople: 'Constantinople', rome: 'Rome',
  alexandria: 'Alexandria', muziris: 'Muziris', guangzhou: 'Guangzhou', quanzhou: 'Quanzhou', calicut: 'Calicut',
  hormuz: 'Hormuz', cordoba: 'Córdoba', lucca: 'Lucca', tabriz: 'Tabriz',
};
const LEFT = new Set(['changan', 'luoyang', 'guangzhou', 'quanzhou', 'baghdad', 'ctesiphon', 'tyre', 'alexandria', 'merv']);
const UP = new Set(['samarkand', 'constantinople', 'kashgar', 'tabriz', 'rome', 'lucca']);

export const silkRoutesFigure = figure(['mongol'], (_ctx, t) => {
  const f = frame(W, MAP.h, 3);
  const layer = svg('g');
  f.svg.append(MAP.base, layer);
  let at = 0;

  const paint = () => {
    const p = PERIODS[at];
    const silk = new Set(PERIODS.slice(0, at + 1).flatMap((q) => q.silk));
    const parts: SVGElement[] = [];
    for (const k of silk) {
      const [x, y] = MAP.xy(P[k]);
      parts.push(svg('circle', { cx: x, cy: y, r: 9, fill: COL.silk, opacity: 0.55 }));
    }
    for (const r of p.land) parts.push(route(MAP, r.pts, COL.overland, r.thin ? 1.5 : 3, r.thin));
    for (const r of p.sea) parts.push(route(MAP, r.pts, COL.bysea, r.thin ? 1.5 : 3, r.thin));
    for (const k of p.towns) parts.push(place(MAP, P[k], NAMES[k] ?? k, { left: LEFT.has(k), up: UP.has(k) }));
    // The key, in the open sea south of India.
    const [kx, ky] = MAP.xy([52, -2]);
    parts.push(
      svg('circle', { cx: kx + 6, cy: ky, r: 6, fill: COL.silk, opacity: 0.55 }), label(kx + 16, ky + 4, 'silk raised', { size: 'small' }),
      svg('line', { x1: kx, y1: ky + 16, x2: kx + 12, y2: ky + 16, stroke: COL.overland, 'stroke-width': 3 }), label(kx + 16, ky + 20, 'by land', { size: 'small' }),
      svg('line', { x1: kx, y1: ky + 32, x2: kx + 12, y2: ky + 32, stroke: COL.bysea, 'stroke-width': 3 }), label(kx + 16, ky + 36, 'by sea', { size: 'small' }),
      label(W - 8, 16, p.name, { bold: true, anchor: 'end', halo: COL.sea, haloWidth: 4 }),
    );
    redraw(layer, ...parts);
    f.readout.textContent = p.say;
    if (at === PERIODS.length - 1) t.done();
  };

  const s = slider('Period', { min: 0, max: PERIODS.length - 1, step: 1, value: 0, show: (v) => PERIODS[v].name, onInput: (v) => { at = v; paint(); }, color: 'silk' });
  f.controls.append(s.node);
  paint();
  return f.node;
});
