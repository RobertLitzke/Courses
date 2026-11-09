// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { collisionChance, evenChance, expectedPairs, keySpace, shortenerEstimate } from '../src/figures/tinyurl';
import { click, context, guess } from './helpers';

describe('tinyurl: the numbers', () => {
  it('seven characters from 62 symbols make 3.5 trillion codes', () => {
    expect(keySpace(62, 7)).toBe(3_521_614_606_208);
  });

  it('an even chance of a repeat comes after about 2.2 million random codes', () => {
    const n = evenChance(keySpace(62, 7));
    expect(n / 1e6).toBeCloseTo(2.21, 1);
    expect(collisionChance(n, keySpace(62, 7))).toBeCloseTo(0.5, 2);
  });

  it('the birthday problem: 23 people, an even chance', () => {
    expect(collisionChance(23, 365)).toBeGreaterThan(0.5);
    expect(collisionChance(22, 365)).toBeLessThan(0.5);
  });

  it('six billion random codes make about five million repeats', () => {
    expect(expectedPairs(6e9, keySpace(62, 7)) / 1e6).toBeCloseTo(5.1, 1);
  });

  it('100 million links a month: 40 writes, 4,000 reads a second, 3 TB in five years', () => {
    const e = shortenerEstimate();
    expect(e.writes).toBeCloseTo(38.6, 1);
    expect(e.reads).toBeCloseTo(3858, -1);
    expect(e.rows).toBe(6e9);
    expect(e.bytes).toBe(3e12);
  });
});

describe('tinyurl: the figures', () => {
  it('the keys figure is done once the guess is in', async () => {
    let done = false;
    const h = FIGURES['tinyurl-keys'](context(), 'guess');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 2 million');
    await Promise.resolve();
    expect(done).toBe(true);
    expect(h.node.textContent).toContain('2.2 million');
  });

  it('the api still builds', () => {
    expect(FIGURES['tinyurl-api'](context()).node.textContent).toContain('301 Moved Permanently');
  });

  it('the flow is done once both paths are seen', async () => {
    let done = false;
    const h = FIGURES['tinyurl-flow'](context(), 'both');
    h.done!.then(() => (done = true));
    click(h.node, 'New links');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
