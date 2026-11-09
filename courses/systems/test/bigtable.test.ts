// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { bloomBits, bloomRate, lsmAt, MEMTABLE_MB, readCost } from '../src/figures/bigtable';
import { click, context, setSlider } from './helpers';

describe('bigtable: the numbers', () => {
  it('a 1% Bloom filter needs about 9.6 bits a key, and 10 bits give under 1%', () => {
    expect(bloomBits(0.01)).toBeCloseTo(9.59, 2);
    expect(bloomRate(10)).toBeCloseTo(0.0082, 4);
  });

  it('reads cost one per file without filters, about one with them', () => {
    expect(readCost(10, false, false)).toBe(10);
    expect(readCost(10, false, true)).toBe(5.5);
    expect(readCost(10, true, true)).toBeCloseTo(1.09, 2);
    expect(readCost(10, true, false)).toBeCloseTo(0.1, 2);
  });

  it('flushes a 64 MB SSTable each time the memtable fills', () => {
    const s = lsmAt(60, 8, false);
    expect(s.flushes).toBe(Math.floor((60 * 8) / MEMTABLE_MB));
    expect(s.tables.length).toBe(s.flushes);
    expect(s.diskWritten).toBe(s.flushes * MEMTABLE_MB);
  });

  it('compaction keeps few files and writes each byte more than once', () => {
    const on = lsmAt(120, 8, true);
    const off = lsmAt(120, 8, false);
    expect(off.tables.length).toBe(15);
    expect(on.tables.length).toBeLessThan(8);
    expect(on.tables.reduce((a, b) => a + b, 0)).toBe(off.tables.reduce((a, b) => a + b, 0));
    expect(on.diskWritten / on.written).toBeGreaterThan(1.5);
  });
});

describe('bigtable: the figures', () => {
  it('the LSM figure is done with Bloom filters on over a pile of files', async () => {
    let done = false;
    const h = FIGURES['bigtable-lsm'](context(), 'bloom');
    h.done!.then(() => (done = true));
    click(h.node, 'Compaction');
    setSlider(h.node, 0, 120);
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Bloom filters');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('the hot-spot figure is done when a key that spreads the writes is picked', async () => {
    let done = false;
    const h = FIGURES['bigtable-hotspot'](context(), 'spread');
    h.done!.then(() => (done = true));
    click(h.node, 'Sensor, then time');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('draws the stills', () => {
    for (const id of ['bigtable-webtable', 'bigtable-sstable']) expect(FIGURES[id](context()).node.querySelector('svg')).toBeTruthy();
  });
});
