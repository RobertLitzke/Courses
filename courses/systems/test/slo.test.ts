// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { budgetMinutes, burnRate, gorilla, monthRun, SAMPLE, timeBits } from '../src/figures/slo';
import { context, guess, setSlider } from './helpers';

describe('slo: the budget', () => {
  it('99.9% over 30 days is 43.2 minutes, 99.99% is 4.32', () => {
    expect(budgetMinutes(0.999)).toBeCloseTo(43.2, 5);
    expect(budgetMinutes(0.9999)).toBeCloseTo(4.32, 5);
  });
  it('burn rate is error rate over the allowance', () => {
    expect(burnRate(0.005, 0.999)).toBeCloseTo(5, 6);
    expect(burnRate(0.0144, 0.999)).toBeCloseTo(14.4, 6);
  });
  it('the month just fits a 99.9% target and breaks a 99.95% one', () => {
    expect(monthRun(0.999).left[719]).toBeGreaterThan(0);
    expect(monthRun(0.999).left[719]).toBeLessThan(0.2);
    expect(monthRun(0.9995).left[719]).toBeLessThan(0);
    expect(monthRun(0.99).left[719]).toBeGreaterThan(0.8);
  });
  it('at 99.9% every burn-rate alert is during an incident, and CPU alerts come nightly', () => {
    const r = monthRun(0.999);
    expect(r.burnAlerts.length).toBe(4);
    expect(r.burnReal).toBe(4);
    expect(r.cpuAlerts.length).toBe(22);
  });
});

describe('slo: Gorilla', () => {
  it('a repeated value and a steady clock cost one bit each', () => {
    expect(timeBits(0)).toBe(1);
    expect(timeBits(5)).toBe(9);
    expect(timeBits(-200)).toBe(12);
    expect(timeBits(100000)).toBe(36);
    const g = gorilla(SAMPLE);
    expect(g[1].tBits + g[1].vBits).toBe(2);
  });
  it('the sample comes to under 2 bytes a point', () => {
    const g = gorilla(SAMPLE);
    const bits = g.reduce((s, r) => s + r.tBits + r.vBits, 0) / g.length;
    expect(bits / 8).toBeLessThan(2);
  });
});

describe('slo: the figure', () => {
  it('is done once the guess is in and the month played out', async () => {
    let done = false;
    const h = FIGURES['slo-budget'](context(), 'month');
    h.done!.then(() => (done = true));
    guess(h.node, 'Yes, with some left');
    setSlider(h.node, 1, 15);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 1, 30);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
