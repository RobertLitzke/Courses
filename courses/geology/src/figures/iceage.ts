// The ice ages played on real relief: the northern ice sheets and the sea
// level over the last 130,000 years (lesson 17), and the Rhône glacier
// growing from the Alps to the Jura and back (lesson 15). Both are driven by
// the LR04 deep-sea record (lesson 16), turned into a share of the ice of the
// last glacial maximum; the shapes are simplified.

import { fromCell, hillshade, heightRamp, lakeMask, loadRelief, mapKey, mapLabels, mapView, reliefFor, rgb, type Relief } from 'didactics/maps';
import { el, svg } from 'didactics/dom';
import { redraw } from 'didactics/draw';
import { asset } from '../asset';
import { iceAt } from './pacemaker';
import { bedAt, elaFor, glacierLength, JURA_KM, thickness } from './ice';
import { figure, frame, player, slider } from './kit';

type LL = [number, number];

/** LR04 today and at the last glacial maximum, 21,000 years ago. */
const D_TODAY = iceAt(0);
const D_LGM = iceAt(20);
/** How much of the last glacial maximum's ice stood on land `ka` thousand years ago: 0 today, 1 at the maximum, a little below 0 in a warmer time. */
export const iceShare = (ka: number) => Math.max(-0.06, (iceAt(ka) - D_TODAY) / (D_LGM - D_TODAY));
/** Sea level, metres from today's: about 125 m lower at the maximum. */
export const seaLevel = (ka: number) => -125 * iceShare(ka);

const ICE: [number, number, number] = [246, 249, 252];
const SEA = rgb('#8fb8c9');
const LAKE = rgb('#9cc3d3');
const DRY_SHELF = rgb('#e6dcbc');

// ---- The northern ice sheets and the sea ---------------------------------------------------

/** The ice sheets at the last glacial maximum, simplified: each grows from and shrinks to its centre. */
const SHEETS: { name: string; centre: LL; edge: LL[]; always?: boolean }[] = [
  {
    name: 'Laurentide and Cordilleran', centre: [-88, 61],
    edge: [[-73, 40.6], [-75, 41], [-77.5, 41.5], [-80.5, 41.2], [-82.5, 39.8], [-85, 39], [-87.5, 38.6], [-90, 39.2], [-93, 41.5], [-96, 41.2], [-98.5, 43.5], [-101, 46.5], [-104, 48.5], [-110, 48.8], [-114, 48.5], [-118, 47.6], [-122.8, 47], [-124.8, 48.3], [-128.5, 51], [-132.5, 54], [-137, 57.5], [-141, 59.6], [-147, 60.3], [-152, 59.6], [-151, 62], [-145, 62.8], [-140, 63.5], [-137, 65.5], [-136, 68.5], [-128, 70], [-123, 73], [-118, 77.9], [-80, 77.9], [-73, 76.5], [-76, 72], [-66, 66.5], [-61.5, 60.5], [-57, 55], [-53, 49.5], [-55, 46.3], [-59.5, 43.6], [-65.5, 42.2], [-70, 41.2]],
  },
  {
    name: 'Greenland', centre: [-40, 72], always: true,
    edge: [[-73, 77.9], [-20, 77.9], [-18, 75], [-21.5, 70.5], [-29, 68], [-38, 65.5], [-43, 59.8], [-48, 61], [-52, 64.5], [-54.5, 69], [-57, 74.5], [-66, 76.5]],
  },
  {
    name: 'Eurasian', centre: [18, 64],
    edge: [[-10.5, 56], [-10.5, 53.5], [-10, 51.6], [-6, 51.6], [-4.5, 52.3], [-3, 52.5], [-0.5, 52.8], [2, 54.5], [5, 55.5], [8.5, 54.8], [10, 53.6], [13, 52.6], [17, 52.4], [21, 52.8], [24.5, 54], [28, 54.7], [31, 55], [33.5, 57], [36, 59.5], [40, 61.5], [45, 63.5], [45, 77.9], [10, 77.9], [-1, 74], [4, 64], [1.5, 61.5], [-2, 60.5], [-7, 59], [-9.5, 57.5]],
  },
];

