// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { dailyRate, HUMAN, LADDER, sayHuman, sayNs } from '../src/figures/nanosecond';
import { click, context, guess } from './helpers';

describe('nanosecond: the numbers', () => {
  it('keeps Dean\'s 2009 values', () => {
    const at = (w: string) => LADDER.find((r) => r.what === w)!.y2009;
    expect(at('Main memory reference')).toBe(100);
    expect(at('Round trip inside a datacentre')).toBe(500_000);
    expect(at('Disk seek')).toBe(10_000_000);
    expect(at('California to the Netherlands and back')).toBe(150_000_000);
  });

  it('on the human scale a seek is about a day and Europe about seventeen days', () => {
    expect(sayHuman((100 * HUMAN) / 1e9)).toBe('1 s');
    expect(sayHuman((10_000_000 * HUMAN) / 1e9)).toBe('28 hours');
    expect(sayHuman((150_000_000 * HUMAN) / 1e9)).toBe('17 days');
  });

  it('says times in the right unit', () => {
    expect(sayNs(0.5)).toBe('0.5 ns');
    expect(sayNs(20_000)).toBe('20 µs');
    expect(sayNs(150_000_000)).toBe('150 ms');
  });

  it('ten million a day is about 100 a second, a day taken as 10⁵ seconds', () => {
    const r = dailyRate(1e6, 10, 3);
    expect(r.mean).toBeCloseTo(100, 6);
    expect(r.peak).toBeCloseTo(300, 6);
  });
});

describe('nanosecond: the figures', () => {
  it('the ladder is done on the human scale', async () => {
    let done = false;
    const h = FIGURES['nanosecond-ladder'](context(), 'human');
    h.done!.then(() => (done = true));
    click(h.node, '2026');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Human scale');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('a disk seek');
  });

  it('the estimate is done once the guess is in', async () => {
    let done = false;
    const h = FIGURES['nanosecond-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    expect(h.node.textContent).not.toContain('about 100 a second');
    guess(h.node, 'About 100');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('about 100 a second');
  });
});
