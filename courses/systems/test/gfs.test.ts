// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { masterLoad, metadata, say } from '../src/figures/gfs';
import { click, context, guess, setSlider } from './helpers';

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

describe('gfs: the arithmetic', () => {
  it('a petabyte of 64 MB chunks is 16 million chunks and 1 GB of metadata', () => {
    const m = metadata(1e15, 64e6);
    expect(m.chunks / 1e6).toBeCloseTo(15.6, 1);
    expect(m.memory / 1e9).toBeCloseTo(1, 1);
  });

  it('the same petabyte in 4 KB blocks needs 16 TB', () => {
    const m = metadata(1e15, 4e3);
    expect(m.chunks).toBe(2.5e11);
    expect(m.memory).toBe(16e12);
  });

  it('10,000 reads a second ask the master about 160 times at 64 MB', () => {
    expect(masterLoad(10_000, 64)).toBeCloseTo(156, 0);
    expect(masterLoad(10_000, 1)).toBe(10_000);
  });

  it('says sizes plainly', () => {
    expect(say(256e6)).toBe('256 MB');
    expect(say(9.9999e14)).toBe('1 PB');
  });
});

describe('gfs: the figures', () => {
  it('the tables still builds', () => {
    expect(FIGURES['gfs-tables'](context()).node.textContent).toContain('chunk 2f1a');
  });

  it('the master fills when the chunks are small', async () => {
    let done = false;
    const h = FIGURES['gfs-flow'](context(), 'overload');
    h.done!.then(() => (done = true));
    pump(30);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 0);
    pump(60);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the master fills when the data goes through it', async () => {
    let done = false;
    const h = FIGURES['gfs-flow'](context(), 'overload');
    h.done!.then(() => (done = true));
    click(h.node, 'Data through the master');
    pump(60);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the estimate is done once the guess is in', async () => {
    let done = false;
    const h = FIGURES['gfs-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 1 GB');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('16 million chunks');
  });
});
