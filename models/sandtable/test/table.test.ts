import { describe, expect, it } from 'vitest';
import { noise, Replay, Table } from '../src/table';

const sum = (a: Float32Array) => a.reduce((s, v) => s + v, 0);

describe('the sand table', () => {
  it('keeps its water between walls, and the water finds one level', () => {
    // A bowl with water piled at one side.
    const t = new Table({ nx: 20, ny: 12, bed: (i) => 0.02 * Math.abs(i - 10), params: { pickUp: 0 } });
    for (let j = 0; j < 12; j++) t.pour(t.k(2, j), 1);
    const before = sum(t.h);
    t.run(6000);
    expect(sum(t.h)).toBeCloseTo(before, 2);
    const level = (i: number) => t.z[t.k(i, 6)] + t.h[t.k(i, 6)];
    expect(Math.abs(level(3) - level(16))).toBeLessThan(0.02);
  });

  it('holds the sea at its level and lets it rise and fall with the tide', () => {
    const t = new Table({ nx: 10, ny: 10, bed: () => -1, sea: (i) => i === 0, params: { tide: 0.5, tidePeriod: 20 } });
    t.run(100); // a quarter of a tide: high water
    expect(Math.abs(t.h[t.k(0, 5)] - (1 + t.seaLevel()))).toBeLessThan(0.1);
    expect(t.seaLevel(5)).toBeCloseTo(0.5, 5);
    expect(t.seaLevel(15)).toBeCloseTo(-0.5, 5);
  });

  it('runs water downhill to the sea, counting what arrives and its dye', () => {
    const t = new Table({ nx: 30, ny: 5, bed: (i) => 1 - i * 0.05, sea: (i) => i === 29, params: { pickUp: 0 } });
    t.sources.push({ k: t.k(0, 2), flow: 1, dye: 1 });
    t.run(4000);
    expect(t.totals.water).toBeGreaterThan(100);
    expect(t.totals.dye / t.totals.water).toBeGreaterThan(0.9);
  });

  it('cuts where water runs fast and lays sand down where it slows', () => {
    // A slope into a flat basin.
    const t = new Table({ nx: 40, ny: 9, bed: (i) => (i < 20 ? 1 - i * 0.05 : 0), edges: { right: 'open' } });
    t.sources.push({ k: t.k(0, 4), flow: 0.5 });
    t.run(3000);
    let cut = 0;
    let laid = 0;
    for (let k = 0; k < t.n; k++) {
      const i = k % t.nx;
      const d = t.z[k] - t.z0[k];
      if (i < 18 && d < 0) cut -= d;
      if (i >= 20 && d > 0) laid += d;
    }
    expect(cut).toBeGreaterThan(0.1);
    expect(laid).toBeGreaterThan(0.05);
  });

  it('stops water at a dam until it spills over the crest, and takes the dam out again', () => {
    const t = new Table({ nx: 30, ny: 5, bed: (i) => 1 - i * 0.03, edges: { right: 'open' }, params: { pickUp: 0 } });
    const dam = [0, 1, 2, 3, 4].map((j) => t.k(15, j));
    t.build(dam, 1.2);
    t.sources.push({ k: t.k(0, 2), flow: 0.2 });
    t.run(400);
    expect(t.totals.outWater).toBe(0);
    expect(t.works[dam[0]]).toBe(1);
    t.remove(dam);
    expect(t.z[dam[0]]).toBeCloseTo(1 - 15 * 0.03, 5);
    t.run(2000);
    expect(t.totals.outWater).toBeGreaterThan(0);
  });

  it('drifts sand along a shore in the direction the waves push it', () => {
    const make = (dir: 1 | -1) => {
      const t = new Table({
        nx: 40, ny: 16, bed: (i, j) => (j < 6 ? 0.6 : -0.1 - (j - 6) * 0.08), sea: (_i, j) => j === 15,
        params: { waves: 0.6, surf: 0.5, driftTo: [dir, 0], drift: 1.2, cliff: 0.15, carry: 0.6, pickUp: 0.5, settle: 1, start: 0.1 },
      });
      t.run(1500);
      let east = 0;
      let west = 0;
      for (let k = 0; k < t.n; k++) {
        const d = t.z[k] - t.z0[k];
        if (d <= 0) continue;
        if (k % 40 >= 30) east += d;
        if (k % 40 < 10) west += d;
      }
      return { east, west };
    };
    const e = make(1);
    const w = make(-1);
    expect(e.east).toBeGreaterThan(e.west);
    expect(w.west).toBeGreaterThan(w.east);
  });

  it('lifts the land, and its starting ground with it', () => {
    const t = new Table({ nx: 6, ny: 6, bed: () => 0, rises: (i) => (i === 3 ? 1 : 0), params: { uplift: 0.1, slump: 0 } });
    t.run(200); // 10 time units
    expect(t.z[t.k(3, 3)]).toBeCloseTo(1, 3);
    expect(t.z0[t.k(3, 3)]).toBeCloseTo(1, 3);
    expect(t.z[t.k(1, 1)]).toBe(0);
  });
});

describe('a replay', () => {
  it('comes out the same going back and forward as straight through', () => {
    const make = () => {
      const t = new Table({ nx: 24, ny: 10, bed: (i, j) => 1 - i * 0.04 + 0.05 * Math.sin(j), edges: { right: 'open' } });
      t.sources.push({ k: t.k(0, 5), flow: 0.4, sand: 0.02 });
      return t;
    };
    const a = new Replay(make, { every: 2 });
    a.to(12);
    a.to(3);
    const scrubbed = a.to(9).z.slice();
    const straight = new Replay(make).to(9).z;
    for (let k = 0; k < straight.length; k++) expect(scrubbed[k]).toBeCloseTo(straight[k], 5);
  });

  it('applies its schedule at the same times every run', () => {
    const make = () => new Table({ nx: 5, ny: 5, bed: () => 0 });
    const r = new Replay(make, { schedule: (t, time) => { t.p.rain = time >= 1 ? 0.1 : 0; } });
    expect(sum(r.to(1).h)).toBeCloseTo(0, 5);
    expect(sum(r.to(2).h)).toBeCloseTo(25 * 0.1, 2);
  });
});

describe('noise', () => {
  it('stays between 0 and 1 and repeats for a seed', () => {
    const n = noise(4, 8, 3);
    const m = noise(4, 8, 3);
    for (let i = 0; i < 50; i++) {
      const v = n(i * 1.3, i * 0.7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(m(i * 1.3, i * 0.7)).toBe(v);
    }
  });
});