/** Where a ray from `c` through `p` leaves the polygon, as a multiple of |p − c| (Infinity if it never does). */
function reach(c: LL, p: LL, poly: LL[]): number {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const s = ((a[0] - c[0]) * ey - (a[1] - c[1]) * ex) / den;
    const u = ((a[0] - c[0]) * dy - (a[1] - c[1]) * dx) / den;
    if (s > 0 && u >= 0 && u <= 1) best = Math.min(best, s);
  }
  return best;
}

/**
 * For each cell, the smallest size of its ice sheet (0 to 1 of the maximum's
 * reach from the centre) that covers it, or Infinity; and whether that sheet
 * is always there.
 */
function iceCover(r: Relief): { need: Float32Array; always: Uint8Array } {
  const need = new Float32Array(r.width * r.height).fill(Infinity);
  const always = new Uint8Array(r.width * r.height);
  for (let row = 0; row < r.height; row++) {
    for (let col = 0; col < r.width; col++) {
      const p = fromCell(r, col, row);
      const i = row * r.width + col;
      for (const s of SHEETS) {
        const k = 1 / reach(s.centre, p, s.edge);
        if (k <= 1 && k < need[i]) {
          need[i] = k;
          always[i] = s.always ? 1 : 0;
        }
      }
    }
  }
  return { need, always };
}

/** The size of the sheets for a share of the maximum's ice: radius grows about as the square root of the volume. */
const sheetSize = (share: number) => (share <= 0 ? 0 : Math.sqrt(share));

/** Sea level below which a place is dry: Bering Strait sill about 50 m, the Strait of Dover about 45 m, the Dogger Bank about 30 m. */
const BRIDGES: { name: string; depth: number; lonlat: LL }[] = [
  { name: 'Beringia', depth: -50, lonlat: [-163, 63.5] },
  { name: 'Doggerland', depth: -40, lonlat: [3, 53.6] },
];

function sayBridges(sea: number): string {
  const dry = BRIDGES.filter((b) => sea < b.depth).map((b) => b.name);
  return dry.length === 0 ? '' : dry.length === 1 ? ` ${dry[0]} is dry land.` : ` ${dry.join(' and ')} are dry land.`;
}

