// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { trueTime, twoPcOutcome, twoPcScript, type TwoPcOptions } from '../src/figures/spanner';
import { click, context, guess, setSlider } from './helpers';

const cases: TwoPcOptions[] = [
  { crash: false, paxos: false },
  { crash: true, paxos: false },
  { crash: true, paxos: true },
  { crash: false, paxos: true },
];

describe('spanner: two-phase commit', () => {
  it('a dead coordinator blocks plain 2PC far longer than 2PC over Paxos groups', () => {
    expect(twoPcOutcome({ crash: false, paxos: false }).blocked).toBe(0);
    const plain = twoPcOutcome({ crash: true, paxos: false });
    const paxos = twoPcOutcome({ crash: true, paxos: true });
    expect(plain.blocked).toBeGreaterThan(5 * paxos.blocked);
  });

  it('the drawing releases the locks when the outcome says, inside the drawing', () => {
    for (const o of cases) {
      const s = twoPcScript(o);
      const releases = s.marks.filter((m) => m.text === 'unlocks').map((m) => m.at);
      expect(releases).toEqual([twoPcOutcome(o).release, twoPcOutcome(o).release]);
      expect(Math.max(...releases)).toBeLessThan(s.tMax);
      expect(s.lanes.some((l) => l.id === 'C2')).toBe(o.paxos);
    }
  });

  it('the figure is done once the Paxos version has played through', async () => {
    let done = false;
    const h = FIGURES['spanner-2pc'](context(), 'unblocked');
    h.done!.then(() => (done = true));
    click(h.node, 'Coordinator dies after the votes');
    setSlider(h.node, 0, 140);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Each is a Paxos group');
    setSlider(h.node, 0, 70);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('spanner: TrueTime', () => {
  it('without a wait, clocks misorder once their skew outgrows the 2 ms gap; commit wait orders for any ε', () => {
    // Skew between the servers is 1.8 ε, so the gap of 2 ms hides it below about 1.1 ms.
    expect(trueTime(0.5, 'clock').ordered).toBe(true);
    for (const eps of [2, 4, 7, 10]) {
      expect(trueTime(eps, 'clock').ordered).toBe(false);
      expect(trueTime(eps, 'tt').ordered).toBe(false);
    }
    for (const eps of [0.5, 1, 4, 7, 10]) {
      const w = trueTime(eps, 'wait');
      expect(w.ordered).toBe(true);
      expect(w.wait).toBeCloseTo(2 * eps, 10);
    }
  });

  it('at ε = 4 ms the wait is 8 ms', () => {
    expect(trueTime(4, 'wait').wait).toBeCloseTo(8, 10);
    expect(trueTime(4, 'tt').wait).toBe(0);
  });

  it('the figure is done with commit wait at ε of 4 ms', async () => {
    let done = false;
    const h = FIGURES['spanner-truetime'](context(), 'ordered');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 8 ms');
    click(h.node, 'TrueTime, no wait');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'TrueTime with commit wait');
    setSlider(h.node, 0, 5);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
