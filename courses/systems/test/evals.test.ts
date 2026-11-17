// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { examplesFor, halfWidth, heldOut, overallChange, splitScore, verdictOf } from '../src/figures/evals';
import { click, context, guess, setSlider } from './helpers';

describe('evals: slices and noise', () => {
  it('a slice can regress while the overall score improves', () => {
    expect(overallChange(0.01, -0.03)).toBeCloseTo(0.0096, 4);
    expect(overallChange(0.2, -0.03)).toBeLessThan(0.003);
  });

  it('200 paired examples cannot see a 3-point regression; 2,000 can', () => {
    expect(verdictOf(-0.03, halfWidth(200, -0.03, true))).toBe('unclear');
    expect(verdictOf(-0.03, halfWidth(2000, -0.03, true))).toBe('worse');
    expect(verdictOf(0.01, halfWidth(20_000, 0.01, true))).toBe('fine');
  });

  it('pairing narrows the interval several times over', () => {
    expect(halfWidth(1000, -0.03, false) / halfWidth(1000, -0.03, true)).toBeGreaterThan(1.5);
    expect(examplesFor(0.01, false)).toBeCloseTo(6915, -2);
    expect(examplesFor(0.01, true)).toBeCloseTo(1537, -1);
  });
});

describe('evals: splits', () => {
  it('splitting by frame leaves twins; by place leaves nothing familiar', () => {
    const frame = splitScore(heldOut('frame'));
    const drive = splitScore(heldOut('drive'));
    const place = splitScore(heldOut('place'));
    expect(frame.twins).toBeGreaterThan(0.85);
    expect(frame.measured).toBeGreaterThan(0.95);
    expect(drive.twins).toBe(0);
    expect(drive.seenPlace).toBe(1);
    expect(drive.measured).toBeCloseTo(0.89, 5);
    expect(place.measured).toBeCloseTo(place.truth, 5);
  });
});

describe('evals: the figures', () => {
  it('slices: done once the gate sees the regression and the total still rises', async () => {
    let done = false;
    const h = FIGURES['evals-slices'](context(), 'caught');
    h.done!.then(() => (done = true));
    guess(h.node, "Can't tell from 200 examples");
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 1, 1000);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('split: done when held out by place', async () => {
    let done = false;
    const h = FIGURES['evals-split'](context(), 'split');
    h.done!.then(() => (done = true));
    click(h.node, 'By drive');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'By place');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
