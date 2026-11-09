// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { blast, choose, fallout, PAIRS } from '../src/figures/outage';
import { click, context } from './helpers';

const tap = (node: HTMLElement, label: string) => {
  const g = node.querySelector(`[aria-label^="${label}"]`);
  if (!g) throw new Error(`nothing labelled ${label}`);
  g.dispatchEvent(new Event('click'));
};

describe('outage: blast radius', () => {
  it('counts shards', () => {
    expect(choose(8, 2)).toBe(28);
    expect(choose(12, 3)).toBe(220);
    expect(choose(100, 5)).toBe(75_287_520);
    expect(choose(2048, 4) / 1e9).toBeCloseTo(730, -1);
    expect(PAIRS.length).toBe(28);
  });
  it('one fleet loses everyone, cells a quarter, shuffle shards one', () => {
    expect(blast('fleet', 0).down).toBe(28);
    expect(blast('cells', 0).down).toBe(7);
    const s = blast('shuffle', 0);
    expect(s.down).toBe(1);
    expect(s.degraded).toBe(12);
    expect(s.fine).toBe(15);
  });
});

describe('outage: the dependency loop', () => {
  it('cutting the backbone leaves only repair on site', () => {
    const down = fallout(['backbone']);
    for (const id of ['dc', 'dns', 'remote', 'apps', 'tools', 'fix']) expect(down.has(id)).toBe(true);
    expect(down.has('site')).toBe(false);
  });
  it('losing DNS alone leaves remote access working', () => {
    const down = fallout(['dns']);
    expect(down.has('tools')).toBe(true);
    expect(down.has('remote')).toBe(false);
  });
});

describe('outage: the figures', () => {
  it('shards: done after a poison request under shuffle sharding', async () => {
    let done = false;
    const h = FIGURES['outage-shards'](context(), 'shuffle');
    h.done!.then(() => (done = true));
    tap(h.node, 'Customer 3');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Shuffle shards');
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('static: done once the servers use their last config and the control plane is down', async () => {
    let done = false;
    const h = FIGURES['outage-static'](context(), 'static');
    h.done!.then(() => (done = true));
    tap(h.node, 'Control plane');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'Uses its last config');
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('loop: done once the backbone is cut', async () => {
    let done = false;
    const h = FIGURES['outage-loop'](context(), 'loop');
    h.done!.then(() => (done = true));
    tap(h.node, 'Backbone network');
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
