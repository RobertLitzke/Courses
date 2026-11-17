// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { driftSeen, falseAlarms, month, tail } from '../src/figures/validation';
import { click, context, setSlider } from './helpers';

describe('validation: a month of nights', () => {
  it('the normal tail', () => {
    expect(tail(1.96)).toBeCloseTo(0.05, 3);
    expect(tail(3)).toBeCloseTo(0.0027, 4);
  });

  it('a low threshold sees the drift early and alarms often', () => {
    expect(driftSeen(2)).toBe(22);
    expect(driftSeen(4)).toBeNull();
    expect(falseAlarms(['history', 'reference'], 2)).toBeGreaterThan(5);
    expect(falseAlarms(['history', 'reference'], 3)).toBeLessThan(1);
  });

  it('every check and a threshold near 3, with the change declared, stops everything', () => {
    const r = month(['totals', 'schema', 'history', 'reference'], 3, true);
    expect(r.reached).toEqual([]);
    expect(r.legitAlarm).toBe(false);
    expect(month(['totals', 'schema', 'history', 'reference'], 3, false).legitAlarm).toBe(true);
    expect(month(['schema', 'history'], 3, true).reached).toContain('A region slowly losing roads');
  });
});

describe('validation: the figures', () => {
  it('bench: done with all checks, a threshold of 3 and the change declared', async () => {
    let done = false;
    const h = FIGURES['validation-bench'](context(), 'guarded');
    h.done!.then(() => (done = true));
    for (const c of ['Control totals', 'Schema and ranges', 'Volume against last week', 'Distribution against a fixed reference']) click(h.node, c);
    click(h.node, 'Declared in advance');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 3);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('write, audit, publish: draws', () => {
    expect(FIGURES['validation-wap'](context()).node).toBeTruthy();
  });
});
