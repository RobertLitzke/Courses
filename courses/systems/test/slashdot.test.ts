// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { inFlight, REQUEST, slowdown } from '../src/figures/slashdot';
import { context, guess, setSlider } from './helpers';

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

describe('slashdot: the numbers', () => {
  it('waiting doubles at half load, ten times at 90%, a hundred at 99%', () => {
    expect(slowdown(0.5)).toBeCloseTo(2);
    expect(slowdown(0.9)).toBeCloseTo(10);
    expect(slowdown(0.99)).toBeCloseTo(100);
  });

  it('Little\'s law: 1,000 a second at 0.2 s is 200 inside', () => {
    expect(inFlight(1000, 0.2)).toBeCloseTo(200);
    expect(inFlight(500, 0.5)).toBeGreaterThan(150);
  });

  it('the request adds up to 252 ms, 12 of them at the server', () => {
    const last = REQUEST[REQUEST.length - 1];
    expect(last[2]).toBe(252);
    const server = REQUEST.find((r) => r[0] === 'The server works')!;
    expect(server[2] - server[1]).toBe(12);
  });
});

describe('slashdot: the figures', () => {
  it('the request still builds', () => {
    expect(FIGURES['slashdot-request'](context()).node.textContent).toContain('TLS 1.3');
  });

  it('the queue is done once the guess is in and the load is at 90%', async () => {
    let done = false;
    const h = FIGURES['slashdot-queue'](context(), 'ninety');
    h.done!.then(() => (done = true));
    guess(h.node, '50% busy');
    setSlider(h.node, 0, 40);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 0, 46);
    pump(10);
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.querySelector('.fig-readout')!.textContent).toContain('92% busy');
  });

  it('the flow is done when the database fills before the web servers', async () => {
    let done = false;
    const h = FIGURES['slashdot-flow'](context(), 'database');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 180);
    pump(40);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 1, 6);
    setSlider(h.node, 0, 470);
    pump(60);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
