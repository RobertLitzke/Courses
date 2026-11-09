// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { percentile, simulateFan, slowShare } from '../src/figures/tail';
import { click, context, guess, setSlider } from './helpers';

describe('tail: the arithmetic', () => {
  it('100 leaves at 1% gives 63%, 1,000 gives nearly all', () => {
    expect(slowShare(100, 0.01)).toBeCloseTo(0.634, 3);
    expect(slowShare(1000, 0.01)).toBeGreaterThan(0.9999);
    expect(slowShare(1, 0.01)).toBeCloseTo(0.01, 6);
  });

  it('percentiles by nearest rank', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(xs, 0.5)).toBe(50);
    expect(percentile(xs, 0.99)).toBe(99);
  });

  it('the simulated fan-out matches the formula', () => {
    const r = simulateFan({ n: 100, p: 0.01, hedgeAfter: null });
    expect(r.slow).toBeGreaterThan(0.6);
    expect(r.slow).toBeLessThan(0.67);
    expect(r.p50).toBeGreaterThan(150);
  });

  it('hedging after about the 95th percentile cuts the tail for a few percent more requests', () => {
    const off = simulateFan({ n: 100, p: 0.01, hedgeAfter: null });
    const on = simulateFan({ n: 100, p: 0.01, hedgeAfter: 15 });
    expect(on.p99).toBeLessThan(50);
    expect(on.p99).toBeLessThan(off.p99 / 10);
    expect(on.extra).toBeLessThan(0.05);
    // Sent at once, every request goes twice.
    expect(simulateFan({ n: 100, p: 0.01, hedgeAfter: 0 }).extra).toBe(1);
  });
});

describe('tail: the figures', () => {
  it('the fan-out figure is done once the guess is in', async () => {
    let done = false;
    const h = FIGURES['tail-fan'](context(), 'guess');
    h.done!.then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    guess(h.node, 'About 63%');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('63%');
  });

  it('the hedging figure is done for a wait that cuts the tail cheaply', async () => {
    let done = false;
    const h = FIGURES['tail-hedge'](context(), 'hedge');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 2);
    click(h.node, 'Hedged requests');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 15);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('draws the stills', () => {
    for (const id of ['tail-curve', 'tail-partition']) expect(FIGURES[id](context()).node.querySelector('svg')).toBeTruthy();
  });
});
