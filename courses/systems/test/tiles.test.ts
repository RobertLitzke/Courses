// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { metresPerPixel, plan, REQUEST_MIX, tileOf, tilesAt, tilesTo } from '../src/figures/tiles';
import { context, guess, setSlider } from './helpers';

describe('tiles: the pyramid', () => {
  it('counts tiles at each zoom', () => {
    expect(tilesAt(0)).toBe(1);
    expect(tilesAt(10)).toBe(1_048_576);
    expect(tilesAt(18) / 1e9).toBeCloseTo(68.7, 1);
    expect(tilesAt(20) / 1e12).toBeCloseTo(1.1, 1);
    expect(tilesTo(18) / 1e9).toBeCloseTo(91.6, 1);
  });
  it('a pixel is 157 km at zoom 0 and 60 cm at zoom 18', () => {
    expect(metresPerPixel(0) / 1000).toBeCloseTo(156.5, 0);
    expect(metresPerPixel(18)).toBeCloseTo(0.6, 1);
  });
  it('numbers tiles as the web maps do', () => {
    expect(tileOf(0, 0, 1)).toEqual({ x: 1, y: 1 });
    expect(tileOf(47.6, -122.33, 14)).toEqual({ x: 2624, y: 5722 });
  });
});

describe('tiles: drawing ahead', () => {
  it('the request mix sums to one', () => {
    expect(REQUEST_MIX.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
  it('zoom 12 is about 130 GB and a quarter of requests; zoom 18 is over half a petabyte', () => {
    const a = plan(12, true);
    expect(a.bytes / 1e9).toBeGreaterThan(100);
    expect(a.bytes / 1e9).toBeLessThan(200);
    expect(1 - a.onDemand).toBeGreaterThan(0.2);
    expect(1 - a.onDemand).toBeLessThan(0.3);
    expect(plan(18, true).bytes / 1e15).toBeGreaterThan(0.5);
  });
  it('storing the ocean tile once saves drawing time', () => {
    expect(plan(16, true).days).toBeLessThan(plan(16, false).days / 2);
  });
});

describe('tiles: the figures', () => {
  it('pyramid: done at zoom 18 after the guess', async () => {
    let done = false;
    const h = FIGURES['tiles-pyramid'](context(), 'deep');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 69 billion');
    setSlider(h.node, 0, 12);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 18);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('render: done with the line at zoom 18', async () => {
    let done = false;
    const h = FIGURES['tiles-render'](context(), 'plan');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 18);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('version: the still draws', () => {
    expect(FIGURES['tiles-version'](context()).node.querySelector('svg')).toBeTruthy();
  });
});
