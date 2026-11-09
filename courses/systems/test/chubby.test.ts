// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { committedAt, fencingRun, LEADER_DIES, logAt, raft, SPLIT } from '../src/figures/chubby';
import { click, context, guess, setSlider } from './helpers';

describe('chubby: Raft as the figures run it', () => {
  it('a new leader is elected in a higher term after the leader dies, and nothing committed is lost', () => {
    const r = raft(LEADER_DIES);
    expect(r.marks.some((m) => m.lane === 'S3' && m.text === 'leader, term 2')).toBe(true);
    expect(committedAt(r, r.tMax)).toEqual(['x=1', 'x=2', 'x=3']);
    for (const id of ['S2', 'S3', 'S4', 'S5']) expect(logAt(r, id, r.tMax).log.map((e) => e.cmd)).toEqual(['x=1', 'x=2', 'x=3']);
  });

  it('in a 2 | 3 split the old leader cannot commit, and its entry is overwritten after the heal', () => {
    const r = raft(SPLIT);
    const mid = 1000;
    const s1 = logAt(r, 'S1', mid);
    expect(s1.role).toBe('leader');
    expect(s1.log.map((e) => e.cmd)).toContain('x=2');
    expect(s1.commit).toBe(1);
    expect(committedAt(r, r.tMax)).toEqual(['x=1', 'x=3']);
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) expect(logAt(r, id, r.tMax).log.map((e) => e.cmd)).toEqual(['x=1', 'x=3']);
    expect(r.marks.some((m) => m.text === 'x=2 overwritten')).toBe(true);
    expect(r.messages.some((m) => m.lost)).toBe(true);
  });

  it('never has two leaders in one term', () => {
    for (const sc of [LEADER_DIES, SPLIT]) {
      const r = raft(sc);
      for (let t = 0; t <= r.tMax; t += 10) {
        const terms = ['S1', 'S2', 'S3', 'S4', 'S5'].map((id) => logAt(r, id, t)).filter((s) => s.role === 'leader').map((s) => s.term);
        expect(new Set(terms).size).toBe(terms.length);
      }
    }
  });

  it('fencing refuses the stale write', () => {
    expect(fencingRun(false).corrupted).toBe(true);
    expect(fencingRun(true).corrupted).toBe(false);
    expect(fencingRun(true).messages.some((m) => m.label?.startsWith('refused'))).toBe(true);
  });
});

describe('chubby: the figures', () => {
  it('the election figure is done when played to the end', async () => {
    let done = false;
    const h = FIGURES['chubby-raft'](context(), 'elected');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 500);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, LEADER_DIES.tMax);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the split figure needs the guess, then the run to the end', async () => {
    let done = false;
    const h = FIGURES['chubby-split'](context(), 'split');
    h.done!.then(() => (done = true));
    guess(h.node, 'x=3, on the side of three');
    setSlider(h.node, 0, SPLIT.tMax);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the fencing figure is done with fencing on, run to the end', async () => {
    let done = false;
    const h = FIGURES['chubby-fencing'](context(), 'fenced');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 340);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Fencing tokens');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
