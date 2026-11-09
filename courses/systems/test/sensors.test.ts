// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { fleetSize, matchShare, perDay, plan, sampleSegments, uploadCost } from '../src/figures/sensors';
import { click, context, guess, setSlider } from './helpers';

describe('sensors: the estimate', () => {
  it('1,000 vehicles at 1 TB an hour for 8 hours is 8 PB a day, about 74 days through 10 Gb/s', () => {
    const s = fleetSize(1000, 1, 8, 10);
    expect(s.daily).toBe(8e15);
    expect(perDay(1) / 1e12).toBeCloseTo(10.8, 1);
    expect(s.linkDays).toBeCloseTo(74, 0);
    expect(s.cellShare).toBeCloseTo(0.0225, 3);
    expect(s.drives).toBe(400);
  });
});

describe('sensors: the plan', () => {
  it('keeping everything swamps any network', () => {
    expect(plan({ keep: 1, path: 'cell', tiered: false }).backlog).toBeGreaterThan(7e15);
    expect(plan({ keep: 1, path: 'depot', tiered: false }).backlog).toBeGreaterThan(6e15);
  });

  it('keeping a few per cent through depots keeps up, and cold storage cuts the bill several times', () => {
    const hot = plan({ keep: 0.04, path: 'depot', tiered: false });
    const cold = plan({ keep: 0.04, path: 'depot', tiered: true });
    expect(hot.backlog).toBe(0);
    expect(hot.storeMonth / cold.storeMonth).toBeGreaterThan(5);
    expect(cold.storeMonth).toBeLessThan(1.5e6);
  });

  it('cellular is fast but its bytes are dear', () => {
    const p = plan({ keep: 0.02, path: 'cell', tiered: true });
    expect(p.delayHours).toBeLessThan(1);
    expect(p.moveMonth).toBeGreaterThan(plan({ keep: 0.02, path: 'depot', tiered: true }).moveMonth * 50);
  });
});

describe('sensors: uploads', () => {
  it('a whole-file upload resends what it had sent; chunks resend one chunk', () => {
    expect(uploadCost(false, 256, 0.6, 0).sent).toBeCloseTo(256 * 1.6, 5);
    expect(uploadCost(true, 256, 0.6, 0).sent).toBeCloseTo(256, 1);
    expect(uploadCost(true, 256, 0.6, 0.25).skipped).toBe(64);
  });
});

describe('sensors: the catalogue', () => {
  it('matching shares multiply', () => {
    expect(matchShare(['night', 'cyclist'])).toBeCloseTo(0.015, 6);
    expect(matchShare([])).toBe(1);
    const segs = sampleSegments();
    expect(segs.length).toBe(400);
    const night = segs.filter((t) => t.includes('night')).length / 400;
    expect(night).toBeGreaterThan(0.2);
    expect(night).toBeLessThan(0.4);
  });
});

describe('sensors: the figures', () => {
  it('estimate: done when the guess is in', async () => {
    let done = false;
    const h = FIGURES['sensors-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About ten weeks');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('bench: done when kept data fits the path and old data goes cold', async () => {
    let done = false;
    const h = FIGURES['sensors-bench'](context(), 'keeps');
    h.done!.then(() => (done = true));
    click(h.node, 'Depot links');
    click(h.node, 'Cold after 30 days');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 300);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('chunks: done when a chunked upload meets a dropped link', async () => {
    let done = false;
    const h = FIGURES['sensors-chunks'](context(), 'resumed');
    h.done!.then(() => (done = true));
    click(h.node, 'Chunks named by hash');
    setSlider(h.node, 0, 0.3);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('find: done when the catalogue answers two filters', async () => {
    let done = false;
    const h = FIGURES['sensors-find'](context(), 'found');
    h.done!.then(() => (done = true));
    click(h.node, 'night');
    click(h.node, 'cyclist');
    click(h.node, 'Ask the catalogue');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
