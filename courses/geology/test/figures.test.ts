// @vitest-environment happy-dom
// Every figure the lessons name builds, in both unit systems, and the ones
// with a task can reach it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { emptyProgress } from 'didactics/progress';
import type { Units } from 'didactics/units';
import { FIGURES } from '../src/figures';
import { WRITTEN } from '../src/lessons';
import { orbitAt, TODAY } from '../src/figures/pacemaker';
import { alpsCooling, lengthFor, RHONE_LAKES, seaLevel } from '../src/figures/iceage';
import { JURA_KM } from '../src/figures/ice';
import { atollAt, PLATE_VEL, sunk } from '../src/figures/hotspot';
import { iceSpread, turnAt } from '../src/figures/drift';
import { rockAt } from '../src/figures/families';
import { fan, arrivals, shadow, REAL_EARTH } from '../src/figures/rays';
import { setPaleomap } from '../src/figures/paleomap';
import { race as raceAt, raceStep, raceSteps } from '../src/figures/rivers';

// The plate model is fetched on the page (data/paleomap.json); here it is read from disk.
setPaleomap(JSON.parse(readFileSync('public/data/paleomap.json', 'utf8')));

const context = (units: Units = 'imperial') => ({ save: emptyProgress(units), closed: new AbortController().signal, score: () => {} });

function setSlider(node: HTMLElement, n: number, value: number): void {
  const input = node.querySelectorAll('input[type=range]')[n] as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input'));
}

