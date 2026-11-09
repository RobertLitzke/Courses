// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { herd, narration, regionOutcome, regionScript, staleSetScript } from '../src/figures/leases';
import { click, context, guess, setSlider } from './helpers';

describe('leases: the herd', () => {
  it('a small herd ends in one query time; it grows by readers times refill time', () => {
    const r = herd({ reads: 1000, leases: false });
    expect(r.refilledAt).toBe(50);
    expect(r.queries).toBe(50);
  });

  it('past what the database can serve, the herd feeds itself', () => {
    const mid = herd({ reads: 10000, leases: false });
    expect(mid.refilledAt).toBeGreaterThan(500);
    expect(mid.refilledAt).toBeLessThan(700);
    const big = herd({ reads: 20000, leases: false });
    expect(big.refilledAt).toBe(Infinity);
    // 5 e^9 ms, by processor sharing: about 40 seconds.
    expect(big.eventually / 1000).toBeGreaterThan(35);
    expect(big.eventually / 1000).toBeLessThan(45);
    expect(big.queries).toBeGreaterThan(30000);
  });

  it('with leases one query refills the key', () => {
    const r = herd({ reads: 50000, leases: true });
    expect(r.queries).toBe(1);
    expect(r.refilledAt).toBe(50);
    expect(r.peak).toBe(1);
  });

  it('the figure is done once the guess is in, leases are on and the run is played', async () => {
    let done = false;
    const h = FIGURES['leases-herd'](context(), 'calm');
    h.done!.then(() => (done = true));
    guess(h.node, 'Tens of seconds');
    setSlider(h.node, 0, 2000);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Leases on');
    setSlider(h.node, 0, 1950);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('leases: the stale set and regions', () => {
  it('without leases a stale value is stored; with them the set is refused', () => {
    expect(staleSetScript(false).messages.some((m) => m.label === 'stored')).toBe(true);
    expect(staleSetScript(true).messages.some((m) => m.label === 'refused')).toBe(true);
    expect(narration(staleSetScript(true).story, 100)).toMatch(/never got in/);
  });

  it('the stale-set figure is done with leases on, played through', async () => {
    let done = false;
    const h = FIGURES['leases-stale'](context(), 'fixed');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 100);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Leases on');
    setSlider(h.node, 0, 99);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('only the marker shows the writer their write; the log or the marker keeps v1 out of the cache', () => {
    expect(regionOutcome({ fromLog: false, marker: false })).toEqual({ userSees: 'v1', cacheEnds: 'v1' });
    expect(regionOutcome({ fromLog: true, marker: false })).toEqual({ userSees: 'v1', cacheEnds: 'empty' });
    expect(regionOutcome({ fromLog: true, marker: true }).userSees).toBe('v2');
    expect(regionScript({ fromLog: true, marker: true }).messages.some((m) => m.label === 'delete k (log)')).toBe(true);
  });

  it('the regions figure is done with both fixes on, played through', async () => {
    let done = false;
    const h = FIGURES['leases-regions'](context(), 'fixed');
    h.done!.then(() => (done = true));
    click(h.node, 'Deletes from the commit log');
    click(h.node, 'Remote marker');
    setSlider(h.node, 0, 240);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
