// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { joined, scores, served } from '../src/figures/features';
import { click, context, setSlider } from './helpers';

describe('features: point in time', () => {
  it('only the availability-time join gives training what serving had', () => {
    expect(joined('available', 30, 8)).toBeCloseTo(served(30, 8), 9);
    expect(Math.abs(joined('event', 30, 8) - served(30, 8))).toBeGreaterThan(1);
    expect(joined('event', 30, 0)).toBeCloseTo(served(30, 0), 9);
  });

  it('a leaky join looks best offline and is worst in service', () => {
    const latest = scores('latest', 10);
    const avail = scores('available', 10);
    expect(latest.offline).toBeLessThan(avail.offline);
    expect(latest.serving).toBeGreaterThan(scores('event', 10).serving);
    expect(avail.offline).toBe(avail.serving);
  });
});

describe('features: the figures', () => {
  it('pit: done on availability time with a real lag', async () => {
    let done = false;
    const h = FIGURES['features-pit'](context(), 'matched');
    h.done!.then(() => (done = true));
    click(h.node, 'As of event time');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'As of availability time');
    await Promise.resolve();
    expect(done).toBe(true);
    setSlider(h.node, 0, 0);
  });

  it('stores: draws', () => {
    expect(FIGURES['features-stores'](context()).node).toBeTruthy();
  });
});
