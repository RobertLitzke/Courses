// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { raceTimeline, RACES, runRoom, saleSize } from '../src/figures/tickets';
import { click, context, guess, setSlider } from './helpers';

describe('tickets: the estimate', () => {
  it('two million seats in four hours is about 140 a second', () => {
    const s = saleSize(14e6, 2e6, 4, 5);
    expect(s.perSeat).toBe(7);
    expect(s.refused).toBe(12e6);
    expect(s.refreshRate).toBe(2.8e6);
    expect(s.salesRate).toBeCloseTo(139, 0);
    expect(s.held).toBeCloseTo(83_333, -2);
  });
});

describe('tickets: the waiting room', () => {
  it('with no room, a crowd past capacity drives sales to nothing', () => {
    const s = runRoom(false, 400, 8000);
    expect(s.sold).toBeLessThan(40);
    expect(s.offered).toBeGreaterThan(600);
  });

  it('with a room, the seat service keeps selling at the admitted rate', () => {
    const s = runRoom(true, 400, 8000);
    expect(s.sold).toBeGreaterThan(120);
    expect(s.failed).toBeLessThan(0.02);
    expect(s.waiting).toBeGreaterThan(1000);
    expect(s.backlog).toBeLessThan(30);
  });

  it('below capacity the room changes little', () => {
    const a = runRoom(false, 100, 6000);
    const b = runRoom(true, 100, 6000);
    expect(Math.abs(a.sold - b.sold)).toBeLessThan(20);
  });
});

describe('tickets: two buyers, one seat', () => {
  it('read-then-write sells the seat twice; the other designs once', () => {
    expect(raceTimeline('naive').owners).toBe(2);
    expect(raceTimeline('conditional').owners).toBe(1);
    expect(raceTimeline('expiry').owners).toBe(1);
  });

  it('every message arrives within the drawing', () => {
    for (const r of RACES) {
      const tl = raceTimeline(r);
      expect(Math.max(...tl.messages.map((m) => m.arrive))).toBeLessThanOrEqual(tl.tMax);
    }
  });
});

describe('tickets: the figures', () => {
  it('estimate: done when the guess is in', async () => {
    let done = false;
    const h = FIGURES['tickets-estimate'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 140');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('room: done with a room and a crowd', async () => {
    let done = false;
    const h = FIGURES['tickets-room'](context(), 'calm');
    h.done!.then(() => (done = true));
    click(h.node, 'Through a waiting room');
    setSlider(h.node, 0, 500);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('race: done when a safe design is played through', async () => {
    let done = false;
    const h = FIGURES['tickets-race'](context(), 'once');
    h.done!.then(() => (done = true));
    setSlider(h.node, 0, 100);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Conditional write');
    setSlider(h.node, 0, 100);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
