// @vitest-environment happy-dom
// Part I's figures: the models against known numbers, and each goal reachable.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { spinHours, weaveHours, yarnMetres } from '../src/figures/spin-hours';
import { liftAt, weaveName } from '../src/figures/weave';
import { colourLeft, vatColour } from '../src/figures/dye';
import { click, context, guess, setSlider } from './helpers';

describe('the spinning estimate', () => {
  it('counts 4,000 m of yarn in a square metre at 20 threads per cm', () => {
    expect(yarnMetres(1, 20)).toBe(4000);
    expect(spinHours(1, 20, 60)).toBeCloseTo(66.7, 0);
  });
  it('needs several spinners per weaver', () => {
    const ratio = spinHours(2, 20, 60) / weaveHours(2, 20);
    expect(ratio).toBeGreaterThan(3);
    expect(ratio).toBeLessThan(10);
  });
  it('is done once the sail is shown', async () => {
    const h = FIGURES['spin-hours'](context(), 'sail');
    click(h.node, 'Viking sail');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the weave grid', () => {
  it('names the weaves four shafts make', () => {
    expect(weaveName([true, false, true, false], 'flip')).toBe('plain');
    expect(weaveName([true, true, false, false], 'right')).toBe('twill 2/2');
    expect(weaveName([true, true, true, false], 'left')).toBe('twill 3/1');
    expect(weaveName([true, true, true, false], 'same')).toBe('stripes');
    expect(weaveName([true, false, true, true], 'right')).toBe('twill 3/1');
  });
  it('shifts the lift one shaft a pick', () => {
    expect(liftAt([true, true, true, false], 'right', 1)).toEqual([false, true, true, true]);
  });
  it('is done on a 3/1 twill', async () => {
    const h = FIGURES.weave(context(), 'denim');
    guess(h.node, "The lifted threads shift one place sideways each pick");
    click(h.node, 'Shift one right');
    h.node.querySelector('[aria-label="Shaft 2"]')!.dispatchEvent(new Event('click'));
    h.node.querySelector('[aria-label="Shaft 4"]')!.dispatchEvent(new Event('click'));
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the knit', () => {
  it('is done once both are pulled hard', async () => {
    const h = FIGURES.knit(context(), 'both');
    setSlider(h.node, 0, 100);
    click(h.node, 'Knitted');
    setSlider(h.node, 0, 90);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the dyes', () => {
  it('washes out without a mordant and stays with one', () => {
    expect(colourLeft('none', 5)).toBeLessThan(0.25);
    expect(colourLeft('alum', 5)).toBeGreaterThan(0.9);
  });
  it('turns from yellow-green to blue in the air, deeper with each dip', () => {
    expect(vatColour(1, 0)).not.toBe(vatColour(1, 1));
    expect(vatColour(4, 1)).not.toBe(vatColour(1, 1));
  });
  it('is done after a wash test of each kind and four dips', async () => {
    const w = FIGURES.wash(context(), 'fast');
    setSlider(w.node, 0, 6);
    click(w.node, 'Alum');
    await expect(w.done).resolves.toBeUndefined();
    const v = FIGURES.vat(context(), 'deep');
    for (let k = 0; k < 4; k++) click(v.node, 'Dip and lift out');
    await expect(v.done).resolves.toBeUndefined();
  });
});
