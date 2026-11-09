// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { CAP, enemyOutcome, enemyScript, HOT, OBJECTS, ownerOf, routeLoad, SERVERS, zipfProbs } from '../src/figures/zanzibar';
import { click, context, setSlider } from './helpers';

describe('zanzibar: the new enemy', () => {
  it('without a zookie the check uses a snapshot from before the removal, and Bob sees the document', () => {
    const o = enemyOutcome(false);
    expect(o.snapshot).toBeLessThan(o.removedAt);
    expect(o.bobSees).toBe(true);
    expect(enemyOutcome(true).bobSees).toBe(false);
  });

  it('the drawing ends with what the outcome says', () => {
    for (const z of [false, true]) {
      const s = enemyScript(z);
      const last = s.messages[s.messages.length - 1];
      expect(last.to).toBe('bob');
      expect(last.label).toBe(z ? 'no access' : 'the document');
      expect(Math.max(...s.messages.map((m) => m.arrive))).toBeLessThan(s.tMax);
    }
  });

  it('the figure is done once the zookie version plays through', async () => {
    let done = false;
    const h = FIGURES['zanzibar-enemy'](context(), 'token');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 86);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Carry a zookie');
    setSlider(h.node, 0, 85);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('zanzibar: routing checks', () => {
  it('Zipf probabilities sum to one and fall with rank', () => {
    const p = zipfProbs(OBJECTS, 1);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(p[0]).toBeGreaterThan(p[1]);
  });

  it('consistent hashing gives every server some objects', () => {
    const owners = new Set(Array.from({ length: OBJECTS }, (_, k) => ownerOf(k)));
    expect(owners.size).toBe(SERVERS.length);
  });

  it('routing by object multiplies the caches: a higher hit rate than any server', () => {
    for (const s of [0.8, 1, 1.2]) {
      expect(routeLoad('hash', s).hit).toBeGreaterThan(routeLoad('any', s).hit + 0.1);
    }
    // Any server: each cache holds the top CAP objects of all of them.
    const p = zipfProbs(OBJECTS, 1);
    expect(routeLoad('any', 1).hit).toBeCloseTo(p.slice(0, CAP).reduce((a, b) => a + b, 0), 10);
  });

  it('with steep popularity, routing by object overloads one server; spreading the hot few evens it out at almost no cost in hits', () => {
    const hash = routeLoad('hash', 1.2);
    const spread = routeLoad('spread', 1.2);
    expect(Math.max(...hash.shares)).toBeGreaterThan(0.35);
    expect(Math.max(...spread.shares)).toBeLessThan(0.31);
    expect(spread.hit).toBeGreaterThan(hash.hit - 0.01);
    expect(HOT).toBe(3);
    for (const r of ['any', 'hash', 'spread'] as const) expect(routeLoad(r, 1.2).shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('the flow figure is done with the hot objects spread at skew 1.2 or more', async () => {
    let done = false;
    const h = FIGURES['zanzibar-flow'](context(), 'spread');
    h.done!.then(() => (done = true));
    click(h.node, 'By object');
    setSlider(h.node, 0, 1.3);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'By object, hot ones spread');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
