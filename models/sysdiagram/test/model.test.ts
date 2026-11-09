import { describe, expect, it } from 'vitest';
import { System, quantile, zipf, type PartSpec, type LinkSpec } from '../src/model';
import { makeRng } from 'didactics/rng';

const client = (o: Partial<PartSpec> = {}): PartSpec => ({ id: 'c', kind: 'client', x: 0, y: 0, rps: 100, ...o });

describe('a single server', () => {
  it('answers in the round trip plus its work when it is idle', () => {
    const s = new System({ parts: [client({ rps: 1 }), { id: 's', kind: 'server', x: 0, y: 0, serviceMs: 5 }], links: [{ from: 'c', to: 's', ms: 10 }], exact: true, seed: 3, keepMs: 30_000 });
    s.run(20_000);
    const st = s.stats(20_000);
    expect(st.count).toBeGreaterThan(5);
    expect(st.p50).toBeCloseTo(25, 5);
    expect(st.errors).toBe(0);
  });

  it('waits longer and longer as the load nears what it can do', () => {
    const p99 = (rps: number) => {
      const s = new System({ parts: [client({ rps }), { id: 's', kind: 'server', x: 0, y: 0, serviceMs: 10 }], links: [{ from: 'c', to: 's', ms: 1 }], seed: 7, keepMs: 60_000 });
      s.run(60_000);
      return s.stats(50_000).p50;
    };
    const light = p99(20); // 20% busy
    const heavy = p99(90); // 90% busy
    expect(heavy).toBeGreaterThan(light * 4);
  });

  it('turns requests away once its queue is full, and a client gives up after its timeout', () => {
    const s = new System({ parts: [client({ rps: 300, timeoutMs: 200 }), { id: 's', kind: 'server', x: 0, y: 0, serviceMs: 10, queue: 5 }], links: [{ from: 'c', to: 's', ms: 1 }], seed: 2 });
    s.run(5000);
    expect(s.part('s').rejected).toBeGreaterThan(0);
    expect(s.stats(4000).errors).toBeGreaterThan(0.5);
  });
});

describe('spreading and failing', () => {
  const parts: PartSpec[] = [
    client({ rps: 50, timeoutMs: 100 }),
    { id: 'lb', kind: 'lb', x: 0, y: 0 },
    { id: 'a', kind: 'server', x: 0, y: 0, serviceMs: 2 },
    { id: 'b', kind: 'server', x: 0, y: 0, serviceMs: 2 },
  ];
  const links: LinkSpec[] = [
    { from: 'c', to: 'lb' },
    { from: 'lb', to: 'a' },
    { from: 'lb', to: 'b' },
  ];

  it('a balancer shares the work in turn', () => {
    const s = new System({ parts, links, seed: 1 });
    s.run(10_000);
    const a = s.part('a').served;
    const b = s.part('b').served;
    expect(Math.abs(a - b)).toBeLessThanOrEqual(2);
  });

  it('without health checks, half the requests are lost when one server fails; with them, none', () => {
    const blind = new System({ parts, links, seed: 1 });
    blind.setUp('b', false);
    blind.run(10_000);
    expect(blind.stats(8000).errors).toBeGreaterThan(0.4);
    const checked = new System({ parts: parts.map((p) => (p.id === 'lb' ? { ...p, health: true } : p)), links, seed: 1 });
    checked.setUp('b', false);
    checked.run(10_000);
    expect(checked.stats(8000).errors).toBe(0);
  });

  it('retries hide a lost request at the cost of time', () => {
    const s = new System({ parts: parts.map((p) => (p.id === 'c' ? { ...p, retries: 4, backoffMs: 5 } : p)), links, seed: 1 });
    s.setUp('b', false);
    s.run(10_000);
    const st = s.stats(8000);
    expect(st.errors).toBeLessThan(0.1);
    expect(st.p99).toBeGreaterThan(100);
  });

  it('work held by a part when it fails is not finished when it comes back', () => {
    const s = new System({ parts, links, seed: 4 });
    s.run(1000);
    s.setUp('a', false);
    s.setUp('a', true);
    s.run(1000);
    expect(s.part('a').busy).toBeLessThanOrEqual(1);
  });
});

