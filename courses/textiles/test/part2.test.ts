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
import { BAND, bodies } from '../src/figures/bodies';
import { PRICE, priceWith } from '../src/figures/tshirt';
import { comfort } from '../src/figures/prickle';
import { heatLoss, MET } from '../src/figures/loft';
import { threadCount } from '../src/figures/threads';
import { maxShare } from '../src/figures/reshred';
import { area } from '../src/figures/fulling';
import { apply, travelled } from '../src/figures/bobbins';
import { checkered } from '../src/figures/strips';
import { days, knots } from '../src/figures/knots';
import { GARMENTS, used } from '../src/figures/layout';
import { whiteShare } from '../src/figures/fade';

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
  it('lets one weaver keep about five plain looms or over twenty automatic ones', () => {
    expect(load(5, 'plain')).toBeLessThanOrEqual(1);
    expect(load(6, 'plain')).toBeGreaterThan(1);
    expect(load(26, 'automatic')).toBeLessThanOrEqual(1);
    expect(loomOutput(10, 'plain')).toBeCloseTo(loomOutput(5, 'plain'), 5);
  });
  it('is done with twenty automatic looms running', async () => {
    const h = FIGURES.looms(context(), 'auto');
    click(h.node, 'Automatic loom');
    setSlider(h.node, 0, 24);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the body scatter', () => {
  it('shows a wide spread of hips within one bust size', () => {
    const hips = bodies().filter(([b]) => b >= BAND[0] && b <= BAND[1]).map(([, h]) => h);
    expect(hips.length).toBeGreaterThan(10);
    expect(Math.max(...hips) - Math.min(...hips)).toBeGreaterThan(15);
  });
});