const click = (node: HTMLElement, text: string) => {
  const b = [...node.querySelectorAll('button')].find((x) => x.textContent?.trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.dispatchEvent(new Event('click'));
};

/** Pick a guess and lock it in. */
const guess = (node: HTMLElement, choice: string) => {
  click(node, choice);
  click(node, 'Lock it in');
};

describe('figures', () => {
  for (const units of ['imperial', 'metric'] as const) {
    it(`all build (${units})`, () => {
      for (const l of WRITTEN) for (const p of l.parts) for (const b of p.blocks) {
        if (!isDiagram(b)) continue;
        const handle = FIGURES[b.id](context(units), b.goal, b.options);
        expect(handle.node, `${l.id}: ${b.id}`).toBeInstanceOf(HTMLElement);
      }
    });
  }

  it('lesson 1: settling levels out, and the cliff reads in order', async () => {
    const settle = FIGURES.settle(context(), 'flat');
    guess(settle.node, 'They fill the hollows and level out');
    setSlider(settle.node, 1, 100);
    setSlider(settle.node, 0, 8);
    await expect(settle.done).resolves.toBeUndefined();
    const order = FIGURES.order(context(), 'ordered');
    for (const e of ['Layer A settles', 'Layer B settles', 'Layer C settles', 'A crack (fault) shifts A, B and C', 'The top is worn level, and layer D settles on it', 'Melted rock fills a crack (dike) through everything']) click(order.node, e);
    await expect(order.done).resolves.toBeUndefined();
  });

  it('lesson 2: a river leaves clean sand, and a dune builds its beds', async () => {
    const sort = FIGURES.sorting(context(), 'sand-bed');
    setSlider(sort.node, 0, 0.15);
    await expect(sort.done).resolves.toBeUndefined();
    expect(sort.node.textContent).toContain('clean sandstone');
    const dune = FIGURES.dune(context(), 'built');
    guess(dune.node, 'From the left');
    setSlider(dune.node, 0, 90);
    await expect(dune.done).resolves.toBeUndefined();
  });

  it('lesson 3: layers tie up by their fossils, and steep layers V downstream', async () => {
    const cor = FIGURES.correlate(context(), 'matched');
    const rects = () => [...cor.node.querySelectorAll('rect[role=button]')];
    const tap = (col: string, rock: string) => {
      const r = rects().find((x) => x.getAttribute('aria-label') === `${col}: ${rock}`);
      if (!r) throw new Error(`no ${col}: ${rock}`);
      r.dispatchEvent(new Event('click'));
    };
    // A wrong match first: same rock, different fossils.
    tap('Canal cutting', 'cream limestone with sea lily stems');
    tap('Hill quarry', 'cream limestone with lamp shells');
    expect(cor.node.textContent).toContain('Same rock');
    for (const [col, rock] of [
      ['Canal cutting', 'blue clay with no fossils'],
      ['Canal cutting', 'cream limestone with sea lily stems'],
      ['Well shaft', 'blue clay with ammonites'],
      ['Well shaft', 'cream limestone with lamp shells'],
    ]) {
      tap(col, rock);
      tap('Hill quarry', rock);
    }
    await expect(cor.done).resolves.toBeUndefined();
    const vees = FIGURES.vees(context(), 'downstream');
    guess(vees.node, 'A V pointing upstream');
    setSlider(vees.node, 0, 2);
    expect(vees.node.textContent).toContain('still points upstream');
    setSlider(vees.node, 0, 20);
    await expect(vees.done).resolves.toBeUndefined();
  });

  it('lesson 4: slow cooling grows crystals, and deep in a flow the columns are hexagons', async () => {
    const furnace = FIGURES.furnace(context(), 'crystals');
    guess(furnace.node, 'Black glass');
    expect(furnace.node.textContent).toContain('glass');
    setSlider(furnace.node, 0, 8);
    await expect(furnace.done).resolves.toBeUndefined();
    expect(furnace.node.textContent).toContain('Basalt');
    const columns = FIGURES.columns(context(), 'hexagons');
    setSlider(columns.node, 0, 12);
    await expect(columns.done).resolves.toBeUndefined();
  });

  it('lesson 5: buried mud grows garnets, and squeezed flakes line up', async () => {
    const burial = FIGURES.burial(context(), 'garnet');
    setSlider(burial.node, 0, 20);
    await expect(burial.done).resolves.toBeUndefined();
    setSlider(burial.node, 0, 30);
    setSlider(burial.node, 1, 8);
    expect(burial.node.textContent).toContain('Blueschist');
    const squeeze = FIGURES.squeeze(context(), 'cleavage');
    setSlider(squeeze.node, 0, 90);
    await expect(squeeze.done).resolves.toBeUndefined();
  });

  it('lesson 6: mud melts before basalt, limestone becomes marble, and the melt ends in quartz', async () => {
    const cond = FIGURES.conditions(context(), 'migmatite');
    guess(cond.node, 'Granite');
    setSlider(cond.node, 0, 25);
    setSlider(cond.node, 1, 500);
    expect(cond.node.textContent).toContain('Schist');
    setSlider(cond.node, 1, 750);
    await expect(cond.done).resolves.toBeUndefined();
    expect(rockAt('basalt', 750, 25).name).toBe('Amphibolite');
    expect(rockAt('lime', 600, 20).name).toBe('Marble');
    expect(rockAt('granite', 1000, 0).name).toBe('Lava');
    expect(rockAt('mud', 300, 35).name).toBe('Blueschist');
    const bowen = FIGURES.bowen(context(), 'quartz');
    setSlider(bowen.node, 0, 1000);
    expect(bowen.node.textContent).toMatch(/would make (andesite|dacite)/);
    setSlider(bowen.node, 0, 690);
    await expect(bowen.done).resolves.toBeUndefined();
  });

  it('lesson 7: the cliff at Siccar Point is built in five stages', async () => {
    const unc = FIGURES.unconformity(context(), 'story');
    await Promise.resolve();
    guess(unc.node, 'Tens of millions of years');
    setSlider(unc.node, 0, 5);
    await expect(unc.done).resolves.toBeUndefined();
    expect(unc.node.textContent).toContain('million years');
  });

  it('lesson 8: Kelvin gets about 100 million years, and two half-lives leave a quarter', async () => {
    const cooling = FIGURES.cooling(context(), 'kelvin');
    setSlider(cooling.node, 0, 2);
    await expect(cooling.done).resolves.toBeUndefined();
    expect(cooling.node.textContent).toContain('Kelvin');
    const decay = FIGURES.decay(context(), 'two-halves');
    guess(decay.node, 'None');
    setSlider(decay.node, 0, 8.94);
    await expect(decay.done).resolves.toBeUndefined();
    expect(decay.node.textContent).toContain('50 uranium atoms remain');
  });

  it('lesson 9: South America meets Africa at the shelf edge', async () => {
    const fit = FIGURES.fit(context(), 'fitted');
    guess(fit.node, 'The shelf edges');
    click(fit.node, 'Shelf edges');
    setSlider(fit.node, 0, 100);
    await expect(fit.done).resolves.toBeUndefined();
  });

  it('lesson 10: the ridge matches the survey at about 2.9 cm a year', async () => {
    const ridge = FIGURES.ridge(context(), 'matched');
    setSlider(ridge.node, 1, 6);
    expect(ridge.node.textContent).toContain('too wide');
    setSlider(ridge.node, 1, 2.9);
    await expect(ridge.done).resolves.toBeUndefined();
  });

  it('lesson 11: a steeper slab brings the volcanoes nearer the trench', async () => {
    const slab = FIGURES.slab(context(), 'close');
    guess(slab.node, 'Closer to the trench');
    setSlider(slab.node, 0, 60);
    await expect(slab.done).resolves.toBeUndefined();
  });

  it('lesson 12: the Pacific plate moves about 9 cm a year', async () => {
    const plume = FIGURES.plume(context(), 'speed');
    guess(plume.node, 'About 10 cm a year');
    setSlider(plume.node, 0, 9);
    await expect(plume.done).resolves.toBeUndefined();
    const ice = FIGURES['gondwana-ice'](context(), 'hub');
    await ice.ready;
    guess(ice.node, 'Spread out from one centre');
    setSlider(ice.node, 0, 300);
    await expect(ice.done).resolves.toBeUndefined();
    expect(iceSpread(300)).toBeLessThan(5);
    expect(iceSpread(0)).toBeGreaterThan(2000);
    const atoll = FIGURES.atoll(context(), 'atoll');
    guess(atoll.node, 'A ring of reef around a lagoon');
    setSlider(atoll.node, 0, 0.05);
    setSlider(atoll.node, 1, 12);
    expect(atoll.node.textContent).toContain('died');
    setSlider(atoll.node, 0, 0.5);
    await expect(atoll.done).resolves.toBeUndefined();
    expect(atollAt(40, 0.5).stage).toBe('guyot');
  });

  it('lesson 13: a river that keeps up cuts a canyon; a knickpoint climbs', async () => {
    const race = FIGURES.race(context(), 'gorge');
    setSlider(race.node, 0, 1.2);
    setSlider(race.node, 3, 1);
    expect(race.node.textContent).toContain('wind gap');
    setSlider(race.node, 0, 0.6);
    setSlider(race.node, 2, 600);
    expect(race.node.textContent).toContain('Still holding');
    setSlider(race.node, 1, 0.6);
    await expect(race.done).resolves.toBeUndefined();
    // The lead buys time: a deeper valley holds the lake longer before it spills round.
    expect(raceAt(0.6, 0.3, 0.5e6, 100).diverted).not.toBeNull();
    expect(raceAt(0.6, 0.3, 0.5e6, 200).diverted).toBeNull();
    expect(raceAt(0.6, 0.3, 1e6, 200).bed).toBeCloseTo(200 + 0.6 * (1e6 - 200 / 0.0003) / 1000, 6);
    expect(raceAt(0.5, 0.5, 1e6, 200).canyon).toBeCloseTo(700, 6);
    expect(raceStep(0.6, 0.3, 1e6, 200)).toBe(3);
    expect(raceSteps(0.5, 0.5)).toHaveLength(3);
    const knick = FIGURES.knick(context(), 'knick');
    setSlider(knick.node, 0, 60);
    setSlider(knick.node, 1, 60);
    await expect(knick.done).resolves.toBeUndefined();
  });

  it('lesson 14: about 10 °C colder sends the Rhône glacier to the Jura', async () => {
    const glacier = FIGURES.glacier(context(), 'jura');
    expect(glacier.node.textContent).toMatch(/[5-9] km long|1[0-2] km long/);
    setSlider(glacier.node, 0, -10);
    await expect(glacier.done).resolves.toBeUndefined();
  });

  it('lesson 15: a cold northern summer, and the 41,000-year beat', async () => {
    const orbit = FIGURES.orbit(context(), 'cold');
    setSlider(orbit.node, 0, 22.1);
    setSlider(orbit.node, 1, 0.05);
    setSlider(orbit.node, 2, 0);
    await expect(orbit.done).resolves.toBeUndefined();
    const record = FIGURES.record(context(), 'beat');
    click(record.node, '1.2 to 2 million years ago');
    setSlider(record.node, 0, 41);
    await expect(record.done).resolves.toBeUndefined();
    const cycles = FIGURES.cycles(context(), 'played');
    expect([...cycles.node.querySelectorAll('button')].map((b) => b.textContent)).toContain('Play');
    setSlider(cycles.node, 0, 800);
    await expect(cycles.done).resolves.toBeUndefined();
  });

  it('lesson 15: the orbit through time agrees with today, and 11,000 years ago had strong northern summers', () => {
    expect(orbitAt(0).sun).toBeCloseTo(TODAY, -1);
    expect(orbitAt(0).tilt).toBeCloseTo(23.44, 1);
    expect(orbitAt(11).sun).toBeGreaterThan(TODAY + 40);
  });

  it('lesson 16: the crust rises after the ice melts', async () => {
    const rebound = FIGURES.rebound(context(), 'raised');
    setSlider(rebound.node, 0, 3000);
    setSlider(rebound.node, 1, 10);
    await expect(rebound.done).resolves.toBeUndefined();
  });
  it('P branch: round craters at a slant, a dated plain, a floating crust, a Moon from a Mars-like impactor', async () => {
    const impact = FIGURES.impact(context(), 'shallow-round');
    guess(impact.node, 'Round');
    setSlider(impact.node, 0, Math.log10(20));
    setSlider(impact.node, 1, 15);
    await expect(impact.done).resolves.toBeUndefined();
    const count = FIGURES['crater-count'](context(), 'date');
    guess(count.node, 'Only a few hundred million years older');
    setSlider(count.node, 0, 3.8);
    await expect(count.done).resolves.toBeUndefined();
    const ocean = FIGURES['magma-ocean'](context(), 'crust');
    guess(ocean.node, 'They float to the top');
    setSlider(ocean.node, 0, 96);
    await expect(ocean.done).resolves.toBeUndefined();
    expect(ocean.node.textContent).toContain('white crust');
    const mix = FIGURES['moon-mix'](context(), 'mars-like');
    setSlider(mix.node, 0, 1);
    await expect(mix.done).resolves.toBeUndefined();
  });

  it('L1: silica-rich water under ash turns a log to quartz, wall by wall', async () => {
    const fossil = FIGURES.fossilize(context(), 'petrified');
    guess(fossil.node, 'Volcanic ash');
    for (const b of ['Buried fast', 'No oxygen', 'Silica']) click(fossil.node, b);
    await expect(fossil.done).resolves.toBeUndefined();
    const cells = FIGURES.cells(context(), 'replaced');
    setSlider(cells.node, 0, 2000);
    await expect(cells.done).resolves.toBeUndefined();
  });

  it('D branch: weighing, locating, the Moho, the core, the inner core and the drill', async () => {
    const plumb = FIGURES.plumb(context(), 'match');
    setSlider(plumb.node, 0, 4.5);
    await expect(plumb.done).resolves.toBeUndefined();
    const layers = FIGURES.layers(context(), 'core');
    guess(layers.node, 'Packed at the centre');
    setSlider(layers.node, 0, 0.55);
    setSlider(layers.node, 1, 11);
    await expect(layers.done).resolves.toBeUndefined();
    const epi = FIGURES.epicentre(context(), 'found');
    setSlider(epi.node, 0, 190);
    setSlider(epi.node, 1, 130);
    await expect(epi.done).resolves.toBeUndefined();
    const moho = FIGURES.moho(context(), 'fit');
    guess(moho.node, 'Farther from the quake');
    setSlider(moho.node, 0, 54);
    await expect(moho.done).resolves.toBeUndefined();
    const rays = FIGURES.rays(context(), 'shadow');
    setSlider(rays.node, 0, 3480);
    await expect(rays.done).resolves.toBeUndefined();
    const inner = FIGURES['inner-core'](context(), 'lehmann');
    setSlider(inner.node, 0, 1220);
    await expect(inner.done).resolves.toBeUndefined();
    const drill = FIGURES.drill(context(), 'ktb');
    guess(drill.node, 'Shallower');
    setSlider(drill.node, 0, 28);
    setSlider(drill.node, 1, 265);
    await expect(drill.done).resolves.toBeUndefined();
  });

  it('time lapses: each played figure reaches today and is done', async () => {
    for (const [id, end] of [['opening', 150], ['ice-sheets', 130], ['rhone-ice', 120], ['island-drift', 550], ['cycles', 800]] as const) {
      const h = FIGURES[id](context(), id === 'opening' ? 'opened' : 'played');
      expect([...h.node.querySelectorAll('button')].some((b) => b.textContent === 'Play'), id).toBe(true);
      setSlider(h.node, 0, end);
      await expect(h.done, id).resolves.toBeUndefined();
    }
  });

  it('the Rhône map shows every place its lesson names, and the same lakes as the ice-age map', () => {
    const lesson = JSON.parse(readFileSync('src/lessons/erratics.json', 'utf8'));
    const map = lesson.parts.flatMap((p: { blocks: { id?: string; options?: Record<string, unknown> }[] }) => p.blocks).find((b: { id?: string; options?: Record<string, unknown> }) => b.id === 'map' && b.options?.relief === 'maps/rhone').options;
    const [w, s, e, n] = JSON.parse(readFileSync('public/maps/rhone.json', 'utf8')).bounds;
    for (const l of map.labels) expect(l.lon > w && l.lon < e && l.lat > s && l.lat < n, l.text).toBe(true);
    const texts = map.labels.map((l: { text: string }) => l.text);
    for (const place of ['Mont Blanc', 'Lake Neuchâtel', 'Lake Geneva', 'Pierre à Bot', 'Jura', 'Valais']) expect(texts).toContain(place);
    expect(map.lakes).toEqual(RHONE_LAKES);
  });

  it('time lapses: the models behind the maps', () => {
    // The South Atlantic: closed before it opened, open today.
    expect(turnAt(140)).toBeCloseTo(57);
    expect(turnAt(0)).toBe(0);
    // The sea about 125 m lower at the last glacial maximum, as today now.
    expect(seaLevel(20)).toBeLessThan(-110);
    expect(Math.abs(seaLevel(0))).toBeLessThan(1);
    // The Rhône glacier reaches the Jura at the maximum, and only its own valley today.
    expect(lengthFor(alpsCooling(20))).toBeGreaterThanOrEqual(JURA_KM);
    expect(lengthFor(alpsCooling(0))).toBeLessThan(20);
    // The Pacific plate moves west-northwest at about 10 cm a year, and old islands have sunk most.
    expect(PLATE_VEL[0]).toBeLessThan(0);
    expect(PLATE_VEL[1]).toBeGreaterThan(0);
    expect(Math.hypot(...PLATE_VEL) / 10).toBeGreaterThan(8);
    expect(Math.hypot(...PLATE_VEL) / 10).toBeLessThan(12);
    expect(sunk(5)).toBeGreaterThan(sunk(1));
  });

  it('lessons 17 to 19: faults snap, magma explodes, a megathrust lifts and drops the coast', async () => {
    const fence = FIGURES.fence(context(), 'snapped');
    guess(fence.node, 'Broken at the fault, each side straight again but shifted');
    setSlider(fence.node, 0, 160);
    await expect(fence.done).resolves.toBeUndefined();
    const stick = FIGURES['stick-slip'](context(), 'compared');
    setSlider(stick.node, 0, 1.5);
    setSlider(stick.node, 1, 400);
    setSlider(stick.node, 0, 6);
    setSlider(stick.node, 1, 401);
    await expect(stick.done).resolves.toBeUndefined();
    const shake = FIGURES.shaking(context(), 'resonant');
    guess(shake.node, 'On the old lake mud');
    setSlider(shake.node, 0, 20);
    await expect(shake.done).resolves.toBeUndefined();
    const conduit = FIGURES.conduit(context(), 'both');
    guess(conduit.node, 'It comes out as bubbles that stay trapped and tear the magma apart');
    setSlider(conduit.node, 2, 100);
    expect(conduit.node.textContent).toContain('Explosion');
    setSlider(conduit.node, 0, 50);
    await expect(conduit.done).resolves.toBeUndefined();
    const column = FIGURES.column(context(), 'collapsed');
    guess(column.node, 'It falls back and pours down the mountain');
    setSlider(column.node, 1, 500);
    await expect(column.done).resolves.toBeUndefined();
    const mt = FIGURES.megathrust(context(), 'wave');
    guess(mt.node, 'Down');
    setSlider(mt.node, 0, 300);
    expect(mt.node.textContent).toContain('coast town drops');
    setSlider(mt.node, 1, 25);
    await expect(mt.done).resolves.toBeUndefined();
  });

  it('floods and Cascadia branches: spill, plucking, a floating dam, flood beds, a buried marsh, the blast', async () => {
    const spill = FIGURES.spillover(context(), 'spilled');
    guess(spill.node, 'No, it would stay in its valley');
    setSlider(spill.node, 0, 1000);
    await expect(spill.done).resolves.toBeUndefined();
    const cat = FIGURES.cataract(context(), 'retreated');
    setSlider(cat.node, 0, 90);
    setSlider(cat.node, 1, 30);
    await expect(cat.done).resolves.toBeUndefined();
    const dam = FIGURES['ice-dam'](context(), 'floated');
    guess(dam.node, 'About nine-tenths as deep');
    setSlider(dam.node, 1, 60);
    await expect(dam.done).resolves.toBeUndefined();
    const beds = FIGURES['flood-beds'](context(), 'counted');
    guess(beds.node, 'They were separate floods, with time between them for animals to live on the dry bed');
    setSlider(beds.node, 0, 40);
    setSlider(beds.node, 1, 40);
    await expect(beds.done).resolves.toBeUndefined();
    const marsh = FIGURES.marsh(context(), 'buried');
    guess(marsh.node, 'It drops into the reach of the tides');
    setSlider(marsh.node, 0, 2000);
    await expect(marsh.done).resolves.toBeUndefined();
    const blast = FIGURES.blast(context(), 'blasted');
    guess(blast.node, 'Explode, sideways through the gap');
    setSlider(blast.node, 0, 59);
    await expect(blast.done).resolves.toBeUndefined();
    expect(blast.node.textContent).toContain('largest landslide');
  });

  it('Seattle and Whidbey branches: the fault, a failing bluff, liquefaction, the bluff builder, dry gravel, a starved beach, a terrane, a trench', async () => {
    const fault = FIGURES['seattle-fault'](context(), 'raised');
    guess(fault.node, 'The south side, riding up the slope of the fault');
    setSlider(fault.node, 0, 60);
    await expect(fault.done).resolves.toBeUndefined();
    const bluff = FIGURES.bluff(context(), 'failed');
    guess(bluff.node, 'The stormy winter');
    setSlider(bluff.node, 0, 0);
    setSlider(bluff.node, 1, 119);
    expect(bluff.node.textContent).not.toContain('slid onto the beach');
    setSlider(bluff.node, 0, 1);
    await expect(bluff.done).resolves.toBeUndefined();
    const liq = FIGURES.liquefy(context(), 'liquefied');
    guess(liq.node, 'It sinks and tilts as the sand starts to flow like a liquid');
    setSlider(liq.node, 0, 0.3);
    setSlider(liq.node, 1, 30);
    await expect(liq.done).resolves.toBeUndefined();
    const built = FIGURES['bluff-builder'](context(), 'built');
    guess(built.node, 'The sand and peat at the bottom');
    setSlider(built.node, 0, 70);
    expect(built.node.textContent).toContain('sea stands about');
    setSlider(built.node, 0, 100);
    await expect(built.done).resolves.toBeUndefined();
    const soil = FIGURES['soil-water'](context(), 'dried');
    guess(soil.node, 'The one on outwash gravel');
    setSlider(soil.node, 0, 14);
    await expect(soil.done).resolves.toBeUndefined();
    const drift = FIGURES['drift-cell'](context(), 'starved');
    guess(drift.node, 'It narrows over the years, because the bluff no longer feeds it');
    setSlider(drift.node, 1, 1);
    setSlider(drift.node, 2, 60);
    await expect(drift.done).resolves.toBeUndefined();
    const acc = FIGURES.accrete(context(), 'accreted');
    guess(acc.node, 'The arc whole, plus the seamount’s top and slivers of the seafloor');
    setSlider(acc.node, 0, 2);
    setSlider(acc.node, 1, 100);
    await expect(acc.done).resolves.toBeUndefined();
    const trench = FIGURES.trench(context(), 'counted');
    guess(trench.node, 'Three');
    setSlider(trench.node, 0, 7);
    await expect(trench.done).resolves.toBeUndefined();
  });
});

describe('the real Earth', () => {
  it('throws a P-wave shadow starting near 104 degrees', () => {
    const [from] = shadow(arrivals(fan(REAL_EARTH)).bins)!;
    expect(from).toBeGreaterThan(95);
    expect(from).toBeLessThan(110);
  });
});
