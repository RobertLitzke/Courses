// Lesson 8: how a loom stores a pattern. The reader paints a motif on a grid
// of warp threads (columns) and picks (rows), or loads one. On a shaft loom
// every warp thread that behaves differently needs its own shaft, so the
// figure counts the distinct columns: a mirror-symmetric motif needs about
// half as many as a lopsided one. On a drawloom the warp is tied in cords and
// a second worker, the drawboy, pulls one prepared bundle (a lash) per pick,
// so the number of kinds of thread no longer matters; what is stored is one
// lash per row, and the cost is a second worker on every pick.
// Goal 'many': a motif that needs ten or more shafts, seen on both looms.

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame } from './kit';

export const COLS = 16;
export const ROWS = 12;
export type Motif = boolean[][];

const art = (rows: string[]): Motif => rows.map((r) => [...r].map((c) => c === '#'));

export const MOTIFS: Record<string, Motif> = {
  Diamond: art([
    '................',
    '.......##.......',
    '......####......',
    '.....##..##.....',
    '....##....##....',
    '...##..##..##...',
    '...##..##..##...',
    '....##....##....',
    '.....##..##.....',
    '......####......',
    '.......##.......',
    '................',
  ]),
  Bird: art([
    '................',
    '..........##....',
    '.........####...',
    '.........#.###..',
    '..#.....#####...',
    '..##...#####....',
    '...########.....',
    '....#######.....',
    '.....#####......',
    '......#..#......',
    '.....##..##.....',
    '................',
  ]),
};

/** How many shafts a shaft loom needs: one for each different column (a thread that rises on a different set of picks). */
export function shaftsNeeded(m: Motif): number {
  const kinds = new Set<string>();
  for (let c = 0; c < COLS; c++) kinds.add(m.map((row) => (row[c] ? '1' : '0')).join(''));
  return kinds.size;
}

/** Threads raised on each pick: the cords the drawboy pulls. */
export const cordsPerPick = (m: Motif): number[] => m.map((row) => row.filter(Boolean).length);

const W = 520;
const H = 240;
const CELL = 15;
const GX = 20;
const GY = 30;

export const patternFigure = figure(['many'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let motif: Motif = MOTIFS.Diamond.map((r) => [...r]);
  let loom: 'shaft' | 'draw' = 'shaft';
  const seen = new Set<string>();

  const paint = () => {
    const parts: SVGElement[] = [];
    const n = shaftsNeeded(motif);
    // The cloth: lifted warp shows as blue (the pattern), the rest as the weft's colour.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = svg('rect', {
          x: GX + c * CELL, y: GY + r * CELL, width: CELL - 1, height: CELL - 1,
          fill: motif[r][c] ? COL.warp : COL.weft, style: 'cursor:pointer', role: 'button',
          'aria-label': `Warp ${c + 1}, pick ${r + 1}${motif[r][c] ? ', raised' : ''}`,
        });
        cell.addEventListener('click', () => { motif[r][c] = !motif[r][c]; paint(); });
        parts.push(cell);
      }
    }
    parts.push(label(GX + (COLS * CELL) / 2, GY - 10, 'Tap squares: blue = warp raised', { size: 'small', anchor: 'middle', soft: true }));
    const px = GX + COLS * CELL + 30;
    if (loom === 'shaft') {
      // One small bar per shaft needed; four is an ordinary loom's limit.
      parts.push(label(px, GY - 10, `Shafts needed: ${n}`, { bold: true }));
      for (let k = 0; k < n; k++) {
        parts.push(svg('rect', { x: px + (k % 10) * 18, y: GY + Math.floor(k / 10) * 40, width: 12, height: 32, rx: 2, fill: k < 4 ? COL.cloth : COL.you }));
      }
      parts.push(label(px, GY + 120, 'Blue: what a plain 4-shaft loom has.', { size: 'small', soft: true }));
      parts.push(label(px, GY + 134, 'Orange: extra pattern shafts.', { size: 'small', soft: true }));
      parts.push(label(px, GY + 160, 'Each shaft lifts every warp thread', { size: 'small' }));
      parts.push(label(px, GY + 174, 'that behaves the same way.', { size: 'small' }));
    } else {
      const cords = cordsPerPick(motif);
      parts.push(label(px, GY - 10, `Lashes: ${ROWS}, one per pick`, { bold: true }));
      for (let r = 0; r < ROWS; r++) {
        parts.push(svg('rect', { x: px, y: GY + r * CELL + 2, width: Math.max(1, cords[r] * 8), height: CELL - 5, fill: COL.you }));
        parts.push(label(px + Math.max(1, cords[r] * 8) + 4, GY + r * CELL + 11, `${cords[r]}`, { size: 'small', soft: true }));
      }
      parts.push(label(px, GY + ROWS * CELL + 16, 'Cords the drawboy pulls on each pick', { size: 'small', soft: true }));
    }
    redraw(g, ...parts);
    const sym = n <= Math.ceil(COLS / 2) + 1;
    f.readout.textContent = loom === 'shaft'
      ? `This motif has ${n} different kinds of warp thread, so a shaft loom needs ${n} shafts, threaded once and lifted in order pick by pick.${sym ? ' A mirror-image motif reuses its columns, which keeps the count down.' : ' A lopsided motif has few matching columns, so the count climbs.'}`
      : `The drawboy pulls one prepared lash of cords for each of the ${ROWS} picks, so any motif fits, however many kinds of thread it has. The cost is a second worker, pulling on every pick.`;
    if (n >= 10) seen.add(loom);
    if (seen.size === 2) t.done();
  };

  const presets = choices(Object.keys(MOTIFS), (i) => { motif = Object.values(MOTIFS)[i].map((r) => [...r]); paint(); });
  const looms = choices(['Shaft loom', 'Drawloom'], (i) => { loom = i === 0 ? 'shaft' : 'draw'; paint(); });
  presets.pick(0);
  looms.pick(0);
  f.controls.append(presets.node, looms.node);
  paint();
  return f.node;
});
