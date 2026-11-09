// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { buildTrie, complete, crawl, QUERY_LOG, scan, suggestLoad } from '../src/figures/search';
import { click, context, guess } from './helpers';

describe('search: the frontier', () => {
  it('one polite queue stalls behind the big site: about 1/share pages a second', () => {
    const r = crawl('fifo', 200, 0.2);
    expect(r.pages).toBeGreaterThan(3);
    expect(r.pages).toBeLessThan(7);
    expect(r.waiting).toBeGreaterThan(0.9);
    expect(r.bigRate).toBeLessThanOrEqual(1.05);
  });

  it('a queue per host keeps every fetcher busy and every host polite', () => {
    const r = crawl('perhost', 200, 0.2);
    expect(r.pages).toBeGreaterThan(380);
    expect(r.bigRate).toBeLessThanOrEqual(1);
    expect(r.waiting).toBeLessThan(0.05);
  });

  it('per-host queues are limited by the hosts once fetchers outnumber them', () => {
    const r = crawl('perhost', 1000, 0.2);
    expect(r.pages).toBeLessThanOrEqual(1001);
  });

  it('an impolite crawler hammers the big site', () => {
    const r = crawl('none', 200, 0.2);
    expect(r.pages).toBeGreaterThan(380);
    expect(r.bigRate).toBeGreaterThan(60);
  });
});

describe('search: the trie', () => {
  const root = buildTrie(QUERY_LOG, 3);
  it('precomputed and scanned completions agree', () => {
    for (const p of ['s', 'se', 'sea', 'seat', 'seattle', 'sen']) expect(complete(root, p).top).toEqual(scan(root, p).top);
    expect(complete(root, 'sea').top.map((x) => x[0])).toEqual(['seattle weather', 'seahawks', 'seattle times']);
  });

  it('a stored list touches one node a letter; a scan touches the whole subtree', () => {
    expect(complete(root, 'sea').visited).toBe(3);
    expect(scan(root, 'sea').visited).toBeGreaterThan(50);
    expect(scan(root, 's').visited).toBeGreaterThan(scan(root, 'seattle').visited);
  });

  it('an unknown prefix gives nothing', () => {
    expect(complete(root, 'sx').top).toEqual([]);
  });
});

describe('search: serving suggestions', () => {
  it('every keystroke with no cache and letter shards needs over a hundred servers', () => {
    const L = suggestLoad({ pause: false, edge: 'off', shard: 'letter' });
    expect(L.requests).toBe(800_000);
    expect(L.servers).toBe(116);
  });

  it('a pause, an edge cache and hashed shards cut it to a handful', () => {
    const L = suggestLoad({ pause: true, edge: 'top', shard: 'hash' });
    expect(L.origin).toBeCloseTo(120_000, -3);
    expect(L.servers).toBeLessThan(10);
    expect(L.medianMs).toBeLessThan(40);
  });
});

describe('search: the figures', () => {
  it('frontier: done once guessed and per-host queues reach a good rate', async () => {
    let done = false;
    const h = FIGURES['search-frontier'](context(), 'polite');
    h.done!.then(() => (done = true));
    guess(h.node, 'About 5');
    click(h.node, 'A queue per host');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('trie: done once three prefixes are read from stored lists', async () => {
    let done = false;
    const h = FIGURES['search-trie'](context(), 'typed');
    h.done!.then(() => (done = true));
    click(h.node, 'Top three stored at each node');
    click(h.node, 's');
    click(h.node, 'seattle');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('bench: done once the origin load is small and shards are even', async () => {
    let done = false;
    const h = FIGURES['search-bench'](context(), 'fast');
    h.done!.then(() => (done = true));
    click(h.node, 'After a 100 ms pause');
    click(h.node, 'Cache the top million prefixes');
    await Promise.resolve();
    expect(done).toBe(false);
    click(h.node, 'By hash of the prefix');
    await Promise.resolve();
    expect(done).toBe(true);
  });

  it('index: draws', () => {
    expect(FIGURES['search-index'](context()).node).toBeTruthy();
  });
});