describe('the T-shirt price', () => {
  it('rises by under 1% with fixed markups and a few percent with percentage markups when wages triple', () => {
    expect(priceWith(1, 'percent')).toBeCloseTo(PRICE, 5);
    expect(priceWith(3, 'fixed') / PRICE - 1).toBeLessThan(0.02);
    const pct = priceWith(3, 'percent') / PRICE - 1;
    expect(pct).toBeGreaterThan(0.04);
    expect(pct).toBeLessThan(0.08);
  });
  it('is done once tripled wages are seen with both markups', async () => {
    const h = FIGURES.tshirt(context(), 'triple');
    setSlider(h.node, 0, 3);
    click(h.node, 'Markup: same percentage');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the prickle figure', () => {
  it('passes fine merino and fails jumper wool', () => {
    expect(comfort(19)).toBeGreaterThan(0.95);
    expect(comfort(21)).toBeGreaterThan(0.95);
    expect(comfort(27)).toBeLessThan(0.9);
  });
  it('is done after a guess and a soft and a scratchy wool', async () => {
    const h = FIGURES.prickle(context(), 'soft');
    guess(h.node, 'About 21 µm');
    setSlider(h.node, 0, 18);
    setSlider(h.node, 0, 30);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the crease figure', () => {
  it('is done once every cloth is tried', async () => {
    const h = FIGURES.crease(context(), 'all');
    for (const n of ['Cotton', 'Durable-press cotton', 'Wool', 'Polyester']) click(h.node, n);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the loft figure', () => {
  it('needs about 2 cm at 0 °C sitting still', () => {
    expect(heatLoss(10, 0)).toBeGreaterThan(MET);
    expect(heatLoss(20, 0)).toBeLessThan(MET);
  });
  it('is done after a guess and a warm layer at -10 °C', async () => {
    const h = FIGURES.loft(context(), 'warm');
    guess(h.node, 'About 2 cm');
    setSlider(h.node, 1, -15);
    setSlider(h.node, 0, 35);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the thread count figure', () => {
  it('keeps honest counts under 600', () => {
    expect(threadCount(0.08)).toBeLessThan(600);
    expect(threadCount(0.3)).toBeGreaterThan(100);
  });
  it('is done when plies are counted past 800', async () => {
    const h = FIGURES.threads(context(), 'ply');
    click(h.node, 'Count each of 3 plies');
    setSlider(h.node, 0, 0.12);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the stretch figure', () => {
  it('is done once jersey and the elastane knit are pulled hard', async () => {
    const h = FIGURES.stretch(context(), 'compare');
    setSlider(h.node, 0, 40);
    click(h.node, 'Jersey with 5% elastane');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the rain figure', () => {
  it('is done when the membrane keeps up and then falls behind', async () => {
    const h = FIGURES.rain(context(), 'limits');
    click(h.node, 'Climbing a hill');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the reshred figure', () => {
  it('lets about a quarter of once-shredded cotton spin', () => {
    expect(maxShare(1)).toBeGreaterThan(0.2);
    expect(maxShare(1)).toBeLessThan(0.3);
    expect(maxShare(2)).toBeLessThan(maxShare(1));
  });
  it('is done after a guess and a blend that spins and one that does not', async () => {
    const h = FIGURES.reshred(context(), 'blend');
    guess(h.node, 'About a quarter');
    setSlider(h.node, 0, 0.2);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the fulling figure', () => {
  it('felts in hot soapy water and not dry', () => {
    expect(area(0, 100)).toBe(1);
    expect(area(2, 30)).toBeLessThan(0.7);
    expect(area(1, 30)).toBeGreaterThan(0.85);
  });
  it('is done after dry rubbing and a felted mat', async () => {
    const h = FIGURES.fulling(context(), 'felt');
    click(h.node, 'Dry');
    click(h.node, 'Rub ten times');
    click(h.node, 'Hot soapy water');
    for (let i = 0; i < 3; i++) click(h.node, 'Rub ten times');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the bobbins figure', () => {
  it('passes the left pair through the right in a cloth stitch', () => {
    let p = [0, 1, 2, 3];
    for (const m of ['cross', 'twist', 'cross'] as const) p = apply(p, m);
    expect(travelled(p)).toBe(true);
    expect(travelled(apply(apply([0, 1, 2, 3], 'cross'), 'twist'))).toBe(false);
  });
  it('is done after cross, twist, cross', async () => {
    const h = FIGURES.bobbins(context(), 'cloth');
    for (const m of ['Cross', 'Twist', 'Cross']) click(h.node, m);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the beard figure', () => {
  it('is done once every step is seen', async () => {
    const h = FIGURES.beard(context(), 'cycle');
    for (let i = 0; i < 5; i++) click(h.node, 'Next step');
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the strips figure', () => {
  it('is done when alternate strips are shifted one block', async () => {
    expect(checkered(0)).toBe(false);
    expect(checkered(0.5)).toBe(false);
    const h = FIGURES.strips(context(), 'checker');
    setSlider(h.node, 0, 1);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the knots figure', () => {
  it('counts knots and days', () => {
    expect(knots(10)).toBe(600000);
    expect(days(10)).toBe(60);
  });
  it('is done after a coarse and a fine density', async () => {
    const h = FIGURES.knots(context(), 'fine');
    setSlider(h.node, 0, 64);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the layout figure', () => {
  it('wastes nothing draped and more when fitted', () => {
    expect(used(GARMENTS[0])).toBeCloseTo(1);
    expect(used(GARMENTS[1])).toBeCloseTo(1);
    expect(used(GARMENTS[2])).toBeLessThan(0.95);
    expect(used(GARMENTS[3])).toBeLessThan(used(GARMENTS[2]));
  });
  it('is done once every garment is laid out', async () => {
    const h = FIGURES.layout(context(), 'all');
    for (const n of ['Tunic with gores', 'Fitted gown', 'Bias-cut dress']) click(h.node, n);
    await expect(h.done).resolves.toBeUndefined();
  });
});

describe('the fade figure', () => {
  it('shows the core only once the ring is worn through', () => {
    expect(whiteShare(40, true)).toBe(0);
    expect(whiteShare(100, true)).toBeGreaterThan(0.5);
    expect(whiteShare(100, false)).toBe(0);
  });
  it('is done when ring-dyed yarn is worn to the core', async () => {
    const h = FIGURES.fade(context(), 'fade');
    setSlider(h.node, 0, 90);
    await expect(h.done).resolves.toBeUndefined();
  });
});
