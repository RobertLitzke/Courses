// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { LogSim, logFigureForTest } from '../src/figures/kafka';
import { context } from './helpers';

const run = (sim: LogSim, ms: number) => {
  for (let t = 0; t < ms; t += 20) sim.step(20);
};

describe('kafka: the log', () => {
  it('three consumers at 25 a second keep up with 60 a second over six partitions', () => {
    const sim = new LogSim();
    run(sim, 10000);
    expect(sim.lag()).toBeLessThan(10);
    expect(sim.end.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(6 * 300 + 599);
  });

  it('a stopped consumer is noticed after the session timeout and its partitions restart from the last commit', () => {
    const sim = new LogSim();
    const g = sim.groups[0];
    run(sim, 3500);
    const victim = g.consumers[1];
    const held = sim.holds(g, victim.id);
    expect(held.length).toBeGreaterThan(0);
    sim.setUp(g, victim.id, false);
    run(sim, 1000);
    expect(g.rebalances).toBe(0);
    run(sim, 1200);
    expect(g.rebalances).toBe(1);
    expect(sim.holds(g, victim.id)).toEqual([]);
    expect(g.owner.every((o) => o !== null && o !== victim.id)).toBe(true);
    expect(g.reread).toBeGreaterThan(0);
    // Two consumers with three partitions each need 30 a second.
    run(sim, 8000);
    expect(sim.lag()).toBeGreaterThan(50);
    g.speed = 35;
    run(sim, 20000);
    expect(sim.lag()).toBeLessThan(10);
  });

  it('a new group from offset 0 replays the history and catches up', () => {
    const sim = new LogSim();
    const r = sim.addGroup('replay', 1, 200, 'start');
    expect(sim.lag(r)).toBe(1800);
    run(sim, 20000);
    expect(sim.lag(r)).toBeLessThan(10);
  });

  it('the figure is done after a rebalance once the lag is back down', async () => {
    let done = false;
    const h = FIGURES['kafka-log'](context(), 'rebalance');
    h.done!.then(() => (done = true));
    expect(h.node).toBeTruthy();
    const t = { goal: 'rebalance', done: () => (done = true), promise: new Promise<void>(() => {}), keep: () => {}, restored: false, waitFor: () => {} };
    const f = logFigureForTest(context(), t);
    const g = f.sim.groups[0];
    run(f.sim, 2000);
    f.sim.setUp(g, g.consumers[0].id, false);
    run(f.sim, 12000);
    f.paint();
    expect(done).toBe(false);
    g.speed = 40;
    run(f.sim, 20000);
    f.paint();
    expect(done).toBe(true);
  });
});
