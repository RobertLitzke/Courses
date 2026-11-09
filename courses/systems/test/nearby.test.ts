// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { drivers, gridCells, hilbert, queryRanges, quadtree, runs, search, zOrder } from '../src/figures/nearby';
import { click, context, setSlider } from './helpers';

describe('nearby: cells', () => {
  const pts = drivers();
  it('places 400 drivers, most in the city', () => {
    expect(pts.length).toBe(400);
  });
  it('a small circle near a grid corner touches four cells', () => {
    expect(gridCells({ x: 5.1, y: 5.1 }, 0.5, 2.5).length).toBe(4);
    expect(gridCells({ x: 3.75, y: 3.75 }, 0.5, 2.5).length).toBe(1);
  });
  it('the quadtree keeps every cell under its cap', () => {
    const leaves = quadtree(pts, 12);
    const inside = (b: { x: number; y: number; w: number }) => pts.filter((p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.w).length;
    expect(Math.max(...leaves.map(inside))).toBeLessThanOrEqual(12);
  });
  it('in the city the quadtree scans fewer drivers than a fixed grid, finding the same', () => {
    const c = { x: 12.6, y: 8.2 };
    const g = search(pts, 'grid', 2.5, c, 1.5);
    const q = search(pts, 'quad', 12, c, 1.5);
    const h = search(pts, 'hex', 1.4, c, 1.5);
    expect(q.found).toBe(g.found);
    expect(h.found).toBe(g.found);
    expect(q.scanned).toBeLessThan(g.scanned);
    expect(g.scanned).toBeGreaterThanOrEqual(g.found);
    expect(h.scanned).toBeGreaterThanOrEqual(h.found);
  });
});

describe('nearby: curves', () => {
  it('Z-order interleaves bits', () => {
    expect(zOrder(0, 0, 3)).toBe(0);
    expect(zOrder(1, 0, 3)).toBe(1);
    expect(zOrder(0, 1, 3)).toBe(2);
    expect(zOrder(1, 1, 3)).toBe(3);
    expect(zOrder(7, 7, 3)).toBe(63);
  });
  it('the Hilbert curve visits every cell once and always steps to a neighbour', () => {
    const n = 8;
    const at: [number, number][] = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) at[hilbert(n, x, y)] = [x, y];
    expect(at.filter(Boolean).length).toBe(64);
    for (let i = 1; i < 64; i++) expect(Math.abs(at[i][0] - at[i - 1][0]) + Math.abs(at[i][1] - at[i - 1][1])).toBe(1);
  });
  it('counts runs of consecutive numbers', () => {
    expect(runs([5, 3, 4, 9, 10, 12])).toBe(3);
    expect(runs([])).toBe(0);
  });
  it('a Hilbert numbering needs no more ranges than Z-order on average', () => {
    let z = 0;
    let h = 0;
    for (let x = 0; x <= 5; x++) for (let y = 0; y <= 5; y++) {
      const r = queryRanges(8, x, y, 3);
      z += r.z;
      h += r.hilbert;
    }
    expect(h).toBeLessThanOrEqual(z);
  });
});

describe('nearby: the figures', () => {
  it('cells: done once all three schemes are tried', async () => {
    let done = false;
    const f = FIGURES['nearby-cells'](context(), 'all');
    f.done!.then(() => (done = true));
    click(f.node, 'Quadtree');
    await Promise.resolve();
    expect(done).toBe(false);
    click(f.node, 'Hexagons');
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('curve: done on the Hilbert curve', async () => {
    let done = false;
    const f = FIGURES['nearby-curve'](context(), 'hilbert');
    f.done!.then(() => (done = true));
    setSlider(f.node, 0, 4);
    click(f.node, 'Hilbert');
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('shards: done with smaller cells at a high rate', async () => {
    let done = false;
    const f = FIGURES['nearby-shards'](context(), 'split');
    f.done!.then(() => (done = true));
    click(f.node, 'Smaller where busy');
    await Promise.resolve();
    expect(done).toBe(false);
    setSlider(f.node, 0, 450);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
