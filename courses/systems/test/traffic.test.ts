// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { band, driveBetween, handcart, matchNearest, matchViterbi, median, project, publish, quietStreet, rightShare, samples, score, traffic, trueSpeed } from '../src/figures/traffic';
import { click, context, setSlider } from './helpers';

describe('traffic: map matching', () => {
  it('driving between the parallel roads goes round by a link', () => {
    const a = project(0, { x: 300, y: 0 });
    const b = project(1, { x: 300, y: 30 });
    expect(driveBetween(a, b)).toBeGreaterThan(600);
    expect(driveBetween(project(1, { x: 100, y: 30 }), project(1, { x: 300, y: 30 }))).toBeCloseTo(200, 6);
  });
  it('with no GPS error both methods are right', () => {
    const { pts, truth } = samples(0);
    expect(rightShare(matchNearest(pts), truth)).toBe(1);
    expect(rightShare(matchViterbi(pts, 4), truth)).toBe(1);
  });
  it('with 20 m of error the hidden Markov model beats the nearest road over many trips', () => {
    let near = 0;
    let hmm = 0;
    for (let s = 1; s <= 12; s++) {
      const { pts, truth } = samples(20, s);
      near += rightShare(matchNearest(pts), truth);
      hmm += rightShare(matchViterbi(pts, 20), truth);
    }
    expect(hmm / 12).toBeGreaterThan(near / 12 + 0.05);
    expect(hmm / 12).toBeGreaterThan(0.9);
  });
});

describe('traffic: speeds from reports', () => {
  it('the true speed drops for the jam and recovers', () => {
    expect(trueSpeed(10)).toBe(50);
    expect(trueSpeed(30)).toBe(12);
    expect(trueSpeed(50)).toBe(50);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
  it('a busy road shows the jam within minutes, and a long window shows it later', () => {
    const all = traffic(5);
    const short = score(publish(all, { window: 2, fewest: 3, groups: false }).speed);
    const long = score(publish(all, { window: 15, fewest: 3, groups: false }).speed);
    expect(short.late).not.toBeNull();
    expect(long.late).not.toBeNull();
    expect(short.late!).toBeLessThan(long.late!);
    expect(short.clearLate!).toBeLessThan(long.clearLate!);
  });
  it('below the threshold the usual speed is shown', () => {
    const p = publish(traffic(0.2), { window: 2, fewest: 3, groups: false });
    expect(p.live.filter((x) => !x).length).toBeGreaterThan(50);
    expect(band(p.speed[0])).toBe(0);
  });
  it('the handcart makes a jam unless a group counts once; a real jam shows either way', () => {
    const red = (d: 'handcart' | 'jam', groups: boolean) => {
      const p = publish(quietStreet(d).all, { window: 5, fewest: 3, groups });
      return p.speed.filter((v, i) => p.live[i] && band(v) === 2).length;
    };
    expect(handcart().length).toBe(99 * 20);
    expect(red('handcart', false)).toBeGreaterThan(15);
    expect(red('handcart', true)).toBe(0);
    expect(red('jam', false)).toBeGreaterThan(15);
    expect(red('jam', true)).toBeGreaterThan(15);
  });
});

describe('traffic: the figures', () => {
  it('match: done with the model at 15 m or more', async () => {
    let done = false;
    const f = FIGURES['traffic-match'](context(), 'viterbi');
    f.done!.then(() => (done = true));
    click(f.node, 'Hidden Markov model');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(f.node, 0, 20);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('window: done after a short and a long window', async () => {
    let done = false;
    const f = FIGURES['traffic-window'](context(), 'window');
    f.done!.then(() => (done = true));
    setSlider(f.node, 0, 2);
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(f.node, 0, 12);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('handcart: done after both days with grouping on', async () => {
    let done = false;
    const f = FIGURES['traffic-handcart'](context(), 'check');
    f.done!.then(() => (done = true));
    click(f.node, 'Real jam');
    click(f.node, 'A group counts once');
    await Promise.resolve();
    expect(done).toBe(false);
    click(f.node, 'Handcart');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
