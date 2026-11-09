// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { fanoutLoad, MACHINE, SEQ_MAX, snowflakeId, snowflakeParts, snowflakeRun, STEP_AT, TWEPOCH } from '../src/figures/fanout';
import { click, context, guess, setSlider } from './helpers';

describe('fanout: the work', () => {
  it('the lesson’s estimate: 1.3 million operations a second pushed, 60 million pulled', () => {
    expect(fanoutLoad('Fan-out on write', 200).total).toBe(1_300_000);
    expect(fanoutLoad('Fan-out on read', 200).total).toBe(60_005_000);
  });

  it('a 30-million-follower tweet takes 30 million inserts and five minutes pushed, none in the hybrid', () => {
    const push = fanoutLoad('Fan-out on write', 30_000_000);
    expect(push.bigInserts).toBe(30_000_000);
    expect(push.bigDelay).toBe(300);
    const hybrid = fanoutLoad('Hybrid', 30_000_000);
    expect(hybrid.bigInserts).toBe(0);
    expect(hybrid.listsPerRead).toBeGreaterThan(1);
    expect(hybrid.total).toBeLessThan(fanoutLoad('Fan-out on read', 30_000_000).total / 10);
  });
});

describe('fanout: Snowflake', () => {
  it('packs and unpacks the three fields', () => {
    const id = snowflakeId(TWEPOCH + 1000n, 37, 5);
    expect(id).toBe((1000n << 22n) | (37n << 12n) | 5n);
    expect(snowflakeParts(id)).toEqual({ ms: TWEPOCH + 1000n, machine: 37, seq: 5 });
  });

  it('IDs only grow, even when the sequence runs out', () => {
    const run = snowflakeRun(5000, false);
    const ids = run.flatMap((k) => k.ids);
    for (let i = 1; i < ids.length; i++) expect(ids[i] > ids[i - 1]).toBe(true);
    expect(run[0].issued).toBe(SEQ_MAX);
    expect(run[0].waiting).toBe(5000 - SEQ_MAX);
    expect(ids.every((x) => snowflakeParts(x).machine === MACHINE)).toBe(true);
  });

  it('a clock stepped back is refused until it passes the last millisecond used, and IDs stay in order', () => {
    const run = snowflakeRun(1000, true);
    expect(run[STEP_AT].refused).toBeGreaterThan(0);
    expect(run[STEP_AT].issued).toBe(0);
    const ids = run.flatMap((k) => k.ids);
    expect(new Set(ids.map(String)).size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) expect(ids[i] > ids[i - 1]).toBe(true);
  });
});

describe('fanout: the figures', () => {
  it('the cost figure asks first, then is done with the hybrid and a huge account', async () => {
    let done = false;
    const h = FIGURES['fanout-cost'](context(), 'hybrid');
    h.done!.then(() => (done = true));
    guess(h.node, 'Fan-out on write');
    click(h.node, 'Hybrid');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 5); // 30 million
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the Snowflake figure is done when the clock steps back', async () => {
    let done = false;
    const h = FIGURES['fanout-snowflake'](context(), 'back');
    h.done!.then(() => (done = true));
    setSlider(h.node, 1, 12);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Clock steps back 4 ms at 10 ms');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('refuses');
  });
});
