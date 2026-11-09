// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { maxQueries, modMoves, readAfterWrite, replicaLoad } from '../src/figures/replicas';
import { click, context, setSlider } from './helpers';

// Run the live diagrams by hand: every figure is on screen, and frames come when pumped.
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

describe('replicas: the arithmetic', () => {
  it('five replicas at 5% writes are 80% busy', () => {
    const l = replicaLoad(10_000, 0.05, 5, 3000);
    expect(l.writes).toBe(500);
    expect(l.reads).toBe(1900);
    expect(l.util).toBeCloseTo(0.8);
  });

  it('at 30% writes a replica is full with writes alone', () => {
    expect(replicaLoad(10_000, 0.3, 100, 3000).util).toBeGreaterThan(1);
    expect(maxQueries(0.3, 1000, 3000)).toBeLessThan(10_000);
    expect(maxQueries(0.05, 5, 3000)).toBeCloseTo(12_500, -1);
  });

  it('going from three clusters to four by mod moves three users in four', () => {
    expect(modMoves(3, 4)).toBeCloseTo(0.75, 2);
  });

  it('a reload reads stale data only when the lag outlasts it, and both fixes cure it', () => {
    expect(readAfterWrite(50, 0).stale).toBe(false);
    expect(readAfterWrite(250, 0).stale).toBe(true);
    expect(readAfterWrite(250, 1).stale).toBe(false);
    const wait = readAfterWrite(250, 2);
    expect(wait.stale).toBe(false);
    expect(wait.waited).toBe(38 + 250 - 180);
    expect(readAfterWrite(350, 2).end).toBeLessThanOrEqual(440);
  });
});

describe('replicas: the figures', () => {
  it('the replicas fall behind when writes rise', async () => {
    let done = false;
    const h = FIGURES['replicas-flow'](context(), 'lag');
    h.done!.then(() => (done = true));
    pump(20);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 30);
    pump(120);
    await Promise.resolve();
    expect(done).toBe(true);
  }, 20_000);

  it('the sequence is done when a fix is played through a long lag', async () => {
    let done = false;
    const h = FIGURES['replicas-seq'](context(), 'fixed');
    h.done!.then(() => (done = true));
    expect(h.node.textContent).toContain('without it');
    setSlider(h.node, 0, 0);
    click(h.node, 'Wait for my write');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 440);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the shards fit once there are enough clusters', async () => {
    let done = false;
    const h = FIGURES['replicas-shards'](context(), 'fit');
    h.done!.then(() => (done = true));
    pump(1);
    setSlider(h.node, 0, 3);
    pump(1);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 4);
    pump(1);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
