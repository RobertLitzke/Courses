// @vitest-environment happy-dom
// Part II's figures: each goal reachable, and the maps' data sane.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { PERIODS } from '../src/figures/silk-routes';
import { cropHeight, worldMap } from '../src/figures/world';
import { click, context, setSlider } from './helpers';
import { MOTIFS, shaftsNeeded } from '../src/figures/pattern-loom';
import { knotsFor } from '../src/figures/inca';

describe('the world map', () => {
  it('puts the crop corners at the drawing corners', () => {
    const m = worldMap({ lon: [-10, 145], lat: [-12, 55] }, 560);
    expect(m.xy([-10, 55])).toEqual([0, 0]);
    const [x, y] = m.xy([145, -12]);
    expect(x).toBeCloseTo(560);
    expect(y).toBeCloseTo(m.h);
    expect(cropHeight({ lon: [0, 90], lat: [0, 45] }, 400)).toBeGreaterThan(200);
  });
});

describe('the silk routes', () => {
  it('runs in order of time', () => {
    expect(PERIODS[0].name).toMatch(/BC/);
    expect(PERIODS.at(-1)!.name).toMatch(/1300/);
  });
  it('is done at the last period', async () => {
    const h = FIGURES['silk-routes'](context(), 'mongol');
    setSlider(h.node, 0, PERIODS.length - 1);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the pattern loom', () => {
  it('needs fewer shafts for a symmetric motif', () => {
    expect(shaftsNeeded(MOTIFS.Diamond)).toBeLessThan(shaftsNeeded(MOTIFS.Bird));
    expect(shaftsNeeded(MOTIFS.Bird)).toBeGreaterThanOrEqual(10);
  });
  it('is done once a busy motif is seen on both looms', async () => {
    const h = FIGURES['pattern-loom'](context(), 'many');
    click(h.node, 'Bird');
    click(h.node, 'Drawloom');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the khipu', () => {
  it('ties 352 as three hundreds, five tens and a long knot of two', () => {
    expect(knotsFor(352)).toEqual([{ place: 0, count: 2, kind: 'long' }, { place: 1, count: 5, kind: 'single' }, { place: 2, count: 3, kind: 'single' }]);
    expect(knotsFor(41)[0].kind).toBe('eight');
    expect(knotsFor(1203).map((k) => k.place)).toEqual([0, 2, 3]);
  });
});
