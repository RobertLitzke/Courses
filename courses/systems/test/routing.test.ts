// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { bidirectional, CELLS, contract, customiseCell, dijkstra, hierarchyRoute, overlayRoute, roadGraph, straightLine, TRIPS, weights } from '../src/figures/routing';
import { click, context, setSlider } from './helpers';

const g = roadGraph();
const w = weights(g);

describe('routing: the algorithms', () => {
  it('builds a grid of roads with motorways', () => {
    expect(g.nodes.length).toBe(160);
    expect(g.edges.some((e) => e.fast)).toBe(true);
  });
  it('every method finds the same travel time on every trip', () => {
    const h = contract(g, w);
    const cliques = Array.from({ length: CELLS }, (_, c) => customiseCell(g, w, c));
    for (const [s, t] of TRIPS) {
      const d = dijkstra(g, w, s, t).time;
      expect(dijkstra(g, w, s, t, straightLine(g, t)).time).toBeCloseTo(d, 6);
      expect(bidirectional(g, w, s, t).time).toBeCloseTo(d, 6);
      expect(hierarchyRoute(g, h, s, t).time).toBeCloseTo(d, 6);
      expect(overlayRoute(g, w, cliques, s, t).time).toBeCloseTo(d, 6);
    }
  });
  it('A*, both ends and the hierarchy settle fewer junctions than Dijkstra', () => {
    const h = contract(g, w);
    for (const [s, t] of TRIPS) {
      const d = dijkstra(g, w, s, t).settled.length;
      expect(dijkstra(g, w, s, t, straightLine(g, t)).settled.length).toBeLessThan(d);
      expect(bidirectional(g, w, s, t).settled.length).toBeLessThan(d);
      expect(hierarchyRoute(g, h, s, t).settled.length).toBeLessThan(d / 2);
    }
  });
  it('a jam makes the route slower or longer, never faster', () => {
    const [s, t] = TRIPS[0];
    const base = dijkstra(g, w, s, t);
    const e = g.adj[base.path[0]].find((x) => x.to === base.path[1])!.e;
    expect(dijkstra(g, weights(g, new Set([e])), s, t).time).toBeGreaterThanOrEqual(base.time);
  });
});

describe('routing: the figures', () => {
  it('search: done when the hierarchy search runs to the end', async () => {
    let done = false;
    const f = FIGURES['routing-search'](context(), 'ch');
    f.done!.then(() => (done = true));
    click(f.node, 'Hierarchy');
    setSlider(f.node, 0, 1);
    await Promise.resolve();
    expect(done).toBe(true);
  });
  it('shortcut: draws', () => {
    const f = FIGURES['routing-shortcut'](context(), '');
    expect(f.node.querySelector('svg')).not.toBeNull();
  });
  it('cells: done when a jam lands on the route', async () => {
    let done = false;
    const f = FIGURES['routing-crp'](context(), 'jam');
    f.done!.then(() => (done = true));
    const [s, t] = TRIPS[0];
    const base = dijkstra(g, w, s, t);
    const e = g.adj[base.path[2]].find((x) => x.to === base.path[3])!.e;
    f.node.querySelector(`[data-edge="${e}"]`)!.dispatchEvent(new Event('click'));
    await Promise.resolve();
    expect(done).toBe(true);
  });
});
