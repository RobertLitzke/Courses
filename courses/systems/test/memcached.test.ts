// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { cacheAside, cacheRace, keysMoved } from '../src/figures/memcached';
import { click, context, guess, setSlider } from './helpers';

describe('memcached: the arithmetic', () => {
  it('90% hits halves a 4,000-a-second database; 99% leaves it a twentieth', () => {
    expect(cacheAside(20_000, 0.9).db).toBeCloseTo(2000);
    expect(cacheAside(20_000, 0.99).db).toBeCloseTo(200);
    expect(cacheAside(20_000, 0.9).mean).toBeCloseTo(1.45);
    expect(cacheAside(20_000, 0.99).mean).toBeCloseTo(0.595);
  });

  it('10 to 11 servers moves about 91% of keys by mod n and about 9% on a ring', () => {
    expect(keysMoved(10, 11, 'mod')).toBeCloseTo(10 / 11, 2);
    const ring = keysMoved(10, 11, 'ring');
    expect(ring).toBeGreaterThan(0.01);
    expect(ring).toBeLessThan(0.25);
  });

  it('on average a ring moves about 1/n of the keys', () => {
    let sum = 0;
    for (let n = 5; n < 45; n++) sum += keysMoved(n, n + 1, 'ring') * (n + 1);
    expect(sum / 40).toBeGreaterThan(0.6);
    expect(sum / 40).toBeLessThan(1.5);
  });

  it('setting on write leaves the cache stale; deleting does not', () => {
    const set = cacheRace('set');
    expect(set.db).toBe('v2');
    expect(set.cache).toBe('v1');
    const del = cacheRace('delete');
    expect(del.cache).toBe(del.db);
  });
});

describe('memcached: the figures', () => {
  it('the wire still builds', () => {
    expect(FIGURES['memcached-wire'](context()).node.textContent).toContain('STORED');
  });

  it('the flow is done at 99% hits', async () => {
    let done = false;
    const h = FIGURES['memcached-flow'](context(), 'ninetynine');
    h.done!.then(() => (done = true));
    guess(h.node, 'It falls to a tenth');
    setSlider(h.node, 0, 95);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 99);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the race is done when delete on write is played to the end', async () => {
    let done = false;
    const h = FIGURES['memcached-race'](context(), 'delete');
    h.done!.then(() => (done = true));
    expect(h.node.textContent).toContain('v1, stale');
    click(h.node, 'Delete on write');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 160);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the ring is done once a server is added both ways', async () => {
    let done = false;
    const h = FIGURES['memcached-ring'](context(), 'both');
    h.done!.then(() => (done = true));
    click(h.node, 'Add a server');
    expect(h.node.textContent).toContain('91%');
    click(h.node, 'Ring');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Add a server');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
