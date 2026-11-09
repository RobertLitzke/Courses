// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { KILLED_WORKER, runJob } from '../src/figures/mapreduce';
import { click, context, setSlider } from './helpers';

describe('mapreduce: the job model', () => {
  it('a healthy run takes three waves of maps and reduces in turn', () => {
    const j = runJob();
    expect(j.mapsDone).toBe(30);
    expect(j.finish).toBe(45);
    expect(j.wasted).toBe(0);
  });

  it('one slow machine more than doubles the time, and backup tasks win most of it back', () => {
    const slow = runJob({ slow: true });
    const backed = runJob({ slow: true, backups: true });
    expect(slow.finish).toBeGreaterThan(2 * runJob().finish);
    expect(backed.finish).toBeLessThan(1.3 * runJob().finish);
    expect(backed.wasted).toBeGreaterThan(0);
    expect(backed.wasted / backed.spent).toBeLessThan(0.15);
  });

  it('a dead worker costs a little, and its finished maps run again', () => {
    const j = runJob({ killAt: 25 });
    expect(j.finish).toBeGreaterThan(45);
    expect(j.finish).toBeLessThan(1.25 * 45);
    expect(j.runs.some((r) => r.worker === KILLED_WORKER && r.fate === 'lost')).toBe(true);
    expect(j.runs.filter((r) => r.kind === 'map' && r.fate === 'done').length).toBe(200);
    expect(j.runs.filter((r) => r.kind === 'reduce' && r.fate === 'done').length).toBe(100);
  });

  it('every task is done exactly once, whatever goes wrong', () => {
    for (const o of [{ slow: true, backups: true, killAt: 25 }, { backups: true }, { slow: true, killAt: 10 }]) {
      const j = runJob(o);
      const maps = new Set(j.runs.filter((r) => r.kind === 'map' && r.fate === 'done').map((r) => r.task));
      expect(maps.size).toBe(200);
      expect(j.runs.filter((r) => r.kind === 'reduce' && r.fate === 'done').length).toBe(100);
    }
  });
});

describe('mapreduce: the figure', () => {
  it('is done when the slow job is run to the end with backups on', async () => {
    let done = false;
    const h = FIGURES['mapreduce-job'](context(), 'backup');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 125);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Backup tasks');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('draws the index still', () => {
    expect(FIGURES['mapreduce-index'](context()).node.querySelector('svg')).toBeTruthy();
  });
});