export const iceSheetsFigure = figure(['played'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  const START = 130;
  let pos = 0;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let cover: ReturnType<typeof iceCover> | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  let painted = -1;
  const marks = svg('g');
  const paint = () => {
    const ka = START - pos;
    if (pos >= START && t.goal === 'played') t.done();
    const share = iceShare(ka);
    const sea = seaLevel(ka);
    f.readout.textContent = ka < 0.5
      ? 'Today. Only Greenland’s ice is left, and the sea stands where it has stood for the last 6,000 years or so. Over a whole cycle, the ice took about 100,000 years to grow and about 10,000 to melt.'
      : `${Math.round(ka)},000 years ago: the ice sheets held ${share <= 0.03 ? 'no more ice than today' : `about ${Math.round(share * 100)}% as much ice as at their greatest`}, and the sea stood ${Math.abs(Math.round(sea))} m ${sea < 0 ? 'lower' : 'higher'} than today.${sayBridges(sea)}`;
    if (!relief || !view || !cover || !shade || !ramp) return;
    const key = Math.round(ka);
    if (key === painted) return;
    painted = key;
    const size = sheetSize(share);
    const { need, always } = cover;
    const ground = ramp;
    redraw(marks, ...mapLabels(view, BRIDGES.filter((b) => sea < b.depth).map((b) => ({ lon: b.lonlat[0], lat: b.lonlat[1], text: b.name, area: true }))));
    view.paint({
      shade, relief: 0.8, ground,
      colorAt: (i, z) => {
        if (need[i] <= (always[i] ? Math.max(0.93, size) : size)) return ICE;
        if (z <= sea) return SEA;
        if (z <= 0) return DRY_SHELF;
        return null;
      },
    });
  };
  const ts = slider('Time', 0, START, 1, 0, (v) => (v >= START ? 'today' : `${START - v},000 years ago`), (v) => { pos = v; paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 20 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/iceage').then((r) => {
      relief = r;
      shade = hillshade(r, undefined, 6);
      ramp = heightRamp(r);
      cover = iceCover(r);
      view = mapView(r, { alt: 'A shaded relief map of the northern hemisphere from Alaska to the Urals, with the ice sheets and the coastline changing over the last 130,000 years.' });
      view.svg.append(marks);
      const key = mapKey([{ text: 'Ice', color: '#e9eef3' }, { text: 'Sea', color: '#8fb8c9' }, { text: 'Sea floor laid dry', color: '#e6dcbc' }]);
      holder.replaceChildren(view.node, key, el('p.map-credit', {}, `Heights: ${r.meta.credit}. Ice and sea level from the LR04 deep-sea record; ice-sheet shapes simplified.`));
      painted = -1;
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});

// ---- The Rhône glacier on the map ----------------------------------------------------------

/** The ice's path, [lon, lat, km from the source], matching the long section in ice.ts; a second arm runs from Lausanne towards Geneva. */
const TRUNK: [number, number, number][] = [
  [8.38, 46.6, 0], [8.33, 46.52, 8], [8.13, 46.4, 25], [7.99, 46.32, 40], [7.88, 46.3, 50], [7.53, 46.29, 76],
  [7.36, 46.23, 90], [7.07, 46.1, 105], [7.0, 46.25, 120], [6.93, 46.38, 135], [6.63, 46.5, 155], [6.64, 46.78, 180],
  [6.92, 47.0, 205], [7.2, 47.12, 225], [7.55, 47.22, 250],
];
const ARM: [number, number, number][] = [[6.63, 46.5, 155], [6.35, 46.38, 180], [6.14, 46.2, 205]];

/** How far the ice can spread to each side of its path, km: narrow in the valley, a wide lobe on the plateau. */
const spread = (km: number) => (km < 14 ? 12 : km < 130 ? 9 : Math.min(40, 9 + (km - 130) * 0.6));

/** For each cell, km along the ice's path (or Infinity if too far to the side). */
function alongPath(r: Relief): Float32Array {
  const out = new Float32Array(r.width * r.height).fill(Infinity);
  const KX = 111.32 * Math.cos((46.6 * Math.PI) / 180);
  const KY = 110.57;
  for (let row = 0; row < r.height; row++) {
    for (let col = 0; col < r.width; col++) {
      const [lon, lat] = fromCell(r, col, row);
      let best = Infinity;
      let along = Infinity;
      for (const path of [TRUNK, ARM]) {
        for (let k = 1; k < path.length; k++) {
          const [x0, y0, a0] = path[k - 1];
          const [x1, y1, a1] = path[k];
          const ax = (x1 - x0) * KX;
          const ay = (y1 - y0) * KY;
          const px = (lon - x0) * KX;
          const py = (lat - y0) * KY;
          const u = Math.max(0, Math.min(1, (px * ax + py * ay) / (ax * ax + ay * ay)));
          const d = Math.hypot(px - u * ax, py - u * ay);
          if (d < best) {
            best = d;
            along = a0 + u * (a1 - a0);
          }
        }
      }
      if (best <= spread(along)) out[row * r.width + col] = along;
    }
  }
  return out;
}

/** The glacier's length for a cooling, remembered to a tenth of a degree. */
const lengths = new Map<number, number>();
export function lengthFor(cooling: number): number {
  const k = Math.round(cooling * 10) / 10;
  let v = lengths.get(k);
  if (v === undefined) {
    v = glacierLength(k, 1);
    lengths.set(k, v);
  }
  return v;
}

/** About how much colder the Alps were `ka` thousand years ago: 10 °C at the maximum, scaled by the ice in the deep-sea record. */
export const alpsCooling = (ka: number) => -10 * Math.max(0, iceShare(ka));

/** The lakes on the Rhône map, a point on each; the erratics lesson's still map lists the same. */
export const RHONE_LAKES = [[6.55, 46.45], [6.85, 46.9], [7.18, 47.1], [7.08, 46.93], [7.72, 46.69], [7.97, 46.73], [6.17, 45.85], [8.4, 45.82]].map(([lon, lat]) => ({ lon, lat }));

const RHONE_PLACES: [number, string][] = [[40, 'Brig'], [90, 'Sion'], [105, 'Martigny'], [135, 'Lake Geneva'], [180, 'the plateau'], [205, 'the Jura above Neuchâtel']];

export const rhoneMapFigure = figure(['played'], (ctx, t) => {
  const holder = el('div', {}, el('p.map-note', {}, 'Loading the map…'));
  const f = frame({ drawing: holder, lines: 3 });
  const START = 120;
  let pos = 0;
  let relief: Relief | null = null;
  let view: ReturnType<typeof mapView> | null = null;
  let along: Float32Array | null = null;
  let lakes: Uint8Array | null = null;
  let shade: Float32Array | null = null;
  let ramp: ReturnType<typeof heightRamp> | null = null;
  let farthest = 0;
  let painted = -1;
  const paint = () => {
    const ka = START - pos;
    const cooling = alpsCooling(ka);
    const len = lengthFor(cooling);
    if (ka >= START - 0.5) farthest = 0;
    farthest = Math.max(farthest, len);
    if (pos >= START && t.goal === 'played') t.done();
    const at = RHONE_PLACES.filter(([km]) => km <= len + 3).pop()?.[1];
    f.readout.textContent = `${ka < 0.5 ? 'Today' : `${Math.round(ka)},000 years ago`}: the Alps about ${Math.abs(cooling).toFixed(0)} °C colder than today, and the snowline near ${Math.round(elaFor(cooling, 1) / 100) * 100} m. The Rhône glacier is about ${Math.round(len)} km long${at ? `, reaching ${at}` : ''}.${farthest >= JURA_KM ? ' At its greatest it reached the Jura and left its boulders there.' : ''}`;
    if (!relief || !view || !along || !lakes || !shade || !ramp) return;
    const key = Math.round(len);
    if (key === painted) return;
    painted = key;
    const a = along;
    const wet = lakes;
    view.paint({
      shade, relief: 0.85, ground: ramp,
      colorAt: (i, z) => {
        const km = a[i];
        if (km <= len && z < bedAt(km) + thickness(km, len) + 150) return ICE;
        if (wet[i]) return LAKE;
        return null;
      },
    });
  };
  const ts = slider('Time', 0, START, 1, 0, (v) => (v >= START ? 'today' : `${START - v},000 years ago`), (v) => { pos = v; paint(); }, 'water');
  f.controls.append(player(ts, ctx, { seconds: 20 }).node, ts.node);
  paint();
  t.waitFor(
    reliefFor((p) => loadRelief(asset(p)), 'maps/rhone').then((r) => {
      relief = r;
      shade = hillshade(r, undefined, 1.5);
      ramp = heightRamp(r);
      along = alongPath(r);
      lakes = lakeMask(r, RHONE_LAKES);
      view = mapView(r, { alt: 'A shaded relief map of western Switzerland, from the Rhône glacier in the Alps to the Jura, with the glacier growing down the Rhône valley and across the plateau, then shrinking back.' });
      holder.replaceChildren(view.node, el('p.map-credit', {}, `Heights: ${r.meta.credit}. Glacier from the long-section model above, driven by the LR04 deep-sea record; simplified.`));
      painted = -1;
      paint();
    }).catch(() => holder.replaceChildren(el('p.map-note', {}, 'The map could not be loaded here.'))),
  );
  return f.node;
});
