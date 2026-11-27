// Branch M7: why shredded cotton needs new cotton beside it. Tearing old
// cloth back into fibre breaks the fibres; here each pass leaves them 0.6
// times as long (from a 28 mm staple). A ring-spinning mill needs a mean
// fibre length of about 25 mm for a fine, strong yarn, so a blend can hold
// only as much short recycled fibre as keeps the mean above that. Round,
// illustrative numbers; real limits depend on the yarn and the machine.
// Goal 'blend': a guess first, then a blend that spins and one that does not.

import { svg } from 'didactics/dom';
import { label, line, redraw } from 'didactics/draw';
import { COL, figure, frame, guessFirst, slider } from './kit';

export const STAPLE = 28;
export const KEEP = 0.6;
export const NEED = 25;

export const shredded = (passes: number) => STAPLE * KEEP ** passes;
export const blendLength = (share: number, passes: number) => share * shredded(passes) + (1 - share) * STAPLE;
/** The largest share of recycled fibre that still spins. */
export const maxShare = (passes: number) => (STAPLE - NEED) / (STAPLE - shredded(passes));

const W = 520;
const H = 200;
const N = 48;
const PX = 4.5;

export const reshredFigure = figure(['blend'], (_ctx, t) => {
  const f = frame(W, H, 3);
  const g = svg('g');
  f.svg.append(g);
  let share = 0.5;
  let passes = 1;
  let opened = false;
  const seen = new Set<'yes' | 'no'>();

  const paint = () => {
    const nRec = Math.round(share * N);
    const L = blendLength(share, passes);
    const ok = L >= NEED;
    const parts: SVGElement[] = [];
    for (let i = 0; i < N; i++) {
      // Recycled fibres scattered through the blend: 29 and 48 share no factor, so this visits every slot.
      const rec = (i * 29) % N < nRec;
      // A little spread about each mean, fixed per fibre.
      const v = Math.sin(i * 12.9898) * 43758.5453;
      const jit = 0.8 + 0.4 * (v - Math.floor(v));
      const len = (rec ? shredded(passes) : STAPLE) * jit * PX;
      const x = 20 + Math.floor(i / 16) * 165;
      const y = 44 + (i % 16) * 8;
      parts.push(line(x, y, x + len, y, rec ? COL.recycled : COL.fibre, 3));
    }
    parts.push(label(20, 22, `Mean fibre length ${L.toFixed(1)} mm: ${ok ? 'spins into fine yarn' : 'too short to spin well'}`, { bold: true, fill: ok ? COL.good : COL.bad }));
    redraw(g, ...parts);
    f.readout.textContent = ok
      ? `${Math.round(share * 100)}% recycled fibre, shredded ${passes === 1 ? 'once' : `${passes} times`}, leaves the blend long enough to spin. The new cotton carries the short fibres.`
      : `With ${Math.round(share * 100)}% shredded fibre at about ${shredded(passes).toFixed(0)} mm, the blend is too short. Short fibres slip past each other, so the yarn is weak and hairy.`;
    if (opened) { seen.add(ok ? 'yes' : 'no'); if (seen.size === 2) t.done(); }
  };

  const sS = slider('Recycled fibre in the blend', { min: 0, max: 1, step: 0.05, value: share, show: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { share = v; paint(); }, color: 'recycled' });
  const sP = slider('Times shredded', { min: 1, max: 3, step: 1, value: passes, show: (v) => `${v}`, onInput: (v) => { passes = v; paint(); }, color: 'fibre' });
  f.controls.append(sS.node, sP.node);
  paint();
  guessFirst(t, f, {
    ask: 'About how much of a fine cotton yarn can be made of cotton shredded once from old clothes?',
    options: ['Almost all of it', 'About a quarter', 'Under 1%'],
    answer: 1,
    sliders: [sS, sP],
    after: () => { opened = true; paint(); },
  });
  return f.node;
});
