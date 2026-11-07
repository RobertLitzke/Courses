// @vitest-environment happy-dom
// Lesson 2, A hand with skin between the fingers.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { BATS, costPerKm, liftToDrag, niche, slowest, turnRadius, wingSize } from '../src/figures/hand';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

const own = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'hand')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('lesson 2: hand', () => {
  it('wing loading sets slow flight and turning; aspect ratio sets cost', () => {
    // A little brown bat, 8 g on 100 square centimetres: about 8 N per square metre.
    expect((0.008 * 9.81) / 0.01).toBeCloseTo(7.85, 1);
    expect(turnRadius(6.5)).toBeLessThan(0.5);
    expect(turnRadius(15)).toBeGreaterThan(0.75);
    expect(slowest(15)).toBeGreaterThan(slowest(6));
    expect(liftToDrag(9)).toBeGreaterThan(liftToDrag(6));
    expect(costPerKm(10)).toBeCloseTo(1);
    expect(costPerKm(6)).toBeGreaterThan(1.2);
    // A 12 g bat with a middling wing spans about 30 cm.
    expect(wingSize(7, 10).span).toBeGreaterThan(0.25);
    expect(wingSize(7, 10).span).toBeLessThan(0.35);
    expect(niche(BATS[1].ar, BATS[1].wl)).toBe('clutter');
    expect(niche(BATS[4].ar, BATS[4].wl)).toBe('open');
    expect(niche(BATS[3].ar, BATS[3].wl)).toBe('edge');
  });

  it('the wing figure reaches clutter, open sky and both', async () => {
    const c = FIGURES['wing-shape'](context(), 'clutter');
    setSlider(c.node, 0, 6);
    setSlider(c.node, 1, 6);
    await expect(c.done).resolves.toBeUndefined();
    const o = FIGURES['wing-shape'](context(), 'open');
    setSlider(o.node, 0, 9);
    setSlider(o.node, 1, 15);
    await expect(o.done).resolves.toBeUndefined();
    const b = FIGURES['wing-shape'](context(), 'both');
    setSlider(b.node, 0, 6);
    setSlider(b.node, 1, 6);
    setSlider(b.node, 0, 9);
    setSlider(b.node, 1, 15);
    await expect(b.done).resolves.toBeUndefined();
  });

  it('the genes put the bat with the horse', async () => {
    const r = FIGURES.regroup(context(), 'switched', own('regroup'));
    guess(r.node, 'The horse');
    click(r.node, 'By genes');
    await expect(r.done).resolves.toBeUndefined();
  });

  it('every clue about Onychonycteris on leaves the question open', async () => {
    const f = FIGURES['clue-board'](context(), 'clues', own('clue-board'));
    for (const c of ['Show clue 1: Flapping wings', 'Show clue 2: A small inner ear', 'Show clue 3: Joined throat and ear bones']) click(f.node, c);
    expect(f.node.querySelector('.fig-readout')!.textContent).toMatch(/question is open/);
    await expect(f.done).resolves.toBeUndefined();
  });
});
