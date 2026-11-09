// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { Cluster, failuresPerDay, recordAppend, repairMinutes, scheme } from '../src/figures/chunks';
import { click, context, setSlider } from './helpers';

// Run the animations by hand: every figure is on screen, and frames come when pumped.
const frames: FrameRequestCallback[] = [];
let clock = 0;
globalThis.requestAnimationFrame = (cb) => frames.push(cb);
globalThis.IntersectionObserver = class {
  constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
  observe() { this.cb([{ isIntersecting: true }]); }
  disconnect() {}
} as unknown as typeof IntersectionObserver;
const pump = (seconds: number) => {
  clock = Math.max(clock, performance.now());
  for (let i = 0; i < seconds * 20; i++) {
    clock += 50;
    for (const f of frames.splice(0)) f(clock);
  }
};

const repairAll = (c: Cluster) => {
  let n = 0;
  while (c.repairOne() && n++ < 10_000);
};

describe('chunks: the arithmetic', () => {
  it('10,000 disks at 3% a year is nearly one a day', () => {
    expect(failuresPerDay(10_000, 0.03)).toBeCloseTo(0.82, 2);
  });

  it('a 4 TB disk takes 11 hours from one machine and 13 minutes from a hundred', () => {
    expect(repairMinutes(4, 1, 100) / 60).toBeCloseTo(11.1, 1);
    expect(repairMinutes(4, 100, 50)).toBeCloseTo(13.3, 1);
  });

  it('copies against codes', () => {
    expect(scheme(1, 2, true)).toMatchObject({ overhead: 3, survives: 2, repairReads: 1 });
    expect(scheme(6, 3)).toMatchObject({ overhead: 1.5, survives: 3, repairReads: 6 });
    expect(scheme(10, 4).overhead).toBeCloseTo(1.4);
  });
});

describe('chunks: the cluster', () => {
  it('rack-aware placement puts each chunk on three racks', () => {
    const c = new Cluster({ rackAware: true });
    for (const w of c.where) expect(new Set(w.map(c.rackOf)).size).toBe(3);
  });

  it('random placement loses a few chunks to any rack failure; rack-aware loses none', () => {
    for (let r = 0; r < 3; r++) {
      const random = new Cluster();
      random.failRack(r);
      expect(random.counts().lost).toBeGreaterThan(0);
      expect(random.counts().lost).toBeLessThan(10);
      const aware = new Cluster({ rackAware: true });
      aware.failRack(r);
      expect(aware.counts().lost).toBe(0);
      expect(aware.counts().one).toBe(0);
      repairAll(aware);
      expect(aware.counts().full).toBe(150);
    }
  });

  it('repairing the most endangered first clears the single copies sooner', () => {
    const steps = (priority: boolean) => {
      const c = new Cluster({ priority });
      c.failRack(0);
      let n = 0;
      while (c.counts().one > 0 && c.repairOne()) n++;
      return n;
    };
    expect(steps(true)).toBeLessThan(steps(false));
  });

  it('a retried record append leaves duplicates on some copies', () => {
    expect(recordAppend(false).copiesOf).toEqual({ a: 1, p: 1, b: 1 });
    expect(recordAppend(true).copiesOf).toEqual({ a: 2, p: 2, b: 1 });
  });
});

describe('chunks: the figures', () => {
  it('the fault figure is done when a rack fails with rack-aware placement and repairs finish', async () => {
    let done = false;
    const h = FIGURES['chunks-fault'](context(), 'safe');
    h.done!.then(() => (done = true));
    const rack = () => [...h.node.querySelectorAll('text')].find((x) => x.textContent?.startsWith('Rack 2'))!;
    rack().dispatchEvent(new Event('click'));
    pump(15);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Rack-aware placement');
    rack().dispatchEvent(new Event('click'));
    pump(15);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('0 lost');
  }, 20_000);

  it('the write is done when the failing case is played through', async () => {
    let done = false;
    const h = FIGURES['chunks-seq'](context(), 'retry');
    h.done!.then(() => (done = true));
    click(h.node, 'B fails to apply it');
    setSlider(h.node, 0, 100);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 190);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the cost still builds', () => {
    expect(FIGURES['chunks-cost'](context()).node.textContent).toContain('Reed-Solomon 10+4');
  });
});
