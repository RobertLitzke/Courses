// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { amplification, Breaker, retryRun, steady, type Guards } from '../src/figures/chaos';
import { click, context, guess, setSlider } from './helpers';

const slow: Guards = { rps: 1000, slowMs: 3000, timeout: false, retries: false, breaker: false, bulkhead: false };

describe('chaos: a slow dependency', () => {
  it('healthy, the pool runs at 35 threads by Little’s law', () => {
    const s = steady({ ...slow, slowMs: 30 });
    expect(s.threads).toBeCloseTo(35, 5);
    expect(s.play).toBe(1);
    expect(s.full).toBe(1);
  });

  it('with no guards a 3 s dependency starves playback to about 13%', () => {
    const s = steady(slow);
    expect(s.threads).toBe(200);
    expect(s.play).toBeCloseTo(200 / 1510, 2);
    expect(s.failed).toBeCloseTo(1, 5);
  });

  it('a timeout alone saves playback, at 170 threads; adding retries loses it again', () => {
    const t = steady({ ...slow, timeout: true });
    expect(t.play).toBe(1);
    expect(t.threads).toBeCloseTo(170, 5);
    expect(t.degraded).toBe(1);
    const r = steady({ ...slow, timeout: true, retries: true });
    expect(r.play).toBeGreaterThan(0.3);
    expect(r.play).toBeLessThan(0.4);
    expect(r.callsB).toBeGreaterThan(500);
  });

  it('a bulkhead or an open breaker saves playback', () => {
    expect(steady({ ...slow, bulkhead: true }).play).toBe(1);
    expect(steady({ ...slow, bulkhead: true }).bulk).toBeCloseTo(40, 5);
    expect(steady(slow, true).play).toBe(1);
  });

  it('the breaker opens after a second of failures, tests after five, and closes if B is well', () => {
    const b = new Breaker();
    for (let i = 0; i < 9; i++) b.step(100, 1);
    expect(b.state).toBe('closed');
    b.step(100, 1);
    expect(b.state).toBe('open');
    for (let i = 0; i < 50; i++) b.step(100, 1);
    expect(b.state).toBe('trying');
    for (let i = 0; i < 10; i++) b.step(100, 0);
    expect(b.state).toBe('closed');
  });

  it('the figure is done once a slow B no longer stops playback', async () => {
    let done = false;
    const h = FIGURES['chaos-fault'](context(), 'survive');
    h.done!.then(() => (done = true));
    // The log slider runs 30 to 3000 ms over 1000 positions.
    setSlider(h.node, 0, 1000);
    click(h.node, 'Timeout 300 ms');
    // The figure eases toward the steady state on each frame; settle it by redrawing a few times through the slider.
    for (let i = 0; i < 40; i++) setSlider(h.node, 0, 1000 - (i % 2));
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('chaos: retries', () => {
  it('three tries at five layers is 243', () => {
    expect(amplification(3, 5, true)).toBe(243);
    expect(amplification(3, 5, false)).toBe(3);
  });

  it('the amplification figure is done after the guess and a change of tries', async () => {
    let done = false;
    const h = FIGURES['chaos-amplify'](context(), 'multiply');
    h.done!.then(() => (done = true));
    guess(h.node, '243');
    setSlider(h.node, 0, 4);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('jitter gets everyone through soonest with the fewest calls; plain backoff stays in step', () => {
    const none = retryRun('none');
    const back = retryRun('backoff');
    const jit = retryRun('jitter');
    expect(jit.lastMs).toBeLessThan(none.lastMs);
    expect(jit.total).toBeLessThan(back.total);
    expect(jit.total).toBeLessThan(none.total);
    expect(back.lastMs).toBe(Infinity);
    expect(none.lastMs).toBeCloseTo(2900, -2);
    expect(jit.lastMs).toBeLessThan(1500);
  });

  it('the jitter figure is done on choosing jitter', async () => {
    let done = false;
    const h = FIGURES['chaos-jitter'](context(), 'jitter');
    h.done!.then(() => (done = true));
    click(h.node, 'Back off with jitter');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
