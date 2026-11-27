// Lesson 8: how a loom stores a pattern. The reader paints a motif on a grid
// of warp threads (columns) and picks (rows), or loads one. On a shaft loom
// every warp thread that behaves differently needs its own shaft, so the
// figure counts the distinct columns: a mirror-symmetric motif needs about
// half as many as a lopsided one. On a drawloom the warp is tied in cords and
// a second worker, the drawboy, pulls one prepared bundle (a lash) per pick,
// so the number of kinds of thread no longer matters; what is stored is one
// lash per row, and the cost is a second worker on every pick.
// Goal 'many': a motif that needs ten or more shafts, seen on both looms.
// Goal 'cards' (lesson 18) adds a third loom, the Jacquard: every warp thread
// has its own hook, and one punched card per pick says which hooks rise, so
// the deck replaces both the extra shafts and the drawboy. Done when the
// reader changes a square on the Jacquard and sees its card change.

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

/** Holes punched in a Jacquard deck for a motif: one per raised thread on each card. */
export const holesPunched = (m: Motif): number => cordsPerPick(m).reduce((a, b) => a + b, 0);

export const patternFigure = figure(['many', 'cards'], (_ctx, t) => {
  const jacquard = t.goal === 'cards';
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let motif: Motif = MOTIFS.Diamond.map((r) => [...r]);
  let loom: 'shaft' | 'draw' | 'jacquard' = jacquard ? 'jacquard' : 'shaft';
  let changed = -1;
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
        cell.addEventListener('click', () => { motif[r][c] = !motif[r][c]; changed = loom === 'jacquard' ? r : -1; paint(); });
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
    } else if (loom === 'jacquard') {
      // One card per pick, drawn level with its row: a dark hole lets that warp's hook rise.
      parts.push(label(px, GY - 10, `Cards: ${ROWS}, holes: ${holesPunched(motif)}`, { bold: true }));
      const HOLE = 13;
      for (let r = 0; r < ROWS; r++) {
        parts.push(svg('rect', { x: px, y: GY + r * CELL + 1, width: COLS * HOLE + 6, height: CELL - 3, rx: 2, fill: COL.paper, stroke: r === changed ? COL.you : COL.coast, 'stroke-width': r === changed ? 2 : 1 }));
        for (let c = 0; c < COLS; c++) {
          parts.push(svg('circle', { cx: px + 3 + c * HOLE + HOLE / 2, cy: GY + r * CELL + CELL / 2 - 0.5, r: 3.2, fill: motif[r][c] ? COL.ink : 'none', stroke: motif[r][c] ? 'none' : COL.coast, 'stroke-width': 0.6 }));
        }
      }
      parts.push(label(px, GY + ROWS * CELL + 16, 'One card per pick; a hole lifts that thread', { size: 'small', soft: true }));
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
    f.readout.textContent = loom === 'jacquard'
      ? (changed >= 0
        ? `You changed pick ${changed + 1}, so only card ${changed + 1} is punched differently. Each of the ${COLS} warp threads has its own hook, so no shafts are threaded and no drawboy pulls cords; a new pattern is a new deck of cards.`
        : `Each card holds one pick: a hole lets that warp thread's hook rise, and a blank pushes it down. This motif takes ${ROWS} cards. Tap a square to change a card.`)
      : loom === 'shaft'
      ? `This motif has ${n} different kinds of warp thread, so a shaft loom needs ${n} shafts, threaded once and lifted in order pick by pick.${sym ? ' A mirror-image motif reuses its columns, which keeps the count down.' : ' A lopsided motif has few matching columns, so the count climbs.'}`
      : `The drawboy pulls one prepared lash of cords for each of the ${ROWS} picks, so any motif fits, however many kinds of thread it has. The cost is a second worker, pulling on every pick.`;
    if (n >= 10) seen.add(loom);
    if (jacquard ? (loom === 'jacquard' && changed >= 0) : seen.size === 2) t.done();
  };

  const presets = choices(Object.keys(MOTIFS), (i) => { motif = Object.values(MOTIFS)[i].map((r) => [...r]); changed = -1; paint(); });
  const kinds = ['shaft', 'draw', 'jacquard'] as const;
  const looms = choices(jacquard ? ['Shaft loom', 'Drawloom', 'Jacquard'] : ['Shaft loom', 'Drawloom'], (i) => { loom = kinds[i]; changed = -1; paint(); });
  presets.pick(0);
  looms.pick(jacquard ? 2 : 0);
  f.controls.append(presets.node, looms.node);
  paint();
  return f.node;
});
