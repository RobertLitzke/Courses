import { describe, expect, it } from 'vitest';
import { hash32, modulo, moved, Ring } from '../src/ring';
import { erlangC, little, mm1Time, mmcTime, tailFanout } from '../src/queueing';
import { bytes, count, duration } from '../src/numbers';

describe('consistent hashing', () => {
  it('hashes the same string to the same place', () => {
    expect(hash32('abc')).toBe(hash32('abc'));
    expect(hash32('abc')).not.toBe(hash32('abd'));
  });

  it('moves about one key in n when a node joins, where key mod n moves most of them', () => {
    const four = ['a', 'b', 'c', 'd'];
    const five = [...four, 'e'];
    const r4 = new Ring(four, 100);
    const r5 = new Ring(five, 100);
    const ring = moved(10_000, (k) => r4.owner(k), (k) => r5.owner(k));
    const mod = moved(10_000, modulo(four), modulo(five));
    expect(ring).toBeGreaterThan(0.12);
    expect(ring).toBeLessThan(0.28);
    expect(mod).toBeGreaterThan(0.75);
  });

  it('virtual nodes even out the shares', () => {
    const spread = (v: number) => {
      const s = [...new Ring(['a', 'b', 'c', 'd', 'e'], v).shares().values()];
      return Math.max(...s) / Math.min(...s);
    };
    expect(spread(200)).toBeLessThan(spread(1));
    expect(spread(200)).toBeLessThan(1.5);
    const total = [...new Ring(['a', 'b', 'c'], 10).shares().values()].reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 9);
  });

  it('lists distinct replicas clockwise', () => {
    const r = new Ring(['a', 'b', 'c', 'd'], 20);
    const reps = r.replicas(42, 3);
    expect(new Set(reps).size).toBe(3);
    expect(reps[0]).toBe(r.owner(42));
  });
});

describe('queues', () => {
  it('M/M/1 doubles its time at half load and blows up near full', () => {
    expect(mm1Time(0.5, 10)).toBeCloseTo(20);
    expect(mm1Time(0.9, 10)).toBeCloseTo(100);
    expect(mm1Time(1, 10)).toBe(Infinity);
  });
  it('Erlang C matches M/M/1 with one server, and more servers wait less at the same utilisation', () => {
    expect(erlangC(1, 0.5)).toBeCloseTo(0.5);
    expect(mmcTime(1, 0.5, 10)).toBeCloseTo(mm1Time(0.5, 10));
    expect(mmcTime(8, 0.8 * 8, 10)).toBeLessThan(mmcTime(1, 0.8, 10));
  });
  it("Little's law and the tail of a fan-out", () => {
    expect(little(1000, 0.05)).toBe(50);
    expect(tailFanout(100, 0.99)).toBeCloseTo(0.634, 3);
  });
});

describe('numbers', () => {
  it('writes sizes, times and counts plainly', () => {
    expect(bytes(1.5e12)).toBe('1.5 TB');
    expect(duration(0.35)).toBe('350 µs');
    expect(duration(1200)).toBe('1.2 s');
    expect(count(3.4e6)).toBe('3.4 million');
  });
});
