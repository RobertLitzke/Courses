// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { FIGURES } from '../src/figures';
import { curtail, dist, FLIGHTS, homeHeading, PLACES, power, straightness } from '../src/figures/home';
import { WRITTEN } from '../src/lessons';
import { click, context, guess, setSlider } from './helpers';

const ownOptions = (id: string) => {
  const b = WRITTEN.find((l) => l.id === 'home')!.parts.flatMap((p) => p.blocks).find((x) => isDiagram(x) && x.id === id);
  return b && isDiagram(b) ? b.options : undefined;
};

describe('lesson 10, The way home', () => {
  it('places sit at the published distances from the cave (Tsoar et al. 2011)', () => {
    expect(dist(PLACES.cave, PLACES.tree)).toBeGreaterThan(10);
    expect(dist(PLACES.cave, PLACES.tree)).toBeLessThan(20);
    expect(dist(PLACES.cave, PLACES.negev)).toBeCloseTo(44, -1);
    expect(dist(PLACES.cave, PLACES.crater)).toBeGreaterThan(78);
    expect(dist(PLACES.cave, PLACES.crater)).toBeLessThan(88);
    expect(dist(PLACES.crater, PLACES.rim)).toBeLessThan(7);
  });

  it('tracks are as straight as the published ones', () => {
    const s = FLIGHTS.map((f) => straightness(f.track));
    expect(s[1]).toBeGreaterThan(0.75);
    expect(s[2]).toBeLessThan(0.55);
    expect(s[3]).toBeGreaterThan(0.85);
  });

  it('a field turned at sunset sends the bat off by the turn; after dark it does not (Holland 2006, 2010)', () => {
    expect(homeHeading(0, true)).toBe(180);
    expect(homeHeading(90, true)).toBe(90);
    expect(homeHeading(-90, true)).toBe(270);
    expect(homeHeading(90, false)).toBe(180);
  });

  it('raising the cut-in speed saves half or more of the bats for about 1% of the power (Arnett et al. 2011)', () => {
    expect(power(3, 3.5)).toBe(0);
    expect(power(12)).toBe(1);
    const five = curtail(5);
    const six = curtail(6.5);
    expect(five.saved).toBeGreaterThan(0.44);
    expect(six.saved).toBeLessThan(0.93);
    expect(six.saved).toBeGreaterThan(five.saved);
    expect(six.lost).toBeLessThanOrEqual(0.01);
    expect(curtail(3.5).saved).toBeCloseTo(0);
  });

  it('the GPS figure: guess, then play all four flights', async () => {
    const f = FIGURES['fruitbat-gps'](context(), 'all');
    guess(f.node, 'Fly in loops, then head home');
    for (const fl of FLIGHTS) {
      click(f.node, fl.name);
      setSlider(f.node, 0, 100);
    }
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the sunset figure: guess, then let bats go after a turn at sunset and after dark', async () => {
    const f = FIGURES['sunset-compass'](context(), 'both');
    guess(f.node, 'East');
    click(f.node, 'Let it go');
    click(f.node, 'After dark');
    click(f.node, 'Let it go');
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the turbine figure: guess, then save half the bats', async () => {
    const f = FIGURES['turbine-cutin'](context(), 'half');
    guess(f.node, 'About 1%');
    setSlider(f.node, 0, 5.5);
    await expect(f.done).resolves.toBeUndefined();
  });

  it('the clue board, from the lesson\'s JSON, leaves only the map', async () => {
    const f = FIGURES['clue-board'](context(), 'clues', ownOptions('clue-board'));
    guess(f.node, 'A map of distant landmarks');
    for (const c of ['Show clue 1: Echoes are short', 'Show clue 2: A closed box', 'Show clue 3: Straight home from new ground', 'Show clue 4: Lost in the crater']) click(f.node, c);
    await expect(f.done).resolves.toBeUndefined();
  });
});
