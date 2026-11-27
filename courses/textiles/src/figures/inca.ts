// Lesson 11: the Inca state's cloth, as two stills. The road and storehouse
// map shows the two trunk roads of the Qhapaq Ñan, Cusco, and the big
// storehouse sites sized by how many qullqa they had. The khipu still shows
// how a pendant cord records a number: clusters of single knots for hundreds
// and tens, a long knot for units.

import { svg } from 'didactics/dom';
import { label, line, still } from 'didactics/draw';
import { COL } from './kit';
import { place, route, worldMap, type LonLat } from './world';

const W = 420;
const MAP = worldMap({ lon: [-84, -60], lat: [-23, 1] }, W);

const AT = {
  quito: [-78.5, -0.2], tumbes: [-80.45, -3.57], caxas: [-79.6, -5.1], cajamarca: [-78.5, -7.16], huanuco: [-76.6, -9.87],
  xauxa: [-75.5, -11.8], cusco: [-71.97, -13.53], titicaca: [-69.4, -15.8], cotapachi: [-66.2, -17.4], santiago: [-70.65, -33.45],
  paracas: [-76.25, -13.8], wari: [-74.2, -13.06], chincha: [-76.13, -13.4], arequipa: [-71.5, -16.4], atacama: [-68.2, -22.9],
  pachacamac: [-76.9, -12.25], trujillo: [-79.03, -8.1], maule: [-72.3, -35.3],
} satisfies Record<string, LonLat>;

/** Storehouse counts at a few excavated sites (rounded). */
export const STOREHOUSES: readonly { at: keyof typeof AT; name: string; n: number }[] = [
  { at: 'cotapachi', name: 'Cotapachi', n: 2400 },
  { at: 'xauxa', name: 'Hatun Xauxa', n: 2000 },
  { at: 'huanuco', name: 'Huánuco Pampa', n: 500 },
];

export function incaMapStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, MAP.h);
  s.append(MAP.base);
  s.append(
    route(MAP, [AT.quito, AT.caxas, AT.cajamarca, AT.huanuco, AT.xauxa, AT.cusco, AT.titicaca, [-67.5, -19], AT.atacama, [-67.6, -24]], COL.overland, 2.5),
    route(MAP, [AT.titicaca, AT.cotapachi], COL.overland, 1.5),
    route(MAP, [AT.tumbes, AT.trujillo, AT.pachacamac, AT.chincha, [-74, -15.8], [-71.5, -17.6], [-70.3, -20], [-70.2, -24]], COL.overland, 1.5),
    route(MAP, [AT.pachacamac, AT.xauxa], COL.overland, 1.2, true),
    route(MAP, [AT.chincha, AT.cusco], COL.overland, 1.2, true),
  );
  for (const st of STOREHOUSES) {
    const [x, y] = MAP.xy(AT[st.at]);
    s.append(svg('circle', { cx: x, cy: y, r: Math.sqrt(st.n) / 3, fill: COL.gold, opacity: 0.6 }));
  }
  const names: [keyof typeof AT, string, { left?: boolean; up?: boolean }][] = [
    ['quito', 'Quito', {}], ['caxas', 'Caxas', { left: true }], ['cajamarca', 'Cajamarca', {}], ['huanuco', 'Huánuco Pampa', {}],
    ['xauxa', 'Hatun Xauxa', {}], ['cusco', 'Cusco', { up: true }], ['titicaca', 'Lake Titicaca', { left: true }], ['cotapachi', 'Cotapachi', {}], 
    ['paracas', 'Paracas', { left: true }], ['wari', 'Wari', {}],
  ];
  for (const [k, name, o] of names) s.append(place(MAP, AT[k], name, o));
  const [kx, ky] = MAP.xy([-83, -16]);
  const [cx, cy] = MAP.xy([-67.4, -22.2]);
  s.append(label(cx + 4, cy, 'to central Chile', { size: 'small', halo: COL.land }));
  s.append(
    svg('line', { x1: kx, y1: ky, x2: kx + 16, y2: ky, stroke: COL.overland, 'stroke-width': 2.5 }), label(kx + 20, ky + 4, 'Inca roads', { size: 'small' }),
    svg('circle', { cx: kx + 8, cy: ky + 18, r: 6, fill: COL.gold, opacity: 0.6 }), label(kx + 20, ky + 22, 'storehouses,', { size: 'small' }),
    label(kx + 20, ky + 34, 'sized by count', { size: 'small' }),
  );
  return { node };
}

/** The knots on one pendant cord for a whole number, as Inca accountants tied them (units as a long knot, 1 as a figure eight). */
export function knotsFor(n: number): { place: number; count: number; kind: 'single' | 'long' | 'eight' }[] {
  const digits = String(n).split('').map(Number).reverse();
  return digits.map((d, place) => ({ place, count: d, kind: place > 0 ? 'single' : d === 1 ? 'eight' : 'long' } as const)).filter((k) => k.count > 0);
}

export function khipuStill(): { node: HTMLElement } {
  const KW = 420;
  const KH = 256;
  const { node, svg: s } = still(KW, KH);
  const top = 30;
  s.append(line(20, top, KW - 20, top, COL.fibre, 5), label(KW / 2, 18, 'Main cord', { size: 'small', anchor: 'middle', soft: true }));
  const values = [352, 41, 1203, 7];
  const tiers = [190, 140, 95, 60]; // y of units, tens, hundreds, thousands
  values.forEach((v, i) => {
    const x = 70 + i * 90;
    s.append(line(x, top, x, KH - 34, i % 2 ? COL.madder : COL.yarn, 3));
    for (const k of knotsFor(v)) {
      const y = tiers[k.place];
      if (k.kind === 'single') {
        for (let j = 0; j < k.count; j++) s.append(svg('circle', { cx: x, cy: y - j * 7 + (k.count - 1) * 3.5, r: 3.6, fill: COL.ink }));
      } else if (k.kind === 'long') {
        s.append(svg('rect', { x: x - 4, y: y - k.count * 3, width: 8, height: k.count * 6, rx: 3, fill: COL.ink }));
        for (let j = 1; j < k.count; j++) s.append(line(x - 4, y - k.count * 3 + j * 6, x + 4, y - k.count * 3 + j * 6, COL.paper, 0.8));
      } else {
        s.append(svg('path', { d: `M${x - 4} ${y - 6} C${x + 8} ${y - 2} ${x - 8} ${y + 2} ${x + 4} ${y + 6}`, fill: 'none', stroke: COL.ink, 'stroke-width': 3 }));
      }
    }
    s.append(label(x, KH - 18, v.toLocaleString('en-GB'), { size: 'note', bold: true, anchor: 'middle' }));
  });
  const names = ['units', 'tens', 'hundreds', 'thousands'];
  tiers.forEach((y, i) => s.append(label(KW - 16, y + 3, names[i], { size: 'small', anchor: 'end', soft: true })));
  return { node };
}
