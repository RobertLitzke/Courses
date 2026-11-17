// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { combined, outcome, skipped } from '../src/figures/labels';
import { click, context, setSlider } from './helpers';

describe('labels: the line', () => {
  it('overlap cuts individual slips', () => {
    expect(combined(0.1, 1)).toBe(0.1);
    expect(combined(0.1, 2)).toBeCloseTo(0.019, 4);
    expect(combined(0.1, 3)).toBeCloseTo(0.028, 4);
  });

  it('overlap does not fix an unclear guideline', () => {
    const one = outcome({ overlap: 1, skipAbove: 1, ambiguity: 0.4, audit: false });
    const three = outcome({ overlap: 3, skipAbove: 1, ambiguity: 0.4, audit: false });
    expect(three.fromAmbiguity).toBeCloseTo(one.fromAmbiguity, 6);
    expect(three.trueErr).toBeGreaterThan(0.035);
    expect(three.measuredErr).toBeLessThan(three.trueErr / 2);
  });

  it('skipping people saves minutes and hides the model\'s errors', () => {
    expect(skipped(0.9).share).toBeCloseTo(0.18, 6);
    const none = outcome({ overlap: 2, skipAbove: 1, ambiguity: 0.05, audit: true });
    const some = outcome({ overlap: 2, skipAbove: 0.85, ambiguity: 0.05, audit: true });
    expect(some.costPer1000).toBeLessThan(none.costPer1000);
    expect(some.fromModel).toBeGreaterThan(0.015);
    expect(none.trueErr).toBeLessThan(0.03);
    expect(none.perDay).toBeGreaterThan(33_000);
  });
});

describe('labels: the figures', () => {
  it('bench: done with two labelers, a clear guideline and an audit', async () => {
    let done = false;
    const h = FIGURES['labels-bench'](context(), 'trusted');
    h.done!.then(() => (done = true));
    click(h.node, 'Gold and a random audit');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, '2');
    setSlider(h.node, 1, 0.05);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('record: draws', () => {
    expect(FIGURES['labels-record'](context()).node).toBeTruthy();
  });
});
