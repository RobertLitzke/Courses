// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { buildDays, DAYS } from '../src/figures/datasets';
import { click, context } from './helpers';

describe('datasets: twelve days of builds', () => {
  it('incremental only keeps every lost update', () => {
    const d = buildDays('incremental', true, true);
    expect(d.length).toBe(DAYS);
    expect(d[DAYS - 1].wrong).toBe(200_000);
    expect(d.some((x) => x.alarm)).toBe(false);
  });

  it('a rolling rebuild catches the bug and clears the drift', () => {
    const d = buildDays('both', true, true);
    expect(d.find((x) => x.alarm)?.day).toBe(3);
    expect(d[DAYS - 1].wrong).toBe(0);
    expect(d.every((x) => x.idsChanged === 0)).toBe(true);
  });

  it('a rebuild that ignores the registry reissues IDs', () => {
    expect(buildDays('both', false, false).reduce((s, x) => s + x.idsChanged, 0)).toBe(1.2e9);
    expect(buildDays('both', false, true).some((x) => x.alarm)).toBe(false);
  });
});

describe('datasets: the figures', () => {
  it('bench: done with incremental plus rolling rebuild and the registry', async () => {
    let done = false;
    const h = FIGURES['datasets-bench'](context(), 'caught');
    h.done!.then(() => (done = true));
    click(h.node, 'Full rebuild daily');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Incremental + rolling rebuild');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('stills draw', () => {
    expect(FIGURES['datasets-conflate'](context()).node).toBeTruthy();
    expect(FIGURES['datasets-manifest'](context()).node).toBeTruthy();
  });
});
