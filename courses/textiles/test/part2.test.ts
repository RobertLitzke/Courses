// @vitest-environment happy-dom
// Part II's figures: each goal reachable, and the maps' data sane.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { PERIODS } from '../src/figures/silk-routes';
import { cropHeight, worldMap } from '../src/figures/world';
import { click, context, guess, setSlider } from './helpers';
import { MOTIFS, shaftsNeeded } from '../src/figures/pattern-loom';
import { knotsFor } from '../src/figures/inca';
import { ROUTES, voyage } from '../src/figures/monsoon';
import { hoursProblems } from '../src/figures/hours';
import { STAGES, hoursWith, idle, output, startWorkers } from '../src/figures/workshop';

describe('the world map', () => {
  it('puts the crop corners at the drawing corners', () => {
    const m = worldMap({ lon: [-10, 145], lat: [-12, 55] }, 560);
    expect(m.xy([-10, 55])).toEqual([0, 0]);
    const [x, y] = m.xy([145, -12]);
    expect(x).toBeCloseTo(560);
    expect(y).toBeCloseTo(m.h);
    expect(cropHeight({ lon: [0, 90], lat: [0, 45] }, 400)).toBeGreaterThan(200);
  });
});

describe('the silk routes', () => {
  it('runs in order of time', () => {
    expect(PERIODS[0].name).toMatch(/BC/);
    expect(PERIODS.at(-1)!.name).toMatch(/1300/);
  });
  it('is done at the last period', async () => {
    const h = FIGURES['silk-routes'](context(), 'mongol');
    setSlider(h.node, 0, PERIODS.length - 1);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the pattern loom', () => {
  it('needs fewer shafts for a symmetric motif', () => {
    expect(shaftsNeeded(MOTIFS.Diamond)).toBeLessThan(shaftsNeeded(MOTIFS.Bird));
    expect(shaftsNeeded(MOTIFS.Bird)).toBeGreaterThanOrEqual(10);
  });
  it('is done once a busy motif is seen on both looms', async () => {
    const h = FIGURES['pattern-loom'](context(), 'many');
    click(h.node, 'Bird');
    click(h.node, 'Drawloom');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the khipu', () => {
  it('ties 352 as three hundreds, five tens and a long knot of two', () => {
    expect(knotsFor(352)).toEqual([{ place: 0, count: 2, kind: 'long' }, { place: 1, count: 5, kind: 'single' }, { place: 2, count: 3, kind: 'single' }]);
    expect(knotsFor(41)[0].kind).toBe('eight');
    expect(knotsFor(1203).map((k) => k.place)).toEqual([0, 2, 3]);
  });
});

describe('the monsoon', () => {
  it('brings a January ship home from the Red Sea in 8 months, an April one in 17', () => {
    expect(voyage(ROUTES.red, 1)).toHaveLength(8);
    expect(voyage(ROUTES.red, 4)).toHaveLength(17);
  });
  it('makes January the best of the guess options', () => {
    const len = (m: number) => voyage(ROUTES.red, m).length;
    expect(Math.min(len(1), len(4), len(7), len(10))).toBe(len(1));
  });
  it('is done once both routes are tried and the Red Sea run is quick', async () => {
    const h = FIGURES.monsoon(context(), 'quick');
    guess(h.node, 'January');
    setSlider(h.node, 0, 2);
    click(h.node, 'Malacca');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the hours bar', () => {
  it('checks its options', () => {
    expect(hoursProblems({ item: 'x', stages: [{ stage: 'Spinning', hours: 10, who: 'household' }] })).toEqual([]);
    expect(hoursProblems({ item: 'x', stages: [{ stage: 'Spinning', hours: 0, who: 'nobody' }] })).toHaveLength(1);
  });
});

describe('the bottleneck workshop', () => {
  const w = startWorkers();
  it('starts in balance and the shuttle alone adds nothing', () => {
    const base = output({ hours: hoursWith(new Set()), workers: w });
    expect(output({ hours: hoursWith(new Set(['shuttle'])), workers: w })).toBeCloseTo(base);
    expect(idle({ hours: hoursWith(new Set()), workers: w }, 'spin')).toBeLessThan(0.01);
  });
  it('makes weaving the bottleneck once spinning is fast', () => {
    const shop = { hours: hoursWith(new Set(['jenny'])), workers: w };
    expect(idle(shop, 'weave')).toBeLessThan(0.001);
    expect(idle(shop, 'spin')).toBeGreaterThan(0.5);
  });
  it('is done at ten times the start', async () => {
    const h = FIGURES.workshop(context(), 'tenfold');
    guess(h.node, 'Weavers wait for yarn, and cloth output barely changes');
    for (const b of ['Mule', 'Carding engine', 'Power loom', 'Move workers to keep pace']) click(h.node, b);
    await expect(h.done).resolves.toBeUndefined();
  });
});