describe('policies', () => {
  it('a cache answers its share of hits and passes the rest on', () => {
    const s = new System({
      parts: [client({ rps: 200 }), { id: 'k', kind: 'cache', x: 0, y: 0, policy: { type: 'cache', hit: 0.9 } }, { id: 'd', kind: 'db', x: 0, y: 0, serviceMs: 1 }],
      links: [{ from: 'c', to: 'k' }, { from: 'k', to: 'd' }],
      seed: 5,
    });
    s.run(20_000);
    const share = s.part('d').served / s.part('k').served;
    expect(share).toBeGreaterThan(0.07);
    expect(share).toBeLessThan(0.13);
  });

  it('hashing sends each key to the same shard every time', () => {
    const seen = new Map<number, string>();
    const s = new System({
      parts: [client({ rps: 100, keys: 50 }), { id: 'r', kind: 'service', x: 0, y: 0, policy: { type: 'hash' } }, ...['s0', 's1', 's2'].map((id) => ({ id, kind: 'shard' as const, x: 0, y: 0 }))],
      links: [{ from: 'c', to: 'r' }, { from: 'r', to: 's0' }, { from: 'r', to: 's1' }, { from: 'r', to: 's2' }],
      seed: 9,
    });
    let clash = false;
    s.hooks.serve = (p, call) => {
      if (p.kind !== 'shard') return;
      const was = seen.get(call.key);
      if (was && was !== p.id) clash = true;
      seen.set(call.key, p.id);
      expect(p.id).toBe(`s${call.key % 3}`);
    };
    s.run(5000);
    expect(clash).toBe(false);
    expect(seen.size).toBeGreaterThan(30);
  });

  it('a quorum write succeeds with one replica of three down, and fails with two', () => {
    const make = () =>
      new System({
        parts: [client({ rps: 50, timeoutMs: 100 }), { id: 'co', kind: 'service', x: 0, y: 0, policy: { type: 'fanout', need: 2 } }, ...['r1', 'r2', 'r3'].map((id) => ({ id, kind: 'replica' as const, x: 0, y: 0 }))],
        links: [{ from: 'c', to: 'co' }, { from: 'co', to: 'r1', ms: 2 }, { from: 'co', to: 'r2', ms: 5 }, { from: 'co', to: 'r3', ms: 30 }],
        seed: 11,
      });
    const one = make();
    one.setUp('r1', false);
    one.run(5000);
    expect(one.stats(4000).errors).toBe(0);
    // It waits for the slow replica now.
    expect(one.stats(4000).p50).toBeGreaterThan(55);
    const two = make();
    two.setUp('r1', false);
    two.setUp('r2', false);
    two.run(5000);
    expect(two.stats(4000).errors).toBe(1);
  });

  it('an asynchronous queue answers at once and the worker catches up later', () => {
    const s = new System({
      parts: [client({ rps: 100 }), { id: 'q', kind: 'queue', x: 0, y: 0, policy: { type: 'async' }, serviceMs: 0.1 }, { id: 'w', kind: 'worker', x: 0, y: 0, serviceMs: 50 }],
      links: [{ from: 'c', to: 'q', ms: 1 }, { from: 'q', to: 'w', ms: 1 }],
      seed: 3,
    });
    s.run(3000);
    expect(s.stats(2000).p99).toBeLessThan(10);
    expect(s.part('w').waiting.length).toBeGreaterThan(50);
  });

  it('a failover sends to the first part that is up', () => {
    const s = new System({
      parts: [client({ rps: 50 }), { id: 'app', kind: 'server', x: 0, y: 0, policy: { type: 'failover' }, health: true }, { id: 'p', kind: 'db', x: 0, y: 0 }, { id: 's', kind: 'replica', x: 0, y: 0 }],
      links: [{ from: 'c', to: 'app' }, { from: 'app', to: 'p' }, { from: 'app', to: 's' }],
      seed: 1,
    });
    s.run(2000);
    expect(s.part('s').served).toBe(0);
    s.setUp('p', false);
    s.run(2000);
    expect(s.part('s').served).toBeGreaterThan(50);
  });
});

describe('helpers', () => {
  it('quantile and zipf', () => {
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.99)).toBe(10);
    expect(quantile([], 0.5)).toBeNaN();
    const draw = zipf(100, 1.2, makeRng(1));
    const n = Array.from({ length: 5000 }, draw);
    const top = n.filter((k) => k === 0).length;
    const tail = n.filter((k) => k === 99).length;
    expect(top).toBeGreaterThan(tail * 20);
  });
});
