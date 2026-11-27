// Lesson 9: English cloth words on the map. Words named after a city sit on
// that city (dots); words borrowed from a language are listed over the
// region where it was spoken (boxes). A still: nothing here is a cause the
// reader can change.

import { svg } from 'didactics/dom';
import { label, still } from 'didactics/draw';
import { COL } from './kit';
import { place, worldMap, type LonLat } from './world';

const W = 560;
const MAP = worldMap({ lon: [-12, 128], lat: [-6, 56] }, W);

/** Words named after a city: the word, the city, where, and which side to label. */
export const CITY_WORDS: readonly { word: string; city: string; at: LonLat; left?: boolean; up?: boolean }[] = [
  { word: 'damask', city: 'Damascus', at: [36.3, 33.5], left: true },
  { word: 'muslin', city: 'Mosul', at: [43.1, 36.3], up: true },
  { word: 'baldachin', city: 'Baghdad', at: [44.4, 33.3] },
  { word: 'tabby', city: 'Baghdad', at: [44.4, 33.3] },
  { word: 'fustian', city: 'Fustat (Cairo)', at: [31.2, 30.0], left: true },
  { word: 'calico', city: 'Calicut', at: [75.8, 11.3], left: true },
  { word: 'cashmere', city: 'Kashmir', at: [74.8, 34.1], up: true },
  { word: 'satin', city: 'Quanzhou', at: [118.6, 24.9], left: true, up: true },
];

/** Words borrowed from a language: where to put the box and what it lists. */
export const LANGUAGE_WORDS: readonly { language: string; at: LonLat; words: string[] }[] = [
  { language: 'Arabic', at: [40, 19], words: ['cotton', 'mohair'] },
  { language: 'Persian', at: [75, 54], words: ['taffeta', 'seersucker', 'shawl', 'pyjama'] },
  { language: 'Hindi and Urdu', at: [83, 30], words: ['chintz', 'khaki', 'bandanna', 'dungaree'] },
  { language: 'Malay', at: [106, 6], words: ['gingham'] },
];

export function wordsStill(): { node: HTMLElement } {
  const { node, svg: s } = still(W, MAP.h);
  s.append(MAP.base);
  for (const l of LANGUAGE_WORDS) {
    const [x, y] = MAP.xy(l.at);
    const bw = 96;
    const bh = 16 + l.words.length * 12;
    s.append(
      svg('rect', { x: x - bw / 2, y, width: bw, height: bh, rx: 4, fill: COL.paper, stroke: COL.overland, 'stroke-width': 1, opacity: 0.92 }),
      label(x, y + 12, `from ${l.language}`, { size: 'small', bold: true, anchor: 'middle' }),
      ...l.words.map((word, i) => label(x, y + 24 + i * 12, word, { size: 'small', anchor: 'middle' })),
    );
  }
  // Group the city words by city so Baghdad shows both.
  const byCity = new Map<string, (typeof CITY_WORDS)[number][]>();
  for (const w of CITY_WORDS) byCity.set(w.city, [...(byCity.get(w.city) ?? []), w]);
  for (const [city, ws] of byCity) {
    const w = ws[0];
    s.append(place(MAP, w.at, `${ws.map((x) => x.word).join(', ')} (${city})`, { left: w.left, up: w.up, fill: COL.madder }));
  }
  return { node };
}
