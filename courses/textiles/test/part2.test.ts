// @vitest-environment happy-dom
// Part II's figures: each goal reachable, and the maps' data sane.
import { describe, expect, it } from 'vitest';
import { FIGURES } from '../src/figures';
import { PERIODS } from '../src/figures/silk-routes';
import { cropHeight, worldMap } from '../src/figures/world';
import { click, context, guess, setSlider } from './helpers';
import { MOTIFS, holesPunched, shaftsNeeded } from '../src/figures/pattern-loom';
import { knotsFor } from '../src/figures/inca';
import { ROUTES, voyage } from '../src/figures/monsoon';
import { hoursProblems } from '../src/figures/hours';
import { hoursWith, idle, output, startWorkers } from '../src/figures/workshop';
import { PRESETS, jennyReturn } from '../src/figures/jenny-pays';
import { grows } from '../src/figures/cotton-belt';
import { seriesProblems } from '../src/figures/series';
import { load, output as loomOutput } from '../src/figures/looms';

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
  it('punches one hole per raised thread on the Jacquard', () => {
    expect(holesPunched(MOTIFS.Diamond)).toBe(MOTIFS.Diamond.flat().filter(Boolean).length);
  });
  it('is done once a square is changed on the Jacquard', async () => {
    const h = FIGURES['pattern-loom'](context(), 'cards');
    let finished = false;
    h.done?.then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    (h.node.querySelector('[aria-label="Warp 1, pick 1"]') as SVGElement).dispatchEvent(new Event('click'));
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

describe('the workshop in lesson 15', () => {
  it('is done once the power loom leaves the weavers idle', async () => {
    const h = FIGURES.workshop(context(), 'loom');
    guess(h.node, 'They have far more weaving capacity than yarn, so work and piece rates fall');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('does a jenny pay', () => {
  it('pays in Lancashire on Allen\'s wages and not in Bengal', () => {
    expect(jennyReturn(6, 70)).toBeGreaterThan(0.3);
    expect(jennyReturn(1, 70)).toBeLessThan(0);
  });
  it('is done once all presets are seen', async () => {
    const h = FIGURES['jenny-pays'](context(), 'compare');
    for (const p of PRESETS) click(h.node, p.name);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the cotton belt', () => {
  it('grows cotton in Mississippi but not Kentucky or west Texas', () => {
    expect(grows(-90, 33)).toBe(true);
    expect(grows(-85, 37.5)).toBe(false);
    expect(grows(-102, 33)).toBe(false);
  });
  it('is done once both overlays are seen', async () => {
    const h = FIGURES['cotton-belt'](context(), 'overlay');
    guess(h.node, 'To about the Tennessee and Kentucky border');
    click(h.node, 'Add 1860');
    click(h.node, 'Add today');
    await expect(h.done).resolves.toBeUndefined();
  });
  it('checks a series chart\'s options', () => {
    expect(seriesProblems({ from: 1, to: 2, panels: [{ title: 'a', unit: 'b', lines: [{ name: 'c', color: 'gold', points: [[1, 1], [2, 2]] }] }] })).toEqual([]);
    expect(seriesProblems({ from: 1, to: 2, panels: [{ title: 'a', unit: 'b', lines: [{ name: 'c', color: '#123', points: [[1, 1]] }] }] })).toHaveLength(1);
  });
});

describe('the loom minder', () => {
  it('lets one weaver keep about six plain looms or over twenty automatic ones', () => {
    expect(load(6, 'plain')).toBeLessThanOrEqual(1);
    expect(load(7, 'plain')).toBeGreaterThan(1);
    expect(load(26, 'automatic')).toBeLessThanOrEqual(1);
    expect(loomOutput(12, 'plain')).toBeCloseTo(loomOutput(7, 'plain'), 5);
  });
  it('is done with twenty automatic looms running', async () => {
    const h = FIGURES.looms(context(), 'auto');
    click(h.node, 'Automatic loom');
    setSlider(h.node, 0, 24);
    await expect(h.done).resolves.toBeUndefined();
  });
});
