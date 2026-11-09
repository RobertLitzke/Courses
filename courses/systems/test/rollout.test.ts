// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { abSteps, behindMoreThan, fleetPlan, FLEET, rollout } from '../src/figures/rollout';
import { click, context, guess, setSlider } from './helpers';

describe('rollout: stages', () => {
  it('all at once, a defect breaks its whole share of the fleet', () => {
    expect(rollout(false, 0.2).broken).toBe(FLEET * 0.2);
  });

  it('a gross defect is caught in the first stage, a subtle one later, and a tiny one not at all', () => {
    const gross = rollout(true, 0.2);
    expect(gross.haltedStage).toBe(0);
    expect(gross.broken).toBeCloseTo(2000, 6);
    expect(rollout(true, 0.001).haltedStage).toBe(1);
    expect(rollout(true, 0.0001).haltedStage).toBe(2);
    const tiny = rollout(true, 0.00001);
    expect(tiny.haltedStage).toBe(-1);
    expect(tiny.updated).toBe(FLEET);
  });
});

describe('rollout: A/B slots', () => {
  it('in place, a bad update or a power cut leaves the device dead', () => {
    expect(abSteps('inplace', 'bad').at(-1)!.device.color).toBe('error');
    expect(abSteps('inplace', 'power').at(-1)!.device.color).toBe('error');
  });

  it('with two slots, every case ends with a running device', () => {
    for (const c of ['good', 'bad', 'power'] as const) expect(abSteps('ab', c).at(-1)!.device.color).toBe('answer');
    expect(abSteps('ab', 'bad').at(-1)!.device.text).toContain('v1');
    expect(abSteps('ab', 'good').at(-1)!.device.text).toContain('v2');
  });
});

describe('rollout: the fleet', () => {
  const base = { delta: false, wifiFirst: false, deltaPaths: 1, spreadDays: 1 };

  it('full releases over cellular cost tens of millions a month', () => {
    const p = fleetPlan(base);
    expect(p.perCar).toBeCloseTo(21.5, 6);
    expect(p.cellCost).toBeGreaterThan(3e7);
    expect(p.peakGbps).toBeGreaterThan(1000);
  });

  it('deltas cut the bytes about thirteen times; Wi-Fi first cuts cellular again but takes longer', () => {
    const d = fleetPlan({ ...base, delta: true });
    expect(fleetPlan(base).totalBytes / d.totalBytes).toBeGreaterThan(10);
    const w = fleetPlan({ ...base, delta: true, wifiFirst: true });
    expect(w.cellCost).toBeLessThan(d.cellCost / 3);
    expect(w.daysTo95).toBeGreaterThan(d.daysTo95 + 10);
  });

  it('more delta paths leave fewer cars needing everything', () => {
    expect(behindMoreThan(1)).toBeCloseTo(0.024, 6);
    expect(fleetPlan({ ...base, delta: true, deltaPaths: 12 }).fullShare).toBeLessThan(0.003);
  });

  it('spreading the offer flattens the peak', () => {
    const one = fleetPlan({ ...base, delta: true, wifiFirst: true });
    const week = fleetPlan({ ...base, delta: true, wifiFirst: true, spreadDays: 7 });
    expect(week.peakGbps).toBeLessThan(one.peakGbps / 3);
  });
});

describe('rollout: the figures', () => {
  it('stages: done when a subtle defect is caught after the first stage', async () => {
    let done = false;
    const h = FIGURES['rollout-stages'](context(), 'subtle');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 2,000');
    click(h.node, 'Stages behind a health gate');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 430); // about 0.1%, on the log slider
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('ab: done when two slots carry a bad update to the end', async () => {
    let done = false;
    const h = FIGURES['rollout-ab'](context(), 'fallback');
    h.done!.then(() => (done = true));
    click(h.node, 'A/B slots');
    click(h.node, 'An update that won\'t boot');
    setSlider(h.node, 0, 100);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('back on v1');
  });

  it('sign: draws the four roles', () => {
    const h = FIGURES['rollout-sign'](context(), 'look');
    for (const r of ['Root', 'Targets', 'Snapshot', 'Timestamp']) expect(h.node.textContent).toContain(r);
  });

  it('fleet: done with deltas, Wi-Fi first and a spread offer', async () => {
    let done = false;
    const h = FIGURES['rollout-fleet'](context(), 'lean');
    h.done!.then(() => (done = true));
    click(h.node, 'Delta from what the car has');
    click(h.node, 'Wi-Fi first, cellular after 14 days');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 1, 3);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
