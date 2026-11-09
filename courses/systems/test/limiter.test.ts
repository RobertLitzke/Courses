// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { admit, Bucket, burstyClient, busiest, runBench } from '../src/figures/limiter';
import { click, context, guess, setSlider } from './helpers';

describe('limiter: counting against a limit', () => {
  const times = burstyClient();
  const passed = (algo: Parameters<typeof admit>[0], burst?: number) => {
    const ok = admit(algo, times, 100, 60, burst);
    return times.filter((_, i) => ok[i]);
  };

  it('fixed windows let nearly twice the limit through across a boundary', () => {
    const worst = busiest(passed('fixed'));
    expect(worst.count).toBeGreaterThan(180);
    expect(worst.count).toBeLessThanOrEqual(200);
  });

  it('a sliding log never lets more than the limit into any minute', () => {
    expect(busiest(passed('log')).count).toBeLessThanOrEqual(100);
  });

  it('a sliding counter stays close to the limit', () => {
    expect(busiest(passed('counter')).count).toBeLessThanOrEqual(115);
  });

  it('a token bucket allows its size plus a minute of refill', () => {
    const b = busiest(passed('bucket', 20)).count;
    expect(b).toBeLessThanOrEqual(20 + 100 + 1);
    expect(busiest(passed('bucket', 100)).count).toBeGreaterThan(b);
  });

  it('a bucket refills at its rate and holds no more than its size', () => {
    const b = new Bucket(10, 5);
    let yes = 0;
    for (let i = 0; i < 20; i++) if (b.take(0)) yes++;
    expect(yes).toBe(5);
    expect(b.take(50)).toBe(false);
    expect(b.take(100)).toBe(true);
    b.take(100_000);
    expect(b.tokens).toBeLessThanOrEqual(5);
  });
});

describe('limiter: the bench', () => {
  it('with no limiter a flood from A hurts B', () => {
    const s = runBench(0, 400, 12_000);
    expect(s.bBad > 0.05 || s.bP99 > 400).toBe(true);
  });

  it('a shared limiter refuses A\'s excess and keeps B fast', () => {
    const s = runBench(2, 400, 12_000);
    expect(s.aLimited).toBeGreaterThan(200);
    expect(s.aOk).toBeLessThan(110);
    expect(s.bBad).toBeLessThan(0.02);
    expect(s.bP99).toBeLessThan(400);
  });

  it('buckets in each gateway do nearly as well', () => {
    const s = runBench(1, 400, 12_000);
    expect(s.aLimited).toBeGreaterThan(200);
    expect(s.bBad).toBeLessThan(0.02);
  });

  it('with Redis down, failing closed refuses everyone and failing open lets A through', () => {
    const closed = runBench(2, 100, 8_000, { failOpen: false, redisDown: true });
    expect(closed.bBad).toBeGreaterThan(0.9);
    const open = runBench(2, 100, 8_000, { failOpen: true, redisDown: true });
    expect(open.bBad).toBeLessThan(0.05);
    expect(open.aOk).toBeGreaterThan(80);
  });
});

describe('limiter: the figures', () => {
  it('windows: done once guessed and another way of counting is picked', async () => {
    let done = false;
    const h = FIGURES['limiter-windows'](context(), 'compare');
    h.done!.then(() => (done = true));
    guess(h.node, 'Nearly 200');
    click(h.node, 'Sliding log');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('bench: done once a limiter faces a flood', async () => {
    let done = false;
    const h = FIGURES['limiter-bench'](context(), 'shield');
    h.done!.then(() => (done = true));
    click(h.node, 'Shared buckets in Redis');
    setSlider(h.node, 0, 400);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('record: draws', () => {
    expect(FIGURES['limiter-record'](context()).node).toBeTruthy();
  });
});
