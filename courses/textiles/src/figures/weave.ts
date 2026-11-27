// Lesson 4: how a loom makes a weave. A four-shaft loom: warp thread 1 is on
// shaft 1, thread 2 on shaft 2 and so on, repeating every four threads. For
// each pick of the weft the weaver lifts some shafts; the lifted warp threads
// show on the face and the weft hides the rest. The reader sets which shafts
// rise for the first pass and how the lift changes from each pick to the
// next, and the cloth builds row by row. Plain weave, the 2/2 twill and the
// 3/1 twill of denim all come from four shafts; a satin needs at least five.
// Goal 'denim': a 3/1 warp-faced twill (three shafts up, stepping one thread
// each pick).

import { svg } from 'didactics/dom';
import { label, redraw } from 'didactics/draw';
import { COL, choices, figure, frame, guessFirst, tint } from './kit';

export type Step = 'same' | 'left' | 'right' | 'flip';
export const STEPS: Step[] = ['same', 'right', 'left', 'flip'];
const STEP_NAMES: Record<Step, string> = { same: 'Repeat it', right: 'Shift one right', left: 'Shift one left', flip: 'Swap up and down' };

/** The lift for pass `row`: which of the four shafts are up. */
export function liftAt(first: readonly boolean[], step: Step, row: number): boolean[] {
  return [0, 1, 2, 3].map((s) => {
    if (step === 'same') return first[s];
    if (step === 'flip') return row % 2 === 0 ? first[s] : !first[s];
    const shift = step === 'right' ? row : -row;
    return first[(((s - shift) % 4) + 4) % 4];
  });
}

/** What the lift and step make. */
export function weaveName(first: readonly boolean[], step: Step): string {
  const up = first.filter(Boolean).length;
  if (up === 0 || up === 4) return 'none';
  const rows = [0, 1, 2, 3].map((r) => liftAt(first, step, r));
  const same = rows.every((r) => r.join() === rows[0].join());
  if (same) return 'stripes';
  const alternating = (r: boolean[]) => r[0] !== r[1] && r[1] !== r[2] && r[2] !== r[3];
  if (rows.every(alternating)) return 'plain';
  if (step === 'flip') return 'blocks';
  const contiguous = [0, 1, 2, 3].some((k) => [0, 1, 2, 3].every((i) => first[(k + i) % 4] === i < up));
  if (!contiguous) return 'broken';
  return up === 2 ? 'twill 2/2' : up === 3 ? 'twill 3/1' : 'twill 1/3';
}

const W = 400;
const H = 230;
const N = 16; // threads shown each way
const CELL = 11;
const OX = 196;
const OY = 26;

export const weaveFigure = figure(['denim'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  const first = [true, false, true, false];
  let step: Step = 'flip';

  const paint = () => {
    const parts: SVGElement[] = [];
    // The shafts: four boxes showing which rise on the first pass, tap to change.
    parts.push(label(14, 20, 'First pick: tap a shaft to lift it', { size: 'small', bold: true }));
    for (let s = 0; s < 4; s++) {
      const y = 32 + s * 30;
      const box = svg('g', { role: 'button', tabindex: 0, style: 'cursor:pointer', 'aria-label': `Shaft ${s + 1}` });
      box.append(svg('rect', { x: 14, y, width: 150, height: 24, rx: 5, fill: first[s] ? COL.warp : tint(COL.ink, 0.06), stroke: COL.warp }),
        label(22, y + 16, `Shaft ${s + 1}: ${s + 1}, ${s + 5}, ${s + 9}…`, { size: 'small', fill: first[s] ? COL.paper : COL.ink }),
        label(156, y + 16, first[s] ? 'up' : 'down', { size: 'small', anchor: 'end', bold: true, fill: first[s] ? COL.paper : COL.soft }));
      const toggle = () => { first[s] = !first[s]; paint(); };
      box.addEventListener('click', toggle);
      box.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); toggle(); } });
      parts.push(box);
    }
    parts.push(label(14, 166, `Then each pick: ${STEP_NAMES[step].toLowerCase()}`, { size: 'small', soft: true }));
    // The cloth: warp runs up and down (indigo), weft across (pale). Pass 1 is at the bottom, as the cloth grows away from the weaver's hands.
    parts.push(label(OX, 18, 'The cloth', { size: 'small', bold: true }));
    for (let r = 0; r < N; r++) {
      const lift = liftAt(first, step, r);
      const y = OY + (N - 1 - r) * CELL;
      for (let c = 0; c < N; c++) {
        const up = lift[c % 4];
        const x = OX + c * CELL;
        parts.push(up
          ? svg('rect', { x: x + 1.5, y: y - 0.5, width: CELL - 3, height: CELL + 1, rx: 2, fill: COL.warp })
          : svg('rect', { x: x - 0.5, y: y + 1.5, width: CELL + 1, height: CELL - 3, rx: 2, fill: COL.weft }));
      }
    }
    parts.push(label(OX + (N * CELL) / 2, OY + N * CELL + 14, 'warp runs up and down; pick 1 is at the bottom', { size: 'small', anchor: 'middle', soft: true }));
    redraw(g, ...parts);
    const name = weaveName(first, step);
    f.readout.textContent = {
      none: 'With every shaft down (or every one up) the weft never crosses the warp and there is no cloth, only a pile of loose threads.',
      stripes: 'The same shafts rise every pick, so the same warp threads always sit on top: the weft just lies across them and the cloth falls apart into stripes. The lift has to change from pick to pick.',
      plain: 'Plain weave: every thread goes over one and under one, and the next pick reverses it. It is the tightest, firmest weave, used for linen shirts, calico and canvas.',
      blocks: 'The lift swaps every pick, but with two neighbouring shafts together the threads pair up into a basket weave, looser than plain weave.',
      broken: 'The lifted shafts are not side by side, so the floats break up and no clean diagonal forms.',
      'twill 2/2': 'A 2/2 twill: each thread floats over two and under two, and the pattern shifts one thread every pick, so the floats line up into a diagonal. Twills are softer than plain weave and drape better.',
      'twill 3/1': 'A 3/1 twill, the weave of denim: three warp threads up and one down, stepping one thread each pick. The face is mostly warp, so with an indigo warp and a pale weft the front is blue and the back is pale.',
      'twill 1/3': 'A 1/3 twill: one warp up and three down, so the face is mostly weft. It is denim seen from the back.',
    }[name] ?? '';
    if (name === 'twill 3/1') t.done();
  };

  const how = choices(STEPS.map((s) => STEP_NAMES[s]), (i) => { step = STEPS[i]; paint(); });
  how.pick(3);
  f.controls.append(how.node);
  guessFirst(t, f, {
    ask: 'Denim shows diagonal lines on its face. On a loom, what has to happen from one pick of the weft to the next to make them?',
    options: ['The same threads are lifted every pick', 'The lifted threads shift one place sideways each pick', 'Lifted and lowered threads swap every pick'],
    answer: 1,
    sliders: [],
    hidden: [how.node],
    after: () => paint(),
  });
  paint();
  return f.node;
});
