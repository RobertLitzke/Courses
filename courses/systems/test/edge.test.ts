// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { edgeNumbers, hitRate, LADDER, pickRate, playback, T_END, TITLES } from '../src/figures/edge';
import { click, context, guess, setSlider } from './helpers';

describe('edge: the steep curve', () => {
  it('a tenth of the catalogue serves about three quarters of the views', () => {
    expect(hitRate(TITLES, 1, 1000)).toBeCloseTo(0.765, 2);
    expect(hitRate(TITLES, 1, 2000)).toBeCloseTo(0.836, 2);
    expect(hitRate(TITLES, 1, 3700)).toBeLessThan(0.9);
    expect(hitRate(TITLES, 1, 3800)).toBeGreaterThan(0.9);
    expect(hitRate(TITLES, 1, TITLES)).toBeCloseTo(1, 10);
  });

  it('steeper popularity makes a small cache better', () => {
    expect(hitRate(TITLES, 1.2, 1000)).toBeGreaterThan(hitRate(TITLES, 0.8, 1000));
  });

  it('the backbone carries the misses', () => {
    const n = edgeNumbers(1, 1000);
    expect(n.backbone).toBeCloseTo(5 * (1 - n.h), 10);
  });

  it('the figure is done at 90% with s at 1', async () => {
    let done = false;
    const h = FIGURES['edge-cache'](context(), 'ninety');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 75%');
    // Log slider from 10 to 10,000 over 1000 positions; 5,000 titles is at 1000 × log(500)/log(1000).
    setSlider(h.node, 0, Math.round((1000 * Math.log(500)) / Math.log(1000)));
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('edge: adaptive bitrate', () => {
  it('the buffer rule picks low when empty and high when full, capped by bandwidth', () => {
    expect(pickRate(2, 8)).toBe(LADDER[0]);
    expect(pickRate(28, 8)).toBe(5.8);
    expect(pickRate(28, 2)).toBeLessThanOrEqual(1.6);
  });

  it('a fixed 5.8 Mb/s player stalls when bandwidth drops to 2; the adaptive one does not', () => {
    const fixed = playback(false, 2);
    const abr = playback(true, 2);
    expect(fixed.stalls).toBeGreaterThan(1);
    expect(fixed.stallSeconds).toBeGreaterThan(10);
    expect(abr.stalls).toBe(0);
    expect(abr.meanRate).toBeGreaterThan(2);
  });

  it('a four-second 5.8 Mb/s segment over 2 Mb/s takes nearly twelve seconds', () => {
    expect((5.8 * 4) / 2).toBeCloseTo(11.6, 5);
  });

  it('the figure is done with the adaptive player played through a deep dip', async () => {
    let done = false;
    const h = FIGURES['edge-abr'](context(), 'smooth');
    h.done!.then(() => (done = true));
    click(h.node, 'Adaptive bitrate');
    setSlider(h.node, 1, 1.5);
    setSlider(h.node, 0, T_END - 1);
    setSlider(h.node, 0, T_END);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
