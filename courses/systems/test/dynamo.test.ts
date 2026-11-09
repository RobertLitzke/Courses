// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { heirs, imbalance, merkle, quorumRun, shares } from '../src/figures/dynamo';
import { click, context, setSlider } from './helpers';

describe('dynamo: the ring', () => {
  it('shares add up to the whole circle', () => {
    const s = [...shares(6, 16).values()];
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('more points per server even out the load (the numbers the lesson quotes)', () => {
    expect(imbalance(6, 1)).toBeGreaterThan(2.5);
    expect(imbalance(6, 8)).toBeLessThanOrEqual(1.3);
    expect(imbalance(6, 128)).toBeLessThan(1.15);
  });

  it("one point each: a lost server's keys all go to one heir; many points: to all the rest", () => {
    expect(heirs(6, 1, 'C').size).toBe(1);
    expect(heirs(6, 64, 'C').size).toBe(5);
    const total = [...heirs(6, 64, 'C').values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 9);
  });
});

describe('dynamo: quorums', () => {
  it('a read is stale exactly when R + W is not more than N = 3', () => {
    for (let R = 1; R <= 3; R++)
      for (let W = 1; W <= 3; W++) {
        const run = quorumRun({ R, W });
        expect(run.writeOk).toBe(true);
        expect(run.stale).toBe(R + W <= 3);
      }
  });

  it('with B down, a strict quorum refuses W = 3; a sloppy one accepts it and hands the copy back', () => {
    const strict = quorumRun({ R: 1, W: 3, bDown: true });
    expect(strict.writeOk).toBe(false);
    const sloppy = quorumRun({ R: 1, W: 3, bDown: true, sloppy: true });
    expect(sloppy.writeOk).toBe(true);
    expect(sloppy.messages.some((m) => m.from === 'D' && m.to === 'B' && m.label === 'handed off')).toBe(true);
  });

  it('the sloppy quorum answers the write sooner, from the stand-in', () => {
    expect(quorumRun({ R: 2, W: 2, bDown: true, sloppy: true }).writeDone).toBeLessThan(quorumRun({ R: 2, W: 2, bDown: true }).writeDone);
  });

  it('Merkle trees differ only along the path to the changed range', () => {
    const { a, b } = merkle(5);
    a.forEach((level, d) => {
      const differ = level.filter((h, i) => h !== b[d][i]).length;
      expect(differ).toBe(1);
    });
  });
});

describe('dynamo: the figures', () => {
  it('the ring is done when the load is even', async () => {
    let done = false;
    const h = FIGURES['dynamo-ring'](context(), 'even');
    h.done!.then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(h.node, 1, 6); // 64 points each
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the quorum figure is done after a stale read and then a fresh one with R + W > N', async () => {
    let done = false;
    const h = FIGURES['dynamo-quorum'](context(), 'quorum');
    h.done!.then(() => (done = true));
    setSlider(h.node, 2, 560);
    await Promise.resolve();
    expect(done).toBe(false);
    expect(h.node.textContent).toContain('stale');
    setSlider(h.node, 0, 2);
    setSlider(h.node, 2, 560);
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('draws the Merkle still, and takes C out of the ring', () => {
    expect(FIGURES['dynamo-merkle'](context()).node.querySelector('svg')).toBeTruthy();
    const h = FIGURES['dynamo-ring'](context());
    click(h.node, 'Take out C');
    expect(h.node.textContent).toContain('taken out');
  });
});
