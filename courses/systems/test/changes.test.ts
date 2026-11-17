// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { eligible, triage } from '../src/figures/changes';
import { click, context, setSlider } from './helpers';

describe('changes: triage', () => {
  it('a high bar sends more work to people', () => {
    expect(eligible(0.6)).toBe(1);
    expect(eligible(0.9)).toBeCloseTo(0.25, 6);
    const strict = triage(0.99, 15, true);
    expect(strict.backlog[6]).toBeGreaterThan(strict.backlog[0]);
    expect(strict.waitHours).toBeGreaterThan(48);
  });

  it('two reviewers on the top tier cut the worst errors', () => {
    expect(triage(0.75, 15, false).badViews - triage(0.75, 15, true).badViews).toBeGreaterThan(400_000);
    const ok = triage(0.75, 15, true);
    expect(ok.waitHours).toBeLessThanOrEqual(24);
    expect(ok.badViews).toBeLessThan(100_000);
  });
});

describe('changes: the figure', () => {
  it('triage: done with two reviewers, a short queue and few bad views', async () => {
    let done = false;
    const h = FIGURES['changes-triage'](context(), 'balanced');
    h.done!.then(() => (done = true));
    click(h.node, 'Two reviewers');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 0.75);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
