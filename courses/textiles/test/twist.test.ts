// @vitest-environment happy-dom
// Lesson 1's twist figure: the model's shape, and the goal reachable.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { LOAD, SNARL, outcome, strength } from '../src/figures/twist';
import { click, context, guess, setSlider } from './helpers';

describe('the twist figure', () => {
  it('parts with too little twist, holds at a moderate one, snarls and then weakens with too much', () => {
    expect(outcome(0)).toBe('parts');
    expect(outcome(1)).toBe('parts');
    expect(outcome(5)).toBe('holds');
    expect(outcome(SNARL + 1)).toBe('snarls');
    expect(outcome(15)).toBe('parts');
    expect(strength(15)).toBeLessThan(strength(6));
    expect(strength(15)).toBeLessThan(LOAD);
  });
  it('lets a plied yarn hold at a high twist without snarling', () => {
    expect(outcome(12, true)).toBe('holds');
  });
  it('is done when a single yarn holds and lies straight', async () => {
    const h = FIGURES.twist(context(), 'holds');
    guess(h.node, 'A moderate amount');
    setSlider(h.node, 0, 12);
    expect(h.node.textContent).toContain('snarl');
    click(h.node, 'Two plied together');
    click(h.node, 'Single');
    setSlider(h.node, 0, 5);
    await expect(h.done).resolves.toBeUndefined();
  });
});
