// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { NIGHT_WORK, nightRun, splitAt, suiteSize, trajectory } from '../src/figures/replay';
import { click, context, guess, setSlider } from './helpers';

describe('replay: determinism', () => {
  it('the same inputs, build and seed replay bit for bit', () => {
    expect(trajectory('replay')).toEqual(trajectory());
    expect(splitAt(trajectory(), trajectory('replay'))).toBe(-1);
  });

  it('an unrecorded random draw splits the paths early, and 32-bit rounding splits them later', () => {
    const r = trajectory();
    const unseeded = splitAt(r, trajectory('unseeded'));
    const build = splitAt(r, trajectory('build'));
    expect(unseeded).toBeGreaterThan(0);
    expect(build).toBeGreaterThan(unseeded);
    expect(build).toBeLessThan(500);
  });
});

describe('replay: the estimate', () => {
  it('a million 30-second scenarios at a core-second a second take about 50 minutes on 10,000 cores', () => {
    const s = suiteSize(1e6, 30, 1, 10_000);
    expect(s.coreHours).toBeCloseTo(8333, 0);
    expect(s.wallSeconds / 60).toBeCloseTo(50, 0);
    expect(s.falseAlarms).toBe(10_000);
  });
});

describe('replay: a night on the cluster', () => {
  const base = { preemptible: false, checkpoint: false, taskMin: 120, cache: false };

  it('a reservation is too small to finish both builds by morning, and costs the same whatever it does', () => {
    expect(NIGHT_WORK).toBeCloseTo(66_667, 0);
    const n = nightRun(base);
    expect(n.finish).toBeGreaterThan(9);
    expect(nightRun({ ...base, cache: true }).cost).toBe(n.cost);
  });

  it('preemptible capacity is cheaper, but long tasks without checkpoints lose a quarter of it', () => {
    const n = nightRun({ ...base, preemptible: true });
    expect(n.cost).toBeLessThan(nightRun(base).cost / 3);
    expect(n.wasted / n.used).toBeGreaterThan(0.2);
    expect(n.finish).toBeGreaterThan(9);
  });

  it('tiny tasks waste their start-up; checkpoints rescue long ones', () => {
    const tiny = nightRun({ ...base, preemptible: true, taskMin: 1 });
    expect(tiny.wasted / tiny.used).toBeGreaterThan(0.45);
    const saved = nightRun({ ...base, preemptible: true, checkpoint: true });
    expect(saved.wasted / saved.used).toBeLessThan(0.06);
    expect(saved.finish).toBeLessThan(9);
  });

  it('reusing baseline results halves the work', () => {
    const n = nightRun({ ...base, preemptible: true, checkpoint: true, taskMin: 30, cache: true });
    expect(n.used).toBeLessThan(NIGHT_WORK * 0.6);
    expect(n.finish).toBeLessThan(5);
  });
});

describe('replay: the figures', () => {
  it('drift: done once the new build is replayed after the guess', async () => {
    let done = false;
    const h = FIGURES['replay-drift'](context(), 'drift');
    h.done!.then(() => (done = true));
    guess(h.node, 'Somewhere else entirely');
    click(h.node, 'An unrecorded random draw');
    await Promise.resolve();
    expect(done).toBe(false);
    expect(h.node.textContent).toContain('apart at tic');
    click(h.node, 'New build, 32-bit rounding');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('estimate: done when the guess is in', async () => {
    let done = false;
    const h = FIGURES['replay-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About an hour');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('scheduler: draws', () => {
    const h = FIGURES['replay-scheduler'](context(), 'look');
    expect(h.node.textContent).toContain('claim with a lease');
  });

  it('bench: done when preemptible capacity finishes by morning without much waste', async () => {
    let done = false;
    const h = FIGURES['replay-bench'](context(), 'night');
    h.done!.then(() => (done = true));
    click(h.node, 'Batch, preemptible');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Every 5 minutes');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('bench: the slider changes the task size', () => {
    const h = FIGURES['replay-bench'](context(), 'night');
    click(h.node, 'Batch, preemptible');
    setSlider(h.node, 0, 1);
    expect(h.node.textContent).toContain('50% of them wasted');
  });
});
